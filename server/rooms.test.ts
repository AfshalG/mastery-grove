import { describe, expect, it } from 'vitest';
import { SAMPLE_WORLD } from '../src/data/sampleWorld';
import type { ClassmateData } from '../src/types/game';
import { CODE_ALPHABET, RoomStore, ROOM_IDLE_MS, normalizeCode } from './rooms';

const clock = (start = 1_000_000) => {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
};
const summary = (name: string): ClassmateData => ({
  id: 'ignored',
  name,
  avatarColor: '#000',
  misconceptionStrength: { m1: 0.6 },
  activeMisconceptionId: 'm1',
  predictionStats: { exact: 1, direction: 0, miss: 0 },
  attempts: [],
  flags: [],
});

describe('RoomStore', () => {
  it('makes 4-letter codes from letters and digits that are hard to mix up, never the same twice', () => {
    const store = new RoomStore();
    const codes = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const { room } = store.create(SAMPLE_WORLD, 'Ms Tan');
      expect(room.code).toMatch(new RegExp(`^[${CODE_ALPHABET}]{4}$`));
      codes.add(room.code);
    }
    expect(codes.size).toBe(200);
  });

  it('reads a typed code kindly: lower case, spaces and dashes are fine', () => {
    expect(normalizeCode(' kx-4m ')).toBe('KX4M');
    expect(normalizeCode('ab')).toBe('AB');
  });

  it('lets students join with a code and a name, and keeps the teacher in the room', () => {
    const store = new RoomStore();
    const { room, player: teacher } = store.create(SAMPLE_WORLD, 'Ms Tan');
    const joined = store.join(room.code.toLowerCase(), { name: '  Aisha  ', role: 'student' });

    expect(joined.ok).toBe(true);
    if (!joined.ok) return;
    expect(joined.player).toMatchObject({ name: 'Aisha', role: 'student', connected: true });
    expect(store.players(room.code).map((p) => [p.name, p.role])).toEqual([
      ['Ms Tan', 'teacher'],
      ['Aisha', 'student'],
    ]);
    expect(teacher.role).toBe('teacher');
  });

  it('refuses an unknown code, and a name that is empty or too long is fixed rather than refused', () => {
    const store = new RoomStore();
    expect(store.join('ZZZZ', { name: 'Wei Jie', role: 'student' })).toEqual({ ok: false, error: 'No class with that code. Check it with your teacher.' });
    const { room } = store.create(SAMPLE_WORLD, 'Ms Tan');
    const blank = store.join(room.code, { name: '   ', role: 'student' });
    const long = store.join(room.code, { name: 'A really very long name for a kid', role: 'student' });
    expect(blank.ok && blank.player.name).toBe('Explorer');
    expect(long.ok && long.player.name.length).toBeLessThanOrEqual(20);
  });

  it('lets a student who dropped rejoin as the same player, where they were', () => {
    const store = new RoomStore();
    const { room } = store.create(SAMPLE_WORLD, 'Ms Tan');
    const first = store.join(room.code, { name: 'Aisha', role: 'student' });
    if (!first.ok) throw new Error('join failed');
    store.move(room.code, first.player.id, { x: 3, z: -4, yaw: 1, moving: false });
    store.disconnect(room.code, first.player.id);
    expect(store.players(room.code).find((p) => p.id === first.player.id)?.connected).toBe(false);

    const again = store.join(room.code, { name: 'Aisha', role: 'student', playerId: first.player.id });
    expect(again.ok && again.player).toMatchObject({ id: first.player.id, x: 3, z: -4, connected: true });
    expect(store.players(room.code)).toHaveLength(2);
  });

  it('gives the teacher a roster of students only, built from what each one sends', () => {
    const store = new RoomStore();
    const { room } = store.create(SAMPLE_WORLD, 'Ms Tan');
    const a = store.join(room.code, { name: 'Aisha', role: 'student' });
    const b = store.join(room.code, { name: 'Wei Jie', role: 'student' });
    if (!a.ok || !b.ok) throw new Error('join failed');
    store.summarize(room.code, a.player.id, summary('whatever the client says'));

    const roster = store.roster(room.code);
    expect(roster.map((s) => s.name)).toEqual(['Aisha', 'Wei Jie']);
    expect(roster[0]).toMatchObject({ id: a.player.id, isLiveStudent: true, activeMisconceptionId: 'm1' });
    expect(roster[1]).toMatchObject({ id: b.player.id, attempts: [], activeMisconceptionId: null });
  });

  it('keeps deployed quests and the session, so a student who joins late gets them too', () => {
    const store = new RoomStore();
    const { room } = store.create(SAMPLE_WORLD, 'Ms Tan');
    const tree = { ...SAMPLE_WORLD.trees[0], id: 'quest-1', isTeacherDeployed: true };
    store.deploy(room.code, [tree]);
    store.nextSession(room.code);

    const late = store.join(room.code, { name: 'Zoe', role: 'student' });
    expect(late.ok && late.room.deployed.map((t) => t.id)).toEqual(['quest-1']);
    expect(late.ok && late.room.session).toBe(2);
  });

  it('forgets rooms idle for 6 hours', () => {
    const c = clock();
    const store = new RoomStore(c.now);
    const { room: old } = store.create(SAMPLE_WORLD, 'Ms Tan');
    c.advance(ROOM_IDLE_MS - 1000);
    const { room: fresh } = store.create(SAMPLE_WORLD, 'Mr Lim');
    c.advance(2000);

    expect(store.sweep()).toEqual([old.code]);
    expect(store.get(old.code)).toBeUndefined();
    expect(store.get(fresh.code)).toBeDefined();
  });

  it('keeps positions sane: numbers only, inside a generous box', () => {
    const store = new RoomStore();
    const { room } = store.create(SAMPLE_WORLD, 'Ms Tan');
    const a = store.join(room.code, { name: 'Aisha', role: 'student' });
    if (!a.ok) throw new Error('join failed');
    store.move(room.code, a.player.id, { x: 1e9, z: Number.NaN, yaw: 2, moving: true });
    const p = store.players(room.code).find((q) => q.id === a.player.id)!;
    expect(p.x).toBeLessThanOrEqual(1000);
    expect(p.z).toBe(0);
  });
});
