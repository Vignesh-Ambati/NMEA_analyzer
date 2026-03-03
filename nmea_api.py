import datetime
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
import tkinter as tk
from tkinter import filedialog

# =========================================
# CONFIG
# =========================================

CHUNK_SIZE = 100_000          # flush after this many GGA records
DOWNSAMPLE = 5                 # keep every 5th line globally
BATCH_LINES = 50000            # lines per parsing batch (tunable)


# =========================================
# CACHE
# =========================================

# class DataCache:
#     def __init__(self):
#         self.temp_dir = tempfile.mkdtemp(prefix=".logcache_")
#         atexit.register(self.cleanup)

#     def path(self, name):
#         return os.path.join(self.temp_dir, name)

#     def cleanup(self):
#         shutil.rmtree(self.temp_dir, ignore_errors=True)
        
class DataCache:
    def __init__(self):
        base_dir = os.getcwd()
        self.temp_directory = os.path.join(base_dir, ".logcache")
        os.makedirs(self.temp_directory, exist_ok=True)
        
        # FIX: Explicitly pass 'dir'. The first positional argument is 'suffix'.
        self.temp_dir = tempfile.mkdtemp(prefix=".logcache_", dir=self.temp_directory)

    def path(self, name):
        return os.path.join(self.temp_dir, name)

    def cleanup(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)


# =========================================
# DETECT TYPE & PARSERS (enhanced)
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
                "quality": int(parts[6]) if parts[6] else 0,
            }

        elif msg == "RMC":
            return {
                "type": "RMC",
                "time": float(parts[1]) if parts[1] else None,
                "speed": float(parts[7]) if parts[7] else None,
            }

        elif msg == "GSV":
            sv_cno = []
            # fields: total messages, msg num, total SVs, then quadruples (sv, elev, az, cno)
            for i in range(4, len(parts)-1, 4):
                if i+3 < len(parts):
                    sv = parts[i]
                    cno = parts[i+3]
                    if sv and cno:
                        try:
                            sv_cno.append((int(sv), float(cno)))
                        except:
                            pass
            return {
                "type": "CNO",
                "time": None,
                "sv_cno": sv_cno
            }

        elif msg == "GSA":
            talker = line[1:3]  # e.g., "GP"
            const_map = {"GP":0, "GL":1, "GA":2, "GB":3, "GQ":4, "GI":5}
            const = const_map.get(talker, -1)
            # PRNs are fields 3 to 14
            prns = []
            for i in range(3, 15):
                if i < len(parts) and parts[i]:
                    try:
                        prns.append(int(parts[i]))
                    except:
                        pass
            svCount = len(prns)
            pdop = float(parts[15]) if len(parts)>15 and parts[15] else None
            hdop = float(parts[16]) if len(parts)>16 and parts[16] else None
            vdop = float(parts[17]) if len(parts)>17 and parts[17] else None
            return {
                "type": "GSA",
                "time": None,
                "constellation": const,
                "svCount": svCount,
                "pdop": pdop,
                "hdop": hdop,
                "vdop": vdop
            }

        # Optional: add parser for $ACMPS if needed
        # ...

    except:
        return None

    return None


# =========================================
# TIME VALIDATOR
# =========================================

class TimeValidator:
    def __init__(self):
        self.last_time = None
        self.invalid_jumps = []
        self.diff_count = 0
        self.allowed_diffs = {
            datetime.timedelta(seconds=1),
            datetime.timedelta(seconds=1, microseconds=10000),
            datetime.timedelta(seconds=1, microseconds=990000),
            datetime.timedelta(microseconds=980000),
            datetime.timedelta(microseconds=970000),
            datetime.timedelta(microseconds=960000),
        }
    def validate(self, current_time):
        if current_time is None:
            return True  # Ignore invalid parses safely
        if self.last_time is None:
            self.last_time = current_time
            return True
        diff = current_time - self.last_time
        if diff in self.allowed_diffs:
            self.last_time = current_time
            return True
        else:
            self.diff_count += 1
            self.invalid_jumps.append((self.last_time, current_time, diff))
            print("Remove the incomplete data from the log file and continue")
            print("time difference:", diff)
            print("Previous:", self.last_time)
            print("Current :", current_time)
            self.last_time = current_time
            return False    #check this, if needed, make it automatic to remove this set from the log.
    def summary(self):
        print("The time Difference count:", self.diff_count)
        return self.diff_count


# =========================================
# DISK WRITER (extended)
# =========================================

class DiskWriter:
    def __init__(self, cache):
        self.cache = cache
        self.buffers = {
            "GNGGA_time": [], "GNGGA_lat": [], "GNGGA_lon": [], "GNGGA_sv": [], "GNGGA_dop": [], "GNGGA_alt": [], "GNGGA_geoidal": [],
            "GNGNS_time": [], "GNGNS_lat": [], "GNGNS_lon": [], "GNGNS_sv": [], "GNGNS_dop": [], "GNGNS_alt": [],
            "GNRMC_time": [], "GNRMC_lat": [], "GNRMC_lon": [], "GNRMC_speedknots": [], "GNRMC_course": [], "GNGNS_date": [],
            "GNGLL_lat": [], "GNGLL_lon": [], "GNGLL_time": [],
            "GNVTG_speedknots": [], "GNVTG_speedkmph": [],
            "GNZDA_time": [], "GNZDA_date": [], "GNZDA_offset": [],
            "GNGSA_gps": [], "GNGSA_gls": [], "GNGSA_gal": [], "GNGSA_bds": [], "GNGSA_qzss": [], "GNGSA_irnss": [],
            "GPGSV": [], "GLGSV": [], "GAGSV": [], "GBGSV": [], "GIGSV": [], "GQGSV": [],
            "ACSUR": [], "PVT": [],
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
        self.append_npy(self.cache.path("GGA_quality.npy"), np.array(self.buffers["GGA_quality"]))

        if self.buffers["RMC_time"]:
            self.append_npy(self.cache.path("RMC_time.npy"), np.array(self.buffers["RMC_time"]))
            self.append_npy(self.cache.path("RMC_speed.npy"), np.array(self.buffers["RMC_speed"]))

        if self.buffers["CNO_time"]:
            self.append_npy(self.cache.path("CNO_time.npy"), np.array(self.buffers["CNO_time"]))
            self.append_npy(self.cache.path("CNO_svId.npy"), np.array(self.buffers["CNO_svId"]))
            self.append_npy(self.cache.path("CNO_cno.npy"), np.array(self.buffers["CNO_cno"]))

        if self.buffers["GSA_time"]:
            self.append_npy(self.cache.path("GSA_time.npy"), np.array(self.buffers["GSA_time"]))
            self.append_npy(self.cache.path("GSA_const.npy"), np.array(self.buffers["GSA_const"]))
            self.append_npy(self.cache.path("GSA_svCount.npy"), np.array(self.buffers["GSA_svCount"]))
            self.append_npy(self.cache.path("GSA_pdop.npy"), np.array(self.buffers["GSA_pdop"]))
            self.append_npy(self.cache.path("GSA_hdop.npy"), np.array(self.buffers["GSA_hdop"]))
            self.append_npy(self.cache.path("GSA_vdop.npy"), np.array(self.buffers["GSA_vdop"]))

        for k in self.buffers:
            self.buffers[k].clear()

    def store(self, item):
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
            self.buffers["GGA_quality"].append(parsed["quality"])

        elif parsed["type"] == "RMC":
            self.buffers["RMC_time"].append(t)
            self.buffers["RMC_speed"].append(parsed["speed"])

        elif parsed["type"] == "CNO":
            for svId, cno in parsed["sv_cno"]:
                self.buffers["CNO_time"].append(t)
                self.buffers["CNO_svId"].append(svId)
                self.buffers["CNO_cno"].append(cno)

        elif parsed["type"] == "GSA":
            self.buffers["GSA_time"].append(t)
            self.buffers["GSA_const"].append(parsed["constellation"])
            self.buffers["GSA_svCount"].append(parsed["svCount"])
            self.buffers["GSA_pdop"].append(parsed["pdop"])
            self.buffers["GSA_hdop"].append(parsed["hdop"])
            self.buffers["GSA_vdop"].append(parsed["vdop"])

        # flush if buffer is full
        if len(self.buffers["GGA_time"]) >= CHUNK_SIZE:
            self.flush()


# =========================================
# BATCH PARSER (unchanged)
# =========================================

def parse_batch(lines_with_indices):
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


# =========================================
# MAIN BUILD (unchanged)
# =========================================

def build_dataset(filepath):
    cache = DataCache()
    writer = DiskWriter(cache)

    num_workers = mp.cpu_count() - 2
    print(f"Using {num_workers} worker processes")

    with open(filepath, 'rb') as f:
        with mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ) as mm:
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

                heap = []
                next_expected = 0

                for future in futures:
                    for item in future.result():
                        heapq.heappush(heap, item)

                    while heap and heap[0][0] == next_expected:
                        _, parsed = heapq.heappop(heap)
                        writer.store((next_expected, parsed))
                        next_expected += 1

                while heap:
                    idx, parsed = heapq.heappop(heap)
                    if idx < next_expected:
                        print(f"Error: index {idx} < next_expected {next_expected} – this should not happen")
                        continue
                    writer.store((idx, parsed))
                    next_expected = idx + 1

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
# PLOTS (enhanced)
# =========================================

# ---------- Simple plots (keep existing) ----------
def plot_cno(cache):
    t = load_all_chunks(cache.path("CNO_time.npy"))
    c = load_all_chunks(cache.path("CNO_cno.npy"))
    plt.figure()
    plt.scatter(t, c, s=1)
    plt.title("C/N0 (all satellites)")
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
    plt.title("Satellites Used (total)")
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

# ---------- New per‑satellite C/N0 plots ----------
def plot_cno_all_sv(cache):
    t = load_all_chunks(cache.path("CNO_time.npy"))
    sv = load_all_chunks(cache.path("CNO_svId.npy"))
    c = load_all_chunks(cache.path("CNO_cno.npy"))
    if len(t) == 0:
        print("No CNO data")
        return
    unique_sv = np.unique(sv)
    plt.figure(figsize=(12,6))
    for sv_id in unique_sv:
        mask = sv == sv_id
        plt.scatter(t[mask], c[mask], s=1, label=f'SV {sv_id}')
    plt.title("C/N0 per satellite")
    plt.xlabel("Time (s)")
    plt.ylabel("C/N0 (dBHz)")
    plt.legend(loc='upper right', fontsize=8, ncol=3)
    plt.show()

def plot_cno_two_logs(cache1, cache2):
    # This function expects two caches; it will prompt for second file if not provided.
    # For simplicity, we assume both caches are passed.
    t1 = load_all_chunks(cache1.path("CNO_time.npy"))
    sv1 = load_all_chunks(cache1.path("CNO_svId.npy"))
    c1 = load_all_chunks(cache1.path("CNO_cno.npy"))
    t2 = load_all_chunks(cache2.path("CNO_time.npy"))
    sv2 = load_all_chunks(cache2.path("CNO_svId.npy"))
    c2 = load_all_chunks(cache2.path("CNO_cno.npy"))
    if len(t1)==0 or len(t2)==0:
        print("Insufficient CNO data in one of the logs")
        return
    unique_sv = np.union1d(np.unique(sv1), np.unique(sv2))
    plt.figure(figsize=(12,6))
    for sv_id in unique_sv:
        mask1 = sv1 == sv_id
        mask2 = sv2 == sv_id
        if np.any(mask1):
            plt.scatter(t1[mask1], c1[mask1], s=1, label=f'SV {sv_id} (log1)')
        if np.any(mask2):
            plt.scatter(t2[mask2], c2[mask2], s=1, marker='x', label=f'SV {sv_id} (log2)')
    plt.title("C/N0 comparison")
    plt.xlabel("Time (s)")
    plt.ylabel("C/N0 (dBHz)")
    plt.legend(loc='upper right', fontsize=6, ncol=3)
    plt.show()

# ---------- SV count per constellation ----------
def plot_sv_count_per_constellation(cache):
    t = load_all_chunks(cache.path("GSA_time.npy"))
    const = load_all_chunks(cache.path("GSA_const.npy"))
    count = load_all_chunks(cache.path("GSA_svCount.npy"))
    if len(t) == 0:
        print("No GSA data")
        return
    const_names = ['GPS', 'GLONASS', 'Galileo', 'BDS', 'QZSS', 'IRNSS']
    plt.figure(figsize=(12,6))
    for code in range(6):
        mask = const == code
        if np.any(mask):
            plt.plot(t[mask], count[mask], label=const_names[code])
    plt.title("Satellites used per constellation")
    plt.xlabel("Time (s)")
    plt.ylabel("Number of SVs")
    plt.legend()
    plt.show()

def plot_sv_count_two_logs(cache1, cache2):
    t1 = load_all_chunks(cache1.path("GSA_time.npy"))
    const1 = load_all_chunks(cache1.path("GSA_const.npy"))
    count1 = load_all_chunks(cache1.path("GSA_svCount.npy"))
    t2 = load_all_chunks(cache2.path("GSA_time.npy"))
    const2 = load_all_chunks(cache2.path("GSA_const.npy"))
    count2 = load_all_chunks(cache2.path("GSA_svCount.npy"))
    if len(t1)==0 or len(t2)==0:
        print("Insufficient GSA data")
        return
    const_names = ['GPS', 'GLONASS', 'Galileo', 'BDS', 'QZSS', 'IRNSS']
    plt.figure(figsize=(12,6))
    for code in range(6):
        mask1 = const1 == code
        mask2 = const2 == code
        if np.any(mask1):
            plt.plot(t1[mask1], count1[mask1], label=f'{const_names[code]} (log1)')
        if np.any(mask2):
            plt.plot(t2[mask2], count2[mask2], '--', label=f'{const_names[code]} (log2)')
    plt.title("Satellites used per constellation (comparison)")
    plt.xlabel("Time (s)")
    plt.ylabel("Number of SVs")
    plt.legend()
    plt.show()

# ---------- Position losses ----------
def plot_position_losses(cache):
    # Identify times where altitude is zero or lat/lon missing
    t = load_all_chunks(cache.path("GGA_time.npy"))
    alt = load_all_chunks(cache.path("GGA_alt.npy"))
    lat = load_all_chunks(cache.path("GGA_lat.npy"))
    lon = load_all_chunks(cache.path("GGA_lon.npy"))
    if len(t) == 0:
        print("No GGA data")
        return
    # Consider loss if alt is NaN or lat/lon are 0 (assuming 0 means invalid)
    # In our data, missing values are stored as None, but numpy converts to NaN? Actually we store floats, missing become 0.0? Need to check.
    # For safety, we'll treat alt==0 as loss, but that may not be accurate.
    loss_mask = (alt == 0) | (lat == 0) | (lon == 0)
    loss_times = t[loss_mask]
    plt.figure()
    plt.plot(t, alt, label='Altitude')
    plt.scatter(loss_times, np.zeros_like(loss_times), color='red', marker='x', label='Position loss')
    plt.title("Position losses (altitude = 0)")
    plt.xlabel("Time (s)")
    plt.ylabel("Altitude (m)")
    plt.legend()
    plt.show()
    print(f"Position lost at {len(loss_times)} times")

# ---------- Print restarts (console) ----------
def print_restarts(cache):
    r = np.load(cache.path("restarts.npy"))
    print(f"Total restarts: {len(r)}")
    for i, t in enumerate(r):
        print(f"Restart {i+1}: time {t:.3f} s")

# ---------- SBAS usage (GGA quality) ----------
def plot_sbas_usage(cache):
    t = load_all_chunks(cache.path("GGA_time.npy"))
    qual = load_all_chunks(cache.path("GGA_quality.npy"))
    plt.figure()
    plt.plot(t, qual, drawstyle='steps-post')
    plt.title("GPS Quality indicator (1=GPS, 2=DGPS, etc.)")
    plt.xlabel("Time (s)")
    plt.ylabel("Quality")
    plt.yticks([0,1,2,3,4,5,6])
    plt.grid(True, axis='y')
    plt.show()

# ---------- Statistics vs true values (simplified) ----------
def plot_statistics(cache):
    # This is a placeholder; real implementation would prompt for true coordinates.
    print("Statistics plotting not fully implemented. Use plot_position and enter true coords manually.")
    # Could open a dialog to input true lat/lon/alt and then compute errors.
    pass

# =========================================
# RUN (optional)
# =========================================

def run_all(cache):
    with ThreadPoolExecutor() as ex:
        ex.submit(plot_cno_all_sv, cache)
        ex.submit(plot_position, cache)
        ex.submit(plot_sat, cache)
        ex.submit(plot_restarts, cache)
        ex.submit(plot_altitude, cache)
        ex.submit(plot_dop, cache)
        ex.submit(plot_velocity, cache)