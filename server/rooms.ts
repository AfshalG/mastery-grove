// Class rooms, in memory: the server runs as one instance, so a Map is enough. A teacher opens a room with a
// world and gets a code; students join with it. Plain logic, tested without sockets (server/realtime.ts wires it).
import { randomUUID } from 'node:crypto';
import type { ClassmateData, TreeData, WorldData } from '../src/types/game';
import type { PublicPlayer, Role } from '../src/types/realtime';

/** No 0/O, 1/I/L, 2/Z, 5/S, 8/B, E/A/U or Y: nothing a 10-year-old copying from the board can mix up. */
export const CODE_ALPHABET = 'CDFGHJKMNPQRTVWX3469';
const CODE_LENGTH = 4;
export const ROOM_IDLE_MS = 6 * 60 * 60 * 1000;
const NAME_MAX = 20;
/** Positions are kept inside this box, whatever a client sends. */
const WORLD_LIMIT = 1000;

export interface Player extends PublicPlayer {
  /** The student's latest learner summary, for the teacher's roster only. */
  summary: ClassmateData | null;
}

export interface Room {
  code: string;
  world: WorldData;
  session: number;
  createdAt: number;
  lastActiveAt: number;
  players: Map<string, Player>;
  /** Everything the teacher has sent out, so a student who joins late gets it too. */
  deployed: TreeData[];
}

export const normalizeCode = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, '');

function cleanName(name: unknown) {
  const text = typeof name === 'string' ? name.replace(/[\u0000-\u001f\u007f]/g, '').trim().replace(/\s+/g, ' ') : '';
  return text.slice(0, NAME_MAX).trim() || 'Explorer';
}

const finite = (n: unknown, limit: number) => (typeof n === 'number' && Number.isFinite(n) ? Math.max(-limit, Math.min(limit, n)) : 0);

export type JoinResult = { ok: true; room: Room; player: Player } | { ok: false; error: string };

export class RoomStore {
  private rooms = new Map<string, Room>();

  constructor(
    private now: () => number = Date.now,
    private random: () => number = Math.random
  ) {}

  private newCode() {
    for (;;) {
      let code = '';
      for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[Math.floor(this.random() * CODE_ALPHABET.length)];
      if (!this.rooms.has(code)) return code;
    }
  }

  private newPlayer(name: unknown, role: Role, id: string = randomUUID()): Player {
    return { id, name: cleanName(name), role, x: 0, z: 4, yaw: Math.PI, moving: false, connected: true, summary: null };
  }

  /** A teacher opens a room for a world. */
  create(world: WorldData, teacherName: unknown): { room: Room; player: Player } {
    const player = this.newPlayer(teacherName, 'teacher');
    const room: Room = {
      code: this.newCode(),
      world,
      session: 1,
      createdAt: this.now(),
      lastActiveAt: this.now(),
      players: new Map([[player.id, player]]),
      deployed: [],
    };
    this.rooms.set(room.code, room);
    return { room, player };
  }

  get(code: string): Room | undefined {
    return this.rooms.get(normalizeCode(code));
  }

  /** Joins a room, or rejoins as the same player (same id) after a dropped connection. */
  join(code: string, who: { name: unknown; role: Role; playerId?: string }): JoinResult {
    const room = this.get(code);
    if (!room) return { ok: false, error: 'No class with that code. Check it with your teacher.' };
    room.lastActiveAt = this.now();
    const existing = who.playerId ? room.players.get(who.playerId) : undefined;
    if (existing) {
      existing.connected = true;
      return { ok: true, room, player: existing };
    }
    const player = this.newPlayer(who.name, who.role === 'teacher' ? 'teacher' : 'student');
    room.players.set(player.id, player);
    return { ok: true, room, player };
  }

  disconnect(code: string, playerId: string) {
    const player = this.get(code)?.players.get(playerId);
    if (player) {
      player.connected = false;
      player.moving = false;
    }
  }

  move(code: string, playerId: string, at: { x: unknown; z: unknown; yaw: unknown; moving: unknown }) {
    const room = this.get(code);
    const player = room?.players.get(playerId);
    if (!room || !player) return null;
    player.x = finite(at.x, WORLD_LIMIT);
    player.z = finite(at.z, WORLD_LIMIT);
    player.yaw = finite(at.yaw, 100);
    player.moving = at.moving === true;
    room.lastActiveAt = this.now();
    return player;
  }

  /** The latest learner summary a student's game sent (their own model: mix-ups, answers, flags). */
  summarize(code: string, playerId: string, summary: ClassmateData) {
    const player = this.get(code)?.players.get(playerId);
    if (player?.role === 'student') player.summary = summary;
  }

  players(code: string): PublicPlayer[] {
    return [...(this.get(code)?.players.values() ?? [])].map(({ summary: _summary, ...p }) => p);
  }

  /** Every student, for the teacher's view: their own summary, with the name and id the room knows them by. */
  roster(code: string): ClassmateData[] {
    return [...(this.get(code)?.players.values() ?? [])]
      .filter((p) => p.role === 'student')
      .map((p) => ({
        misconceptionStrength: {},
        activeMisconceptionId: null,
        overcomeMisconceptions: [],
        predictionStats: { exact: 0, direction: 0, miss: 0 },
        attempts: [],
        flags: [],
        ...(p.summary ?? {}),
        id: p.id,
        name: p.name,
        avatarColor: p.summary?.avatarColor ?? '#6366f1',
        isLiveStudent: true,
      }));
  }

  deploy(code: string, trees: TreeData[]) {
    const room = this.get(code);
    if (!room) return;
    room.deployed.push(...trees);
    room.lastActiveAt = this.now();
  }

  nextSession(code: string) {
    const room = this.get(code);
    if (!room) return null;
    room.session += 1;
    room.lastActiveAt = this.now();
    return room.session;
  }

  /** Drops rooms nobody has used for ROOM_IDLE_MS. Returns their codes. */
  sweep(): string[] {
    const gone: string[] = [];
    for (const [code, room] of this.rooms) {
      if (this.now() - room.lastActiveAt > ROOM_IDLE_MS) {
        this.rooms.delete(code);
        gone.push(code);
      }
    }
    return gone;
  }
}
