from __future__ import annotations
from typing import NamedTuple, Optional

class CNoPoint(NamedTuple):
    """One (sv, epoch) C/N0 sample — feeds CByN0 plot."""
    t:             int
    constellation: str    # e.g. "GPS", "GLONASS"
    sv_id:         int
    cno:           float  # dB-Hz

class AltPoint(NamedTuple):
    """Altitude from GGA/GNS — feeds altitude plots."""
    t:     int
    alt_m: float

class DOPPoint(NamedTuple):
    """Best-of-epoch DOP values from GSA — feeds DOP plot."""
    t:    int
    pdop: Optional[float]
    hdop: Optional[float]
    vdop: Optional[float]

class SVCountPoint(NamedTuple):
    """Satellites used for fix from GGA — feeds SV-count plot."""
    t:        int
    sv_count: int

class FixPoint(NamedTuple):
    """Fix quality indicator (0=none,1=GPS,2=DGPS,4=RTK,5=Float…)."""
    t:           int
    fix_quality: int

class VelocityPoint(NamedTuple):
    """Speed and course — feeds velocity plot.  Speed always in km/h."""
    t:          int
    speed_kmh:  float
    course_deg: float

class SBASPoint(NamedTuple):
    """SBAS SVs visible/tracked this epoch (PRN 120-158)."""
    t:        int
    sbas_svs: tuple   # ((sv_id, cno), …)


class FixEventPoint(NamedTuple):
    """Single timestamp marking a fix transition event."""
    t:         int
    event:     str    # "LOSS" | "REACQUIRE"


class GSASVPoint(NamedTuple):
    """SVs used-for-fix from GSA sentence(s) in one epoch."""
    t:      int
    sv_ids: tuple   # tuple of int SV IDs across all constellations

class GSVCNoPoint(NamedTuple):
    """Per-SV C/N0 sample from GSV (same as CNoPoint but written to file)."""
    t:             int
    constellation: str
    sv_id:         int
    cno:           float

class MIPSPoint(NamedTuple):
    """
    MIPS-proxy: ratio of SVs used-for-fix to SVs in-view per epoch.
    A sustained ratio < 0.5 suggests the receiver is struggling.
    t            : epoch timestamp
    svs_used     : count from GGA num_svs field
    svs_in_view  : total unique SVs seen across all GSV sentences
    ratio        : svs_used / svs_in_view  (NaN-safe: 0.0 if in_view == 0)
    """
    t:          int
    svs_used:   int
    svs_in_view: int
    ratio:      float

class _GSVEpoch:
    """
    Accumulates all GSV sentences for one constellation within one epoch.
    Multi-sentence groups (sentence 1/3, 2/3, 3/3) are merged here.
    """
    __slots__ = ("total_sentences", "received", "sv_map")
    total_sentences: int
    received:        set    # sentence numbers seen
    sv_map:          dict   # sv_id (int) → cno (float)

    def __init__(self, total_sentences: int = 0):
        self.total_sentences = total_sentences
        self.received        = set()
        self.sv_map          = {}

    def is_complete(self) -> bool:
        return (self.total_sentences > 0
                and len(self.received) >= self.total_sentences)


class _GSARecord:
    """Parsed fields from one GSA sentence."""
    __slots__ = ("fix_mode", "sv_used", "pdop", "hdop", "vdop")

    def __init__(self, fix_mode: int, sv_used: list,
                 pdop: Optional[float], hdop: Optional[float], vdop: Optional[float]):
        self.fix_mode: int             = fix_mode   # 1=no fix  2=2-D  3=3-D
        self.sv_used:  list            = sv_used
        self.pdop:     Optional[float] = pdop
        self.hdop:     Optional[float] = hdop
        self.vdop:     Optional[float] = vdop


class _GGARecord:
    """Parsed fields from the most recent GGA/GNS sentence."""
    __slots__ = ("fix_quality", "num_svs", "hdop", "alt_m")

    def __init__(self, fix_quality: int, num_svs: int,
                 hdop: Optional[float], alt_m: Optional[float]):
        self.fix_quality: int             = fix_quality
        self.num_svs:     int             = num_svs
        self.hdop:        Optional[float] = hdop
        self.alt_m:       Optional[float] = alt_m


class _RMCRecord:
    """Parsed fields from the most recent RMC sentence."""
    __slots__ = ("status", "speed_knots", "course_deg")

    def __init__(self, status: str, speed_knots: float, course_deg: float):
        self.status:       str   = status   # 'A' = active/valid, 'V' = void
        self.speed_knots:  float = speed_knots
        self.course_deg:   float = course_deg


class _VTGRecord:
    """Parsed fields from the most recent VTG sentence."""
    __slots__ = ("speed_kmh", "course_true")

    def __init__(self, speed_kmh: float, course_true: float):
        self.speed_kmh:   float = speed_kmh
        self.course_true: float = course_true


# ══════════════════════════════════════════════════════════════════════════════
#  RESULTS CONTAINER
# ══════════════════════════════════════════════════════════════════════════════

class Stage2Results:
    """
    All analytics series produced by one Stage 2 pass.

    Every attribute is a plain Python list — hand it directly to matplotlib,
    numpy (via np.array(results.altitude_series)), or a Tkinter plot widget.

    Attribute map → TASK coverage
    ──────────────────────────────────────────────────────────────────
    cno_series            → "Plot CByN0 from a log"
    altitude_series       → "Plot altitude for a log / for 2 logs"
    dop_series            → "Plot DOP for a log"
    sv_count_series       → "Plot SV count for fix"
    fix_series            → "Check for position losses" (raw timeline)
    velocity_series       → "Velocity Plot"
    fix_events            → "Check for position losses" + "Number of times reset"
    mips_series           → "Analyze MIPS"
    sbas_series           → "SBAS use in the log"
    ──────────────────────────────────────────────────────────────────
    """
    __slots__ = (
        "cno_series",
        "altitude_series",
        "dop_series",
        "sv_count_series",
        "fix_series",
        "velocity_series",
        "fix_events",
        "mips_series",
        "sbas_series",
        "gsa_sv_series",
        "gsv_cno_series",
    )

    def __init__(self):
        self.cno_series:       list[CNoPoint]       = []
        self.altitude_series:  list[AltPoint]        = []
        self.dop_series:       list[DOPPoint]        = []
        self.sv_count_series:  list[SVCountPoint]    = []
        self.fix_series:       list[FixPoint]        = []
        self.velocity_series:  list[VelocityPoint]   = []
        self.fix_events:       list[FixEventPoint]   = []  # LOSS / REACQUIRE
        self.mips_series:      list[MIPSPoint]       = []
        self.sbas_series:      list[SBASPoint]       = []
        self.gsa_sv_series:    list[GSASVPoint]      = []  # GSA: used SV IDs per epoch
        self.gsv_cno_series:   list[GSVCNoPoint]     = []  # GSV: per-SV C/N0 per epoch

    # ── Convenience helpers for plotters ──────────────────────────────────────

    def position_losses(self) -> list[int]:
        """Timestamps where fix dropped to 0 (→ 'Check for position losses')."""
        return [e.t for e in self.fix_events if e.event == "LOSS"]

    def reset_count(self) -> int:
        """Number of fix reacquisitions (→ 'Number of times reset')."""
        return sum(1 for e in self.fix_events if e.event == "REACQUIRE")

    def sbas_active_epochs(self) -> list[int]:
        """Timestamps where at least one SBAS SV was tracked (→ 'SBAS use')."""
        return [p.t for p in self.sbas_series]

    def summary(self) -> str:
        return (
            f"Stage2Results("
            f"cno={len(self.cno_series)}, "
            f"alt={len(self.altitude_series)}, "
            f"dop={len(self.dop_series)}, "
            f"sv_count={len(self.sv_count_series)}, "
            f"fix={len(self.fix_series)}, "
            f"velocity={len(self.velocity_series)}, "
            f"fix_events={len(self.fix_events)}, "
            f"mips={len(self.mips_series)}, "
            f"sbas={len(self.sbas_series)}, "
            f"gsa_sv={len(self.gsa_sv_series)}, "
            f"gsv_cno={len(self.gsv_cno_series)})"
        )

    # ── File output ───────────────────────────────────────────────────────────

    def write_to_cache(self, cache) -> None:
        """
        Write all derived analytics series to JSONL files in *cache*.

        Files produced
        ──────────────
        altitude.jsonl          → {"t": int, "alt_m": float}
        dop.jsonl               → {"t": int, "hdop": float}
        sv_used_count.jsonl     → {"t": int, "count": int}
                                   SV count used for fix, from GGA/GNS parts[7].
                                   Empty field → 0.
        velocity.jsonl          → {"t": int, "speed_kmh": float}
        <CONSTELLATION>_gsv_cno.jsonl  (one file per constellation seen in log)
                                → {"t": int, "sv_id": int, "cno": float}
                                   e.g. GPS_gsv_cno.jsonl, GLONASS_gsv_cno.jsonl
                                   Empty cno field → 0.0.

        Rule: every field defaults to 0 / 0.0 when the source NMEA field is
        empty, as long as a valid timestamp is present for that epoch.
        """
        _BUF = 8 * 1024 * 1024  # 8 MB write buffer

        def _open(name: str):
            return open(cache.path(name), "w", buffering=_BUF)

        # altitude  (from GGA / GNS parts[9])
        with _open("altitude.jsonl") as f:
            f.write("\n".join(
                f'{{"t":{p.t},"alt_m":{p.alt_m if p.alt_m is not None else 0}}}'
                for p in self.altitude_series
            ))
            if self.altitude_series:
                f.write("\n")

        # dop  (hdop — best-of-epoch from GSA, or from GGA parts[8])
        with _open("dop.jsonl") as f:
            f.write("\n".join(
                f'{{"t":{p.t},"hdop":{p.hdop if p.hdop is not None else 0}}}'
                for p in self.dop_series
            ))
            if self.dop_series:
                f.write("\n")

        # sv_used_count  (number of SVs used for fix, from GGA/GNS parts[7])
        # Empty parts[7] is already defaulted to 0 in _process_gga/_process_gns.
        with _open("sv_used_count.jsonl") as f:
            f.write("\n".join(
                f'{{"t":{p.t},"count":{p.sv_count}}}'
                for p in self.sv_count_series
            ))
            if self.sv_count_series:
                f.write("\n")

        # velocity  (VTG preferred, RMC fallback — always in km/h)
        with _open("velocity.jsonl") as f:
            f.write("\n".join(
                f'{{"t":{p.t},"speed_kmh":{p.speed_kmh if p.speed_kmh is not None else 0}}}'
                for p in self.velocity_series
            ))
            if self.velocity_series:
                f.write("\n")

        # gsv_cno — one file per constellation: <CONSTELLATION>_gsv_cno.jsonl
        # e.g. GPS_gsv_cno.jsonl, GLONASS_gsv_cno.jsonl, BEIDOU_gsv_cno.jsonl
        # Schema: {"t": int, "sv_id": int, "cno": float}  (empty cno -> 0.0)
        # Group points by constellation first, then write each file in one pass.
        from collections import defaultdict as _dd
        by_constellation: dict[str, list] = _dd(list)
        for p in self.gsv_cno_series:
            by_constellation[p.constellation].append(p)

        for constellation, points in by_constellation.items():
            with _open(f"{constellation}_gsv_cno.jsonl") as f:
                f.write("\n".join(
                    f'{{"t":{p.t},"sv_id":{p.sv_id},"cno":{p.cno}}}'
                    for p in points
                ))
                if points:
                    f.write("\n")


# ══════════════════════════════════════════════════════════════════════════════
#  CONSTANTS
# ══════════════════════════════════════════════════════════════════════════════

_SBAS_PRN_MIN = 120   # GPS-family SBAS (WAAS/EGNOS/MSAS/GAGAN/SDCM)
_SBAS_PRN_MAX = 158

_KNOTS_TO_KMH = 1.852


# ══════════════════════════════════════════════════════════════════════════════
#  HELPERS  (module-level functions avoid per-call attribute lookup overhead)
# ══════════════════════════════════════════════════════════════════════════════

def _f(s: str, default: Optional[float] = None) -> Optional[float]:
    """Safe float parse; strips NMEA checksum suffix (*XX) if present."""
    if not s:
        return default
    if "*" in s:
        s = s[:s.index("*")]
    try:
        return float(s)
    except ValueError:
        return default


def _i(s: str, default: Optional[int] = None) -> Optional[int]:
    """Safe int parse; strips NMEA checksum suffix if present."""
    if not s:
        return default
    if "*" in s:
        s = s[:s.index("*")]
    try:
        return int(s)
    except ValueError:
        return default


# ══════════════════════════════════════════════════════════════════════════════
#  STAGE 2 PROCESSOR
# ══════════════════════════════════════════════════════════════════════════════

class Stage2Processor:
    """
    Single-pass, epoch-based, in-memory NMEA analytics processor.

    ┌─────────────────────────────────────────────────────────────────┐
    │  HOW TO INTEGRATE (zero changes to existing Stage 1 logic)     │
    │                                                                 │
    │  # processor.py  — __init__                                     │
    │  self.stage2: Optional[Stage2Processor] = None                  │
    │                                                                 │
    │  # processor.py  — process_line, GGA/RMC/GNS/ZDA branch        │
    │  if self.stage2 and t is not None:                              │
    │      self.stage2.on_message(name, t, parts)                     │
    │                                                                 │
    │  # processor.py  — process_line, GSA/GSV/other branch           │
    │  if self.stage2 and self.current_time is not None:              │
    │      self.stage2.on_message(name, self.current_time, parts)     │
    │                                                                 │
    │  # processor.py  — run(), after flush_all()                     │
    │  if self.stage2:                                                │
    │      self.stage2.finalize()                                     │
    └─────────────────────────────────────────────────────────────────┘

    External usage::

        s2 = Stage2Processor()
        proc = FastNMEAProcessor(path)
        proc.stage2 = s2
        cache = proc.run()
        results = s2.results   # Stage2Results — all series ready
    """

    def __init__(self):
        self.results = Stage2Results()

        # Current epoch
        self._t: Optional[int] = None

        # Epoch accumulators (cleared, not replaced, on epoch transition)
        self._gsv: dict[str, _GSVEpoch] = {}   # constellation → _GSVEpoch
        self._gsa: dict[str, _GSARecord] = {}   # constellation → _GSARecord
        self._gga: Optional[_GGARecord]  = None
        self._rmc: Optional[_RMCRecord]  = None
        self._vtg: Optional[_VTGRecord]  = None

        # Cross-epoch state (for event detection)
        self._last_fix_quality: Optional[int] = None

    # ── Public API ─────────────────────────────────────────────────────────────

    def on_message(self, name: str, t: int, parts: list[str]) -> None:
        """
        Feed one classified NMEA record into Stage 2.

        Called from FastNMEAProcessor.process_line() after Stage 1 has
        already split *parts* and resolved *name* — no duplicate work.

        :param name:  Stage-1 classifier  e.g. ``"GPS_GSV"``, ``"GNGGA"``,
                      ``"BEIDOU_GSA"``, ``"GNRMC"``, ``"GNVTG"``.
        :param t:     Integer epoch timestamp (seconds of day).
        :param parts: Split CSV fields of the original NMEA sentence.
        """
        # ── Epoch boundary ────────────────────────────────────────────────────
        if t != self._t:
            if self._t is not None:
                self._flush_epoch()
            self._t = t

        # ── Dispatch ──────────────────────────────────────────────────────────
        if name.endswith("_GSV"):
            self._process_gsv(name[:-4], parts)   # strip "_GSV"
        elif name.endswith("_GSA"):
            self._process_gsa(name[:-4], parts)   # strip "_GSA"
        elif name.endswith("GGA"):
            self._process_gga(parts)
        elif name.endswith("GNS"):
            self._process_gns(parts)
        elif name.endswith("RMC"):
            self._process_rmc(parts)
        elif name.endswith("VTG"):
            self._process_vtg(parts)
        # ZDA and GLL intentionally ignored — no derived analytics needed

    def finalize(self, cache=None) -> Stage2Results:
        """
        Flush the last in-progress epoch and (optionally) write all analytics
        series to JSONL files in *cache*.  Call once after the main loop ends.

        :param cache: A ``DataCache`` instance from Stage 1.  When provided,
                      six JSONL files are written into the cache directory:
                      ``altitude.jsonl``, ``dop.jsonl``, ``sv_count.jsonl``,
                      ``velocity.jsonl``, ``gsa_used_svs.jsonl``,
                      ``gsv_cno.jsonl``.

        Returns the populated :class:`Stage2Results` object.
        """
        if self._t is not None:
            self._flush_epoch()
        if cache is not None:
            self.results.write_to_cache(cache)
        print(f"[Stage2] finalized — {self.results.summary()}")
        return self.results

    # ── Per-message accumulators ───────────────────────────────────────────────

    def _process_gsv(self, constellation: str, parts: list[str]) -> None:
        """
        Accumulate one GSV sentence.

        GSV fields:
          parts[1]  total sentences in this group
          parts[2]  sentence number (1-based)
          parts[3]  total SVs in view
          parts[4+] repeating groups of [sv_id, elev, azim, cno]
        """
        if len(parts) < 5:
            return

        total  = _i(parts[1], 1)
        seq    = _i(parts[2], 1)

        epoch = self._gsv.get(constellation)
        if epoch is None or epoch.total_sentences != total:
            # New sentence group (first sentence or unexpected restart)
            epoch = _GSVEpoch(total_sentences=total)
            self._gsv[constellation] = epoch

        epoch.received.add(seq)

        # Parse SV quadruples: [sv_id, elev, azim, cno]
        # Each group is exactly 4 fields; the NMEA 4.1 signal-id trailer at the
        # end is skipped naturally because idx+3 < lp will be False for it.
        # Empty cno field means SV is visible but not tracked — stored as 0.0
        # per the rule that empty fields = 0 when a timestamp is present.
        idx = 4
        lp  = len(parts)
        while idx + 3 < lp:
            sv_id = _i(parts[idx])
            cno   = _f(parts[idx + 3], 0.0)   # empty -> 0.0
            idx  += 4

            if sv_id and sv_id > 0:
                # Keep highest C/N0 if sv_id appears across multiple sentences
                existing = epoch.sv_map.get(sv_id)
                if existing is None or cno > existing:
                    epoch.sv_map[sv_id] = cno

    def _process_gsa(self, constellation: str, parts: list[str]) -> None:
        """
        Parse one GSA sentence per constellation.

        GSA fields:
          parts[2]     fix mode  (1=none, 2=2D, 3=3D)
          parts[3-14]  SV IDs used (up to 12)
          parts[15]    PDOP
          parts[16]    HDOP
          parts[17]    VDOP (may carry *checksum)
        """
        if len(parts) < 18:
            return

        sv_used: list[int] = []
        for i in range(3, 15):
            v = _i(parts[i])
            if v:
                sv_used.append(v)

        self._gsa[constellation] = _GSARecord(
            _i(parts[2], 1),
            sv_used,
            _f(parts[15]),
            _f(parts[16]),
            _f(parts[17]),
        )

    def _process_gga(self, parts: list[str]) -> None:
        """
        Parse GGA for fix quality, SV count, HDOP, altitude.

        GGA fields (all 0-based after splitting on comma, talker+msg = parts[0]):
          parts[6]  fix quality  (0=invalid, 1=GPS, 2=DGPS, 4=RTK, 5=Float-RTK)
          parts[7]  satellites used for fix
          parts[8]  HDOP
          parts[9]  altitude, metres (MSL)
        """
        if len(parts) < 10:
            return

        self._gga = _GGARecord(
            _i(parts[6], 0),
            _i(parts[7], 0),
            _f(parts[8]),
            _f(parts[9]),
        )

    def _process_gns(self, parts: list[str]) -> None:
        """
        Parse GNS for fix quality, SV count, HDOP, altitude.

        GNS has a different layout from GGA — parts[6] is a mode-indicator
        string (e.g. "ANNNNN") not a numeric fix-quality code.

        GNS fields:
          parts[6]  mode indicators  (one char per constellation: A/D/E/M/N/P/R/S)
                      first char is GPS; 'N' means no fix for that system
          parts[7]  total satellites used for navigation solution
          parts[8]  HDOP
          parts[9]  altitude, metres (MSL)
                    NOTE: GNS has no 'M' unit field between alt and geoid-sep
                    unlike GGA, so indices 9+ differ from GGA after this point.
        """
        if len(parts) < 10:
            return

        # Derive a GGA-compatible fix_quality from the first mode character:
        #   'N' = no fix (→ 0), anything else = at least a standard fix (→ 1)
        # Preserve 2 for differential and 5 for float where distinguishable.
        mode0 = parts[6][0] if parts[6] else 'N'
        if   mode0 == 'N': fix_quality = 0
        elif mode0 == 'D': fix_quality = 2   # differential
        elif mode0 in ('R', 'P'): fix_quality = 4   # RTK fixed / precise
        elif mode0 == 'F': fix_quality = 5   # RTK float
        else:              fix_quality = 1   # 'A'=autonomous, 'E'=estimated, etc.

        self._gga = _GGARecord(
            fix_quality,
            _i(parts[7], 0),
            _f(parts[8]),
            _f(parts[9]),
        )

    def _process_rmc(self, parts: list[str]) -> None:
        """
        Parse RMC for validity status, speed, and true course.

        RMC fields:
          parts[2]  status  ('A'=active/valid, 'V'=void)
          parts[7]  speed over ground (knots)
          parts[8]  course over ground (degrees true)
        """
        if len(parts) < 8:
            return

        self._rmc = _RMCRecord(
            parts[2] if len(parts[2]) == 1 else 'V',
            _f(parts[7], 0.0),
            _f(parts[8], 0.0) if len(parts) > 8 else 0.0,
        )

    def _process_vtg(self, parts: list[str]) -> None:
        """
        Parse VTG for speed (km/h preferred over knots) and true course.

        VTG fields:
          parts[1]  course, degrees true
          parts[5]  speed, knots  (fallback)
          parts[7]  speed, km/h
        """
        if len(parts) < 8:
            return

        self._vtg = _VTGRecord(
            _f(parts[7], 0.0),
            _f(parts[1], 0.0),
        )

    # ── Epoch flush ────────────────────────────────────────────────────────────

    def _flush_epoch(self) -> None:
        """
        Commit accumulated epoch data to all result series, then reset buffers.

        Called on every timestamp transition — the single most performance-
        critical path.  All branches are ordered by expected message frequency
        (GSV most common → GGA/velocity less so → events rare).
        """
        t = self._t
        r = self.results

        # ── 1. C/N0  +  SBAS detection  (from GSV) ───────────────────────────
        # sv_map values are always float (0.0 when SV is visible but not tracked).
        # total_svs_in_view counts ALL SVs for MIPS.
        sbas_svs: list[tuple[int, float]] = []
        total_svs_in_view = 0

        for constellation, epoch in self._gsv.items():
            sv_map = epoch.sv_map
            total_svs_in_view += len(sv_map)
            cno_series_append = r.cno_series.append
            gsv_cno_append    = r.gsv_cno_series.append

            for sv_id, cno in sv_map.items():
                cno_series_append(CNoPoint(t, constellation, sv_id, cno))
                gsv_cno_append(GSVCNoPoint(t, constellation, sv_id, cno))
                if _SBAS_PRN_MIN <= sv_id <= _SBAS_PRN_MAX:
                    sbas_svs.append((sv_id, cno))

        if sbas_svs:
            r.sbas_series.append(SBASPoint(t, tuple(sbas_svs)))

        # ── 2. Fix quality  +  altitude  +  SV count  (from GGA) ─────────────
        svs_used_for_fix = 0

        if self._gga is not None:
            gga = self._gga
            fq  = gga.fix_quality

            r.fix_series.append(FixPoint(t, fq))
            svs_used_for_fix = gga.num_svs or 0

            if gga.alt_m is not None:
                r.altitude_series.append(AltPoint(t, gga.alt_m))

            if gga.num_svs is not None:
                r.sv_count_series.append(SVCountPoint(t, gga.num_svs))

            # Event detection: LOSS (valid → 0) and REACQUIRE (0 → valid)
            last = self._last_fix_quality
            if last is not None:
                if last > 0 and fq == 0:
                    r.fix_events.append(FixEventPoint(t, "LOSS"))
                elif last == 0 and fq > 0:
                    r.fix_events.append(FixEventPoint(t, "REACQUIRE"))

            self._last_fix_quality = fq

        # ── 3. MIPS proxy  (svs_used / svs_in_view per epoch) ────────────────
        if total_svs_in_view > 0:
            ratio = svs_used_for_fix / total_svs_in_view
            r.mips_series.append(
                MIPSPoint(t, svs_used_for_fix, total_svs_in_view, ratio)
            )

        # ── 4. DOP  (best-of-epoch across all constellations, from GSA) ──────
        #
        # Strategy: for multi-GNSS receivers each GSA gives per-constellation
        # DOP.  We emit the minimum (best) value seen — it's what the combined
        # solution actually achieved.
        pdop = hdop = vdop = None
        all_sv_used: list[int] = []
        for gsa in self._gsa.values():
            if gsa.pdop is not None and (pdop is None or gsa.pdop < pdop):
                pdop = gsa.pdop
            if gsa.hdop is not None and (hdop is None or gsa.hdop < hdop):
                hdop = gsa.hdop
            if gsa.vdop is not None and (vdop is None or gsa.vdop < vdop):
                vdop = gsa.vdop
            all_sv_used.extend(gsa.sv_used)

        if pdop is not None or hdop is not None or vdop is not None:
            r.dop_series.append(DOPPoint(t, pdop, hdop, vdop))

        if all_sv_used:
            r.gsa_sv_series.append(GSASVPoint(t, tuple(all_sv_used)))

        # ── 5. Velocity  (VTG preferred; RMC as fallback) ────────────────────
        if self._vtg is not None:
            r.velocity_series.append(
                VelocityPoint(t, self._vtg.speed_kmh, self._vtg.course_true)
            )
        elif self._rmc is not None:
            r.velocity_series.append(
                VelocityPoint(
                    t,
                    self._rmc.speed_knots * _KNOTS_TO_KMH,
                    self._rmc.course_deg,
                )
            )

        self._gsv.clear()
        self._gsa.clear()
        self._gga = None
        self._rmc = None
        self._vtg = None