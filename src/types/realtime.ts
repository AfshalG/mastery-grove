// The Socket.IO events between the game and the server (server/realtime.ts), typed on both ends.
import type { ClassmateData, TreeData, WorldData } from './game';

export type Role = 'student' | 'teacher';

/** What everyone in a room can see about a player. */
export interface PublicPlayer {
  id: string;
  name: string;
  role: Role;
  x: number;
  z: number;
  yaw: number;
  moving: boolean;
  connected: boolean;
}

export interface Presence {
  id: string;
  x: number;
  z: number;
  yaw: number;
  moving: boolean;
}

export type Reply<T> = ({ ok: true } & T) | { ok: false; error: string };
type Ack<T> = (reply: Reply<T>) => void;

export interface Joined {
  code: string;
  playerId: string;
  role: Role;
  world: WorldData;
  players: PublicPlayer[];
  session: number;
  /** Quests the teacher has already sent out. */
  deployed: TreeData[];
}

export interface ClientToServerEvents {
  /** A teacher opens a room for the forest they have loaded. */
  'room:create': (req: { world: WorldData; name: string }, ack: Ack<Joined>) => void;
  /** Join with a code, or rejoin as the same player after a dropped connection. */
  'room:join': (req: { code: string; name: string; role: Role; playerId?: string }, ack: Ack<Joined>) => void;
  'room:leave': () => void;
  /** Sent up to 10 times a second while walking; may be dropped. */
  'presence:move': (at: { x: number; z: number; yaw: number; moving: boolean }) => void;
  /** A student's own learner summary, for the teacher's roster, sent when it changes. */
  'learner:summary': (summary: ClassmateData) => void;
  'teacher:deploy': (req: { trees: TreeData[]; label: string }, ack: Ack<{ sentTo: number }>) => void;
  'teacher:next-session': (ack: Ack<{ session: number }>) => void;
}

export interface ServerToClientEvents {
  'presence:update': (p: Presence) => void;
  'room:players': (players: PublicPlayer[]) => void;
  'room:roster': (roster: ClassmateData[]) => void;
  'quest:deployed': (quest: { trees: TreeData[]; label: string }) => void;
  'session:changed': (s: { session: number }) => void;
}
