"""
Plot data extraction backend - handles multi-threaded GSV file processing
with binary search for fast timestamp-based lookups.
"""

import os
import json
import bisect
import numpy as np
from dataclasses import dataclass, field
from threading import Thread
from queue import Queue
from typing import Optional

@dataclass
class GSVDataset:
    """
    Holds sorted, extracted GSV data ready for plotting or querying.
    Attributes:
        time_data: Sorted numpy array of timestamps (float32).
        cno_data:  C/N0 values (dB-Hz, float32) aligned to time_data.
    """
    time_data: np.ndarray = field(default_factory=lambda: np.array([], dtype=np.float32))
    cno_data:  np.ndarray = field(default_factory=lambda: np.array([], dtype=np.float32))

    def search_time(self, timestamp: float) -> int:
        """
        Return the index of the closest sample to *timestamp*.

        Uses ``bisect_left`` on the sorted time array so the lookup is
        O(log n) regardless of dataset size.
        """
        if self.time_data.size == 0:
            raise ValueError("Dataset is empty.")

        pos = bisect.bisect_left(self.time_data, timestamp)

        # Clamp to valid range
        if pos == 0:
            return 0
        if pos >= len(self.time_data):
            return len(self.time_data) - 1

        # Pick whichever neighbour is closer
        before = pos - 1
        if (timestamp - self.time_data[before]) <= (self.time_data[pos] - timestamp):
            return before
        return pos

    def query_range(
        self,
        t_start: float,
        t_end: float,
    ) -> "GSVDataset":
        """
        Return a **view** (no copy) of data whose timestamps fall inside
        [t_start, t_end].  Both bounds are located with binary search so
        the slice operation is O(log n + k) where k is the result size.
        """
        lo = bisect.bisect_left(self.time_data, t_start)
        hi = bisect.bisect_right(self.time_data, t_end)
        return GSVDataset(
            time_data=self.time_data[lo:hi],
            cno_data=self.cno_data[lo:hi],
        )

    def query_nearest(self, timestamp: float) -> tuple[float, float]:
        """Return the (time, cno) pair nearest to *timestamp*."""
        idx = self.search_time(timestamp)
        return float(self.time_data[idx]), float(self.cno_data[idx])

    def __len__(self) -> int:
        return len(self.time_data)

    def __bool__(self) -> bool:
        return self.time_data.size > 0

def _parse_gsv_file(file_path: str, file_index: int, result_queue: Queue) -> None:
    local_times: list[float] = []
    local_cnos:  list[float] = []

    try:
        with open(file_path, "r") as fh:
            for raw_line in fh:
                raw_line = raw_line.strip()
                if not raw_line:
                    continue
                try:
                    record = json.loads(raw_line)
                except json.JSONDecodeError:
                    continue

                time_val  = record.get("t")
                data_parts = record.get("data", [])

                if not data_parts or len(data_parts) < 5:
                    continue

                idx = 4
                while idx + 3 < len(data_parts):
                    sv_id_str = data_parts[idx]
                    cno_str   = data_parts[idx + 3]
                    idx += 4

                    try:
                        sv_id = int(sv_id_str)   if sv_id_str else 0
                        cno   = float(cno_str)   if cno_str   else 0.0
                    except (ValueError, TypeError):
                        continue

                    if sv_id > 0:
                        local_times.append(time_val)
                        local_cnos.append(cno)

    except OSError as exc:
        print(f"[GSVExtractor] Error reading {file_path}: {exc}")

    result_queue.put((file_index, local_times, local_cnos))

class GSVExtractor:
    """
    Discovers, parses, and aggregates ``_GSV.jsonl`` files from a directory.

    Processing is parallelised: one :class:`~threading.Thread` per file.
    Results are stored in a :class:`GSVDataset` that supports O(log n)
    timestamp queries via binary search.

    Example usage::

        extractor = GSVExtractor("/path/to/data")
        dataset   = extractor.extract()

        if dataset:
            t, cno = dataset.query_nearest(1_700_000_000.0)
            subset  = dataset.query_range(t_start, t_end)
    """
    FILE_SUFFIX = "_GSV.jsonl"
    def __init__(self, temp_dir: str) -> None:
        self.temp_dir = temp_dir
        self._dataset: Optional[GSVDataset] = None

    def extract(self) -> Optional[GSVDataset]:
        """
        Scan *temp_dir*, parse all matching files in parallel, and return
        a sorted :class:`GSVDataset`.

        Returns ``None`` when the directory is missing or holds no GSV files.
        """
        file_paths = self._discover_files()
        if not file_paths:
            return None

        raw_times, raw_cnos = self._parallel_parse(file_paths)

        if not raw_times:
            print("[GSVExtractor] No valid data extracted from GSV files.")
            return None

        self._dataset = self._build_dataset(raw_times, raw_cnos)
        print(
            f"[GSVExtractor] Extracted {len(self._dataset)} data points "
            f"from {len(file_paths)} file(s)."
        )
        return self._dataset

    @property
    def dataset(self) -> Optional[GSVDataset]:
        """Return the most recently extracted :class:`GSVDataset`, or ``None``."""
        return self._dataset

    def _discover_files(self) -> list[str]:
        """Return absolute paths of all ``_GSV.jsonl`` files in *temp_dir*."""
        if not os.path.isdir(self.temp_dir):
            print(f"[GSVExtractor] Directory not found: {self.temp_dir}")
            return []

        files = [
            os.path.join(self.temp_dir, f)
            for f in os.listdir(self.temp_dir)
            if f.endswith(self.FILE_SUFFIX)
        ]

        if files:
            names = [os.path.basename(p) for p in files]
            print(f"[GSVExtractor] Found {len(files)} GSV file(s): {names}")
        else:
            print(f"[GSVExtractor] No '*{self.FILE_SUFFIX}' files in {self.temp_dir}")

        return files

    def _parallel_parse(
        self,
        file_paths: list[str],
    ) -> tuple[list[float], list[float]]:
        """
        Spin up one daemon thread per file, collect results via a Queue,
        and merge into flat lists.
        """
        result_queue: Queue = Queue()
        threads = [
            Thread(
                target=_parse_gsv_file,
                args=(path, idx, result_queue),
                daemon=True,
            )
            for idx, path in enumerate(file_paths)
        ]

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        all_times: list[float] = []
        all_cnos:  list[float] = []

        while not result_queue.empty():
            _, times, cnos = result_queue.get()
            all_times.extend(times)
            all_cnos.extend(cnos)

        return all_times, all_cnos

    @staticmethod
    def _build_dataset(
        raw_times: list[float],
        raw_cnos:  list[float],
    ) -> GSVDataset:
        """Convert raw lists into a sorted, numpy-backed :class:`GSVDataset`."""
        time_arr = np.array(raw_times, dtype=np.float32)
        cno_arr  = np.array(raw_cnos,  dtype=np.float32)

        sort_idx = np.argsort(time_arr, kind="stable")
        return GSVDataset(
            time_data=time_arr[sort_idx],
            cno_data=cno_arr[sort_idx],
        )