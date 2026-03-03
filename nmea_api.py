import os
import tempfile
import shutil
import json
import numpy as np

# =========================
# CACHE
# =========================

class DataCache:
    def __init__(self):
        base_dir = os.getcwd()
        self.temp_directory = os.path.join(base_dir, ".logcache")
        os.makedirs(self.temp_directory, exist_ok=True)

        self.temp_dir = tempfile.mkdtemp(
            prefix=".logcache_",
            dir=self.temp_directory
        )

    def path(self, name):
        return os.path.join(self.temp_dir, name)

    def cleanup(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)


# =========================
# STREAM (FAST)
# =========================

def stream_nmea(file_path):
    with open(file_path, "rb", buffering=8 * 1024 * 1024) as f:
        for raw in f:
            if raw and raw[0] == 36:  # '$'
                yield raw.decode("ascii", "ignore").strip()


# =========================
# PARSER
# =========================

def parse_epochs(lines):
    current_epoch = None
    current_time = None

    def new_epoch():
        return {
            "time": None,
            "GSA": {},
            "GSV": {"GP": [], "GL": [], "GA": [], "GB": [], "GQ": [], "GI": []}
        }

    gsv_state = {k: [] for k in ("GP", "GL", "GA", "GB", "GQ", "GI")}

    for line in lines:
        parts = line.split(",")   # ✅ FAST (C optimized)
        msg = parts[0][1:]

        # ---- TIME EXTRACTION ----
        if msg.endswith(("RMC", "GGA", "ZDA")) and len(parts) > 1:
            t = parts[1]
            if t and t != current_time:
                if current_epoch:
                    yield current_epoch
                current_epoch = new_epoch()
                current_time = t

        if current_epoch is None:
            current_epoch = new_epoch()

        current_epoch["time"] = current_time

        # ---- GSA ----
        if msg.endswith("GSA"):
            current_epoch["GSA"][msg[:2]] = parts
            continue

        # ---- GSV ----
        if msg.endswith("GSV"):
            talker = msg[:2]
            gsv_state[talker].append(parts)

            total = int(parts[1]) if parts[1] else 1
            if len(gsv_state[talker]) == total:
                current_epoch["GSV"][talker] = gsv_state[talker][:]
                gsv_state[talker].clear()

            continue

        # ---- OTHER ----
        current_epoch[msg] = parts

    if current_epoch:
        yield current_epoch


# =========================
# MAIN (ULTRA FAST)
# =========================

def process_nmea_file(file_path):
    cache = DataCache()

    json_path = cache.path("data.jsonl")
    index_path = cache.path("time_index.npy")

    times = []

    # BIG BUFFER WRITE
    with open(json_path, "w", buffering=8 * 1024 * 1024) as f:

        for epoch in parse_epochs(stream_nmea(file_path)):

            # ---- WRITE JSON LINE ----
            f.write(json.dumps(epoch) + "\n")

            # ---- BUILD INDEX INLINE ----
            t = epoch.get("time")
            if t:
                try:
                    times.append(float(t))
                except:
                    times.append(0.0)
            else:
                times.append(0.0)

    # ---- SAVE INDEX ----
    np.save(index_path, np.array(times, dtype=np.float64))

    return cache, json_path, index_path


# =========================
# READER (FAST)
# =========================

def read_all(json_path):
    with open(json_path, "r") as f:
        for line in f:
            yield json.loads(line)


# =========================
# QUERY (FAST)
# =========================

def query_time_range(cache, start, end):
    index = np.load(cache.path("time_index.npy"))

    mask = (index >= start) & (index <= end)
    indices = set(np.where(mask)[0])   # ⚡ O(1) lookup

    results = []
    for i, epoch in enumerate(read_all(cache.path("data.jsonl"))):
        if i in indices:
            results.append(epoch)

    return results