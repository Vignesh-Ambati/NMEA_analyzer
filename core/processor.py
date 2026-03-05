"""
core/processor.py
─────────────────
Core NMEA processing engine.

  process_nmea_file — reads a raw NMEA log, splits each sentence type into
                      its own JSONL file inside a DataCache temp directory,
                      and returns the populated DataCache.

Message routing
───────────────
  Time-bearing  (GGA / RMC / GNS / ZDA) → written with their own timestamp.
  GSA / GSV     → further split by constellation via resolve_constellation().
  Everything else → grouped under the raw message-type name.

Orphan records (sentences received before the first valid time fix) are
discarded to keep the time index contiguous.
"""

import json
import os

from .cache import DataCache
from .parser import stream_nmea, parse_time_to_seconds, resolve_constellation


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