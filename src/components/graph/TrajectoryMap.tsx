import React, { useMemo, useState } from 'react';
import { ParsedLogFile } from '../../types/nmea';
import { Download, Navigation, ZoomIn, ZoomOut, RotateCcw, AlertTriangle, CheckCircle } from 'lucide-react';

interface TrajectoryMapProps {
  files: ParsedLogFile[];
  selectedFileId: string;
}

export const TrajectoryMap: React.FC<TrajectoryMapProps> = ({ files, selectedFileId }) => {
  const [hoveredPoint, setHoveredPoint] = useState<{
    lat: number;
    lon: number;
    alt?: number;
    speed?: number;
    time: string;
    fix: number;
  } | null>(null);

  // Filter target files
  const targetFiles = useMemo(() => {
    if (selectedFileId === 'Combined') return files;
    return files.filter((f) => f.id === selectedFileId);
  }, [files, selectedFileId]);

  // Aggregate coordinates across files
  const trajectories = useMemo(() => {
    return targetFiles.map((file) => {
      const coords = file.epochs
        .filter((ep) => ep.latitude !== undefined && ep.longitude !== undefined)
        .map((ep) => ({
          lat: ep.latitude!,
          lon: ep.longitude!,
          alt: ep.altitude,
          speed: ep.speedKmh,
          timeStr: ep.timeStr,
          fixQuality: ep.fixQuality || 0,
        }));

      return {
        id: file.id,
        filename: file.filename,
        color: file.color,
        coords,
      };
    });
  }, [targetFiles]);

  // Compute map bounding box
  const bounds = useMemo(() => {
    let minLat = Infinity,
      maxLat = -Infinity,
      minLon = Infinity,
      maxLon = -Infinity;

    trajectories.forEach((t) => {
      t.coords.forEach((c) => {
        if (c.lat < minLat) minLat = c.lat;
        if (c.lat > maxLat) maxLat = c.lat;
        if (c.lon < minLon) minLon = c.lon;
        if (c.lon > maxLon) maxLon = c.lon;
      });
    });

    if (minLat === Infinity) {
      return { minLat: 37.7, maxLat: 37.8, minLon: -122.5, maxLon: -122.4 };
    }

    const latPad = (maxLat - minLat || 0.005) * 0.1;
    const lonPad = (maxLon - minLon || 0.005) * 0.1;

    return {
      minLat: minLat - latPad,
      maxLat: maxLat + latPad,
      minLon: minLon - lonPad,
      maxLon: maxLon + lonPad,
    };
  }, [trajectories]);

  const mapW = 800;
  const mapH = 500;

  const latSpan = bounds.maxLat - bounds.minLat || 0.001;
  const lonSpan = bounds.maxLon - bounds.minLon || 0.001;

  const toMapX = (lon: number) => {
    const norm = (lon - bounds.minLon) / lonSpan;
    return 40 + norm * (mapW - 80);
  };

  const toMapY = (lat: number) => {
    const norm = 1 - (lat - bounds.minLat) / latSpan;
    return 40 + norm * (mapH - 80);
  };

  // Export KML file
  const exportKml = () => {
    if (trajectories.length === 0) return;
    let kml = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n<name>NMEA GNSS Track Export</name>\n`;

    trajectories.forEach((traj) => {
      kml += `<Placemark>\n<name>${traj.filename}</name>\n<LineString>\n<extrude>1</extrude>\n<tessellate>1</tessellate>\n<altitudeMode>absolute</altitudeMode>\n<coordinates>\n`;
      traj.coords.forEach((c) => {
        kml += `${c.lon},${c.lat},${c.alt || 0}\n`;
      });
      kml += `</coordinates>\n</LineString>\n</Placemark>\n`;
    });

    kml += `</Document>\n</kml>`;

    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gnss_trajectory_${Date.now()}.kml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasCoords = trajectories.some((t) => t.coords.length > 0);

  if (!hasCoords) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500 dark:text-slate-400">
        <AlertTriangle className="w-10 h-10 text-amber-500 mb-2" />
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">No Coordinate Telemetry Found</h4>
        <p className="text-xs text-slate-400 max-w-md mt-1">
          The selected file(s) do not contain valid GGA or RMC latitude/longitude sentences.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 flex flex-col bg-[#FAF8F5] dark:bg-slate-900 rounded-2xl overflow-hidden select-none transition-colors border border-[#E6E1D6] dark:border-slate-800">
      {/* Top Controls Toolbar */}
      <div className="h-10 px-4 bg-[#EFEAE1]/70 dark:bg-slate-800/60 border-b border-[#E6E1D6] dark:border-slate-800 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center space-x-2 font-mono">
          <Navigation className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span className="font-bold text-[#24211D] dark:text-slate-200">2D Ground Track Trajectory</span>
          <span className="text-[#736E65] text-[11px] hidden sm:inline">
            ({bounds.minLat.toFixed(4)}°N, {bounds.minLon.toFixed(4)}°E)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Legend badge */}
          <div className="flex items-center space-x-3 text-[11px] font-mono mr-2">
            <span className="flex items-center space-x-1 text-emerald-700 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Valid Fix</span>
            </span>
            <span className="flex items-center space-x-1 text-rose-600 dark:text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Fix Loss</span>
            </span>
          </div>

          <button
            onClick={exportKml}
            type="button"
            className="px-2.5 py-1 rounded-lg bg-[#EFEAE1] dark:bg-slate-700 hover:bg-[#E05318] hover:text-white text-[#24211D] dark:text-slate-200 border border-[#E6E1D6] dark:border-slate-600 text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer shadow-xs"
            title="Download Google Earth KML"
          >
            <Download className="w-3 h-3" />
            <span className="hidden md:inline">Export KML</span>
          </button>
        </div>
      </div>

      {/* SVG Map Canvas */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4">
        <svg
          viewBox={`0 0 ${mapW} ${mapH}`}
          className="w-full h-full max-h-[550px] overflow-visible"
        >
          {/* Background Grid Pattern */}
          <defs>
            <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
                strokeWidth="0.8"
              />
            </pattern>
          </defs>
          <rect width={mapW} height={mapH} fill="url(#mapGrid)" rx="6" />

          {/* Coordinate Axes Lines */}
          <line x1="40" y1={mapH - 40} x2={mapW - 40} y2={mapH - 40} stroke="currentColor" className="text-slate-300 dark:text-slate-700" strokeWidth="1.5" />
          <line x1="40" y1="40" x2="40" y2={mapH - 40} stroke="currentColor" className="text-slate-300 dark:text-slate-700" strokeWidth="1.5" />

          {/* Trajectory Polylines */}
          {trajectories.map((traj) => {
            if (traj.coords.length < 2) return null;
            const pointsStr = traj.coords
              .map((c) => `${toMapX(c.lon)},${toMapY(c.lat)}`)
              .join(' ');

            const startPoint = traj.coords[0];
            const endPoint = traj.coords[traj.coords.length - 1];

            return (
              <g key={traj.id}>
                {/* Track glow */}
                <polyline
                  points={pointsStr}
                  fill="none"
                  stroke={traj.color}
                  strokeWidth="5"
                  strokeOpacity="0.25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Track line */}
                <polyline
                  points={pointsStr}
                  fill="none"
                  stroke={traj.color}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Individual Coordinate Points with Outage Highlighting */}
                {traj.coords.map((c, i) => {
                  const cx = toMapX(c.lon);
                  const cy = toMapY(c.lat);
                  const isOutage = c.fixQuality === 0;

                  return (
                    <circle
                      key={i}
                      cx={cx}
                      cy={cy}
                      r={isOutage ? 4 : 2}
                      fill={isOutage ? '#EF4444' : traj.color}
                      stroke={isOutage ? '#FFFFFF' : 'none'}
                      strokeWidth={isOutage ? 1 : 0}
                      className="cursor-pointer transition-all hover:scale-150"
                      onMouseEnter={() =>
                        setHoveredPoint({
                          lat: c.lat,
                          lon: c.lon,
                          alt: c.alt,
                          speed: c.speed,
                          time: c.timeStr,
                          fix: c.fixQuality,
                        })
                      }
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                  );
                })}

                {/* Start Marker (Green Pin) */}
                <g transform={`translate(${toMapX(startPoint.lon)}, ${toMapY(startPoint.lat)})`}>
                  <circle r="6" fill="#10B981" stroke="#FFFFFF" strokeWidth="1.5" />
                  <text y="-10" textAnchor="middle" fill="#10B981" fontSize="9" fontWeight="bold">
                    START
                  </text>
                </g>

                {/* End Marker (Red Pin) */}
                <g transform={`translate(${toMapX(endPoint.lon)}, ${toMapY(endPoint.lat)})`}>
                  <circle r="6" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.5" />
                  <text y="-10" textAnchor="middle" fill="#EF4444" fontSize="9" fontWeight="bold">
                    END
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Hovered Point Info Tooltip */}
        {hoveredPoint && (
          <div className="absolute bottom-4 left-4 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-mono backdrop-blur-xs shadow-xl space-y-1">
            <div className="text-[10px] text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1">
              EPOCH: {hoveredPoint.time} UTC
            </div>
            <div className="text-slate-700 dark:text-slate-300">
              Lat: <span className="font-bold text-slate-900 dark:text-slate-100">{hoveredPoint.lat.toFixed(6)}°</span>
            </div>
            <div className="text-slate-700 dark:text-slate-300">
              Lon: <span className="font-bold text-slate-900 dark:text-slate-100">{hoveredPoint.lon.toFixed(6)}°</span>
            </div>
            {hoveredPoint.alt !== undefined && (
              <div className="text-slate-700 dark:text-slate-300">
                Altitude: <span className="font-bold text-sky-500">{hoveredPoint.alt.toFixed(1)} m</span>
              </div>
            )}
            {hoveredPoint.speed !== undefined && (
              <div className="text-slate-700 dark:text-slate-300">
                Speed: <span className="font-bold text-emerald-500">{hoveredPoint.speed.toFixed(1)} km/h</span>
              </div>
            )}
            <div className="text-[10px] font-bold">
              Fix: {hoveredPoint.fix > 0 ? (
                <span className="text-emerald-500">VALID FIX ({hoveredPoint.fix})</span>
              ) : (
                <span className="text-rose-500">POSITION LOSS (0)</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
