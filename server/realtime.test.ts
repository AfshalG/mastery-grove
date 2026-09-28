import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { io as connect, type Socket } from 'socket.io-client';
import { SAMPLE_WORLD } from '../src/data/sampleWorld';
import type { ClientToServerEvents, Joined, Reply, ServerToClientEvents } from '../src/types/realtime';
import { attachRealtime } from './realtime';

type Client = Socket<ServerToClientEvents, ClientToServerEvents>;

let http: HttpServer | undefined;
let realtime: ReturnType<typeof attachRealtime> | undefined;
const clients: Client[] = [];

afterEach(() => {
  clients.splice(0).forEach((c) => c.disconnect());
  realtime?.close();
  http?.close();
});

async function start() {
  http = createServer();
  realtime = attachRealtime(http);
  await new Promise<void>((r) => http!.listen(0, r));
  const { port } = http.address() as AddressInfo;
  return () => {
    const c: Client = connect(`http://127.0.0.1:${port}`, { transports: ['websocket'], forceNew: true, reconnection: false });
    clients.push(c);
    return c;
  };
}

/** The next time `event` arrives on this client (optionally, the first one that passes `where`). */
function next<E extends keyof ServerToClientEvents>(c: Client, event: E, where: (...args: Parameters<ServerToClientEvents[E]>) => boolean = () => true) {
  return new Promise<Parameters<ServerToClientEvents[E]>>((resolve) => {
    const on = ((...args: Parameters<ServerToClientEvents[E]>) => {
      if (!where(...args)) return;
      c.off(event, on as never);
      resolve(args);
    }) as never;
    c.on(event, on);
  });
}

const create = (c: Client) => new Promise<Reply<Joined>>((r) => c.emit('room:create', { world: SAMPLE_WORLD, name: 'Ms Tan' }, r));
const join = (c: Client, code: string, name: string, playerId?: string) =>
  new Promise<Reply<Joined>>((r) => c.emit('room:join', { code, name, role: 'student', playerId }, r));

async function classroom() {
  const client = await start();
  const teacher = client();
  const opened = await create(teacher);
  if (!opened.ok) throw new Error(opened.error);
  const aisha = client();
  const wei = client();
  const a = await join(aisha, opened.code, 'Aisha');
  const w = await join(wei, opened.code, 'Wei Jie');
  if (!a.ok || !w.ok) throw new Error('join failed');
  return { client, teacher, aisha, wei, code: opened.code, aishaId: a.playerId, weiId: w.playerId };
}

describe('class rooms over Socket.IO', () => {
  it('a student who joins gets the teacher’s forest, and the teacher sees them on the roster', async () => {
    const client = await start();
    const teacher = client();
    const opened = await create(teacher);
    expect(opened.ok && opened.code).toMatch(/^[A-Z0-9]{4}$/);
    if (!opened.ok) return;

    const roster = next(teacher, 'room:roster', (r) => r.length === 1);
    const aisha = client();
    const joinedRoom = await join(aisha, opened.code.toLowerCase(), 'Aisha');

    expect(joinedRoom.ok && joinedRoom.world.subject).toBe(SAMPLE_WORLD.subject);
    expect(joinedRoom.ok && joinedRoom.players.map((p) => p.name)).toEqual(['Ms Tan', 'Aisha']);
    const [students] = await roster;
    expect(students[0]).toMatchObject({ name: 'Aisha', isLiveStudent: true });
  });

  it('refuses a code that isn’t a room', async () => {
    const client = await start();
    expect(await join(client(), 'QQQQ', 'Aisha')).toEqual({ ok: false, error: 'No class with that code. Check it with your teacher.' });
  });

  it('students see each other move', async () => {
    const { aisha, wei, aishaId } = await classroom();
    const seen = next(wei, 'presence:update', (p) => p.id === aishaId);
    aisha.emit('presence:move', { x: 2.5, z: -7, yaw: 1.2, moving: true });
    const [p] = await seen;
    expect(p).toEqual({ id: aishaId, x: 2.5, z: -7, yaw: 1.2, moving: true });
  });

  it('the teacher’s quest reaches every student, and a student who joins late gets it too', async () => {
    const { client, teacher, aisha, wei, code } = await classroom();
    const tree = { ...SAMPLE_WORLD.trees[0], id: 'quest-1', isTeacherDeployed: true };
    const gotA = next(aisha, 'quest:deployed');
    const gotW = next(wei, 'quest:deployed');

    const sent = await new Promise<Reply<{ sentTo: number }>>((r) => teacher.emit('teacher:deploy', { trees: [tree], label: 'Simplify both parts' }, r));
    expect(sent).toEqual({ ok: true, sentTo: 2 });
    for (const [quest] of await Promise.all([gotA, gotW])) expect(quest.trees.map((t) => t.id)).toEqual(['quest-1']);

    const late = await join(client(), code, 'Zoe');
    expect(late.ok && late.deployed.map((t) => t.id)).toEqual(['quest-1']);
  });

  it('only the teacher can send quests or start the next session', async () => {
    const { teacher, aisha, wei } = await classroom();
    const denied = await new Promise<Reply<{ sentTo: number }>>((r) => aisha.emit('teacher:deploy', { trees: [SAMPLE_WORLD.trees[0]], label: 'x' }, r));
    expect(denied.ok).toBe(false);

    const changed = next(wei, 'session:changed');
    const started = await new Promise<Reply<{ session: number }>>((r) => teacher.emit('teacher:next-session', r));
    expect(started).toEqual({ ok: true, session: 2 });
    expect((await changed)[0]).toEqual({ session: 2 });
  });

  it('a student’s summary goes to the teacher, and a dropped student can rejoin as themselves', async () => {
    const { client, teacher, aisha, code, aishaId } = await classroom();
    const withSummary = next(teacher, 'room:roster', (r) => r.some((s) => s.activeMisconceptionId === 'm2'));
    aisha.emit('learner:summary', {
      id: 'x',
      name: 'x',
      avatarColor: '#6366f1',
      misconceptionStrength: { m2: 0.7 },
      activeMisconceptionId: 'm2',
      predictionStats: { exact: 2, direction: 1, miss: 0 },
      attempts: [],
      flags: [],
    });
    const [roster] = await withSummary;
    expect(roster.find((s) => s.id === aishaId)).toMatchObject({ name: 'Aisha', activeMisconceptionId: 'm2' });

    const dropped = next(teacher, 'room:players', (ps) => ps.some((p) => p.id === aishaId && !p.connected));
    aisha.disconnect();
    await dropped;
    const back = await join(client(), code, 'Aisha', aishaId);
    expect(back.ok && back.playerId).toBe(aishaId);
  });
});
