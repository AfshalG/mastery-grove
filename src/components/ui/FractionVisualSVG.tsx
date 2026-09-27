import React from 'react';
import { FractionVisual } from '../../types/game';

interface FractionVisualSVGProps {
  visual: FractionVisual;
  className?: string;
  size?: number;
  hideLabel?: boolean;
}

/** One round cake. It scales down with its container, so pictures never spill off a narrow phone. */
const CakeSVG: React.FC<{ parts: number; shaded: number; size: number; cherry?: number }> = ({ parts, shaded, size, cherry = 6.5 }) => (
  <svg viewBox="-100 -100 200 200" className="drop-shadow-sm select-none block" style={{ width: size, maxWidth: '100%', height: 'auto' }}>
    <circle cx="0" cy="0" r="90" fill="#fef08a" stroke="#d97706" strokeWidth="4" />
    {Array.from({ length: parts }).map((_, i) => {
      const startAngle = (2 * Math.PI * i) / parts - Math.PI / 2;
      const endAngle = (2 * Math.PI * (i + 1)) / parts - Math.PI / 2;
      const midAngle = (startAngle + endAngle) / 2;
      const isShaded = i < shaded;
      const d = `M 0 0 L ${Math.cos(startAngle) * 90} ${Math.sin(startAngle) * 90} A 90 90 0 0 1 ${Math.cos(endAngle) * 90} ${Math.sin(endAngle) * 90} Z`;
      return (
        <g key={i}>
          <path d={d} fill={isShaded ? '#f472b6' : '#fef9c3'} stroke="#b45309" strokeWidth="2.5" className="transition-colors duration-200" />
          {isShaded && <circle cx={Math.cos(midAngle) * 55} cy={Math.sin(midAngle) * 55} r={cherry} fill="#dc2626" stroke="#991b1b" strokeWidth="1.5" />}
        </g>
      );
    })}
    <circle cx="0" cy="0" r="7" fill="#d97706" />
  </svg>
);

export const FractionVisualSVG: React.FC<FractionVisualSVGProps> = ({ visual, className = '', size = 180, hideLabel = false }) => {
  if (visual.kind === 'cake') {
    return (
      <div className={`flex flex-col items-center justify-center p-2 bg-amber-50/70 border border-amber-200/80 rounded-2xl min-w-0 ${className}`}>
        {!hideLabel && (
          <span className="text-sm font-extrabold text-ink-soft mb-1.5">
            {visual.shaded}/{visual.parts} shaded
          </span>
        )}
        <CakeSVG parts={visual.parts} shaded={visual.shaded} size={size} />
      </div>
    );
  }

  if (visual.kind === 'two-cakes') {
    const halfSize = Math.max(90, size * 0.7);
    return (
      <div className={`flex flex-col items-center justify-center p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl min-w-0 ${className}`}>
        <div className="flex items-center justify-center gap-3 sm:gap-6 w-full">
          {[visual.left, visual.right].map((side, i) => (
            <React.Fragment key={i}>
              {i === 1 && <span className="text-xs font-black text-ink-soft shrink-0">VS</span>}
              <div className="flex flex-col items-center gap-1 flex-1 min-w-0" style={{ maxWidth: halfSize }}>
                <CakeSVG parts={side.parts} shaded={side.shaded} size={halfSize} cherry={5.5} />
                <span className="text-xs font-extrabold text-slate-800 bg-white px-2.5 py-0.5 rounded-full border border-amber-300 shadow-xs">
                  {side.shaded}/{side.parts}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  }

  if (visual.kind === 'bar') {
    const barWidth = 260;
    const barHeight = 44;
    const pieceWidth = barWidth / visual.parts;

    return (
      <div className={`flex flex-col items-center justify-center p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl min-w-0 ${className}`}>
        {!hideLabel && (
          <span className="text-sm font-extrabold text-ink-soft mb-2">
            {visual.shaded}/{visual.parts} pieces
          </span>
        )}
        <svg
          viewBox={`-5 -5 ${barWidth + 10} ${barHeight + 10}`}
          className="drop-shadow-sm select-none block"
          style={{ width: barWidth + 10, maxWidth: '100%', height: 'auto' }}
        >
          <rect x="0" y="0" width={barWidth} height={barHeight} rx="6" fill="#451a03" stroke="#291305" strokeWidth="3" />
          {Array.from({ length: visual.parts }).map((_, i) => {
            const isShaded = i < visual.shaded;
            const x = i * pieceWidth;
            return (
              <g key={i}>
                <rect
                  x={x + 2}
                  y="2"
                  width={pieceWidth - 4}
                  height={barHeight - 4}
                  rx="4"
                  fill={isShaded ? '#78350f' : '#fed7aa'}
                  stroke={isShaded ? '#92400e' : '#fdba74'}
                  strokeWidth="1.5"
                />
                {isShaded && (
                  <rect x={x + (pieceWidth - 4) * 0.25 + 2} y={barHeight * 0.25} width={(pieceWidth - 4) * 0.5} height={barHeight * 0.5} rx="2" fill="#92400e" opacity="0.6" />
                )}
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  return null;
};
