"""
scripts/align_stage_with_nmea.py
--------------------------------
Aligns extractor stage CSV (epoch Time, Value) with NMEA per-second CSV
and writes a consolidated CSV suitable for file comparison tools.

Usage: run from project root. It auto-detects recent debug CSVs in debug_exports/.
"""
from pathlib import Path
import pandas as pd
import datetime
import glob
import re


def nmea_time_to_epoch(date_str, time_str):
    # date_str expected ddmmyy, time_str expected hhmmss(.ss)
    if pd.isna(time_str) or str(time_str).strip() == '':
        return None
    try:
        # parse time
        t = float(time_str)
        hh = int(t // 10000)
        mm = int((t % 10000) // 100)
        ss = int(t % 100)
        frac = int(round((t - int(t)) * 1e6))
    except Exception:
        return None
    if pd.isna(date_str) or str(date_str).strip() == '':
        # no date; caller should handle
        return None
    try:
        ds = str(int(date_str)).zfill(6)
        day = int(ds[0:2]); month = int(ds[2:4]); year = 2000 + int(ds[4:6])
        dt = datetime.datetime(year, month, day, hh, mm, ss, frac, tzinfo=datetime.timezone.utc)
        return dt.timestamp()
    except Exception:
        return None


def find_latest_stage_csv(debug_dir: Path):
    files = list(debug_dir.glob("*replicaFix_*.csv"))
    if not files:
        return None
    files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return files[0]


def find_nmea_persecond(debug_dir: Path):
    files = list(debug_dir.glob("*_nmea_persecond.csv"))
    if not files:
        return None
    files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return files[0]


def main():
    root = Path('.')
    debug_dir = root / 'debug_exports'
    stage_csv = find_latest_stage_csv(debug_dir)
    nmea_csv = find_nmea_persecond(debug_dir)

    if not stage_csv or not nmea_csv:
        print('Missing required CSVs in debug_exports/. Found:')
        print(' stage_csv=', stage_csv)
        print(' nmea_csv=', nmea_csv)
        return

    print('Using stage CSV:', stage_csv)
    print('Using NMEA per-second CSV:', nmea_csv)

    df_stage = pd.read_csv(stage_csv)
    df_nmea = pd.read_csv(nmea_csv)

    # Convert NMEA per-second rows to epoch using their date/time
    df_nmea['nmea_epoch'] = df_nmea.apply(lambda r: nmea_time_to_epoch(r.get('NMEA_Date'), r.get('NMEA_Time')), axis=1)

    # Fill missing epochs by forward/backfill on date gaps (simple heuristic)
    if df_nmea['nmea_epoch'].isna().any():
        df_nmea['NMEA_Date'] = df_nmea['NMEA_Date'].ffill()
        df_nmea['nmea_epoch'] = df_nmea.apply(lambda r: nmea_time_to_epoch(r.get('NMEA_Date'), r.get('NMEA_Time')), axis=1)

    df_nmea = df_nmea.dropna(subset=['nmea_epoch']).reset_index(drop=True)

    # Normalize stage times to seconds
    if 'Time' not in df_stage.columns:
        print('Stage CSV missing Time column')
        return

    df_stage['stage_epoch'] = df_stage['Time'].astype(float)

    # For each stage row, find nearest nmea row by absolute time difference
    nmea_epochs = df_nmea['nmea_epoch'].values

    aligned_rows = []
    import numpy as np
    for _, s in df_stage.iterrows():
        se = float(s['stage_epoch'])
        # compute nearest
        idx = int(np.abs(nmea_epochs - se).argmin())
        n = df_nmea.iloc[idx]
        delta_t = se - n['nmea_epoch']
        delta_alt = None
        # stage Value may be in meters; attempt to compare with NMEA Altitude_raw
        if 'Value' in s.index and 'Altitude_raw' in n.index:
            try:
                delta_alt = float(s['Value']) - float(n['Altitude_raw'])
            except Exception:
                delta_alt = None
        aligned_rows.append({
            'stage_epoch': se,
            'stage_value': s.get('Value'),
            'nmea_epoch': n['nmea_epoch'],
            'nmea_date': n.get('NMEA_Date'),
            'nmea_time': n.get('NMEA_Time'),
            'nmea_altitude_raw': n.get('Altitude_raw'),
            'delta_seconds': delta_t,
            'delta_altitude': delta_alt
        })

    out = pd.DataFrame(aligned_rows)
    out_path = debug_dir / f"alignment_stage_nmea_{stage_csv.stem}.csv"
    out.to_csv(out_path, index=False)
    print('Wrote alignment CSV to:', out_path)


if __name__ == '__main__':
    main()
