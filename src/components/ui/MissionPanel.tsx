import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useGameStore } from '../../store/useGameStore';
import { approachPoint, groveEntrance } from '../../game/layout';
import type { Mission } from '../../game/missions';
import { BridgeIcon, Lantern, Leaf, MiaFace, Sprout, TrailMap } from './icons';

const icon = (m: Mission) => {
  switch (m.kind) {
    case 'memory':
      return <Lantern size={18} color="var(--color-teal)" />;
    case 'grow':
      return <Sprout size={18} />;
    case 'mia':
      return <MiaFace size={20} mood={m.done ? 'happy' : 'puzzled'} />;
    case 'cross':
      return <BridgeIcon size={20} />;
    default:
      return <Leaf size={16} hollow={!m.done} />;
  }
};

/** Progress as planks: one per tree the mission needs. */
const Planks: React.FC<{ value: number; of: number }> = ({ value, of }) => (
  <span className="flex items-center gap-1 mt-1" aria-label={`${value} of ${of}`}>
    {Array.from({ length: of }, (_, i) => (
      <span
        key={i}
        className={`h-2 flex-1 max-w-6 rounded-[3px] border ${i < value ? 'bg-[#c79a62] border-[#8a6440]' : 'bg-transparent border-dashed border-paper-edge'}`}
      />
    ))}
    <span className="ml-1 text-[11px] font-bold text-ink-soft tabular-nums">
      {value} of {of}
    </span>
  </span>
);

/**
 * The grove's missions, in order, from src/game/missions.ts: grow enough trees to build the bridge, help Mia,
 * cross to the next grove. The next one is highlighted (Byte's beam points at it), and tapping one walks there.
 */
export const MissionPanel: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { plan, layout, trees, moveTo, walkToMia } = useGameStore(
    useShallow((s) => ({ plan: s.missionPlan, layout: s.layout, trees: s.trees, moveTo: s.moveTo, walkToMia: s.walkToMia }))
  );
  const [expanded, setExpanded] = useState(false);
  if (!plan || !layout) return null;

  const go = (m: Mission) => {
    const o = m.objective;
    if (!o || m.done) return;
    if (o.kind === 'mia') walkToMia(o.conceptId);
    else if (o.kind === 'enter') {
      const g = layout.groves[o.groveIndex];
      if (g) {
        const e = groveEntrance(g);
        moveTo([e.x, 0, e.z]);
      }
    } else {
      const tree = trees.find((t) => t.id === o.treeId);
      if (!tree?.position) return;
      const stand = approachPoint(layout, { x: tree.position[0], z: tree.position[2] });
      moveTo([stand.x, 0, stand.z], tree.id);
    }
    setExpanded(false);
  };

  const rows = (
    <ul className="space-y-1">
      {plan.missions.map((m) => {
        const isNext = plan.next?.id === m.id;
        const canGo = !!m.objective && !m.done;
        return (
          <li key={m.id}>
            <button
              type="button"
              data-testid={`mission-${m.kind}`}
              data-done={m.done}
              onClick={() => go(m)}
              disabled={!canGo}
              className={`w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left border-2 transition-colors ${
                isNext ? 'bg-sun-soft border-sun' : canGo ? 'border-transparent hover:bg-paper-deep' : 'border-transparent'
              } ${m.optional && !isNext ? 'opacity-80' : ''}`}
            >
              <span className={`shrink-0 w-6 flex justify-center ${m.done ? 'opacity-60' : ''}`}>{icon(m)}</span>
              <span className="flex-1 min-w-0">
                <span className={`block text-sm font-bold leading-snug ${m.done ? 'text-ink-soft line-through decoration-2 decoration-leaf/50' : ''}`}>{m.label}</span>
                {m.progress && !m.done && <Planks value={m.progress.value} of={m.progress.of} />}
              </span>
              {m.done ? <Leaf size={16} className="shrink-0" /> : isNext ? <span className="shrink-0 text-xs font-black text-sun-deep">Go</span> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );

  if (compact) {
    const next = plan.next;
    return (
      <div className="paper pointer-events-auto rise-in overflow-hidden" data-testid="mission-panel">
        <button type="button" onClick={() => setExpanded((e) => !e)} className="w-full flex items-center gap-2.5 px-3 py-2 text-left" aria-expanded={expanded}>
          <span className="shrink-0">{next ? icon(next) : <Leaf size={16} />}</span>
          <span className="flex-1 min-w-0 text-sm font-bold truncate">{next ? `Next: ${next.label}` : `${plan.questName}: all done!`}</span>
          <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
        {expanded && <div className="px-1.5 pb-1.5 border-t-2 border-paper-edge/70 pt-1.5">{rows}</div>}
      </div>
    );
  }

  return (
    <div className="paper pointer-events-auto rise-in p-2.5 space-y-1.5" data-testid="mission-panel">
      <div className="flex items-center gap-2 px-1.5 pt-0.5">
        <TrailMap size={18} />
        <div className="min-w-0">
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-leaf-deep">Mission</div>
          <div className="text-sm font-black leading-tight truncate">{plan.questName}</div>
        </div>
      </div>
      {rows}
    </div>
  );
};
