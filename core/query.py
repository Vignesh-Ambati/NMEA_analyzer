"""
core/query.py
─────────────
Fast time-range query engine for cached NMEA data.

  query_file — given a DataCache, a message-type name, and an inclusive
               [start, end] time range (in seconds), returns the list of
               JSON records whose timestamp falls within that range.

Implementation note
───────────────────
The function loads the pre-built NumPy time index for the requested message
type, resolves the matching line indices in O(n) time via np.where, then
performs a single sequential pass through the JSONL file collecting only the
needed records.  The index set lookup itself is O(1) per line.
"""

import json
import numpy as np


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