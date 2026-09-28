// Hand-drawn icons for the kid-facing screens: one stroke weight, round ends, the storybook palette.
import React from 'react';

type IconProps = { size?: number; className?: string };
const INK = '#2f2a22';

/** Professor Byte, the tutor: a round little robot with a screen face and a leaf antenna. */
export const ByteFace: React.FC<IconProps & { mood?: 'happy' | 'thinking' }> = ({ size = 32, className, mood = 'happy' }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
    <path d="M24 10 C 24 6, 27 4, 31 4 C 30 8, 28 9, 24 10 Z" fill="#6fae62" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    <path d="M24 10 V 14" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    <rect x="7" y="14" width="34" height="28" rx="11" fill="#f6efe0" stroke={INK} strokeWidth="2.2" />
    <rect x="12" y="19" width="24" height="17" rx="6" fill="#2f3b3a" />
    {mood === 'happy' ? (
      <>
        <circle cx="19" cy="26" r="2.4" fill="#8fe3c5" />
        <circle cx="29" cy="26" r="2.4" fill="#8fe3c5" />
        <path d="M19.5 31 Q 24 34 28.5 31" stroke="#8fe3c5" strokeWidth="2" fill="none" strokeLinecap="round" />
      </>
    ) : (
      <>
        <path d="M17 26 H 21.5" stroke="#8fe3c5" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="29" cy="25.5" r="2.4" fill="#8fe3c5" />
        <path d="M20.5 31.5 H 27.5" stroke="#8fe3c5" strokeWidth="2" strokeLinecap="round" />
      </>
    )}
    <circle cx="7" cy="28" r="2.5" fill="#f2c14e" stroke={INK} strokeWidth="1.8" />
    <circle cx="41" cy="28" r="2.5" fill="#f2c14e" stroke={INK} strokeWidth="1.8" />
  </svg>
);

/** A leaf: filled for grown, hollow for still to do. */
export const Leaf: React.FC<IconProps & { color?: string; hollow?: boolean }> = ({ size = 16, className, color = '#3f7d4e', hollow }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
    <path
      d="M4 20 C 4 10, 10 4, 20 4 C 20 14, 14 20, 4 20 Z"
      fill={hollow ? 'none' : color}
      stroke={hollow ? '#9c8b6a' : INK}
      strokeWidth="1.8"
      strokeLinejoin="round"
      strokeDasharray={hollow ? '3 2.5' : undefined}
    />
    {!hollow && <path d="M5 19 L 15 9" stroke="#fffaf0" strokeWidth="1.6" strokeLinecap="round" opacity="0.8" />}
  </svg>
);

/** The lantern that hangs over trees added for a kid. */
export const Lantern: React.FC<IconProps & { color: string }> = ({ size = 16, className, color }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
    <path d="M9 4 H 15" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    <path d="M12 2 V 4" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    <rect x="7" y="5" width="10" height="3" rx="1.2" fill="#5b4636" stroke={INK} strokeWidth="1.5" />
    <ellipse cx="12" cy="14" rx="6" ry="6.5" fill={color} stroke={INK} strokeWidth="1.8" />
    <path d="M10 12 Q 12 10 14 12" stroke="#fffaf0" strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.8" />
  </svg>
);

/** A two-leaf sprout, for saplings. */
export const Sprout: React.FC<IconProps & { color?: string }> = ({ size = 16, className, color = '#6fae62' }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
    <path d="M12 21 V 11" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    <path d="M12 12 C 12 7, 8 5, 4 5 C 4 10, 8 12, 12 12 Z" fill={color} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
    <path d="M12 14 C 12 9, 16 7, 20 7 C 20 12, 16 14, 12 14 Z" fill={color} stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

/** An apple, for the teacher. */
export const Apple: React.FC<IconProps> = ({ size = 18, className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
    <path d="M12 7 C 9 5, 4 6, 4 12 C 4 17, 8 21, 10 21 C 11 21, 11.5 20.4, 12 20.4 C 12.5 20.4, 13 21, 14 21 C 16 21, 20 17, 20 12 C 20 6, 15 5, 12 7 Z" fill="#d9534f" stroke={INK} strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M12 7 C 12 5, 13 3.5, 14.5 3" stroke={INK} strokeWidth="1.7" strokeLinecap="round" fill="none" />
    <path d="M13 5 C 15 3.5, 17.5 4, 18 5.5 C 16 6.5, 14 6.2, 13 5 Z" fill="#6fae62" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
);

/** A folded trail map, for the list of trees. */
export const TrailMap: React.FC<IconProps> = ({ size = 18, className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
    <path d="M3 6 L 9 4 L 15 6 L 21 4 V 18 L 15 20 L 9 18 L 3 20 Z" fill="#fdf0cc" stroke={INK} strokeWidth="1.7" strokeLinejoin="round" />
    <path d="M9 4 V 18 M15 6 V 20" stroke="#c9b690" strokeWidth="1.3" />
    <path d="M5 15 C 8 13, 10 16, 13 12 S 18 9, 19 8" stroke="#c2493d" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeDasharray="2 2" />
  </svg>
);

/** A chunky arrow for the touch pad. */
export const PadArrow: React.FC<IconProps & { direction: 'up' | 'down' | 'left' | 'right' }> = ({ size = 20, className, direction }) => {
  const turn = { up: 0, right: 90, down: 180, left: 270 }[direction];
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true" style={{ transform: `rotate(${turn}deg)` }}>
      <path d="M12 5 L 19 14 H 14.5 V 19 H 9.5 V 14 H 5 Z" fill={INK} strokeLinejoin="round" stroke={INK} strokeWidth="1.2" />
    </svg>
  );
};

/** The fox companion's face, for the "how sure are you?" question. */
export const FoxFace: React.FC<IconProps> = ({ size = 28, className }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
    <path d="M8 6 L 17 16 L 12 22 Z" fill="#e36f1e" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    <path d="M40 6 L 31 16 L 36 22 Z" fill="#e36f1e" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
    <path d="M24 42 L 7 20 C 10 12, 38 12, 41 20 Z" fill="#e36f1e" stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
    <path d="M24 42 L 14 27 C 18 30, 30 30, 34 27 Z" fill="#fff1dd" />
    <circle cx="17" cy="23" r="2.2" fill={INK} />
    <circle cx="31" cy="23" r="2.2" fill={INK} />
    <circle cx="24" cy="39" r="2.6" fill={INK} />
  </svg>
);

/** Mia, the classmate at the heart of each grove: two hair puffs with berry ribbons. Puzzled until she gets it. */
export const MiaFace: React.FC<IconProps & { mood?: 'puzzled' | 'happy' }> = ({ size = 32, className, mood = 'puzzled' }) => (
  <svg viewBox="0 0 48 48" width={size} height={size} className={className} aria-hidden="true">
    <circle cx="11.5" cy="12" r="7" fill="#3b2a20" stroke={INK} strokeWidth="2" />
    <circle cx="36.5" cy="12" r="7" fill="#3b2a20" stroke={INK} strokeWidth="2" />
    <path d="M14.5 16.5 L 17.5 19 M 33.5 16.5 L 30.5 19" stroke="#c2493d" strokeWidth="3" strokeLinecap="round" />
    <circle cx="24" cy="27" r="15" fill="#b9784f" stroke={INK} strokeWidth="2.2" />
    <path d="M9.2 25 C 10 14, 38 14, 38.8 25 C 33 20.5, 27 19.5, 24 22.5 C 21 19.5, 15 20.5, 9.2 25 Z" fill="#3b2a20" />
    <circle cx="18.5" cy="29" r="2.2" fill={INK} />
    <circle cx="29.5" cy="29" r="2.2" fill={INK} />
    <ellipse cx="14.2" cy="33.6" rx="2.6" ry="1.6" fill="#e58f7e" opacity="0.85" />
    <ellipse cx="33.8" cy="33.6" rx="2.6" ry="1.6" fill="#e58f7e" opacity="0.85" />
    {mood === 'happy' ? (
      <path d="M19.5 35 Q 24 39.5 28.5 35" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    ) : (
      <>
        <path d="M27 24.6 Q 30 22.4 32.6 24" stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <circle cx="25.5" cy="36.2" r="1.8" fill={INK} />
      </>
    )}
  </svg>
);

/** A little arched footbridge, for crossing to the next grove. */
export const BridgeIcon: React.FC<IconProps> = ({ size = 18, className }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
    <path d="M2 17 C 6 20, 18 20, 22 17" stroke="#5fb0c2" strokeWidth="2.2" fill="none" strokeLinecap="round" />
    <path d="M3 14 C 8 9, 16 9, 21 14" stroke="#8a6440" strokeWidth="2.4" fill="none" strokeLinecap="round" />
    <path d="M3 10 C 8 5, 16 5, 21 10" stroke={INK} strokeWidth="1.7" fill="none" strokeLinecap="round" />
    {[6, 10, 14, 18].map((x) => (
      <path key={x} d={`M${x} ${x === 6 || x === 18 ? 8.3 : 6.8} V ${x === 6 || x === 18 ? 12.4 : 10.9}`} stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
    ))}
  </svg>
);
