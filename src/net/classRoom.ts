// The game's side of a class room: one Socket.IO connection to our own server (same origin), and the other
// players' positions. The store (useGameStore) owns what a room means; this module only talks to the server.
import { io, type Socket } from 'socket.io-client';
import type { ClassmateData, TreeData, WorldData } from '../types/game';
import type { ClientToServerEvents, Joined, Presence, PublicPlayer, Reply, Role, ServerToClientEvents } from '../types/realtime';

type RoomSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Other players' latest positions. The 3D classmates read this every frame; it isn't kept in the store because it
 * changes about ten times a second per player.
 */
export const livePlayers = new Map<string, Presence>();

export interface RoomEvents {
  players: (players: PublicPlayer[]) => void;
  roster: (roster: ClassmateData[]) => void;
  quest: (quest: { trees: TreeData[]; label: string }) => void;
  session: (session: number) => void;
  status: (status: 'connected' | 'reconnecting') => void;
}

let socket: RoomSocket | null = null;
/** Who to rejoin as when a dropped connection comes back. */
let rejoinAs: { code: string; name: string; role: Role; playerId: string } | null = null;

const TIMEOUT_MS = 8000;

function connection(events: RoomEvents): RoomSocket {
  if (socket) return socket;
  const s: RoomSocket = io({ transports: ['websocket', 'polling'] });
  s.on('presence:update', (p) => livePlayers.set(p.id, p));
  s.on('room:players', (players) => {
    seed(players);
    events.players(players);
  });
  s.on('room:roster', (roster) => events.roster(roster));
  s.on('quest:deployed', (quest) => events.quest(quest));
  s.on('session:changed', ({ session }) => events.session(session));
  s.on('disconnect', () => events.status('reconnecting'));
  s.on('connect', () => {
    if (!rejoinAs) return events.status('connected');
    // Back after a drop: rejoin as the same player, so the teacher's roster keeps this kid's row.
    s.timeout(TIMEOUT_MS).emit('room:join', rejoinAs, (err, reply) => {
      if (!err && reply.ok) {
        seed(reply.players);
        events.players(reply.players);
      }
      events.status('connected');
    });
  });
  socket = s;
  return s;
}

/** Players' last known spots, for anyone we haven't seen move yet; gone players are forgotten. */
function seed(players: PublicPlayer[]) {
  const here = new Set(players.filter((p) => p.connected).map((p) => p.id));
  for (const id of livePlayers.keys()) if (!here.has(id)) livePlayers.delete(id);
  for (const p of players) if (here.has(p.id) && !livePlayers.has(p.id)) livePlayers.set(p.id, { id: p.id, x: p.x, z: p.z, yaw: p.yaw, moving: false });
}

function ask<T>(send: (s: RoomSocket, done: (err: Error | null, reply: Reply<T>) => void) => void, events: RoomEvents): Promise<Reply<T>> {
  const s = connection(events);
  return new Promise((resolve) => {
    send(s, (err, reply) => resolve(err ? { ok: false, error: 'The class room didn’t answer. Check the connection and try again.' } : reply));
  });
}

export async function createRoom(world: WorldData, name: string, events: RoomEvents): Promise<Reply<Joined>> {
  const reply = await ask<Joined>((s, done) => s.timeout(TIMEOUT_MS).emit('room:create', { world, name }, done), events);
  if (reply.ok) rejoinAs = { code: reply.code, name, role: 'teacher', playerId: reply.playerId };
  return reply;
}

export async function joinRoom(code: string, name: string, events: RoomEvents): Promise<Reply<Joined>> {
  const reply = await ask<Joined>((s, done) => s.timeout(TIMEOUT_MS).emit('room:join', { code, name, role: 'student' }, done), events);
  if (reply.ok) {
    rejoinAs = { code: reply.code, name, role: 'student', playerId: reply.playerId };
    seed(reply.players);
  }
  return reply;
}

export function leaveRoom() {
  rejoinAs = null;
  livePlayers.clear();
  socket?.emit('room:leave');
}

export function sendMove(x: number, z: number, yaw: number, moving: boolean) {
  socket?.volatile.emit('presence:move', { x, z, yaw, moving });
}

export function sendSummary(summary: ClassmateData) {
  socket?.emit('learner:summary', summary);
}

export async function sendQuest(trees: TreeData[], label: string, events: RoomEvents) {
  return ask<{ sentTo: number }>((s, done) => s.timeout(TIMEOUT_MS).emit('teacher:deploy', { trees, label }, done), events);
}

export async function sendNextSession(events: RoomEvents) {
  return ask<{ session: number }>((s, done) => s.timeout(TIMEOUT_MS).emit('teacher:next-session', done), events);
}
