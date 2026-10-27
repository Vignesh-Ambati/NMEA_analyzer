import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { PlotDataPoint, SeriesData } from '../../types';

interface InteractivePlotProps {
  series: SeriesData[];
  yAxisLabel: string;
  unit: string;
  interactionMode: 'idle' | 'pan' | 'zoom';
  isAutoMode: boolean;
  bgColor: string;
  textColor: string;
  gridColor: string;
  showGrid: boolean;
  onViewChanged?: () => void;
  // History stack triggers
  historyTrigger?: number;
  resetTrigger?: number;
  exportTrigger?: number;
  onExportDone?: (blobUrl: string) => void;
}

interface Viewport {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export const InteractivePlot: React.FC<InteractivePlotProps> = ({
  series,
  yAxisLabel,
  unit,
  interactionMode,
  isAutoMode,
  bgColor,
  textColor,
  gridColor,
  showGrid,
  onViewChanged,
  resetTrigger,
  exportTrigger,
  onExportDone,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Compute global data bounds
  const globalBounds = useMemo<Viewport>(() => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    series.forEach((s) => {
      s.points.forEach((p) => {
        if (p.time < minX) minX = p.time;
        if (p.time > maxX) maxX = p.time;
        if (p.value < minY) minY = p.value;
        if (p.value > maxY) maxY = p.value;
      });
    });

    if (minX === Infinity || maxX === -Infinity) {
      minX = 0;
      maxX = 100;
      minY = 0;
      maxY = 10;
    }

    const xSpan = maxX > minX ? maxX - minX : 1;
    const ySpan = maxY > minY ? maxY - minY : 1;

    return {
      minX: minX - xSpan * 0.02,
      maxX: maxX + xSpan * 0.02,
      minY: minY - ySpan * 0.05,
      maxY: maxY + ySpan * 0.05,
    };
  }, [series]);

  // View history stack
  const [viewHistory, setViewHistory] = useState<Viewport[]>([globalBounds]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  const currentView = viewHistory[historyIndex] || globalBounds;

  // Track drag actions
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);

  // Hover crosshair and tooltip state
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    y: number;
    time: number;
    points: { filename: string; color: string; value: number; label?: string }[];
  } | null>(null);

  // Reset to global bounds on series change or explicit reset
  useEffect(() => {
    setViewHistory([globalBounds]);
    setHistoryIndex(0);
  }, [globalBounds, resetTrigger]);

  const pushView = useCallback(
    (newView: Viewport) => {
      setViewHistory((prev) => {
        const sliced = prev.slice(0, historyIndex + 1);
        return [...sliced, newView];
      });
      setHistoryIndex((prev) => prev + 1);
      onViewChanged?.();
    },
    [historyIndex, onViewChanged]
  );

  // Step back / forward in history
  const stepBack = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
      onViewChanged?.();
    }
  }, [historyIndex, onViewChanged]);

  const stepForward = useCallback(() => {
    if (historyIndex < viewHistory.length - 1) {
      setHistoryIndex((prev) => prev + 1);
      onViewChanged?.();
    }
  }, [historyIndex, viewHistory.length, onViewChanged]);

  // Main Canvas Render Loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);

    // Fill background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Padding for axes
    const padLeft = 68;
    const padRight = 24;
    const padTop = 24;
    const padBottom = 44;

    const plotW = width - padLeft - padRight;
    const plotH = height - padTop - padBottom;

    if (plotW <= 10 || plotH <= 10) {
      ctx.restore();
      return;
    }

    const { minX, maxX, minY, maxY } = currentView;
    const xSpan = maxX - minX || 1;
    const ySpan = maxY - minY || 1;

    const toScreenX = (x: number) => padLeft + ((x - minX) / xSpan) * plotW;
    const toScreenY = (y: number) => padTop + (1 - (y - minY) / ySpan) * plotH;
    const toDataX = (sx: number) => minX + ((sx - padLeft) / plotW) * xSpan;
    const toDataY = (sy: number) => minY + (1 - (sy - padTop) / plotH) * ySpan;

    // Grid lines & labels
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    ctx.fillStyle = textColor;
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    // Horizontal Y Grid lines
    const ySteps = 6;
    for (let i = 0; i <= ySteps; i++) {
      const val = minY + (ySpan / ySteps) * i;
      const sy = toScreenY(val);

      if (showGrid) {
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(padLeft, sy);
        ctx.lineTo(width - padRight, sy);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Format tick number
      const label = val >= 1000 ? val.toFixed(0) : val.toFixed(1);
      ctx.fillText(label, padLeft - 8, sy);
    }

    // Vertical X Grid lines (Timestamp)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xSteps = Math.min(8, Math.max(3, Math.floor(plotW / 110)));
    for (let i = 0; i <= xSteps; i++) {
      const timeVal = minX + (xSpan / xSteps) * i;
      const sx = toScreenX(timeVal);

      if (showGrid) {
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(sx, padTop);
        ctx.lineTo(sx, height - padBottom);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const date = new Date(timeVal * 1000);
      const timeStr = `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}:${date.getUTCSeconds().toString().padStart(2, '0')}`;
      ctx.fillText(timeStr, sx, height - padBottom + 8);
    }

    // Y Axis Label
    ctx.save();
    ctx.translate(16, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.font = 'bold 11px system-ui';
    ctx.fillStyle = textColor;
    ctx.fillText(`${yAxisLabel} ${unit ? `(${unit})` : ''}`, 0, 0);
    ctx.restore();

    // Clip to plot boundaries for data lines
    ctx.save();
    ctx.beginPath();
    ctx.rect(padLeft, padTop, plotW, plotH);
    ctx.clip();

    // Draw Data Series with Level of Detail (LOD) subsampling
    series.forEach((s) => {
      if (s.points.length === 0) return;

      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      // LOD decimation: max 2 points per screen pixel
      const maxPts = plotW * 2;
      const step = s.points.length > maxPts ? Math.ceil(s.points.length / maxPts) : 1;

      let started = false;
      for (let i = 0; i < s.points.length; i += step) {
        const pt = s.points[i];
        const sx = toScreenX(pt.time);
        const sy = toScreenY(pt.value);

        if (!started) {
          ctx.moveTo(sx, sy);
          started = true;
        } else {
          ctx.lineTo(sx, sy);
        }
      }
      ctx.stroke();

      // If sparse points (under 80), draw point dots
      if (s.points.length < 80) {
        ctx.fillStyle = s.color;
        s.points.forEach((pt) => {
          const sx = toScreenX(pt.time);
          const sy = toScreenY(pt.value);
          ctx.beginPath();
          ctx.arc(sx, sy, 3, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    });

    // Draw Box-Zoom overlay if currently dragging
    if (isDragging && dragStart && dragCurrent && interactionMode === 'zoom') {
      const x0 = Math.min(dragStart.x, dragCurrent.x);
      const x1 = Math.max(dragStart.x, dragCurrent.x);
      const y0 = Math.min(dragStart.y, dragCurrent.y);
      const y1 = Math.max(dragStart.y, dragCurrent.y);

      ctx.fillStyle = 'rgba(255, 90, 31, 0.2)';
      ctx.strokeStyle = '#FF5A1F';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 2]);
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
      ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
      ctx.setLineDash([]);
    }

    // Crosshair line if hovering
    if (hoverInfo && !isDragging) {
      ctx.strokeStyle = 'rgba(255, 90, 31, 0.7)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      // Vertical crosshair
      ctx.beginPath();
      ctx.moveTo(hoverInfo.x, padTop);
      ctx.lineTo(hoverInfo.x, height - padBottom);
      ctx.stroke();

      // Horizontal crosshair
      ctx.beginPath();
      ctx.moveTo(padLeft, hoverInfo.y);
      ctx.lineTo(width - padRight, hoverInfo.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore(); // Undo plot area clip
    ctx.restore(); // Undo DPR scale
  }, [
    currentView,
    series,
    yAxisLabel,
    unit,
    interactionMode,
    bgColor,
    textColor,
    gridColor,
    showGrid,
    isDragging,
    dragStart,
    dragCurrent,
    hoverInfo,
  ]);

  // Request render on state change or resize
  useEffect(() => {
    renderCanvas();
    const handleResize = () => renderCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderCanvas]);

  // PNG Export Trigger
  useEffect(() => {
    if (!exportTrigger || !canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    onExportDone?.(url);
  }, [exportTrigger, onExportDone]);

  // Mouse Interactions: Pan, Zoom-Box, Wheel
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDragging(true);
    setDragStart({ x, y });
    setDragCurrent({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const padLeft = 68;
    const padRight = 24;
    const padTop = 24;
    const padBottom = 44;
    const plotW = rect.width - padLeft - padRight;
    const plotH = rect.height - padTop - padBottom;

    if (isDragging && dragStart) {
      setDragCurrent({ x, y });

      // Immediate Drag-Pan (when in Pan mode or auto mode)
      if (interactionMode === 'pan' || (isAutoMode && e.buttons === 1)) {
        const dx = x - dragStart.x;
        const dy = y - dragStart.y;

        const xSpan = currentView.maxX - currentView.minX;
        const ySpan = currentView.maxY - currentView.minY;

        const dDataX = (dx / plotW) * xSpan;
        const dDataY = (dy / plotH) * ySpan;

        setViewHistory((prev) => {
          const updated = [...prev];
          updated[historyIndex] = {
            minX: currentView.minX - dDataX,
            maxX: currentView.maxX - dDataX,
            minY: currentView.minY + dDataY,
            maxY: currentView.maxY + dDataY,
          };
          return updated;
        });

        setDragStart({ x, y });
      }
    } else {
      // Calculate Hover Info
      if (x >= padLeft && x <= rect.width - padRight && y >= padTop && y <= rect.height - padBottom) {
        const xSpan = currentView.maxX - currentView.minX;
        const hoverTime = currentView.minX + ((x - padLeft) / plotW) * xSpan;

        // Find nearest points in each series
        const nearestPoints = series.map((s) => {
          if (s.points.length === 0) return null;
          let nearest = s.points[0];
          let minDiff = Math.abs(nearest.time - hoverTime);
          for (let i = 1; i < s.points.length; i++) {
            const diff = Math.abs(s.points[i].time - hoverTime);
            if (diff < minDiff) {
              minDiff = diff;
              nearest = s.points[i];
            }
          }
          return {
            filename: s.filename,
            color: s.color,
            value: nearest.value,
            label: nearest.label,
          };
        }).filter(Boolean) as { filename: string; color: string; value: number; label?: string }[];

        setHoverInfo({
          x,
          y,
          time: hoverTime,
          points: nearestPoints,
        });
      } else {
        setHoverInfo(null);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging || !dragStart || !dragCurrent) {
      setIsDragging(false);
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) {
      setIsDragging(false);
      return;
    }

    const padLeft = 68;
    const padRight = 24;
    const padTop = 24;
    const padBottom = 44;
    const plotW = rect.width - padLeft - padRight;
    const plotH = rect.height - padTop - padBottom;

    // Apply Box Zoom
    if (interactionMode === 'zoom' && Math.abs(dragCurrent.x - dragStart.x) > 10) {
      const x0 = Math.min(dragStart.x, dragCurrent.x);
      const x1 = Math.max(dragStart.x, dragCurrent.x);
      const y0 = Math.min(dragStart.y, dragCurrent.y);
      const y1 = Math.max(dragStart.y, dragCurrent.y);

      const xSpan = currentView.maxX - currentView.minX;
      const ySpan = currentView.maxY - currentView.minY;

      const newMinX = currentView.minX + ((Math.max(padLeft, x0) - padLeft) / plotW) * xSpan;
      const newMaxX = currentView.minX + ((Math.min(rect.width - padRight, x1) - padLeft) / plotW) * xSpan;
      const newMaxY = currentView.maxY - ((Math.max(padTop, y0) - padTop) / plotH) * ySpan;
      const newMinY = currentView.maxY - ((Math.min(rect.height - padBottom, y1) - padTop) / plotH) * ySpan;

      if (newMaxX > newMinX && newMaxY > newMinY) {
        pushView({
          minX: newMinX,
          maxX: newMaxX,
          minY: newMinY,
          maxY: newMaxY,
        });
      }
    }

    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const padLeft = 68;
    const padRight = 24;
    const padTop = 24;
    const padBottom = 44;
    const plotW = rect.width - padLeft - padRight;
    const plotH = rect.height - padTop - padBottom;

    const factor = e.deltaY < 0 ? 0.8 : 1.25;

    const xSpan = currentView.maxX - currentView.minX;
    const ySpan = currentView.maxY - currentView.minY;

    const focalX = currentView.minX + ((x - padLeft) / plotW) * xSpan;
    const focalY = currentView.minY + (1 - (y - padTop) / plotH) * ySpan;

    const newXSpan = xSpan * factor;
    const newYSpan = ySpan * factor;

    const relX = (focalX - currentView.minX) / xSpan;
    const relY = (focalY - currentView.minY) / ySpan;

    const newMinX = focalX - newXSpan * relX;
    const newMaxX = focalX + newXSpan * (1 - relX);
    const newMinY = focalY - newYSpan * relY;
    const newMaxY = focalY + newYSpan * (1 - relY);

    pushView({
      minX: newMinX,
      maxX: newMaxX,
      minY: newMinY,
      maxY: newMaxY,
    });
  };

  // Cursor style based on mode
  const cursorClass =
    interactionMode === 'zoom'
      ? 'cursor-crosshair'
      : interactionMode === 'pan'
      ? isDragging
        ? 'cursor-grabbing'
        : 'cursor-grab'
      : 'cursor-default';

  const hasData = series.some((s) => s.points.length > 0);

  if (!hasData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 select-none text-center space-y-2">
        <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          No data points found for {yAxisLabel}
        </div>
        <p className="text-xs text-slate-400 max-w-sm">
          The selected NMEA file does not contain sentences matching this task criteria.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className={`w-full h-full block ${cursorClass}`}
      />

      {/* Interactive Tooltip Card */}
      {hoverInfo && !isDragging && (
        <div
          className="absolute pointer-events-none z-30 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-3 text-xs font-mono backdrop-blur-xs min-w-44 transition-all duration-75"
          style={{
            left: Math.min(hoverInfo.x + 15, (canvasRef.current?.clientWidth || 300) - 190),
            top: Math.max(10, Math.min(hoverInfo.y - 40, (canvasRef.current?.clientHeight || 200) - 120)),
          }}
        >
          <div className="text-[10px] text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1 mb-1.5 flex items-center justify-between">
            <span>UTC Time</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {new Date(hoverInfo.time * 1000).toISOString().substring(11, 19)}
            </span>
          </div>

          <div className="space-y-1">
            {hoverInfo.points.map((pt, i) => (
              <div key={i} className="flex items-center justify-between space-x-3">
                <span className="flex items-center space-x-1.5 truncate max-w-28 text-[11px] text-slate-600 dark:text-slate-300">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: pt.color }}
                  />
                  <span className="truncate">{pt.filename}</span>
                </span>
                <span className="font-bold text-[11px]" style={{ color: pt.color }}>
                  {pt.value.toFixed(2)} {unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
