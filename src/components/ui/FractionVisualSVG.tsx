import React from 'react';
import { FractionVisual } from '../../types/game';

interface FractionVisualSVGProps {
  visual: FractionVisual;
  className?: string;
  size?: number;
  hideLabel?: boolean;
}

export const FractionVisualSVG: React.FC<FractionVisualSVGProps> = ({
  visual,
  className = '',
  size = 180,
  hideLabel = false,
}) => {
  if (visual.kind === 'cake') {
    return (
      <div className={`flex flex-col items-center justify-center p-2 bg-amber-50/70 border border-amber-200/80 rounded-2xl ${className}`}>
        {!hideLabel && (
          <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <span>🍰 Fraction Cake:</span>
            <span className="text-amber-700 font-extrabold">{visual.shaded}/{visual.parts} shaded</span>
          </span>
        )}
        <svg width={size} height={size} viewBox="-100 -100 200 200" className="drop-shadow-sm select-none">
          <circle cx="0" cy="0" r="90" fill="#fef08a" stroke="#d97706" strokeWidth="4" />
          {Array.from({ length: visual.parts }).map((_, i) => {
            const startAngle = (2 * Math.PI * i) / visual.parts - Math.PI / 2;
            const endAngle = (2 * Math.PI * (i + 1)) / visual.parts - Math.PI / 2;
            const x1 = Math.cos(startAngle) * 90;
            const y1 = Math.sin(startAngle) * 90;
            const x2 = Math.cos(endAngle) * 90;
            const y2 = Math.sin(endAngle) * 90;
            const isShaded = i < visual.shaded;

            const midAngle = (startAngle + endAngle) / 2;
            const cherryX = Math.cos(midAngle) * 55;
            const cherryY = Math.sin(midAngle) * 55;

            const pathD = `M 0 0 L ${x1} ${y1} A 90 90 0 0 1 ${x2} ${y2} Z`;

            return (
              <g key={i}>
                <path
                  d={pathD}
                  fill={isShaded ? '#f472b6' : '#fef9c3'}
                  stroke="#b45309"
                  strokeWidth="2.5"
                  className="transition-colors duration-200"
                />
                {isShaded && (
                  <circle cx={cherryX} cy={cherryY} r="6.5" fill="#dc2626" stroke="#991b1b" strokeWidth="1.5" />
                )}
              </g>
            );
          })}
          <circle cx="0" cy="0" r="7" fill="#d97706" />
        </svg>
      </div>
    );
  }

  if (visual.kind === 'two-cakes') {
    const halfSize = Math.max(90, size * 0.7);
    return (
      <div className={`flex flex-col items-center justify-center p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl ${className}`}>
        <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-2">
          🍰 Comparing Visual Portions
        </span>
        <div className="flex items-center justify-center gap-4 sm:gap-6">
          {/* Left Cake */}
          <div className="flex flex-col items-center gap-1">
            <svg width={halfSize} height={halfSize} viewBox="-100 -100 200 200" className="drop-shadow-sm select-none">
              <circle cx="0" cy="0" r="90" fill="#fef08a" stroke="#d97706" strokeWidth="4" />
              {Array.from({ length: visual.left.parts }).map((_, i) => {
                const startAngle = (2 * Math.PI * i) / visual.left.parts - Math.PI / 2;
                const endAngle = (2 * Math.PI * (i + 1)) / visual.left.parts - Math.PI / 2;
                const x1 = Math.cos(startAngle) * 90;
                const y1 = Math.sin(startAngle) * 90;
                const x2 = Math.cos(endAngle) * 90;
                const y2 = Math.sin(endAngle) * 90;
                const isShaded = i < visual.left.shaded;
                const midAngle = (startAngle + endAngle) / 2;
                const cherryX = Math.cos(midAngle) * 55;
                const cherryY = Math.sin(midAngle) * 55;
                const pathD = `M 0 0 L ${x1} ${y1} A 90 90 0 0 1 ${x2} ${y2} Z`;
                return (
                  <g key={i}>
                    <path d={pathD} fill={isShaded ? '#f472b6' : '#fef9c3'} stroke="#b45309" strokeWidth="2.5" />
                    {isShaded && <circle cx={cherryX} cy={cherryY} r="5.5" fill="#dc2626" />}
                  </g>
                );
              })}
              <circle cx="0" cy="0" r="6" fill="#d97706" />
            </svg>
            <span className="text-xs font-extrabold text-slate-800 bg-white px-2.5 py-0.5 rounded-full border border-amber-300 shadow-xs">
              {visual.left.shaded}/{visual.left.parts}
            </span>
          </div>

          <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">VS</span>

          {/* Right Cake */}
          <div className="flex flex-col items-center gap-1">
            <svg width={halfSize} height={halfSize} viewBox="-100 -100 200 200" className="drop-shadow-sm select-none">
              <circle cx="0" cy="0" r="90" fill="#fef08a" stroke="#d97706" strokeWidth="4" />
              {Array.from({ length: visual.right.parts }).map((_, i) => {
                const startAngle = (2 * Math.PI * i) / visual.right.parts - Math.PI / 2;
                const endAngle = (2 * Math.PI * (i + 1)) / visual.right.parts - Math.PI / 2;
                const x1 = Math.cos(startAngle) * 90;
                const y1 = Math.sin(startAngle) * 90;
                const x2 = Math.cos(endAngle) * 90;
                const y2 = Math.sin(endAngle) * 90;
                const isShaded = i < visual.right.shaded;
                const midAngle = (startAngle + endAngle) / 2;
                const cherryX = Math.cos(midAngle) * 55;
                const cherryY = Math.sin(midAngle) * 55;
                const pathD = `M 0 0 L ${x1} ${y1} A 90 90 0 0 1 ${x2} ${y2} Z`;
                return (
                  <g key={i}>
                    <path d={pathD} fill={isShaded ? '#f472b6' : '#fef9c3'} stroke="#b45309" strokeWidth="2.5" />
                    {isShaded && <circle cx={cherryX} cy={cherryY} r="5.5" fill="#dc2626" />}
                  </g>
                );
              })}
              <circle cx="0" cy="0" r="6" fill="#d97706" />
            </svg>
            <span className="text-xs font-extrabold text-slate-800 bg-white px-2.5 py-0.5 rounded-full border border-amber-300 shadow-xs">
              {visual.right.shaded}/{visual.right.parts}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (visual.kind === 'bar') {
    const totalParts = visual.parts;
    const shadedCount = visual.shaded;
    const barWidth = 260;
    const barHeight = 44;
    const pieceWidth = barWidth / totalParts;

    return (
      <div className={`flex flex-col items-center justify-center p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl ${className}`}>
        <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1">
          <span>🍫 Chocolate Bar Fraction:</span>
          <span className="text-amber-800 font-extrabold">{shadedCount}/{totalParts} Pieces</span>
        </span>
        <svg width={barWidth + 10} height={barHeight + 10} viewBox={`-5 -5 ${barWidth + 10} ${barHeight + 10}`} className="drop-shadow-sm select-none">
          <rect x="0" y="0" width={barWidth} height={barHeight} rx="6" fill="#451a03" stroke="#291305" strokeWidth="3" />
          {Array.from({ length: totalParts }).map((_, i) => {
            const isShaded = i < shadedCount;
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
                  <rect
                    x={x + (pieceWidth - 4) * 0.25 + 2}
                    y={barHeight * 0.25}
                    width={(pieceWidth - 4) * 0.5}
                    height={barHeight * 0.5}
                    rx="2"
                    fill="#92400e"
                    opacity="0.6"
                  />
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
