"""
scripts/extract_nmea_altitude.py
--------------------------------
Extracts altitude-bearing NMEA sentences and produces:
 - raw CSV of all GGA/GNS lines with NMEA date/time/alt
 - per-second CSV selecting one sample per second preferring GGA over GNS

Usage:
    python scripts/extract_nmea_altitude.py /path/to/file.nmea /path/to/output_dir

The script is defensive about missing date fields (takes last seen RMC date).
"""
import sys
import os
import csv
import re
from pathlib import Path
from typing import List, Dict, Optional
import datetime

import pandas as pd

NMEA_TYPES_OF_INTEREST = ("GGA", "GNS")

# Configure default input file and output directory here (edit if needed)
# The workspace contains a large file named 'Navika_900_accord_sim_test_drone_1' (no extension).
DEFAULT_NMEA_FILE = Path("Navika_900_accord_sim_test_drone_1")
DEFAULT_OUTPUT_DIR = Path("debug_exports")


def parse_nmea_file(path: Path) -> pd.DataFrame:
    rows = []
    last_date = None

    def try_alt_and_geoid(fields: List[str]):
        # Return (altitude, geoid_separation) where available.
        alt = None
        geoid = None
        # Common GGA fields: altitude at 9, unit at 10, geoid at 11
        try:
            if len(fields) > 9 and fields[9] != '':
                alt = float(fields[9].replace('M', '').strip())
        except Exception:
            alt = None
        try:
            if len(fields) > 11 and fields[11] != '':
                geoid = float(fields[11].replace('M', '').strip())
        except Exception:
            geoid = None

        # If not found, attempt a few fallback positions
        if alt is None:
            for idx in (8, 7, -4, -3):
                try:
                    v = fields[idx]
                    if v == "":
                        continue
                    alt = float(v.replace('M', '').strip())
                    break
                except Exception:
                    continue
        if geoid is None:
            # look at following tokens for a negative/float value
            for tok in reversed(fields[-6:]):
                try:
                    tc = tok.replace('M', '').strip()
                    if tc == '':
                        continue
                    # heuristic: geoid separation often has leading +/-
                    if re.match(r'^[+-]?\d+\.?\d*$', tc):
                        geoid = float(tc)
                        break
                except Exception:
                    continue

        return alt, geoid

    with open(path, 'r', errors='ignore') as fh:
        for raw in fh:
            line = raw.strip()
            if not line:
                continue
            # many logs include a leading timestamp before the NMEA sentence
            # find the first '$' in the line and parse from there
            dollar = line.find('$')
            if dollar >= 0:
                nline = line[dollar:]
            else:
                nline = line
            if not nline or not nline.startswith('$'):
                continue
            parts = nline.split(',')
            if len(parts) < 2:
                continue
            hdr = parts[0][1:]
            msg_type = hdr[-3:]
            if msg_type == 'RMC':
                # RMC date is usually field 9 (ddmmyy)
                try:
                    date_field = parts[9]
                    if date_field and re.match(r"^\d{6}$", date_field):
                        last_date = date_field
                except Exception:
                    pass
                continue
            if msg_type in NMEA_TYPES_OF_INTEREST:
                time_field = parts[1] if len(parts) > 1 else ''
                alt, geoid = try_alt_and_geoid(parts)
                rows.append({'NMEA_Date': last_date, 'NMEA_Time': time_field, 'Type': msg_type, 'Altitude_raw': alt, 'Geoid_sep': geoid, 'raw_line': nline})
    return pd.DataFrame(rows)


def hhmmss_key_from_time_str(tstr: str) -> Optional[int]:
    try:
        tnum = float(tstr)
        # hhmmss.ss -> integer hhmmss as key
        return int(tnum)
    except Exception:
        return None


def produce_persecond(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    df = df.copy()
    df['time_key'] = df['NMEA_Time'].apply(hhmmss_key_from_time_str)
    df = df.dropna(subset=['time_key'])
    df['time_key'] = df['time_key'].astype(int)

    def pick_group(g):
        ggga = g[g['Type'] == 'GGA']
        if not ggga.empty:
            return ggga.iloc[0]
        return g.iloc[0]

    picked = df.groupby('time_key').apply(pick_group)
    picked = picked.reset_index(drop=True)
    # compute Value similar to extractor (altitude - geoid_sep) when both present
    def compute_value(row):
        try:
            a = float(row.get('Altitude_raw')) if row.get('Altitude_raw') is not None else None
            g = float(row.get('Geoid_sep')) if row.get('Geoid_sep') is not None else None
            if a is None:
                return None
            if g is None:
                return a
            # ellipsoid_height = orthometric_height (MSL) + geoid_separation
            return a + g
        except Exception:
            return row.get('Altitude_raw')

    picked['Value_m'] = picked.apply(compute_value, axis=1)
    return picked[['NMEA_Date', 'NMEA_Time', 'Type', 'Altitude_raw', 'Geoid_sep', 'Value_m']]


def main():
    print("\n=== NMEA Altitude Extractor ===\n")

    in_path = DEFAULT_NMEA_FILE
    out_dir = DEFAULT_OUTPUT_DIR

    print(f"Using default input: {in_path}")
    print(f"Using default output directory: {out_dir}")

    if not in_path.exists():
        # Attempt to auto-detect a likely NMEA file in the workspace root
        def find_nmea_file(root: Path) -> Optional[Path]:
            candidates = []
            for p in root.iterdir():
                try:
                    if p.is_file():
                        # skip our own output dir
                        if p.name == out_dir.name: 
                            continue
                        # check first few KB for NMEA markers
                        with p.open('r', errors='ignore') as fh:
                            sample = fh.read(65536)
                        if '$' in sample:
                            # count likely NMEA sentence starts
                            count = sample.count('\n$') + sample.count('\r$') + sample.count('$GP')
                            candidates.append((count, p.stat().st_size, p))
                except Exception:
                    continue
            if not candidates:
                return None
            # prefer highest sentence count, then largest size
            candidates.sort(reverse=True)
            return candidates[0][2]

        detected = find_nmea_file(Path('.'))
        if detected is None:
            print(f"Error: File not found: {in_path}")
            return
        print(f"Auto-detected NMEA input: {detected}")
        in_path = detected

    out_dir.mkdir(parents=True, exist_ok=True)

    df_raw = parse_nmea_file(in_path)

    base = in_path.stem

    ts = datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')
    raw_csv = out_dir / f"{base}_nmea_raw_{ts}.csv"
    try:
        df_raw.to_csv(raw_csv, index=False, header=False)
        print(f"\nWrote raw NMEA rows to:")
        print(raw_csv)
    except PermissionError:
        raw_csv = out_dir / f"{base}_nmea_raw_{ts}_alt.csv"
        df_raw.to_csv(raw_csv, index=False)
        print(f"\nWrote raw NMEA rows to (alt):")
        print(raw_csv)

    df_persec = produce_persecond(df_raw)

    persec_csv = out_dir / f"{base}_nmea_persecond_{ts}.csv"
    try:
        df_persec.to_csv(persec_csv, index=False, header=False)
        print(f"\nWrote per-second selection to:")
        print(persec_csv)
    except PermissionError:
        persec_csv = out_dir / f"{base}_nmea_persecond_{ts}_alt.csv"
        df_persec.to_csv(persec_csv, index=False)
        print(f"\nWrote per-second selection to (alt):")
        print(persec_csv)

    print("\nProcessing complete.")


if __name__ == '__main__':
    main()
