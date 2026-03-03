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
# TIME PARSER (CORRECT)
# =========================

def parse_time_to_seconds(t):
    """
    Convert hhmmss.sss → seconds since midnight
    Example: "123519.00" → 45319.0
    """
    try:
        if not t:
            return 0.0

        hh = int(t[0:2])
        mm = int(t[2:4])
        ss = float(t[4:])

        return hh * 3600 + mm * 60 + ss
    except:
        return 0.0


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
            "GSV": {}
        }

    gsv_state = {}

    for line in lines:
        parts = line.split(",")
        msg = parts[0][1:]

        # ---- TIME ----
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

            if talker not in gsv_state:
                gsv_state[talker] = []

            gsv_state[talker].append(parts)

            try:
                total = int(parts[1])
            except:
                total = 1

            if len(gsv_state[talker]) == total:
                current_epoch["GSV"][talker] = gsv_state[talker][:]
                gsv_state[talker].clear()

            continue

        # ---- OTHER ----
        current_epoch[msg] = parts

    if current_epoch:
        yield current_epoch


# =========================
# MAIN PROCESSOR
# =========================

def process_nmea_file(file_path, chunk_size=50000):
    cache = DataCache()

    times = []
    chunk_ids = []
    offsets = []

    chunk_id = 0
    local_index = 0

    current_file = open(
        cache.path(f"chunk_{chunk_id}.jsonl"),
        "w",
        buffering=8 * 1024 * 1024
    )

    for epoch in parse_epochs(stream_nmea(file_path)):

        # ---- WRITE ----
        current_file.write(json.dumps(epoch) + "\n")

        # ---- INDEX ----
        t = parse_time_to_seconds(epoch.get("time"))
        times.append(t)
        chunk_ids.append(chunk_id)
        offsets.append(local_index)

        local_index += 1

        # ---- ROTATE ----
        if local_index >= chunk_size:
            current_file.close()

            chunk_id += 1
            local_index = 0

            current_file = open(
                cache.path(f"chunk_{chunk_id}.jsonl"),
                "w",
                buffering=8 * 1024 * 1024
            )

    current_file.close()

    # ---- SAVE INDEX ----
    np.save(cache.path("time_index.npy"), np.array(times, dtype=np.float64))
    np.save(cache.path("chunk_ids.npy"), np.array(chunk_ids, dtype=np.int32))
    np.save(cache.path("offsets.npy"), np.array(offsets, dtype=np.int32))

    return cache


# =========================
# READER
# =========================

def read_selected_offsets(file_path, target_offsets):
    results = []
    target_offsets = sorted(target_offsets)

    with open(file_path, "r") as f:
        current = 0
        target_idx = 0

        for line in f:
            if target_idx >= len(target_offsets):
                break

            if current == target_offsets[target_idx]:
                results.append(json.loads(line))
                target_idx += 1

            current += 1

    return results


# =========================
# QUERY (FAST)
# =========================

def query_time_range(cache, start, end):
    time_index = np.load(cache.path("time_index.npy"))
    chunk_ids = np.load(cache.path("chunk_ids.npy"))
    offsets = np.load(cache.path("offsets.npy"))

    mask = (time_index >= start) & (time_index <= end)
    indices = np.where(mask)[0]

    # ---- GROUP ----
    chunk_groups = {}

    for i in indices:
        cid = int(chunk_ids[i])
        off = int(offsets[i])
        chunk_groups.setdefault(cid, []).append(off)

    results = []

    # ---- READ MINIMUM ----
    for cid, offs in chunk_groups.items():
        path = cache.path(f"chunk_{cid}.jsonl")
        results.extend(read_selected_offsets(path, offs))

    return results