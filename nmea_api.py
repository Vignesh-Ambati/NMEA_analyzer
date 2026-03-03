import os
import numpy as np
import tempfile
import shutil
import atexit
import heapq
import mmap
import threading
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
import multiprocessing as mp
import matplotlib.pyplot as plt

# =========================================
# CONFIG
# =========================================

CHUNK_SIZE = 100_000          # flush after this many GGA records
DOWNSAMPLE = 5                 # keep every 5th line globally
BATCH_LINES = 50000            # lines per parsing batch (tunable)


# =========================================
# CACHE
# =========================================

class DataCache:
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp(prefix=".logcache_")
        atexit.register(self.cleanup)

    def path(self, name):
        return os.path.join(self.temp_dir, name)

    def cleanup(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)


# =========================================
# DETECT TYPE & PARSERS
# =========================================

def detect_type(line):
    if not line.startswith('$'):
        return None
    return line[3:6]

def parse_line(line):
    try:
        parts = line.split(',')
        msg = detect_type(line)

        if msg == "GGA":
            return {
                "type": "GGA",
                "time": float(parts[1]) if parts[1] else None,
                "lat": float(parts[2]) if parts[2] else None,
                "lon": float(parts[4]) if parts[4] else None,
                "sat": int(parts[7]) if parts[7] else 0,
                "alt": float(parts[9]) if parts[9] else None,
            }

        elif msg == "RMC":
            return {
                "type": "RMC",
                "time": float(parts[1]) if parts[1] else None,
                "speed": float(parts[7]) if parts[7] else None,
            }

        elif msg == "GSV":
            cno = []
            for i in range(7, len(parts), 4):
                if parts[i]:
                    cno.append(float(parts[i]))
            return {
                "type": "CNO",
                "time": None,
                "cno": cno
            }

        elif msg == "GSA":
            pdop = float(parts[15]) if parts[15] else None
            hdop = float(parts[16]) if parts[16] else None
            vdop = float(parts[17]) if parts[17] else None
            return {
                "type": "GSA",
                "time": None,
                "pdop": pdop,
                "hdop": hdop,
                "vdop": vdop
            }

    except:
        return None

    return None


class TimeValidator:
    def __init__(self):
        self.last_time = None
        self.restarts = []

    def validate(self, t):
        if t is None:
            return False
        if self.last_time is None:
            self.last_time = t
            return True
        if t < self.last_time or (t - self.last_time > 5):
            self.restarts.append(t)
            self.last_time = t
            return False
        self.last_time = t
        return True

class DiskWriter:
    def __init__(self, cache):
        self.cache = cache
        self.buffers = {
            "GGA_time": [], "GGA_lat": [], "GGA_lon": [], "GGA_sat": [], "GGA_alt": [],
            "RMC_time": [], "RMC_speed": [],
            "CNO_time": [], "CNO_val": [],
            "GSA_time": [], "GSA_pdop": [], "GSA_hdop": [], "GSA_vdop": [],
        }
        self.validator = TimeValidator()
        self.last_time = None

    def append_npy(self, file, array):
        with open(file, 'ab') as f:
            np.save(f, array)

    def flush(self):
        if not self.buffers["GGA_time"]:
            return

        self.append_npy(self.cache.path("GGA_time.npy"), np.array(self.buffers["GGA_time"]))
        self.append_npy(self.cache.path("GGA_lat.npy"), np.array(self.buffers["GGA_lat"]))
        self.append_npy(self.cache.path("GGA_lon.npy"), np.array(self.buffers["GGA_lon"]))
        self.append_npy(self.cache.path("GGA_sat.npy"), np.array(self.buffers["GGA_sat"]))
        self.append_npy(self.cache.path("GGA_alt.npy"), np.array(self.buffers["GGA_alt"]))

        if self.buffers["RMC_time"]:
            self.append_npy(self.cache.path("RMC_time.npy"), np.array(self.buffers["RMC_time"]))
            self.append_npy(self.cache.path("RMC_speed.npy"), np.array(self.buffers["RMC_speed"]))

        if self.buffers["CNO_time"]:
            self.append_npy(self.cache.path("CNO_time.npy"), np.array(self.buffers["CNO_time"]))
            self.append_npy(self.cache.path("CNO_val.npy"), np.array(self.buffers["CNO_val"]))

        if self.buffers["GSA_time"]:
            self.append_npy(self.cache.path("GSA_time.npy"), np.array(self.buffers["GSA_time"]))
            self.append_npy(self.cache.path("GSA_pdop.npy"), np.array(self.buffers["GSA_pdop"]))
            self.append_npy(self.cache.path("GSA_hdop.npy"), np.array(self.buffers["GSA_hdop"]))
            self.append_npy(self.cache.path("GSA_vdop.npy"), np.array(self.buffers["GSA_vdop"]))

        for k in self.buffers:
            self.buffers[k].clear()

    def store(self, item):
        """
        item: tuple (global_index, parsed_dict)
        Downsampling and time validation are applied here.
        """
        idx, parsed = item

        # downsampling based on global line index
        if idx % DOWNSAMPLE != 0:
            return

        # time validation (if the sentence has a time field)
        t = parsed.get("time")
        if t is not None:
            if self.validator.validate(t):
                self.last_time = t
            else:
                return               # skip this message (time jump)
        else:
            # messages without time (GSV, GSA) use the last valid time
            parsed["time"] = self.last_time

        if parsed["time"] is None:
            return

        t = parsed["time"]

        # route to appropriate buffer
        if parsed["type"] == "GGA":
            self.buffers["GGA_time"].append(t)
            self.buffers["GGA_lat"].append(parsed["lat"])
            self.buffers["GGA_lon"].append(parsed["lon"])
            self.buffers["GGA_sat"].append(parsed["sat"])
            self.buffers["GGA_alt"].append(parsed["alt"])

        elif parsed["type"] == "RMC":
            self.buffers["RMC_time"].append(t)
            self.buffers["RMC_speed"].append(parsed["speed"])

        elif parsed["type"] == "CNO":
            for v in parsed["cno"]:
                self.buffers["CNO_time"].append(t)
                self.buffers["CNO_val"].append(v)

        elif parsed["type"] == "GSA":
            self.buffers["GSA_time"].append(t)
            self.buffers["GSA_pdop"].append(parsed["pdop"])
            self.buffers["GSA_hdop"].append(parsed["hdop"])
            self.buffers["GSA_vdop"].append(parsed["vdop"])

        # flush if buffer is full
        if len(self.buffers["GGA_time"]) >= CHUNK_SIZE:
            self.flush()


# =========================================
# BATCH PARSER (runs in worker processes)
# =========================================

def parse_batch(lines_with_indices):
    """
    lines_with_indices: list of (global_index, line_bytes)
    returns: list of (global_index, parsed_dict) for all successfully parsed lines
    """
    results = []
    for idx, line_bytes in lines_with_indices:
        try:
            line = line_bytes.decode('utf-8', errors='ignore')
        except:
            continue
        parsed = parse_line(line)
        if parsed:
            results.append((idx, parsed))
    return results

def build_dataset(filepath):
    cache = DataCache()
    writer = DiskWriter(cache)

    num_workers = mp.cpu_count()
    print(f"Using {num_workers} worker processes")

    with open(filepath, 'rb') as f:
        # memory-map the file for fast scanning
        with mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ) as mm:
            # generator that yields (global_index, line_bytes)
            def line_generator():
                idx = 0
                start = 0
                size = len(mm)
                while start < size:
                    end = mm.find(b'\n', start)
                    if end == -1:
                        line = mm[start:]
                        if line:
                            yield (idx, line)
                        break
                    line = mm[start:end]
                    yield (idx, line)
                    idx += 1
                    start = end + 1

            # collect batches and submit to process pool
            futures = []
            batch = []
            with ProcessPoolExecutor(max_workers=num_workers) as executor:
                for idx, line in line_generator():
                    batch.append((idx, line))
                    if len(batch) >= BATCH_LINES:
                        futures.append(executor.submit(parse_batch, batch))
                        batch = []

                if batch:
                    futures.append(executor.submit(parse_batch, batch))

                # reorder results using a min-heap
                heap = []
                next_expected = 0

                for future in futures:
                    for item in future.result():
                        heapq.heappush(heap, item)

                    # write as long as the smallest index is exactly the next expected
                    while heap and heap[0][0] == next_expected:
                        _, parsed = heapq.heappop(heap)
                        writer.store((next_expected, parsed))
                        next_expected += 1

                # drain remaining heap (indices are sorted, but gaps exist)
                while heap:
                    idx, parsed = heapq.heappop(heap)
                    # safety check: idx should never be less than next_expected
                    if idx < next_expected:
                        print(f"Error: index {idx} < next_expected {next_expected} – this should not happen")
                        continue
                    writer.store((idx, parsed))
                    next_expected = idx + 1

    # final flush and save restarts
    writer.flush()
    np.save(cache.path("restarts.npy"), np.array(writer.validator.restarts))

    return cache


# =========================================
# LOAD (unchanged)
# =========================================

def load_all_chunks(file):
    if not os.path.exists(file):
        return np.array([])
    arrays = []
    with open(file, 'rb') as f:
        while True:
            try:
                arrays.append(np.load(f))
            except:
                break
    return np.concatenate(arrays) if arrays else np.array([])


# =========================================
# PLOTS (unchanged)
# =========================================

def plot_cno(cache):
    t = load_all_chunks(cache.path("CNO_time.npy"))
    c = load_all_chunks(cache.path("CNO_val.npy"))
    plt.figure()
    plt.scatter(t, c, s=1)
    plt.title("C/N0")
    plt.xlabel("Time (s)")
    plt.ylabel("C/N0 (dBHz)")
    plt.show()

def plot_position(cache):
    lat = load_all_chunks(cache.path("GGA_lat.npy"))
    lon = load_all_chunks(cache.path("GGA_lon.npy"))
    plt.figure()
    plt.plot(lon, lat)
    plt.title("Position")
    plt.xlabel("Longitude")
    plt.ylabel("Latitude")
    plt.axis('equal')
    plt.show()

def plot_sat(cache):
    t = load_all_chunks(cache.path("GGA_time.npy"))
    s = load_all_chunks(cache.path("GGA_sat.npy"))
    plt.figure()
    plt.plot(t, s)
    plt.title("Satellites Used")
    plt.xlabel("Time (s)")
    plt.ylabel("Number of satellites")
    plt.show()

def plot_restarts(cache):
    r = np.load(cache.path("restarts.npy"))
    plt.figure()
    plt.plot(r, np.ones_like(r), 'x')
    plt.title("Time Jumps / Restarts")
    plt.xlabel("Time (s)")
    plt.yticks([])
    plt.show()

def plot_altitude(cache):
    t = load_all_chunks(cache.path("GGA_time.npy"))
    alt = load_all_chunks(cache.path("GGA_alt.npy"))
    plt.figure()
    plt.plot(t, alt)
    plt.title("Altitude")
    plt.xlabel("Time (s)")
    plt.ylabel("Altitude (m)")
    plt.show()

def plot_dop(cache):
    t = load_all_chunks(cache.path("GSA_time.npy"))
    pdop = load_all_chunks(cache.path("GSA_pdop.npy"))
    hdop = load_all_chunks(cache.path("GSA_hdop.npy"))
    vdop = load_all_chunks(cache.path("GSA_vdop.npy"))
    plt.figure()
    plt.plot(t, pdop, label='PDOP')
    plt.plot(t, hdop, label='HDOP')
    plt.plot(t, vdop, label='VDOP')
    plt.title("DOP")
    plt.xlabel("Time (s)")
    plt.ylabel("DOP")
    plt.legend()
    plt.show()

def plot_velocity(cache):
    t = load_all_chunks(cache.path("RMC_time.npy"))
    v = load_all_chunks(cache.path("RMC_speed.npy"))
    plt.figure()
    plt.plot(t, v * 0.514444)  # knots to m/s
    plt.title("Velocity")
    plt.xlabel("Time (s)")
    plt.ylabel("Speed (m/s)")
    plt.show()


# =========================================
# RUN (optional)
# =========================================

def run_all(cache):
    with ThreadPoolExecutor() as ex:
        ex.submit(plot_cno, cache)
        ex.submit(plot_position, cache)
        ex.submit(plot_sat, cache)
        ex.submit(plot_restarts, cache)
        ex.submit(plot_altitude, cache)
        ex.submit(plot_dop, cache)
        ex.submit(plot_velocity, cache)