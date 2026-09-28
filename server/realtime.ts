// Live class rooms over Socket.IO: presence, the teacher's roster, and quests and sessions sent to the room.
// Room state lives in RoomStore (server/rooms.ts); this file only moves messages.
import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import type { ClassmateData, TreeData, WorldData } from '../src/types/game';
import type { ClientToServerEvents, Joined, Role, ServerToClientEvents } from '../src/types/realtime';
import { RoomStore, type Room } from './rooms';

interface SocketData {
  code?: string;
  playerId?: string;
  role?: Role;
}

const SWEEP_EVERY_MS = 10 * 60 * 1000;
const MAX_WORLD_TREES = 300;
const MAX_DEPLOY = 12;

function validWorld(world: unknown): world is WorldData {
  const w = world as WorldData | undefined;
  return (
    !!w &&
    typeof w.subject === 'string' &&
    Array.isArray(w.concepts) &&
    Array.isArray(w.misconceptions) &&
    Array.isArray(w.trees) &&
    w.trees.length > 0 &&
    w.trees.length <= MAX_WORLD_TREES
  );
}

const validTree = (t: unknown): t is TreeData => {
  const tree = t as TreeData | undefined;
  return !!tree && typeof tree.id === 'string' && typeof tree.question === 'string' && Array.isArray(tree.choices) && typeof tree.conceptId === 'string';
};

/** Keeps what a student sends to a sensible size before it goes to the teacher. */
function trimSummary(s: ClassmateData): ClassmateData {
  return {
    ...s,
    attempts: Array.isArray(s.attempts) ? s.attempts.slice(0, 30) : [],
    flags: Array.isArray(s.flags) ? s.flags.slice(0, 20) : [],
    teachBacks: Array.isArray(s.teachBacks) ? s.teachBacks.slice(0, 10) : [],
    reflections: Array.isArray(s.reflections) ? s.reflections.slice(0, 10) : [],
  };
}

function joined(room: Room, playerId: string, role: Role, store: RoomStore): Joined {
  return { code: room.code, playerId, role, world: room.world, players: store.players(room.code), session: room.session, deployed: room.deployed };
}

export function attachRealtime(httpServer: HttpServer, store = new RoomStore()) {
  const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
    maxHttpBufferSize: 2_000_000, // a whole world goes up when a teacher opens a room
  });
  const teachers = (code: string) => `${code}:teachers`;
  const sendPlayers = (code: string) => io.to(code).emit('room:players', store.players(code));
  const sendRoster = (code: string) => io.to(teachers(code)).emit('room:roster', store.roster(code));

  io.on('connection', (socket) => {
    const enter = (code: string, playerId: string, role: Role) => {
      socket.data = { code, playerId, role };
      socket.join(code);
      if (role === 'teacher') socket.join(teachers(code));
    };
    const leave = () => {
      const { code, playerId } = socket.data;
      if (!code || !playerId) return;
      store.disconnect(code, playerId);
      socket.leave(code);
      socket.leave(teachers(code));
      socket.data = {};
      sendPlayers(code);
      sendRoster(code);
    };

    socket.on('room:create', (req, ack) => {
      if (typeof ack !== 'function') return;
      if (!validWorld(req?.world)) return ack({ ok: false, error: 'That forest couldn’t be shared.' });
      leave();
      const { room, player } = store.create(req.world, req.name);
      enter(room.code, player.id, 'teacher');
      ack({ ok: true, ...joined(room, player.id, 'teacher', store) });
    });

    socket.on('room:join', (req, ack) => {
      if (typeof ack !== 'function') return;
      const role: Role = req?.role === 'teacher' ? 'teacher' : 'student';
      const result = store.join(String(req?.code ?? ''), { name: req?.name, role, playerId: typeof req?.playerId === 'string' ? req.playerId : undefined });
      if (!result.ok) return ack({ ok: false, error: result.error });
      if (socket.data.code !== result.room.code || socket.data.playerId !== result.player.id) leave();
      enter(result.room.code, result.player.id, result.player.role);
      ack({ ok: true, ...joined(result.room, result.player.id, result.player.role, store) });
      sendPlayers(result.room.code);
      sendRoster(result.room.code);
    });

    socket.on('room:leave', leave);
    socket.on('disconnect', leave);

    socket.on('presence:move', (at) => {
      const { code, playerId } = socket.data;
      if (!code || !playerId || !at || typeof at !== 'object') return;
      const p = store.move(code, playerId, at);
      if (p) socket.to(code).volatile.emit('presence:update', { id: p.id, x: p.x, z: p.z, yaw: p.yaw, moving: p.moving });
    });

    socket.on('learner:summary', (summary) => {
      const { code, playerId, role } = socket.data;
      if (!code || !playerId || role !== 'student' || !summary || typeof summary !== 'object') return;
      store.summarize(code, playerId, trimSummary(summary));
      sendRoster(code);
    });

    socket.on('teacher:deploy', (req, ack) => {
      if (typeof ack !== 'function') return;
      const { code, role } = socket.data;
      if (!code || role !== 'teacher') return ack({ ok: false, error: 'Only the teacher can send a quest.' });
      const trees = (Array.isArray(req?.trees) ? req.trees : []).filter(validTree).slice(0, MAX_DEPLOY);
      if (trees.length === 0) return ack({ ok: false, error: 'There were no questions to send.' });
      store.deploy(code, trees);
      socket.to(code).emit('quest:deployed', { trees, label: String(req?.label ?? '').slice(0, 160) });
      ack({ ok: true, sentTo: store.players(code).filter((p) => p.role === 'student' && p.connected).length });
    });

    socket.on('teacher:next-session', (ack) => {
      if (typeof ack !== 'function') return;
      const { code, role } = socket.data;
      if (!code || role !== 'teacher') return ack({ ok: false, error: 'Only the teacher can start a session.' });
      const session = store.nextSession(code) ?? 1;
      socket.to(code).emit('session:changed', { session });
      ack({ ok: true, session });
    });
  });

  const sweeper = setInterval(() => store.sweep(), SWEEP_EVERY_MS);
  sweeper.unref();
  return {
    io,
    close: () => {
      clearInterval(sweeper);
      io.close();
    },
  };
}
