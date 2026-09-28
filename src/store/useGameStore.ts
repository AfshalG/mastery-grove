import { create } from 'zustand';
import {
  WorldData,
  TreeData,
  TreeState,
  ConfidenceLevel,
  DiagnosisResponse,
  QuestionAttempt,
  ConceptData,
  TreePrediction,
  PredictionStats,
  PredictionHit,
  MisconceptionData,
  ThoughtProcessRecord,
  WelcomeBackInfo,
  Reflection,
  ReflectionRating,
  TeachBackRecord,
  TeachBackResult,
  TeachSpot,
  ClassmateData,
} from '../types/game';
import type { PublicPlayer, Role } from '../types/realtime';
import { createRoom, joinRoom, leaveRoom, sendMove, sendNextSession, sendQuest, sendSummary, type RoomEvents } from '../net/classRoom';
import { SAMPLE_WORLD } from '../data/sampleWorld';
import { buildForest, isExtraTree, plantExtraTrees } from '../game/forest';
import { approachPoint, clampToBounds, routeTo, teachSpotPlace, type ForestLayout, type Vec2 } from '../game/layout';
import { bridgeTreesToGo, openBridges, planMissions, type MissionPlan, type Objective } from '../game/missions';
import { liveAvatar } from '../game/liveAvatar';
import { miaStatus, validTeachSpots } from '../game/teach';
import { diagnoseServe } from '../game/serve';
import { stoneSpots } from '../game/stones';
import { sanitizePassage, sanitizeVisual } from '../game/visuals';
import { computeTutorPick } from '../game/planner';
import { dueTrees, judgmentFeedback, reviewCard, type Card } from '../game/memory';
import {
  SAPLING_SPACING,
  activeMisconception,
  canOpenTree,
  countCompletedGroves,
  currentStreak,
  dedupeTreeIds,
  isGroveComplete,
  rootTreeId,
  unlockedConcepts,
  weakenMisconception,
  worldFingerprint,
} from '../game/progress';

interface LastAnswerInfo {
  isCorrect: boolean;
  tree: TreeData;
  /** For a hands-on serve: how many slices (or planks) the kid served. */
  served?: number;
  chosenChoice: string;
  confidence: ConfidenceLevel;
  prediction: TreePrediction | null;
  predictionHit: PredictionHit | null;
}

/** The class room this device is in, if any. */
export interface RoomInfo {
  code: string;
  playerId: string;
  role: Role;
  name: string;
  status: 'connected' | 'reconnecting';
}

interface GameStore {
  world: WorldData | null;
  /** Where groves, signs and the trail stand (src/game/layout.ts). Rebuilt whenever a world loads. */
  layout: ForestLayout | null;
  trees: TreeData[];
  screen: 'start' | 'game' | 'teacher';

  // Avatar & Controls
  avatarPosition: [number, number, number];
  targetPosition: [number, number, number] | null;
  /** The rest of a click-to-walk after targetPosition: over bridges, then to the spot clicked. */
  waypoints: [number, number, number][];
  targetTreeToOpen: string | null;
  /** Groves the kid has walked into (crossing into the next grove is a mission). */
  visitedGroves: string[];
  /**
   * Groves that have opened. Once open, a grove stays open: a memory check answered wrong wilts a tree, but it
   * never locks a grove (or breaks a bridge) the kid has already reached.
   */
  openedGroves: string[];
  /** The grove being worked on, its missions, and the next one: where Byte's beam points. */
  missionPlan: MissionPlan | null;
  objective: Objective | null;
  /** Why the kid can't cross a stream yet, for the note when they walk into the water or click past it. */
  bridgeNotice: (streamIndex: number) => string;

  // UI & Modals
  selectedTree: TreeData | null;
  /** Where the answer stones stand for the open question (one per choice); null when none are up. */
  answerStones: Vec2[] | null;
  /** A memory-check question keeps its choices hidden until the kid has an answer in mind (retrieval practice). */
  choicesHidden: boolean;
  /** Slices (or planks) picked so far in a hands-on serve, shared by the 3D cake and the card. */
  servedSlices: number[];
  toggleServeSlice: (index: number) => void;
  revealChoices: () => void;

  // Retention: sessions, Leitner cards, the Memory Quest and reflection
  session: number;
  cards: Record<string, Card>;
  reflections: Reflection[];
  /** The grove the kid just finished and hasn't reflected on yet. */
  pendingReflection: string | null;
  lastPlayedDay: string | null;
  /** A new session: trees due for a memory check come back (the teacher can start one; so does a new day). */
  startNextSession: () => void;
  /** Saves the kid's reflection and returns the feedback line, if their feeling and results disagree. */
  submitReflection: (rating: ReflectionRating, note: string) => string | null;
  dismissReflection: () => void;
  // Class rooms (Socket.IO): classmates in the same forest, and a live roster for the teacher
  room: RoomInfo | null;
  roomPlayers: PublicPlayer[];
  /** Live students, for the teacher's view. */
  roster: ClassmateData[];
  roomError: string | null;
  /** Teacher: open a room for the forest that's loaded. Returns the code, or null. */
  openClassRoom: (name: string) => Promise<string | null>;
  /** Student: join with a code; the teacher's forest loads. */
  joinClassRoom: (code: string, name: string) => Promise<boolean>;
  leaveClassRoom: () => void;
  /** Plants trees the teacher sent (or deployed here), skipping any already planted. */
  plantTeacherTrees: (trees: TreeData[], label: string, quiet?: boolean) => void;
  /** Starts the next session here and, for a teacher with a room open, for the whole class. */
  startClassSession: () => Promise<void>;

  // Mia's teach-back
  /** The world's teach spots that are usable, at most one per grove. */
  teachSpots: TeachSpot[];
  teachBacks: TeachBackRecord[];
  /** The grove whose Mia the kid is talking to; null when her card is closed. */
  openTeachSpot: string | null;
  targetSpotToOpen: string | null;
  teachBackPending: boolean;
  teachBackResult: TeachBackResult | null;
  teachBackError: string | null;
  /** Walks to Mia in that grove, and opens her card on arrival. */
  walkToMia: (conceptId: string) => void;
  openMia: (conceptId: string) => void;
  closeMia: () => void;
  /** Sends the kid's explanation (typed, or a voice note) to be marked, and records the try. */
  submitTeachBack: (said: { text: string } | { audio: { base64: string; mimeType: string } }) => Promise<void>;

  /** The kid is standing on an answer stone before saying how sure they are. */
  confidenceNudge: boolean;
  setConfidenceNudge: (on: boolean) => void;
  selectedConfidence: ConfidenceLevel | null;
  setSelectedConfidence: (confidence: ConfidenceLevel | null) => void;
  questListOpen: boolean;
  tutorBeaconTreeId: string | null;
  tutorBeaconReason: string | null;
  showPredictions: boolean;
  welcomeBackInfo: WelcomeBackInfo | null;
  saplingNotice: string | null;
  teacherToast: string | null;

  // Learner Model & Memory
  attempts: QuestionAttempt[];
  thoughtProcessRecords: ThoughtProcessRecord[];
  misconceptionStrength: Record<string, number>;
  activeMisconceptionId: string | null;
  overcomeMisconceptions: string[];
  predictionStats: PredictionStats;
  predictions: Record<string, TreePrediction>;
  isPredicting: boolean;

  // Diagnosis & Thought-Process Verification
  isDiagnosing: boolean;
  currentThoughtRecord: ThoughtProcessRecord | null;
  diagnosisResult: DiagnosisResponse | null;
  diagnosisError: string | null;
  lastAnswerResult: LastAnswerInfo | null;
  showExplanationModal: boolean;
  isRevising: boolean;

  // Sound cues
  soundTrigger: { type: 'correct' | 'wrong' | 'unlock'; time: number } | null;

  // Actions
  loadWorld: (world: WorldData) => void;
  loadSampleWorld: () => void;
  setScreen: (screen: 'start' | 'game' | 'teacher') => void;
  setAvatarPosition: (pos: [number, number, number]) => void;
  /** Walks there (over bridges). Returns false when an unfinished bridge stops the walk short. */
  moveTo: (pos: [number, number, number], treeIdToOpen?: string) => boolean;
  /** The avatar reached its walk target: clear it, and open the tree it was walking to, if any. */
  arriveAtTarget: () => void;
  /** Drop the walk target (the player took over with the keys). */
  cancelWalk: () => void;
  openTree: (tree: TreeData) => void;
  closeTree: () => void;
  toggleQuestList: () => void;
  setQuestListOpen: (open: boolean) => void;
  toggleShowPredictions: () => void;
  dismissWelcomeBack: () => void;
  setSaplingNotice: (msg: string | null) => void;

  // Adaptation & AI Workflows
  refreshPredictions: () => Promise<void>;
  updateTutorBeacon: () => void;
  answerTreeQuestion: (treeId: string, choiceIndex: number, confidence: ConfidenceLevel) => Promise<void>;
  answerServeQuestion: (treeId: string, servedCount: number, confidence: ConfidenceLevel) => Promise<void>;
  confirmThoughtProcess: (confirmed: 'yes' | 'no', studentWords?: string) => Promise<void>;
  retryDiagnosis: () => Promise<void>;
  dismissFeedback: () => void;
  deployTeacherQuest: (misconceptionId: string) => Promise<void>;
  checkAndPlantMemorySprouts: () => Promise<void>;
  getUnlockedConcepts: () => string[];
  getCurrentGroveProgress: () => { questName: string; current: number; total: number };
}

const MIA_NEEDS_HELP = 'Mia needs your help';

/** Lets the correct-answer chime finish before a grove's unlock fanfare. */
const UNLOCK_SOUND_DELAY_MS = 700;

function getStorageKey(world: WorldData) {
  return `mastery_grove_learner_${world.subject.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${worldFingerprint(world)}`;
}

/** What gets saved for a learner, whenever any of it changes (see the subscription at the end of this file). */
const SAVED_FIELDS = [
  'attempts',
  'thoughtProcessRecords',
  'misconceptionStrength',
  'activeMisconceptionId',
  'overcomeMisconceptions',
  'predictionStats',
  'predictions',
  'trees',
  'session',
  'cards',
  'reflections',
  'lastPlayedDay',
  'teachBacks',
  'visitedGroves',
  'openedGroves',
] as const;

const today = () => new Date().toISOString().slice(0, 10);

/** Each diagnosis request gets a number; a reply for an older one updates the records but not the card. */
let diagnosisSeq = 0;
/** Each prediction request gets a number; only the newest reply is used. */
let predictionSeq = 0;

interface DiagnosisContext {
  seq: number;
  tree: TreeData;
  chosenChoice: string;
  saplingId: string;
}
/** The last diagnosis request, so Retry can resend it and apply the reply the same way. */
let lastDiagnosis: { ctx: DiagnosisContext; payload: unknown } | null = null;

export const useGameStore = create<GameStore>((set, get) => ({
  world: null,
  layout: null,
  trees: [],
  screen: 'start',

  avatarPosition: [0, 0, 2],
  targetPosition: null,
  waypoints: [],
  targetTreeToOpen: null,
  visitedGroves: [],
  openedGroves: [],
  missionPlan: null,
  objective: null,
  bridgeNotice: (streamIndex) => {
    const { world, layout, trees } = get();
    const stream = layout?.streams[streamIndex];
    if (!world || !layout || !stream) return 'The bridge isn’t finished yet.';
    const past = world.concepts.find((c) => c.id === layout.groves[stream.beforeGrove]?.conceptId);
    const toGo = bridgeTreesToGo(world, layout, trees, get().getUnlockedConcepts(), streamIndex);
    const builder = past?.prerequisites.length === 1 ? world.concepts.find((c) => c.id === past.prerequisites[0]) : undefined;
    const where = builder ? ` in ${builder.questName}` : '';
    return toGo > 0
      ? `The bridge to ${past?.questName ?? 'the next grove'} isn’t finished. Grow ${toGo} more tree${toGo > 1 ? 's' : ''}${where} to build it.`
      : 'The bridge isn’t finished yet.';
  },

  selectedTree: null,
  answerStones: null,
  choicesHidden: false,
  servedSlices: [],
  toggleServeSlice: (index) => {
    const { selectedTree, servedSlices, showExplanationModal } = get();
    if (!selectedTree?.serveConfig || showExplanationModal || index < 0 || index >= selectedTree.serveConfig.totalSlices) return;
    set({ servedSlices: servedSlices.includes(index) ? servedSlices.filter((i) => i !== index) : [...servedSlices, index] });
  },
  revealChoices: () => {
    const { selectedTree } = get();
    if (!selectedTree) return;
    set({ choicesHidden: false, answerStones: stonesFor(selectedTree) });
  },
  session: 1,
  cards: {},
  reflections: [],
  pendingReflection: null,
  lastPlayedDay: null,
  startNextSession: () => {
    const { session, cards, trees } = get();
    const next = session + 1;
    const due = new Set(dueTrees(cards, next));
    set({ session: next, lastPlayedDay: today(), trees: trees.map((t) => (due.has(t.id) ? { ...t, memoryDue: true } : t)) });
    if (due.size > 0) flashToast(`Memory Quest: ${due.size} tree${due.size > 1 ? 's' : ''} to remember.`);
    get().updateTutorBeacon();
    get().refreshPredictions();
  },
  submitReflection: (rating, note) => {
    const { pendingReflection: conceptId, attempts, trees, session } = get();
    if (!conceptId) return null;
    const inGrove = attempts.filter((a) => trees.find((t) => t.id === a.treeId)?.conceptId === conceptId);
    const accuracy = inGrove.length ? inGrove.filter((a) => a.correct).length / inGrove.length : 1;
    const feedback = judgmentFeedback(rating, accuracy);
    const reflection: Reflection = { conceptId, rating, note: note.trim().slice(0, 300), accuracy, feedback, session, at: Date.now() };
    set({ reflections: [reflection, ...get().reflections] });
    return feedback;
  },
  dismissReflection: () => set({ pendingReflection: null }),

  room: null,
  roomPlayers: [],
  roster: [],
  roomError: null,
  openClassRoom: async (name) => {
    const { world } = get();
    if (!world) return null;
    set({ roomError: null });
    const reply = await createRoom(world, name, roomEvents);
    if (!reply.ok) {
      set({ roomError: reply.error });
      return null;
    }
    set({ room: { code: reply.code, playerId: reply.playerId, role: 'teacher', name, status: 'connected' }, roomPlayers: reply.players, roster: [] });
    return reply.code;
  },
  joinClassRoom: async (code, name) => {
    set({ roomError: null });
    const reply = await joinRoom(code, name, roomEvents);
    if (!reply.ok) {
      set({ roomError: reply.error });
      return false;
    }
    // The teacher's forest, with this kid's own saved progress in it if they've played it before.
    get().loadWorld(reply.world);
    set({ room: { code: reply.code, playerId: reply.playerId, role: 'student', name, status: 'connected' }, roomPlayers: reply.players, roster: [] });
    if (reply.deployed.length > 0) get().plantTeacherTrees(reply.deployed, '', true);
    pushSummary();
    return true;
  },
  leaveClassRoom: () => {
    leaveRoom();
    set({ room: null, roomPlayers: [], roster: [], roomError: null });
  },
  plantTeacherTrees: (incoming, label, quiet = false) => {
    const { world, trees } = get();
    if (!world) return;
    const have = new Set(trees.map((t) => t.id));
    const fresh: TreeData[] = incoming
      .filter(
        (t) =>
          !have.has(t.id) &&
          world.concepts.some((c) => c.id === t.conceptId) &&
          Array.isArray(t.choices) &&
          t.choices.every((c) => typeof c === 'string') &&
          Number.isInteger(t.answerIndex) &&
          t.answerIndex >= 0 &&
          t.answerIndex < t.choices.length
      )
      .map((t) => ({
        ...t,
        state: 'unanswered' as const,
        isTeacherDeployed: true,
        visual: sanitizeVisual(t.visual),
        passage: sanitizePassage(t.passage),
        position: undefined,
        groveIndex: Math.max(0, world.concepts.findIndex((c) => c.id === t.conceptId)),
      }));
    if (fresh.length === 0) return;
    set((state) => ({ trees: [...state.trees, ...plantExtraTrees(state.layout, state.trees, fresh)] }));
    if (!quiet) flashToast(`Your teacher sent ${fresh.length} new tree${fresh.length > 1 ? 's' : ''}${label ? `: ${label}` : ''}.`);
    get().updateTutorBeacon();
  },
  startClassSession: async () => {
    get().startNextSession();
    if (get().room?.role !== 'teacher') return;
    const reply = await sendNextSession(roomEvents);
    if (!reply.ok) set({ roomError: reply.error });
  },

  teachSpots: [],
  teachBacks: [],
  openTeachSpot: null,
  targetSpotToOpen: null,
  teachBackPending: false,
  teachBackResult: null,
  teachBackError: null,
  walkToMia: (conceptId) => {
    const { layout, teachSpots } = get();
    const grove = layout?.groves.find((g) => g.conceptId === conceptId);
    if (!grove || !teachSpots.some((t) => t.conceptId === conceptId)) return;
    const { stand } = teachSpotPlace(grove);
    const reaches = get().moveTo([stand.x, 0, stand.z]);
    set({ targetSpotToOpen: reaches ? conceptId : null, questListOpen: false });
  },
  openMia: (conceptId) => {
    if (!get().teachSpots.some((t) => t.conceptId === conceptId)) return;
    if (!get().getUnlockedConcepts().includes(conceptId)) {
      get().setSaplingNotice('Mia is in a grove that opens later.');
      return;
    }
    // One card at a time: talking to Mia puts any open question away.
    if (get().selectedTree) get().closeTree();
    // The kid found her, so the note saying where she is can go (on phones it would cover her).
    const toast = get().teacherToast;
    set({
      openTeachSpot: conceptId,
      teachBackResult: null,
      teachBackError: null,
      questListOpen: false,
      teacherToast: toast?.startsWith(MIA_NEEDS_HELP) ? null : toast,
    });
  },
  closeMia: () => set({ openTeachSpot: null, teachBackResult: null, teachBackError: null }),
  submitTeachBack: async (said) => {
    const { openTeachSpot: conceptId, teachSpots, world, teachBackPending } = get();
    const spot = teachSpots.find((t) => t.conceptId === conceptId);
    if (!conceptId || !spot || teachBackPending) return;
    set({ teachBackPending: true, teachBackResult: null, teachBackError: null });

    try {
      const res = await fetch('/api/grade-teach-back', {
        method: 'POST',
        // A stuck request gives up and shows the retry, instead of spinning.
        signal: AbortSignal.timeout(75_000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conceptName: world?.concepts.find((c) => c.id === conceptId)?.name ?? '',
          puzzledThought: spot.puzzledThought,
          rubricPoints: spot.rubricPoints,
          ...('text' in said ? { explanation: said.text } : { audio: said.audio }),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || typeof data.passed !== 'boolean') throw new Error(data?.error || 'Mia couldn’t follow that. Try again?');
      const result = data as TeachBackResult;

      const record: TeachBackRecord = {
        conceptId,
        passed: result.passed,
        hit: result.hit,
        missing: result.missing,
        words: ('text' in said ? said.text : result.transcript ?? '').trim().slice(0, 1200),
        spoken: !('text' in said),
        session: get().session,
        at: Date.now(),
      };
      const update: Partial<GameStore> = { teachBacks: [record, ...get().teachBacks].slice(0, 60), teachBackPending: false };
      // The try is recorded even if the kid walked off; the card only shows it if it is still open on her.
      if (get().openTeachSpot === conceptId) update.teachBackResult = result;

      if (result.passed) {
        // Explaining Mia's mix-up well is strong evidence the kid is past it too.
        const strengths = { ...get().misconceptionStrength };
        if (spot.misconceptionId) strengths[spot.misconceptionId] = weakenMisconception(strengths[spot.misconceptionId] ?? 0);
        update.misconceptionStrength = strengths;
        update.activeMisconceptionId = activeMisconception(strengths, get().overcomeMisconceptions);
        update.soundTrigger = { type: 'unlock', time: Date.now() };
      }
      set(update);
      if (result.passed) get().updateTutorBeacon();
    } catch (error: any) {
      set({ teachBackPending: false, teachBackError: error?.message || 'Mia couldn’t follow that. Try again?' });
    }
  },

  confidenceNudge: false,
  setConfidenceNudge: (on) => set({ confidenceNudge: on }),
  selectedConfidence: null,
  setSelectedConfidence: (confidence) => set({ selectedConfidence: confidence }),
  questListOpen: false,
  tutorBeaconTreeId: null,
  tutorBeaconReason: null,
  showPredictions: true,
  welcomeBackInfo: null,
  saplingNotice: null,
  teacherToast: null,

  attempts: [],
  thoughtProcessRecords: [],
  misconceptionStrength: {},
  activeMisconceptionId: null,
  overcomeMisconceptions: [],
  predictionStats: { exact: 0, direction: 0, miss: 0 },
  predictions: {},
  isPredicting: false,

  isDiagnosing: false,
  currentThoughtRecord: null,
  diagnosisResult: null,
  diagnosisError: null,
  lastAnswerResult: null,
  showExplanationModal: false,
  isRevising: false,

  soundTrigger: null,

  loadWorld: (rawWorld: WorldData) => {
    // Unique tree ids, and every picture checked before anything draws it (a malformed one crashed the scene).
    rawWorld = {
      ...rawWorld,
      trees: dedupeTreeIds(rawWorld.trees).map((t) => ({ ...t, visual: sanitizeVisual(t.visual), passage: sanitizePassage(t.passage) })),
    };

    let savedData: any = null;
    try {
      const raw = localStorage.getItem(getStorageKey(rawWorld));
      if (raw) savedData = JSON.parse(raw);
    } catch (e) {
      console.warn('Could not read saved progress:', e);
    }
    const fresh = buildForest(rawWorld, rawWorld.trees);
    const defaultTrees = fresh.trees;
    let layout = fresh.layout;

    let initialTrees = defaultTrees;
    let initialAttempts: QuestionAttempt[] = [];
    let initialThoughts: ThoughtProcessRecord[] = [];
    let initialStrengths: Record<string, number> = {};
    let initialOvercome: string[] = [];
    let initialStats: PredictionStats = { exact: 0, direction: 0, miss: 0 };
    let initialPredictions: Record<string, TreePrediction> = {};
    let initialActiveMis: string | null = null;
    let welcomeInfo: WelcomeBackInfo | null = null;
    let initialSession = 1;
    let initialCards: Record<string, Card> = {};
    let initialReflections: Reflection[] = [];
    let initialTeachBacks: TeachBackRecord[] = [];
    let initialVisited: string[] = [];
    let initialOpened: string[] = [];
    let initialDay: string | null = null;

    rawWorld.misconceptions.forEach((m) => {
      initialStrengths[m.id] = 0;
    });

    if (savedData && Array.isArray(savedData.attempts) && savedData.attempts.length > 0) {
      // Restore from localStorage!
      initialAttempts = savedData.attempts;
      initialThoughts = savedData.thoughtProcessRecords || [];
      initialStrengths = { ...initialStrengths, ...(savedData.misconceptionStrength || {}) };
      initialOvercome = savedData.overcomeMisconceptions || [];
      initialStats = savedData.predictionStats || initialStats;
      initialPredictions = savedData.predictions || {};
      initialActiveMis = savedData.activeMisconceptionId || null;
      initialSession = Number(savedData.session) || 1;
      initialCards = savedData.cards || {};
      initialReflections = savedData.reflections || [];
      initialTeachBacks = Array.isArray(savedData.teachBacks) ? savedData.teachBacks : [];
      initialVisited = Array.isArray(savedData.visitedGroves) ? savedData.visitedGroves : [];
      initialOpened = Array.isArray(savedData.openedGroves) ? savedData.openedGroves : [];
      initialDay = savedData.lastPlayedDay || null;

      if (Array.isArray(savedData.trees) && savedData.trees.length >= defaultTrees.length) {
        // Keep saved progress but recompute every position, so older saves get the current layout.
        const savedTrees: TreeData[] = savedData.trees.map((t: TreeData) => ({ ...t, visual: sanitizeVisual(t.visual), passage: sanitizePassage(t.passage) }));
        const restored = buildForest(rawWorld, savedTrees);
        initialTrees = restored.trees;
        layout = restored.layout;
      }

      const streak = currentStreak(initialAttempts);
      const completedGrovesCount = countCompletedGroves(rawWorld.concepts, initialTrees);

      // Generate friendly Professor Byte memory text
      let watchPattern = 'You made great progress last time.';
      if (initialActiveMis) {
        const activeM = rawWorld.misconceptions.find((m) => m.id === initialActiveMis);
        if (activeM) {
          const concept = rawWorld.concepts.find((c) => c.id === activeM.conceptId);
          watchPattern = `Last time you were working on ${concept?.name || 'this'}. Watch out for this one: ${activeM.label}.`;
        }
      } else if (rawWorld.concepts[0]) {
        watchPattern = `Last time you grew trees in ${rawWorld.concepts[0].questName}.`;
      }

      welcomeInfo = {
        lastWorldSubject: rawWorld.subject,
        thoughtPatternToWatch: watchPattern,
        unlockedGrovesCount: rawWorld.concepts.length,
        completedGrovesCount,
        streak,
      };
    }

    set({
      world: rawWorld,
      layout,
      trees: initialTrees,
      screen: 'game',
      avatarPosition: [layout.spawn.x, 0, layout.spawn.z],
      targetPosition: null,
      waypoints: [],
      targetTreeToOpen: null,
      visitedGroves: initialVisited,
      openedGroves: initialOpened,
      selectedTree: null,
      questListOpen: false,
      diagnosisResult: null,
      diagnosisError: null,
      currentThoughtRecord: null,
      lastAnswerResult: null,
      showExplanationModal: false,
      attempts: initialAttempts,
      thoughtProcessRecords: initialThoughts,
      misconceptionStrength: initialStrengths,
      activeMisconceptionId: initialActiveMis,
      overcomeMisconceptions: initialOvercome,
      predictionStats: initialStats,
      predictions: initialPredictions,
      isPredicting: false,
      welcomeBackInfo: welcomeInfo,
      saplingNotice: null,
      session: initialSession,
      cards: initialCards,
      reflections: initialReflections,
      pendingReflection: null,
      teachSpots: validTeachSpots(rawWorld),
      teachBacks: initialTeachBacks,
      openTeachSpot: null,
      targetSpotToOpen: null,
      teachBackPending: false,
      teachBackResult: null,
      teachBackError: null,
      lastPlayedDay: initialDay ?? today(),
    });
    // Missions and the beam (Byte's pick is one input to them).
    get().updateTutorBeacon();

    // Coming back on a new day starts a new session, and its Memory Quest.
    if (initialDay && initialDay !== today() && Object.keys(initialCards).length > 0) get().startNextSession();

    // Check for retention check memory sprouts and refresh predictions
    setTimeout(() => {
      get().checkAndPlantMemorySprouts();
      get().refreshPredictions();
    }, 200);
  },

  loadSampleWorld: () => {
    get().loadWorld(SAMPLE_WORLD);
  },

  setScreen: (screen) => set({ screen }),
  setAvatarPosition: (pos) => {
    set({ avatarPosition: pos });
    if (get().room) sendMove(pos[0], pos[2], liveAvatar.heading, liveAvatar.moving);
    // Walking into a grove for the first time counts (crossing into it is a mission).
    const { layout, visitedGroves } = get();
    const inside = layout?.groves.find((g) => Math.hypot(pos[0] - g.centre.x, pos[2] - g.centre.z) < g.clearingRadius);
    if (inside && !visitedGroves.includes(inside.conceptId)) {
      set({ visitedGroves: [...visitedGroves, inside.conceptId] });
      get().updateTutorBeacon();
    }
  },
  moveTo: (pos, treeIdToOpen) => {
    // Never aim outside the walkable area, or the avatar would try to walk off the map.
    const layout = get().layout;
    const p = layout ? clampToBounds(layout, { x: pos[0], z: pos[2] }) : { x: pos[0], z: pos[2] };
    if (!layout) {
      set({ targetPosition: [p.x, 0, p.z], waypoints: [], targetTreeToOpen: treeIdToOpen || null, targetSpotToOpen: null });
      return true;
    }
    // Water is crossed by bridges; an unfinished one ends the walk at its near end.
    const { path, blockedAt } = routeTo(layout, openBridges(layout, get().getUnlockedConcepts()), { x: liveAvatar.x, z: liveAvatar.z }, p);
    const [first, ...rest] = path.map((q): [number, number, number] => [q.x, 0, q.z]);
    set({ targetPosition: first, waypoints: rest, targetTreeToOpen: blockedAt === null ? treeIdToOpen || null : null, targetSpotToOpen: null });
    if (blockedAt !== null) get().setSaplingNotice(get().bridgeNotice(blockedAt));
    return blockedAt === null;
  },
  arriveAtTarget: () => {
    const { targetTreeToOpen, targetSpotToOpen, trees, waypoints } = get();
    // Partway along a walk (say, at the end of a bridge): on to the next point.
    if (waypoints.length > 0) {
      set({ targetPosition: waypoints[0], waypoints: waypoints.slice(1) });
      return;
    }
    set({ targetPosition: null, targetTreeToOpen: null, targetSpotToOpen: null });
    const tree = targetTreeToOpen ? trees.find((t) => t.id === targetTreeToOpen) : undefined;
    if (tree) get().openTree(tree);
    else if (targetSpotToOpen) get().openMia(targetSpotToOpen);
  },
  cancelWalk: () => set({ targetPosition: null, waypoints: [], targetTreeToOpen: null, targetSpotToOpen: null }),

  openTree: (tree) => {
    const check = canOpenTree(tree, get().getUnlockedConcepts());
    if (!check.ok) {
      if (check.reason === 'waiting') {
        const remaining = SAPLING_SPACING - (tree.answersSinceMiss ?? 0);
        get().setSaplingNotice(`This one comes back after ${remaining} more question${remaining > 1 ? 's' : ''}.`);
      } else if (check.reason === 'done') {
        get().setSaplingNotice('You already grew this one.');
      } else if (check.reason === 'withered') {
        get().setSaplingNotice('This one comes back as a sapling soon.');
      }
      return;
    }

    // A memory check asks the kid to think of the answer before the choices (and their stones) appear.
    const choicesHidden = !!tree.memoryDue;

    set({
      selectedTree: tree,
      answerStones: choicesHidden ? null : stonesFor(tree),
      choicesHidden,
      servedSlices: [],
      openTeachSpot: null,
      teachBackResult: null,
      teachBackError: null,
      questListOpen: false, // the list is for finding trees; it would sit under the question card
      selectedConfidence: null,
      diagnosisResult: null,
      diagnosisError: null,
      currentThoughtRecord: null,
      showExplanationModal: false,
      lastAnswerResult: null,
    });
  },

  closeTree: () => {
    set({
      selectedTree: null,
      answerStones: null,
      choicesHidden: false,
      servedSlices: [],
      selectedConfidence: null,
      diagnosisResult: null,
      diagnosisError: null,
      currentThoughtRecord: null,
      showExplanationModal: false,
      lastAnswerResult: null,
    });
  },

  toggleQuestList: () => set((state) => ({ questListOpen: !state.questListOpen })),
  setQuestListOpen: (open) => set({ questListOpen: open }),
  toggleShowPredictions: () => set((state) => ({ showPredictions: !state.showPredictions })),
  dismissWelcomeBack: () => set({ welcomeBackInfo: null }),
  setSaplingNotice: (msg) => {
    set({ saplingNotice: msg });
    if (msg) {
      setTimeout(() => {
        if (get().saplingNotice === msg) set({ saplingNotice: null });
      }, 4000);
    }
  },

  updateTutorBeacon: () => {
    const { trees, predictions, activeMisconceptionId, world, layout, teachSpots, teachBacks, visitedGroves, openedGroves } = get();
    if (!world) return;
    const unlocked = get().getUnlockedConcepts();
    // Remember every grove that has opened, so it stays open.
    if (unlocked.some((id) => !openedGroves.includes(id))) set({ openedGroves: unlocked });
    const pick = computeTutorPick(trees, unlocked, predictions, activeMisconceptionId, world.misconceptions);
    // The beam follows the next mission: a tree (Byte's pick when it's in this grove), Mia, or the next grove.
    const plan = layout
      ? planMissions({ world, layout, trees, unlocked, teachSpots, teachBacks, visited: visitedGroves, pickTreeId: pick.beaconId })
      : null;
    const objective = plan ? plan.next?.objective ?? null : pick.beaconId ? ({ kind: 'tree', treeId: pick.beaconId } as Objective) : null;
    const treeId = objective?.kind === 'tree' ? objective.treeId : null;
    set({
      tutorBeaconTreeId: treeId,
      tutorBeaconReason: treeId === null ? null : treeId === pick.beaconId ? pick.reason : plan?.next?.kind === 'memory' ? 'Do you still remember this one?' : 'next on your mission',
      missionPlan: plan,
      objective,
    });
  },

  refreshPredictions: async () => {
    const { world, trees, attempts, thoughtProcessRecords } = get();
    if (!world) return;

    const unlocked = get().getUnlockedConcepts();
    const openTrees = trees.filter((t) => canOpenTree(t, unlocked).ok);
    if (openTrees.length === 0) return;

    // A refresh made while another is in flight used to be dropped; now the newest one wins.
    const seq = ++predictionSeq;
    set({ isPredicting: true });

    try {
      const recentAttempts = attempts.slice(0, 10).map((a) => ({
        question: a.question,
        choice: a.choice,
        correct: a.correct,
        confidence: a.confidence,
        misconceptionId: a.misconceptionId,
      }));

      const memory = thoughtProcessRecords.slice(0, 5).map((r) => ({
        question: r.question,
        choice: r.choice,
        thoughtProcess: r.thoughtProcess,
        confirmed: r.confirmed,
      }));

      const payload = {
        misconceptions: world.misconceptions,
        openTrees: openTrees.map((t) => ({
          id: t.id,
          conceptId: t.conceptId,
          question: t.question,
          choices: t.choices,
          answerIndex: t.answerIndex,
        })),
        recentAttempts,
        memory,
      };

      const res = await fetch('/api/predict-trees', {
        method: 'POST',
        // A stuck request gives up and shows the retry, instead of spinning.
        signal: AbortSignal.timeout(45_000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Predict endpoint status ${res.status}`);

      const data = await res.json();
      if (seq !== predictionSeq) return; // a newer refresh is on its way
      if (Array.isArray(data.predictions)) {
        const nextPreds = { ...get().predictions };
        data.predictions.forEach((p: TreePrediction) => {
          if (p.treeId) nextPreds[p.treeId] = p;
        });

        set({ predictions: nextPreds, isPredicting: false });
        get().updateTutorBeacon();
      } else {
        set({ isPredicting: false });
      }
    } catch (err) {
      console.warn('Background predictions update failed:', err);
      if (seq === predictionSeq) set({ isPredicting: false });
    }
  },

  getUnlockedConcepts: () => {
    const { world, trees, openedGroves } = get();
    if (!world) return [];
    const now = unlockedConcepts(world, trees);
    return world.concepts.map((c) => c.id).filter((id) => now.includes(id) || openedGroves.includes(id));
  },

  getCurrentGroveProgress: () => {
    const { world, layout, trees, avatarPosition } = get();
    if (!world || world.concepts.length === 0) {
      return { questName: 'Loading Grove', current: 0, total: 0 };
    }

    const unlocked = get().getUnlockedConcepts();
    let activeConcept: ConceptData = world.concepts[0];
    let minDistance = Infinity;

    world.concepts.forEach((concept, idx) => {
      if (!unlocked.includes(concept.id)) return;
      const center = layout?.groves[idx]?.centre;
      if (!center) return;
      const dist = Math.hypot(avatarPosition[0] - center.x, avatarPosition[2] - center.z);
      if (dist < minDistance) {
        minDistance = dist;
        activeConcept = concept;
      }
    });

    const groveTrees = trees.filter((t) => t.conceptId === activeConcept.id && !isExtraTree(t));
    const answeredCount = groveTrees.filter((t) => t.state === 'healthy' || t.state === 'regrown').length;

    return {
      questName: activeConcept.questName,
      current: answeredCount,
      total: groveTrees.length,
    };
  },

  // Check if completed groves qualify for a "Memory Sprout" retention check
  checkAndPlantMemorySprouts: async () => {
    const { world, trees, thoughtProcessRecords, overcomeMisconceptions } = get();
    if (!world) return;

    world.concepts.forEach(async (concept, idx) => {
      const isComplete = isGroveComplete(trees, concept.id);

      const existingMemorySprout = trees.find((t) => t.conceptId === concept.id && t.isMemorySprout);

      if (isComplete && !existingMemorySprout) {
        // Find if student had a diagnosed misconception for this concept
        const conceptMisconceptions = world.misconceptions.filter((m) => m.conceptId === concept.id);
        const flaggedMisId = thoughtProcessRecords.find((r) => conceptMisconceptions.some((m) => m.id === r.misconceptionId))?.misconceptionId;
        const targetMis = conceptMisconceptions.find((m) => m.id === flaggedMisId) || conceptMisconceptions[0];

        if (targetMis && !overcomeMisconceptions.includes(targetMis.id)) {
          try {
            const res = await fetch('/api/generate-retention-check', {
              method: 'POST',
              // A stuck request gives up and shows the retry, instead of spinning.
              signal: AbortSignal.timeout(45_000),
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                conceptName: concept.questName,
                misconception: targetMis,
                worldSubject: world.subject,
              }),
            });

            if (res.ok) {
              const qData = await res.json();
              const sproutTree: TreeData = {
                id: `memory_sprout_${concept.id}_${Date.now()}`,
                conceptId: concept.id,
                question: qData.question,
                choices: qData.choices,
                answerIndex: qData.answerIndex,
                explanation: qData.explanation,
                citation: null,
                state: 'unanswered',
                isMemorySprout: true,
                targetMisconceptionId: targetMis.id,
                groveIndex: idx,
              };

              set((state) => ({ trees: [...state.trees, ...plantExtraTrees(state.layout, state.trees, [sproutTree])] }));
              flashToast(`A memory tree grew in ${concept.questName}. Do you still remember?`);

              get().updateTutorBeacon();
            }
          } catch (e) {
            console.warn('Memory sprout generation deferred:', e);
          }
        }
      }
    });
  },

  answerTreeQuestion: async (treeId: string, choiceIndex: number, confidence: ConfidenceLevel) => {
    const {
      trees,
      world,
      predictions,
      predictionStats,
      misconceptionStrength,
      thoughtProcessRecords,
      overcomeMisconceptions,
    } = get();
    const tree = trees.find((t) => t.id === treeId);
    if (!tree || !world) return;

    const isCorrect = choiceIndex === tree.answerIndex;
    const chosenChoice = tree.choices[choiceIndex];
    const correctChoice = tree.choices[tree.answerIndex];

    // Score prediction
    const treePrediction = predictions[treeId] || null;
    let hit: PredictionHit | null = null;
    const nextStats = { ...predictionStats };

    if (treePrediction) {
      if (treePrediction.predictedChoice === choiceIndex) {
        hit = 'exact';
        nextStats.exact += 1;
      } else if ((treePrediction.pCorrect >= 0.5) === isCorrect) {
        hit = 'direction';
        nextStats.direction += 1;
      } else {
        hit = 'miss';
        nextStats.miss += 1;
      }
    }

    // SPACING UPDATE: On every answer, increment answersSinceMiss for all pending saplings!
    const updatedTreesWithSpacing: TreeData[] = trees.map((t) => {
      if (t.state === 'sapling' && t.id !== treeId) {
        return {
          ...t,
          answersSinceMiss: (t.answersSinceMiss ?? 0) + 1,
        };
      }
      return t;
    });

    const prevUnlocked = get().getUnlockedConcepts();
    const treesBefore = get().trees;

    if (isCorrect) {
      const nextState: TreeState =
        tree.state === 'withered' || tree.state === 'sapling' || tree.isSapling ? 'regrown' : 'healthy';

      // A sapling answered right regrows the worksheet tree it came from, however many tries back.
      const rootId = tree.isSapling ? rootTreeId(trees, tree) : null;
      const finalTrees: TreeData[] = updatedTreesWithSpacing.map((t) => {
        if (t.id === treeId) return { ...t, state: nextState, memoryDue: false };
        if (rootId && rootId !== treeId && t.id === rootId) return { ...t, state: 'regrown' };
        return t;
      });

      // Handle Memory Sprout retention check success
      let nextOvercome = [...overcomeMisconceptions];
      const updatedStrengths = { ...misconceptionStrength };

      if (tree.isMemorySprout && tree.targetMisconceptionId) {
        if (!nextOvercome.includes(tree.targetMisconceptionId)) {
          nextOvercome.push(tree.targetMisconceptionId);
        }
        updatedStrengths[tree.targetMisconceptionId] = 0;
        flashToast('You remembered! That mix-up is fixed.');
      } else {
        // Regular tree correct: halve misconception strength for that concept
        world.misconceptions
          .filter((m) => m.conceptId === tree.conceptId)
          .forEach((m) => {
            updatedStrengths[m.id] = weakenMisconception(updatedStrengths[m.id] || 0);
          });
      }

      const highestId = activeMisconception(updatedStrengths, nextOvercome);

      const attempt: QuestionAttempt = {
        treeId,
        choice: chosenChoice,
        choiceIndex,
        correct: true,
        confidence,
        misconceptionId: null,
        hint: null,
        prediction: treePrediction,
        predictionHit: hit,
        at: Date.now(),
        question: tree.question,
        correctAnswer: correctChoice,
      };

      const nextAttempts = [attempt, ...get().attempts];

      set({
        trees: finalTrees,
        cards: reviewedCards(tree, true),
        selectedTree: { ...tree, state: nextState },
        lastAnswerResult: {
          isCorrect: true,
          tree,
          chosenChoice,
          confidence,
          prediction: treePrediction,
          predictionHit: hit,
        },
        showExplanationModal: true,
        attempts: nextAttempts,
        misconceptionStrength: updatedStrengths,
        activeMisconceptionId: highestId,
        overcomeMisconceptions: nextOvercome,
        predictionStats: nextStats,
        soundTrigger: { type: 'correct', time: Date.now() },
      });

      const nextUnlocked = get().getUnlockedConcepts();
      if (nextUnlocked.length > prevUnlocked.length) {
        setTimeout(() => set({ soundTrigger: { type: 'unlock', time: Date.now() } }), UNLOCK_SOUND_DELAY_MS);
      }

      // Check if memory sprouts can now be planted for newly completed groves
      get().checkAndPlantMemorySprouts();
      maybeAskForReflection(tree.conceptId);
      maybeAnnounceMia(tree.conceptId, treesBefore);
      get().updateTutorBeacon();
      get().refreshPredictions();
    } else {
      // Wrong!
      const updatedTrees = updatedTreesWithSpacing.map((t) =>
        t.id === treeId ? { ...t, state: 'withered' as const, memoryDue: false } : t
      );

      // Sprout a sapling beside the missed tree, starting with answersSinceMiss = 0
      const saplingId = `sapling_${tree.id}_${Date.now()}`;
      const groveIdx = tree.groveIndex ?? 0;
      const [saplingTree] = plantExtraTrees(get().layout, updatedTrees, [
        {
          ...tree,
          id: saplingId,
          state: 'sapling',
          isSapling: true,
          sourceTreeId: tree.id,
          groveIndex: groveIdx,
          answersSinceMiss: 0, // Needs 2 more answers before opening
        },
      ]);

      const finalTrees = [...updatedTrees, saplingTree];

      const preliminaryAttempt: QuestionAttempt = {
        treeId,
        choice: chosenChoice,
        choiceIndex,
        correct: false,
        confidence,
        misconceptionId: null,
        hint: null,
        prediction: treePrediction,
        predictionHit: hit,
        at: Date.now(),
        question: tree.question,
        correctAnswer: correctChoice,
      };

      set({
        trees: finalTrees,
        cards: reviewedCards(tree, false),
        selectedTree: { ...tree, state: 'withered' },
        isDiagnosing: true,
        diagnosisError: null,
        diagnosisResult: null,
        currentThoughtRecord: null,
        predictionStats: nextStats,
        attempts: [preliminaryAttempt, ...get().attempts],
        lastAnswerResult: {
          isCorrect: false,
          tree,
          chosenChoice,
          confidence,
          prediction: treePrediction,
          predictionHit: hit,
        },
        showExplanationModal: true,
        soundTrigger: { type: 'wrong', time: Date.now() },
      });

      // Call thought-process diagnosis endpoint
      const memory = thoughtProcessRecords.slice(0, 5).map((r) => ({
        question: r.question,
        choice: r.choice,
        thoughtProcess: r.thoughtProcess,
        confirmed: r.confirmed,
      }));

      const payload = {
        question: tree.question,
        studentChoice: chosenChoice,
        correctAnswer: correctChoice,
        confidence,
        misconceptions: world.misconceptions.filter((m) => m.conceptId === tree.conceptId),
        memory,
      };

      const ctx: DiagnosisContext = { seq: ++diagnosisSeq, tree, chosenChoice, saplingId };
      lastDiagnosis = { ctx, payload };
      await requestDiagnosis(ctx, payload);
    }
  },

  answerServeQuestion: async (treeId: string, servedCount: number, confidence: ConfidenceLevel) => {
    const {
      trees,
      world,
      predictions,
      predictionStats,
      misconceptionStrength,
      thoughtProcessRecords,
      overcomeMisconceptions,
    } = get();
    const tree = trees.find((t) => t.id === treeId);
    if (!tree || !world || !tree.serveConfig) return;

    const { targetNumerator, targetDenominator, totalSlices } = tree.serveConfig;
    const targetRatio = targetNumerator / targetDenominator;
    // Plain rules mark the serve and, if it's wrong, name the exact mistake (src/game/serve.ts).
    const serve = diagnoseServe(tree.serveConfig, servedCount);
    const isCorrect = serve.correct;
    const unit = tree.serveConfig.whole === 'bridge' ? 'planks' : 'slices';

    const chosenChoice = `${servedCount}/${totalSlices} ${unit}`;
    const correctChoice = `${Math.round(targetRatio * totalSlices)}/${totalSlices} ${unit} (${targetNumerator}/${targetDenominator})`;

    const treePrediction = predictions[treeId] || null;
    let hit: PredictionHit | null = null;
    const nextStats = { ...predictionStats };

    if (treePrediction) {
      if ((treePrediction.pCorrect >= 0.5) === isCorrect) {
        hit = 'direction';
        nextStats.direction += 1;
      } else {
        hit = 'miss';
        nextStats.miss += 1;
      }
    }

    const updatedTreesWithSpacing: TreeData[] = trees.map((t) => {
      if (t.state === 'sapling' && t.id !== treeId) {
        return {
          ...t,
          answersSinceMiss: (t.answersSinceMiss ?? 0) + 1,
        };
      }
      return t;
    });

    const prevUnlocked = get().getUnlockedConcepts();
    const treesBefore = get().trees;

    if (isCorrect) {
      const nextState: TreeState =
        tree.state === 'withered' || tree.state === 'sapling' || tree.isSapling ? 'regrown' : 'healthy';

      const rootId = tree.isSapling ? rootTreeId(trees, tree) : null;
      const finalTrees: TreeData[] = updatedTreesWithSpacing.map((t) => {
        if (t.id === treeId) return { ...t, state: nextState, memoryDue: false };
        if (rootId && rootId !== treeId && t.id === rootId) return { ...t, state: 'regrown' };
        return t;
      });

      const updatedStrengths = { ...misconceptionStrength };
      world.misconceptions
        .filter((m) => m.conceptId === tree.conceptId)
        .forEach((m) => {
          updatedStrengths[m.id] = weakenMisconception(updatedStrengths[m.id] || 0);
        });

      const highestId = activeMisconception(updatedStrengths, overcomeMisconceptions);

      const attempt: QuestionAttempt = {
        treeId,
        choice: chosenChoice,
        choiceIndex: servedCount,
        correct: true,
        confidence,
        misconceptionId: null,
        hint: null,
        prediction: treePrediction,
        predictionHit: hit,
        at: Date.now(),
        question: tree.question,
        correctAnswer: correctChoice,
      };

      const nextAttempts = [attempt, ...get().attempts];

      set({
        trees: finalTrees,
        cards: reviewedCards(tree, true),
        selectedTree: { ...tree, state: nextState },
        lastAnswerResult: {
          isCorrect: true,
          tree,
          chosenChoice,
          served: servedCount,
          confidence,
          prediction: treePrediction,
          predictionHit: hit,
        },
        showExplanationModal: true,
        attempts: nextAttempts,
        misconceptionStrength: updatedStrengths,
        activeMisconceptionId: highestId,
        predictionStats: nextStats,
        soundTrigger: { type: 'correct', time: Date.now() },
      });

      const nextUnlocked = get().getUnlockedConcepts();
      if (nextUnlocked.length > prevUnlocked.length) {
        setTimeout(() => set({ soundTrigger: { type: 'unlock', time: Date.now() } }), UNLOCK_SOUND_DELAY_MS);
      }

      get().checkAndPlantMemorySprouts();
      maybeAskForReflection(tree.conceptId);
      maybeAnnounceMia(tree.conceptId, treesBefore);
      get().updateTutorBeacon();
      get().refreshPredictions();
    } else {
      // A wrong serve names the exact mistake (top number, bottom number, the leftover part, too few...).
      const exactDiagnosis = serve.line;

      const updatedTrees = updatedTreesWithSpacing.map((t) =>
        t.id === treeId ? { ...t, state: 'withered' as const, memoryDue: false } : t
      );

      // Sprout a sapling beside the missed tree
      const saplingId = `sapling_${tree.id}_${Date.now()}`;
      const groveIdx = tree.groveIndex ?? 0;
      const [saplingTree] = plantExtraTrees(get().layout, updatedTrees, [
        {
          ...tree,
          id: saplingId,
          state: 'sapling',
          isSapling: true,
          sourceTreeId: tree.id,
          groveIndex: groveIdx,
          answersSinceMiss: 0,
        },
      ]);

      const finalTrees = [...updatedTrees, saplingTree];

      // Only blame the mix-up this serve shows (it used to blame the concept's first one, whatever happened).
      const conceptMix = world.misconceptions.filter((m) => m.conceptId === tree.conceptId);
      const misObj =
        serve.mistake === 'top-number'
          ? conceptMix.find((m) => /numerator|top number/i.test(m.label))
          : serve.mistake === 'bottom-number'
            ? conceptMix.find((m) => /denominator|bottom number/i.test(m.label))
            : undefined;
      const misId = misObj?.id ?? null;

      const updatedStrengths = { ...get().misconceptionStrength };
      if (misId) updatedStrengths[misId] = Math.min(1, (updatedStrengths[misId] || 0) + 0.4);

      const highestId = activeMisconception(updatedStrengths, overcomeMisconceptions);

      const recordId = `thought_${Date.now()}`;
      const newRecord: ThoughtProcessRecord = {
        id: recordId,
        studentName: 'You',
        treeId,
        question: tree.question,
        choice: chosenChoice,
        misconceptionId: misId,
        misconceptionLabel: misObj?.label || 'Not sure which mix-up',
        thoughtProcess: exactDiagnosis,
        studentWords: null,
        confirmed: 'unanswered',
        at: Date.now(),
      };

      const scaffoldHint = serve.hint;

      const preliminaryAttempt: QuestionAttempt = {
        treeId,
        choice: chosenChoice,
        choiceIndex: servedCount,
        correct: false,
        confidence,
        misconceptionId: misId,
        misconceptionLabel: misObj?.label,
        hint: scaffoldHint,
        thoughtProcess: exactDiagnosis,
        prediction: treePrediction,
        predictionHit: hit,
        at: Date.now(),
        question: tree.question,
        correctAnswer: correctChoice,
      };

      const updatedThoughts = [newRecord, ...get().thoughtProcessRecords];

      set({
        trees: finalTrees,
        cards: reviewedCards(tree, false),
        selectedTree: { ...tree, state: 'withered' },
        isDiagnosing: false,
        diagnosisError: null,
        diagnosisResult: {
          misconceptionId: misId ?? 'unclassified',
          confidence: 0.9,
          thoughtProcess: exactDiagnosis,
          scaffoldHint,
        },
        currentThoughtRecord: newRecord,
        thoughtProcessRecords: updatedThoughts,
        misconceptionStrength: updatedStrengths,
        activeMisconceptionId: highestId,
        attempts: [preliminaryAttempt, ...get().attempts],
        lastAnswerResult: {
          isCorrect: false,
          tree,
          chosenChoice,
          served: servedCount,
          confidence,
          prediction: treePrediction,
          predictionHit: hit,
        },
        showExplanationModal: true,
        soundTrigger: { type: 'wrong', time: Date.now() },
      });

      get().updateTutorBeacon();
      get().refreshPredictions();
    }
  },

  confirmThoughtProcess: async (confirmed: 'yes' | 'no', studentWords?: string) => {
    const { currentThoughtRecord, thoughtProcessRecords, world, trees, lastAnswerResult } = get();
    if (!currentThoughtRecord || !world) return;

    if (confirmed === 'no' && studentWords) {
      set({ isRevising: true });
      try {
        const tree = lastAnswerResult?.tree;
        const res = await fetch('/api/revise-thought-process', {
          method: 'POST',
          // A stuck request gives up and shows the retry, instead of spinning.
          signal: AbortSignal.timeout(60_000),
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: currentThoughtRecord.question,
            studentChoice: currentThoughtRecord.choice,
            correctAnswer: tree?.choices[tree?.answerIndex] || '',
            studentWords,
            misconceptions: world.misconceptions,
            initialThoughtProcess: currentThoughtRecord.thoughtProcess,
          }),
        });

        if (res.ok) {
          const revised = await res.json();
          const misObj = world.misconceptions.find((m) => m.id === revised.misconceptionId);

          const updatedRecord: ThoughtProcessRecord = {
            ...currentThoughtRecord,
            thoughtProcess: revised.thoughtProcess,
            misconceptionId: revised.misconceptionId,
            misconceptionLabel: misObj?.label || currentThoughtRecord.misconceptionLabel,
            studentWords,
            confirmed: 'no',
          };

          const updatedThoughts = thoughtProcessRecords.map((r) =>
            r.id === currentThoughtRecord.id ? updatedRecord : r
          );

          const oldId = currentThoughtRecord.misconceptionId;
          const newId = revised.misconceptionId && revised.misconceptionId !== 'unclassified' ? revised.misconceptionId : null;
          const strengths = { ...get().misconceptionStrength };
          if (oldId && oldId !== newId && strengths[oldId]) strengths[oldId] = Math.max(0, strengths[oldId] - 0.4);
          if (newId && newId !== oldId) strengths[newId] = Math.min(1, (strengths[newId] || 0) + 0.4);
          const attempts = get().attempts.slice();
          const i = attempts.findIndex((a) => a.treeId === currentThoughtRecord.treeId && !a.correct);
          if (i >= 0) {
            attempts[i] = {
              ...attempts[i],
              misconceptionId: newId,
              misconceptionLabel: misObj?.label,
              thoughtProcess: revised.thoughtProcess,
              hint: revised.scaffoldHint,
            };
          }

          set({
            isRevising: false,
            currentThoughtRecord: updatedRecord,
            thoughtProcessRecords: updatedThoughts,
            misconceptionStrength: strengths,
            activeMisconceptionId: activeMisconception(strengths, get().overcomeMisconceptions),
            attempts,
            diagnosisResult: {
              misconceptionId: revised.misconceptionId,
              confidence: revised.confidence,
              thoughtProcess: revised.thoughtProcess,
              scaffoldHint: revised.scaffoldHint,
            },
          });
          return;
        }
      } catch (err) {
        console.warn('Revise error:', err);
      } finally {
        set({ isRevising: false });
      }
    }

    // Mark confirmed
    const updatedRecord: ThoughtProcessRecord = {
      ...currentThoughtRecord,
      confirmed,
      studentWords: studentWords || null,
    };

    const updatedThoughts = thoughtProcessRecords.map((r) =>
      r.id === currentThoughtRecord.id ? updatedRecord : r
    );

    set({
      currentThoughtRecord: updatedRecord,
      thoughtProcessRecords: updatedThoughts,
    });

    // If confirmed "yes": Spawn 2 Targeted Questions ("Made for you")
    if (confirmed === 'yes' && currentThoughtRecord.misconceptionId) {
      const misObj = world.misconceptions.find((m) => m.id === currentThoughtRecord.misconceptionId);
      const tree = trees.find((t) => t.id === currentThoughtRecord.treeId);
      const conceptId = tree?.conceptId || world.concepts[0]?.id;

      try {
        const res = await fetch('/api/generate-targeted-questions', {
          method: 'POST',
          // A stuck request gives up and shows the retry, instead of spinning.
          signal: AbortSignal.timeout(60_000),
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            misconception: misObj,
            thoughtProcess: currentThoughtRecord.thoughtProcess,
            conceptId,
            worldSubject: world.subject,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.questions)) {
            const groveIdx = tree?.groveIndex ?? 0;

            const newTargetedTrees: TreeData[] = data.questions.map((q: any, i: number) => ({
              id: `targeted_${Date.now()}_${i}`,
              conceptId,
              question: q.question,
              choices: q.choices,
              answerIndex: q.answerIndex,
              explanation: q.explanation,
              citation: null,
              state: 'unanswered',
              isTargeted: true,
              visual: sanitizeVisual(q.visual),
              groveIndex: groveIdx,
              nearTreeId: tree?.id, // grows beside the question that showed the mix-up
            }));

            set((state) => ({
              trees: [...state.trees, ...plantExtraTrees(state.layout, state.trees, newTargetedTrees)],
            }));

            get().updateTutorBeacon();
          }
        }
      } catch (err) {
        console.warn('Targeted question generation failed:', err);
      }
    }
  },

  deployTeacherQuest: async (misconceptionId: string) => {
    const { world, trees } = get();
    if (!world) return;

    const mis = world.misconceptions.find((m) => m.id === misconceptionId);
    if (!mis) return;

    try {
      const res = await fetch('/api/deploy-teacher-quest', {
        method: 'POST',
        // A stuck request gives up and shows the retry, instead of spinning.
        signal: AbortSignal.timeout(90_000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          misconception: mis,
          conceptId: mis.conceptId,
          worldSubject: world.subject,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.questions)) {
          const conceptIdx = world.concepts.findIndex((c) => c.id === mis.conceptId);

          const newQuestTrees: TreeData[] = data.questions.map((q: any, i: number) => ({
            id: `teacher_quest_${Date.now()}_${i}`,
            conceptId: mis.conceptId,
            question: q.question,
            choices: q.choices,
            answerIndex: q.answerIndex,
            explanation: q.explanation,
            citation: null,
            state: 'unanswered',
            isTeacherDeployed: true,
            visual: sanitizeVisual(q.visual),
            groveIndex: Math.max(0, conceptIdx),
          }));

          get().plantTeacherTrees(newQuestTrees, mis.label, true);
          // With a class room open, the same trees go to every student's forest.
          if (get().room?.role === 'teacher') {
            const sent = await sendQuest(newQuestTrees.map(({ position: _p, ...t }) => t), mis.label, roomEvents);
            flashToast(sent.ok ? `Sent to ${sent.sentTo} student${sent.sentTo === 1 ? '' : 's'}: ${newQuestTrees.length} new trees for "${mis.label}".` : sent.error);
          } else {
            flashToast(`Sent! ${newQuestTrees.length} new trees for "${mis.label}".`);
          }
        }
      }
    } catch (err) {
      console.error('Failed to deploy teacher quest:', err);
    }
  },

  retryDiagnosis: async () => {
    if (!lastDiagnosis) return;
    set({ isDiagnosing: true, diagnosisError: null });
    await requestDiagnosis(lastDiagnosis.ctx, lastDiagnosis.payload);
  },

  dismissFeedback: () => {
    set({
      selectedTree: null,
      answerStones: null,
      showExplanationModal: false,
      lastAnswerResult: null,
      diagnosisResult: null,
      diagnosisError: null,
      currentThoughtRecord: null,
    });
  },
}));

/** A short note for the kid. A newer note is never cleared by an older note's timer. */
function flashToast(msg: string) {
  useGameStore.setState({ teacherToast: msg });
  setTimeout(() => {
    if (useGameStore.getState().teacherToast === msg) useGameStore.setState({ teacherToast: null });
  }, 4500);
}

/** Asks Gemini what the kid was thinking, then records it. The first try and Retry both come through here. */
async function requestDiagnosis(ctx: DiagnosisContext, payload: unknown) {
  try {
    const res = await fetch('/api/diagnose-thought-process', {
      method: 'POST',
      // A stuck request gives up and shows the retry, instead of spinning.
      signal: AbortSignal.timeout(60_000),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Server responded with status ${res.status}`);
    }
    applyDiagnosis(ctx, (await res.json()) as DiagnosisResponse);
  } catch (err: any) {
    console.error('Diagnosis failed:', err);
    if (ctx.seq === diagnosisSeq) {
      useGameStore.setState({ isDiagnosing: false, diagnosisError: err?.message || 'Byte could not be reached.' });
    }
  }
}

/**
 * Records a diagnosis: the thought record (what the teacher sees), the mix-up's strength, the attempt, and a
 * sapling variant aimed at the mix-up. If the kid has already moved on to another question, all of that is
 * still recorded, but the open card is left alone.
 */
function applyDiagnosis(ctx: DiagnosisContext, diagnosis: DiagnosisResponse) {
  const { world, overcomeMisconceptions } = useGameStore.getState();
  if (!world) return;
  const current = ctx.seq === diagnosisSeq;
  const misObj = world.misconceptions.find((m) => m.id === diagnosis.misconceptionId);

  const updatedStrengths = { ...useGameStore.getState().misconceptionStrength };
  if (diagnosis.misconceptionId && diagnosis.misconceptionId !== 'unclassified') {
    updatedStrengths[diagnosis.misconceptionId] = Math.min(1, (updatedStrengths[diagnosis.misconceptionId] || 0) + 0.4);
  }

  const record: ThoughtProcessRecord = {
    id: `thought_${Date.now()}`,
    studentName: 'You',
    treeId: ctx.tree.id,
    question: ctx.tree.question,
    choice: ctx.chosenChoice,
    misconceptionId: diagnosis.misconceptionId,
    misconceptionLabel: misObj?.label || 'Unclassified misconception',
    thoughtProcess: diagnosis.thoughtProcess,
    studentWords: null,
    confirmed: 'unanswered', // always ask the kid whether this is what they did
    at: Date.now(),
  };

  // The newest wrong attempt on this tree gets the diagnosis (not simply the newest attempt: the kid may have moved on).
  const attempts = useGameStore.getState().attempts.slice();
  const i = attempts.findIndex((a) => a.treeId === ctx.tree.id && !a.correct);
  if (i >= 0) {
    attempts[i] = {
      ...attempts[i],
      misconceptionId: diagnosis.misconceptionId,
      misconceptionLabel: misObj?.label || 'Unclassified misconception',
      hint: diagnosis.scaffoldHint,
      thoughtProcess: diagnosis.thoughtProcess,
    };
  }

  useGameStore.setState({
    thoughtProcessRecords: [record, ...useGameStore.getState().thoughtProcessRecords],
    misconceptionStrength: updatedStrengths,
    activeMisconceptionId: activeMisconception(updatedStrengths, overcomeMisconceptions),
    attempts,
    ...(current ? { isDiagnosing: false, diagnosisResult: diagnosis, currentThoughtRecord: record } : {}),
  });

  // The sapling comes back as a variant aimed at this exact mix-up, with the numbers changed.
  fetch('/api/generate-targeted-sapling', {
    method: 'POST',
    // A stuck request gives up and shows the retry, instead of spinning.
    signal: AbortSignal.timeout(60_000),
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      originalQuestion: ctx.tree.question,
      originalChoices: ctx.tree.choices,
      thoughtProcess: diagnosis.thoughtProcess,
      misconception: misObj,
      worldSubject: world.subject,
    }),
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((variant) => {
      if (!variant?.question || !Array.isArray(variant.choices)) return;
      useGameStore.setState((state) => ({
        trees: state.trees.map((t) =>
          t.id === ctx.saplingId
            ? {
                ...t,
                question: variant.question,
                choices: variant.choices,
                answerIndex: variant.answerIndex,
                explanation: variant.explanation,
                visual: sanitizeVisual(variant.visual) ?? t.visual,
              }
            : t
        ),
      }));
    })
    .catch((e) => console.warn('Targeted sapling generation fell back to the original question:', e));

  useGameStore.getState().updateTutorBeacon();
  useGameStore.getState().refreshPredictions();
}

// Save the learner's progress a moment after any of it changes, so nothing is lost between answers.
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let unsaved = false;
function saveProgress() {
  clearTimeout(saveTimer);
  const now = useGameStore.getState();
  if (!unsaved || !now.world) return;
  unsaved = false;
  try {
    localStorage.setItem(getStorageKey(now.world), JSON.stringify(Object.fromEntries(SAVED_FIELDS.map((k) => [k, now[k]]))));
  } catch (e) {
    console.warn('Could not save progress:', e);
  }
}
useGameStore.subscribe((state, prev) => {
  if (!state.world || !SAVED_FIELDS.some((k) => state[k] !== prev[k])) return;
  unsaved = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveProgress, 300);
});
// Closing or hiding the tab saves at once: the last answer (or Mia's thanks) shouldn't wait on the timer.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', saveProgress);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveProgress();
  });
}

/** The answer stones for a multiple-choice tree: a row between the kid's spot and the tree (none for serve-the-cake). */
function stonesFor(tree: TreeData): Vec2[] | null {
  const { layout, trees } = useGameStore.getState();
  if (!layout || !tree.position || tree.kind === 'serve' || tree.choices.length === 0) return null;
  const at = { x: tree.position[0], z: tree.position[2] };
  const others = trees.filter((t) => t.id !== tree.id && t.position).map((t) => ({ x: t.position![0], z: t.position![2] }));
  return stoneSpots(at, approachPoint(layout, at), tree.choices.length, others);
}

/** The kid's cards after an answer: the worksheet tree behind it moves box (a sapling reviews the tree it came from). */
function reviewedCards(tree: TreeData, correct: boolean): Record<string, Card> {
  const { trees, cards, session } = useGameStore.getState();
  const cardId = tree.isSapling ? rootTreeId(trees, tree) : tree.id;
  const owner = trees.find((t) => t.id === cardId);
  if (!owner || isExtraTree(owner)) return cards;
  return { ...cards, [cardId]: reviewCard(cards[cardId], correct, session) };
}

/** When a grove becomes fully grown, ask the kid how well they know it now (once per grove per session). */
function maybeAskForReflection(conceptId: string) {
  const s = useGameStore.getState();
  const done = s.reflections.some((r) => r.conceptId === conceptId && r.session === s.session);
  if (!done && isGroveComplete(s.trees, conceptId)) useGameStore.setState({ pendingReflection: conceptId });
}

/** The moment a grove is grown enough for Mia to ask for help, say where she is (once). */
function maybeAnnounceMia(conceptId: string, treesBefore: TreeData[]) {
  const s = useGameStore.getState();
  if (!s.teachSpots.some((t) => t.conceptId === conceptId)) return;
  const unlocked = s.getUnlockedConcepts();
  const before = miaStatus(treesBefore, conceptId, unlocked, s.teachBacks).kind;
  const now = miaStatus(s.trees, conceptId, unlocked, s.teachBacks).kind;
  if (before === 'growing' && now === 'ready') {
    const grove = s.world?.concepts.find((c) => c.id === conceptId)?.questName ?? 'this grove';
    flashToast(`${MIA_NEEDS_HELP} in ${grove}. She’s sitting in the middle of the grove.`);
  }
}

// ---- Class rooms -------------------------------------------------------------------------------------------------

/** What the server tells us about the room, applied to the store. */
const roomEvents: RoomEvents = {
  players: (players) => useGameStore.setState({ roomPlayers: players }),
  roster: (roster) => useGameStore.setState({ roster }),
  quest: ({ trees, label }) => useGameStore.getState().plantTeacherTrees(trees, label),
  session: () => useGameStore.getState().startNextSession(),
  status: (status) => {
    const room = useGameStore.getState().room;
    if (room && room.status !== status) useGameStore.setState({ room: { ...room, status } });
  },
};

const AVATAR_COLOURS = ['#e36f1e', '#5b8fc7', '#8d75dc', '#3fa59b', '#e46f92', '#c2493d', '#3f7d4e'];
/** A stable colour per player, for the teacher's roster and the classmate's coat in the forest. */
export const colourFor = (id: string) => AVATAR_COLOURS[[...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % AVATAR_COLOURS.length];

/** This student's learner model, as the teacher's roster shows it. */
function summaryOf(s: GameStore): ClassmateData | null {
  if (!s.room) return null;
  return {
    id: s.room.playerId,
    name: s.room.name,
    avatarColor: colourFor(s.room.playerId),
    isLiveStudent: true,
    misconceptionStrength: s.misconceptionStrength,
    activeMisconceptionId: s.activeMisconceptionId,
    overcomeMisconceptions: s.overcomeMisconceptions,
    predictionStats: s.predictionStats,
    attempts: s.attempts.slice(0, 30),
    flags: s.thoughtProcessRecords.slice(0, 20),
    teachBacks: s.teachBacks.slice(0, 10),
    reflections: s.reflections.slice(0, 10),
  };
}

function pushSummary() {
  const s = useGameStore.getState();
  if (s.room?.role !== 'student') return;
  const summary = summaryOf(s);
  if (summary) sendSummary(summary);
}

// A student's summary goes to the teacher a moment after their learner model changes.
const SUMMARY_FIELDS = [
  'attempts',
  'thoughtProcessRecords',
  'misconceptionStrength',
  'activeMisconceptionId',
  'overcomeMisconceptions',
  'predictionStats',
  'teachBacks',
  'reflections',
] as const;
let summaryTimer: ReturnType<typeof setTimeout> | undefined;
useGameStore.subscribe((state, prev) => {
  if (state.room?.role !== 'student' || !SUMMARY_FIELDS.some((k) => state[k] !== prev[k])) return;
  clearTimeout(summaryTimer);
  summaryTimer = setTimeout(pushSummary, 800);
});
