import os
import numpy as np
import tempfile
import shutil
import atexit
import threading
import queue
from concurrent.futures import ThreadPoolExecutor
import matplotlib.pyplot as plt


# =========================================
# CONFIG
# =========================================

CHUNK_SIZE = 100_000
DOWNSAMPLE = 5
QUEUE_SIZE = 5000
NUM_WORKERS = 4


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
# DETECT TYPE
# =========================================

def detect_type(line):
    if not line.startswith('$'):
        return None
    return line[3:6]


# =========================================
# PARSERS
# =========================================

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

    except:
        return None

    return None


# =========================================
# TIME VALIDATOR
# =========================================

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


# =========================================
# DISK WRITER
# =========================================

class DiskWriter:
    def __init__(self, cache):
        self.cache = cache
        self.buffers = {
            "GGA_time": [], "GGA_lat": [], "GGA_lon": [], "GGA_sat": [],
            "RMC_time": [], "RMC_speed": [],
            "CNO_time": [], "CNO_val": [],
        }
        self.lock = threading.Lock()
        self.counter = 0

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

        if self.buffers["RMC_time"]:
            self.append_npy(self.cache.path("RMC_time.npy"), np.array(self.buffers["RMC_time"]))
            self.append_npy(self.cache.path("RMC_speed.npy"), np.array(self.buffers["RMC_speed"]))

        if self.buffers["CNO_time"]:
            self.append_npy(self.cache.path("CNO_time.npy"), np.array(self.buffers["CNO_time"]))
            self.append_npy(self.cache.path("CNO_val.npy"), np.array(self.buffers["CNO_val"]))

        for k in self.buffers:
            self.buffers[k].clear()

    def store(self, parsed, time):
        if self.counter % DOWNSAMPLE != 0:
            self.counter += 1
            return

        t = time

        if parsed["type"] == "GGA":
            self.buffers["GGA_time"].append(t)
            self.buffers["GGA_lat"].append(parsed["lat"])
            self.buffers["GGA_lon"].append(parsed["lon"])
            self.buffers["GGA_sat"].append(parsed["sat"])

        elif parsed["type"] == "RMC":
            self.buffers["RMC_time"].append(t)
            self.buffers["RMC_speed"].append(parsed["speed"])

        elif parsed["type"] == "CNO":
            for v in parsed["cno"]:
                self.buffers["CNO_time"].append(t)
                self.buffers["CNO_val"].append(v)

        self.counter += 1

        if len(self.buffers["GGA_time"]) >= CHUNK_SIZE:
            self.flush()


# =========================================
# PIPELINE WORKERS
# =========================================

def reader(filepath, q):
    with open(filepath, 'r', buffering=1024 * 1024) as f:
        for line in f:
            q.put(line.strip())
    for _ in range(NUM_WORKERS):
        q.put(None)


def parser_worker(q_in, q_out):
    while True:
        line = q_in.get()
        if line is None:
            q_out.put(None)
            break

        parsed = parse_line(line)
        if parsed:
            q_out.put(parsed)


def writer_worker(q, cache):
    validator = TimeValidator()
    writer = DiskWriter(cache)

    last_time = None
    done_count = 0

    while True:
        item = q.get()

        if item is None:
            done_count += 1
            if done_count == NUM_WORKERS:
                break
            continue

        if item["time"] is not None:
            if validator.validate(item["time"]):
                last_time = item["time"]
            else:
                continue
        else:
            item["time"] = last_time

        if item["time"] is None:
            continue

        writer.store(item, item["time"])

    writer.flush()

    np.save(cache.path("restarts.npy"), np.array(validator.restarts))


# =========================================
# MAIN BUILD
# =========================================

def build_dataset(filepath):
    cache = DataCache()

    q1 = queue.Queue(maxsize=QUEUE_SIZE)
    q2 = queue.Queue(maxsize=QUEUE_SIZE)

    t_reader = threading.Thread(target=reader, args=(filepath, q1))
    workers = [threading.Thread(target=parser_worker, args=(q1, q2)) for _ in range(NUM_WORKERS)]
    t_writer = threading.Thread(target=writer_worker, args=(q2, cache))

    t_reader.start()
    for w in workers:
        w.start()
    t_writer.start()

    t_reader.join()
    for w in workers:
        w.join()
    t_writer.join()

    return cache


# =========================================
# LOAD
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
# PLOTS
# =========================================

def plot_cno(cache):
    t = load_all_chunks(cache.path("CNO_time.npy"))
    c = load_all_chunks(cache.path("CNO_val.npy"))

    plt.figure()
    plt.scatter(t, c, s=1)
    plt.title("C/N0")
    plt.show()


def plot_position(cache):
    lat = load_all_chunks(cache.path("GGA_lat.npy"))
    lon = load_all_chunks(cache.path("GGA_lon.npy"))

    plt.figure()
    plt.plot(lon, lat)
    plt.title("Position")
    plt.show()


def plot_sat(cache):
    t = load_all_chunks(cache.path("GGA_time.npy"))
    s = load_all_chunks(cache.path("GGA_sat.npy"))

    plt.figure()
    plt.plot(t, s)
    plt.title("Satellites Used")
    plt.show()


def plot_restarts(cache):
    r = np.load(cache.path("restarts.npy"))
    plt.figure()
    plt.plot(r, np.ones_like(r), 'x')
    plt.title("Restarts")
    plt.show()


# =========================================
# RUN
# =========================================

def run_all(cache):
    with ThreadPoolExecutor() as ex:
        ex.submit(plot_cno, cache)
        ex.submit(plot_position, cache)
        ex.submit(plot_sat, cache)
        ex.submit(plot_restarts, cache)
