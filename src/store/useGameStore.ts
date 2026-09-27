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
} from '../types/game';
import { SAMPLE_WORLD } from '../data/sampleWorld';
import { buildForest, isExtraTree, plantExtraTrees } from '../game/forest';
import { approachPoint, clampToBounds, type ForestLayout, type Vec2 } from '../game/layout';
import { stoneSpots } from '../game/stones';
import { sanitizeVisual } from '../game/visuals';
import { computeTutorPick } from '../game/planner';
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
  chosenChoice: string;
  confidence: ConfidenceLevel;
  prediction: TreePrediction | null;
  predictionHit: PredictionHit | null;
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
  targetTreeToOpen: string | null;

  // UI & Modals
  selectedTree: TreeData | null;
  /** Where the answer stones stand for the open question (one per choice); null when none are up. */
  answerStones: Vec2[] | null;
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
  moveTo: (pos: [number, number, number], treeIdToOpen?: string) => void;
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
] as const;

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
  targetTreeToOpen: null,

  selectedTree: null,
  answerStones: null,
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
    rawWorld = { ...rawWorld, trees: dedupeTreeIds(rawWorld.trees).map((t) => ({ ...t, visual: sanitizeVisual(t.visual) })) };

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

      if (Array.isArray(savedData.trees) && savedData.trees.length >= defaultTrees.length) {
        // Keep saved progress but recompute every position, so older saves get the current layout.
        const savedTrees: TreeData[] = savedData.trees.map((t: TreeData) => ({ ...t, visual: sanitizeVisual(t.visual) }));
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

    const initialUnlocked = unlockedConcepts(rawWorld, initialTrees);
    const initialPick = computeTutorPick(
      initialTrees,
      initialUnlocked,
      initialPredictions,
      initialActiveMis,
      rawWorld.misconceptions
    );

    set({
      world: rawWorld,
      layout,
      trees: initialTrees,
      screen: 'game',
      avatarPosition: [layout.spawn.x, 0, layout.spawn.z],
      targetPosition: null,
      targetTreeToOpen: null,
      selectedTree: null,
      tutorBeaconTreeId: initialPick.beaconId,
      tutorBeaconReason: initialPick.reason,
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
    });

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
  setAvatarPosition: (pos) => set({ avatarPosition: pos }),
  moveTo: (pos, treeIdToOpen) => {
    // Never aim outside the walkable area, or the avatar would try to walk off the map.
    const layout = get().layout;
    const p = layout ? clampToBounds(layout, { x: pos[0], z: pos[2] }) : { x: pos[0], z: pos[2] };
    set({ targetPosition: [p.x, 0, p.z], targetTreeToOpen: treeIdToOpen || null });
  },
  arriveAtTarget: () => {
    const { targetTreeToOpen, trees } = get();
    set({ targetPosition: null, targetTreeToOpen: null });
    const tree = targetTreeToOpen ? trees.find((t) => t.id === targetTreeToOpen) : undefined;
    if (tree) get().openTree(tree);
  },
  cancelWalk: () => set({ targetPosition: null, targetTreeToOpen: null }),

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

    // Multiple-choice questions raise a row of answer stones between the kid and the tree.
    const { layout, trees } = get();
    let answerStones: Vec2[] | null = null;
    if (layout && tree.position && tree.kind !== 'serve' && tree.choices.length > 0) {
      const at = { x: tree.position[0], z: tree.position[2] };
      const others = trees.filter((t) => t.id !== tree.id && t.position).map((t) => ({ x: t.position![0], z: t.position![2] }));
      answerStones = stoneSpots(at, approachPoint(layout, at), tree.choices.length, others);
    }

    set({
      selectedTree: tree,
      answerStones,
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
    const { trees, predictions, activeMisconceptionId, world } = get();
    if (!world) return;
    const unlocked = get().getUnlockedConcepts();
    const pick = computeTutorPick(trees, unlocked, predictions, activeMisconceptionId, world.misconceptions);
    set({
      tutorBeaconTreeId: pick.beaconId,
      tutorBeaconReason: pick.reason,
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
    const { world, trees } = get();
    return world ? unlockedConcepts(world, trees) : [];
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

    if (isCorrect) {
      const nextState: TreeState =
        tree.state === 'withered' || tree.state === 'sapling' || tree.isSapling ? 'regrown' : 'healthy';

      // A sapling answered right regrows the worksheet tree it came from, however many tries back.
      const rootId = tree.isSapling ? rootTreeId(trees, tree) : null;
      const finalTrees: TreeData[] = updatedTreesWithSpacing.map((t) => {
        if (t.id === treeId) return { ...t, state: nextState };
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
      get().updateTutorBeacon();
      get().refreshPredictions();
    } else {
      // Wrong!
      const updatedTrees = updatedTreesWithSpacing.map((t) =>
        t.id === treeId ? { ...t, state: 'withered' as const } : t
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
    const studentRatio = servedCount / totalSlices;
    const isCorrect = Math.abs(studentRatio - targetRatio) < 0.0001;

    const chosenChoice = `${servedCount}/${totalSlices} slices`;
    const correctChoice = `${Math.round(targetRatio * totalSlices)}/${totalSlices} slices (${targetNumerator}/${targetDenominator})`;

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

    if (isCorrect) {
      const nextState: TreeState =
        tree.state === 'withered' || tree.state === 'sapling' || tree.isSapling ? 'regrown' : 'healthy';

      const rootId = tree.isSapling ? rootTreeId(trees, tree) : null;
      const finalTrees: TreeData[] = updatedTreesWithSpacing.map((t) => {
        if (t.id === treeId) return { ...t, state: nextState };
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
        predictionStats: nextStats,
        soundTrigger: { type: 'correct', time: Date.now() },
      });

      const nextUnlocked = get().getUnlockedConcepts();
      if (nextUnlocked.length > prevUnlocked.length) {
        setTimeout(() => set({ soundTrigger: { type: 'unlock', time: Date.now() } }), UNLOCK_SOUND_DELAY_MS);
      }

      get().checkAndPlantMemorySprouts();
      get().updateTutorBeacon();
      get().refreshPredictions();
    } else {
      // Wrong serve: Name mistake exactly per rules
      let exactDiagnosis = '';
      if (servedCount === targetNumerator && totalSlices !== targetDenominator) {
        exactDiagnosis = `You served ${servedCount} slices (the top number), but this cake has ${totalSlices} slices. ${targetNumerator}/${targetDenominator} means ${targetNumerator} out of every ${targetDenominator}.`;
      } else if (servedCount === targetDenominator) {
        exactDiagnosis = `You counted the bottom number (${targetDenominator}) as the pieces to serve.`;
      } else {
        exactDiagnosis = `You served ${servedCount}/${totalSlices}. Is that the same as ${targetNumerator}/${targetDenominator}?`;
      }

      const updatedTrees = updatedTreesWithSpacing.map((t) =>
        t.id === treeId ? { ...t, state: 'withered' as const } : t
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
        servedCount === targetNumerator
          ? conceptMix.find((m) => /numerator|top number/i.test(m.label))
          : servedCount === targetDenominator
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

      const scaffoldHint = `If you cut a cake into ${totalSlices} slices, how many groups of ${targetDenominator} can you make?`;

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

          set((state) => ({ trees: [...state.trees, ...plantExtraTrees(state.layout, state.trees, newQuestTrees)] }));
          flashToast(`Sent! ${newQuestTrees.length} new trees for "${mis.label}".`);

          get().updateTutorBeacon();
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
useGameStore.subscribe((state, prev) => {
  if (!state.world || !SAVED_FIELDS.some((k) => state[k] !== prev[k])) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const now = useGameStore.getState();
    if (!now.world) return;
    try {
      localStorage.setItem(getStorageKey(now.world), JSON.stringify(Object.fromEntries(SAVED_FIELDS.map((k) => [k, now[k]]))));
    } catch (e) {
      console.warn('Could not save progress:', e);
    }
  }, 300);
});
