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

def stream_nmea(file_path):
    with open(file_path, "rb", buffering=8 * 1024 * 1024) as f:
        for raw in f:
            if raw and raw[0] == 36:  # '$'
                yield raw.decode("ascii", "ignore").strip()


# =========================
# TIME PARSER
# =========================

def parse_time_to_seconds(t):
    try:
        if not t:
            return None
        return int(float(t))  # hhmmss → second resolution
    except:
        return None


# =========================
# CONSTELLATION MAPS
# =========================

TALKER_MAP = {
    "GP": "GPS",
    "GL": "GLONASS",
    "GA": "GALILEO",
    "GB": "BEIDOU",
    "GQ": "QZSS",
    "GI": "IRNSS"
}

ID_MAP = {
    1: "GPS",
    2: "GLONASS",
    3: "GALILEO",
    4: "BEIDOU",
    5: "QZSS",
    6: "IRNSS"
}

def plot_cno():
    pass

# =========================
# CONSTELLATION RESOLVER
# =========================

def resolve_constellation(msg, parts):
    talker = msg[:2]

    # ---- GLOBAL (STANDARD NMEA) ----
    if talker != "GN":
        return TALKER_MAP.get(talker, "UNKNOWN")

    # ---- LOCAL (GN → use last field before *) ----
    try:
        last = parts[-1]

        if "*" in last:
            last = last.split("*")[0]

        constellation_id = int(last)
        return ID_MAP.get(constellation_id, "UNKNOWN")

    except:
        return "UNKNOWN"


# =========================
# PROCESSOR (CORE ENGINE)
# =========================

def process_nmea_file(file_path):
    print(f"[DEBUG] process_nmea_file called with '{file_path}'")
    cache = DataCache()

    writers = {}
    time_buffers = {}

    current_time = None
    epoch_active = False
    total_lines = 0
    total_written = 0

    def get_writer(name):
        if name not in writers:
            target = cache.path(f"{name}.jsonl")
            print(f"[DEBUG] creating writer for '{name}' -> {target}")
            writers[name] = open(
                target,
                "w",
                buffering=8 * 1024 * 1024
            )
            time_buffers[name] = []
        return writers[name]

    for line in stream_nmea(file_path):
        total_lines += 1
        parts = line.split(",")
        msg = parts[0][1:]  # remove '$'

        # =========================
        # TIME-BEARING MESSAGES
        # =========================
        if msg.endswith(("GGA", "RMC", "GNS", "ZDA")):
            t = parse_time_to_seconds(parts[1]) if len(parts) > 1 else None

            if t is not None:
                current_time = t
                epoch_active = True

                name = msg
                writer = get_writer(name)

                writer.write(json.dumps({
                    "t": current_time,
                    "data": parts
                }) + "\n")
                total_written += 1

                time_buffers[name].append(current_time)

            continue

        # =========================
        # NON-TIME MESSAGES
        # =========================
        if not epoch_active:
            # Drop orphan data (no valid time yet)
            continue

        # ---- GSA (CONSTELLATION SPLIT) ----
        if msg.endswith("GSA"):
            constellation = resolve_constellation(msg, parts)
            name = f"{constellation}_GSA"

        # ---- GSV (CONSTELLATION SPLIT) ----
        elif msg.endswith("GSV"):
            constellation = resolve_constellation(msg, parts)
            name = f"{constellation}_GSV"

        # ---- OTHERS ----
        else:
            name = msg

        writer = get_writer(name)

        writer.write(json.dumps({
            "t": current_time,
            "data": parts
        }) + "\n")
        total_written += 1

        time_buffers[name].append(current_time)

    # =========================
    # CLOSE FILES
    # =========================
    for f in writers.values():
        f.close()

    print(f"[DEBUG] processing complete, lines seen={total_lines}, records written={total_written}")
    print(f"[DEBUG] cache directory contains: {os.listdir(cache.temp_dir)}")

    # =========================
    # SAVE TIME INDEXES
    # =========================
    # for name, times in time_buffers.items():
    #     np.save(
    #         cache.path(f"{name}_time.npy"),
    #         np.array(times, dtype=np.float64)
    #     )

    return cache


# =========================
# QUERY ENGINE (FAST)
# =========================

def query_file(cache, name, start, end):
    time_index = np.load(cache.path(f"{name}_time.npy"))

    indices = np.where(
        (time_index >= start) & (time_index <= end)
    )[0]

    indices = set(indices)  # ⚡ O(1) lookup

    results = []

    with open(cache.path(f"{name}.jsonl"), "r") as f:
        for i, line in enumerate(f):
            if i in indices:
                results.append(json.loads(line))

    return results