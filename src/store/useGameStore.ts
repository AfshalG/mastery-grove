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
import { buildForest, plantExtraTrees } from '../game/forest';
import { clampToBounds, type ForestLayout } from '../game/layout';

export function computeTutorPick(
  trees: TreeData[],
  unlockedConcepts: string[],
  predictions: Record<string, TreePrediction>,
  activeMisconceptionId: string | null,
  worldMisconceptions: MisconceptionData[]
): { beaconId: string | null; reason: string | null } {
  // Candidates are open trees in unlocked groves, saplings included (if spacing unlocked)
  const openTrees = trees.filter(
    (t) =>
      unlockedConcepts.includes(t.conceptId) &&
      t.state !== 'healthy' &&
      t.state !== 'regrown' &&
      !(t.state === 'sapling' && (t.answersSinceMiss ?? 0) < 2)
  );

  if (openTrees.length === 0) {
    return { beaconId: null, reason: null };
  }

  // Priority 1: Memory Sprout retention checks
  const memorySprout = openTrees.find((t) => t.isMemorySprout);
  if (memorySprout) {
    return {
      beaconId: memorySprout.id,
      reason: 'Memory Sprout: Retention check for past misconception',
    };
  }

  // Priority 2: Targeted "Made for you" trees attacking the student's active thought flaw
  const targetedCandidate = openTrees.find((t) => t.isTargeted);
  if (targetedCandidate) {
    return {
      beaconId: targetedCandidate.id,
      reason: 'Made for you: attacks recent thought pattern',
    };
  }

  const hasPredictions = openTrees.some((t) => !!predictions[t.id]);
  if (!hasPredictions) {
    return {
      beaconId: openTrees[0].id,
      reason: 'First step on the grove trail',
    };
  }

  // Priority 3: Candidate matching active misconception
  if (activeMisconceptionId) {
    const matchingCandidates = openTrees.filter(
      (t) => predictions[t.id]?.misconceptionId === activeMisconceptionId
    );

    if (matchingCandidates.length > 0) {
      matchingCandidates.sort((a, b) => {
        const pA = predictions[a.id]?.pCorrect ?? 0.6;
        const pB = predictions[b.id]?.pCorrect ?? 0.6;
        return Math.abs(pA - 0.6) - Math.abs(pB - 0.6);
      });
      return {
        beaconId: matchingCandidates[0].id,
        reason: 'Checks whether that idea is fixed',
      };
    }
  }

  // Priority 4: Candidate closest to 0.7 optimal learning challenge
  const sortedByOptimalDifficulty = [...openTrees].sort((a, b) => {
    const pA = predictions[a.id]?.pCorrect ?? 0.7;
    const pB = predictions[b.id]?.pCorrect ?? 0.7;
    return Math.abs(pA - 0.7) - Math.abs(pB - 0.7);
  });

  const picked = sortedByOptimalDifficulty[0];
  const pred = predictions[picked.id];
  let reason = 'Optimal challenge (70% predicted success)';

  if (pred?.misconceptionId) {
    const m = worldMisconceptions.find((x) => x.id === pred.misconceptionId);
    if (m) {
      const shortDesc = m.label.length > 28 ? m.label.slice(0, 26) + '…' : m.label;
      reason = `Checks: ${shortDesc}`;
    }
  }

  return {
    beaconId: picked.id,
    reason,
  };
}

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
  lastFailedPayload: any | null;
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

function getStorageKey(subject: string) {
  return `mastery_grove_learner_${subject.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
}

export const useGameStore = create<GameStore>((set, get) => ({
  world: null,
  layout: null,
  trees: [],
  screen: 'start',

  avatarPosition: [0, 0, 2],
  targetPosition: null,
  targetTreeToOpen: null,

  selectedTree: null,
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
  lastFailedPayload: null,
  lastAnswerResult: null,
  showExplanationModal: false,
  isRevising: false,

  soundTrigger: null,

  loadWorld: (rawWorld: WorldData) => {
    const storageKey = getStorageKey(rawWorld.subject);
    let savedData: any = null;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) savedData = JSON.parse(raw);
    } catch (e) {
      console.warn('Could not read from localStorage:', e);
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
        const restored = buildForest(rawWorld, savedData.trees);
        initialTrees = restored.trees;
        layout = restored.layout;
      }

      // Calculate streak: consecutive correct answers from top of attempts
      let streak = 0;
      for (const a of initialAttempts) {
        if (a.correct) streak++;
        else break;
      }

      // Count completed groves
      const completedGrovesCount = rawWorld.concepts.filter((concept) => {
        const cTrees = initialTrees.filter((t) => t.conceptId === concept.id && !t.isSapling && !t.isMemorySprout);
        return cTrees.length > 0 && cTrees.every((t) => t.state === 'healthy' || t.state === 'regrown');
      }).length;

      // Generate friendly Professor Byte memory text
      let watchPattern = 'Last time, you made great progress exploring the grove trail.';
      if (initialActiveMis) {
        const activeM = rawWorld.misconceptions.find((m) => m.id === initialActiveMis);
        if (activeM) {
          const concept = rawWorld.concepts.find((c) => c.id === activeM.conceptId);
          watchPattern = `Professor Byte remembers: "Last time, you were working on ${concept?.name || 'fractions'}: watch out for ${activeM.label}."`;
        }
      } else if (rawWorld.concepts[0]) {
        watchPattern = `Professor Byte remembers: "Last time, you conquered questions in ${rawWorld.concepts[0].questName}!"`;
      }

      welcomeInfo = {
        lastWorldSubject: rawWorld.subject,
        thoughtPatternToWatch: watchPattern,
        unlockedGrovesCount: rawWorld.concepts.length,
        completedGrovesCount,
        streak: Math.max(streak, 1),
      };
    }

    const firstConceptId = rawWorld.concepts[0]?.id;
    const initialUnlocked = [firstConceptId];
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

    // Save initial state to localStorage
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          attempts: initialAttempts,
          thoughtProcessRecords: initialThoughts,
          misconceptionStrength: initialStrengths,
          activeMisconceptionId: initialActiveMis,
          overcomeMisconceptions: initialOvercome,
          predictionStats: initialStats,
          predictions: initialPredictions,
          trees: initialTrees,
        })
      );
    } catch (e) {}

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

  openTree: (tree) => {
    const unlocked = get().getUnlockedConcepts();
    if (!unlocked.includes(tree.conceptId)) return;

    if (tree.state === 'sapling' && (tree.answersSinceMiss ?? 0) < 2) {
      const remaining = 2 - (tree.answersSinceMiss ?? 0);
      get().setSaplingNotice(`Come back later: Answer ${remaining} more tree${remaining > 1 ? 's' : ''} to unlock this review sapling! ⏳`);
      return;
    }

    set({
      selectedTree: tree,
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
    const { world, trees, attempts, thoughtProcessRecords, isPredicting } = get();
    if (!world || isPredicting) return;

    const unlocked = get().getUnlockedConcepts();
    const openTrees = trees.filter(
      (t) =>
        unlocked.includes(t.conceptId) &&
        t.state !== 'healthy' &&
        t.state !== 'regrown' &&
        !(t.state === 'sapling' && (t.answersSinceMiss ?? 0) < 2)
    );

    if (openTrees.length === 0) return;

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
      set({ isPredicting: false });
    }
  },

  getUnlockedConcepts: () => {
    const { world, trees } = get();
    if (!world) return [];

    const unlocked: string[] = [];
    world.concepts.forEach((concept) => {
      if (concept.prerequisites.length === 0) {
        unlocked.push(concept.id);
        return;
      }
      const allPrereqsSatisfied = concept.prerequisites.every((prereqId) => {
        const prereqOriginalTrees = trees.filter(
          (t) => t.conceptId === prereqId && !t.isSapling && !t.isTargeted && !t.isTeacherDeployed && !t.isMemorySprout
        );
        if (prereqOriginalTrees.length === 0) return true;
        return prereqOriginalTrees.every((t) => t.state === 'healthy' || t.state === 'regrown');
      });

      if (allPrereqsSatisfied) {
        unlocked.push(concept.id);
      }
    });

    return unlocked;
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

    const groveTrees = trees.filter((t) => t.conceptId === activeConcept.id && !t.isSapling && !t.isMemorySprout);
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
      const originalTrees = trees.filter(
        (t) => t.conceptId === concept.id && !t.isSapling && !t.isMemorySprout && !t.isTargeted && !t.isTeacherDeployed
      );
      const isComplete =
        originalTrees.length > 0 && originalTrees.every((t) => t.state === 'healthy' || t.state === 'regrown');

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

              set((state) => ({
                trees: [...state.trees, ...plantExtraTrees(state.layout, state.trees, [sproutTree])],
                teacherToast: `Professor Byte planted a Memory Sprout at ${concept.questName} for a retention check! 🌿`,
              }));

              setTimeout(() => {
                set({ teacherToast: null });
              }, 4500);

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

      const finalTrees: TreeData[] = updatedTreesWithSpacing.map((t) => {
        if (t.id === treeId) return { ...t, state: nextState };
        if (tree.isSapling && tree.sourceTreeId && t.id === tree.sourceTreeId) {
          return { ...t, state: 'regrown' };
        }
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
        set({
          teacherToast: 'Retention Check Passed! Misconception marked Overcome in teacher console! 🌟',
        });
        setTimeout(() => set({ teacherToast: null }), 4500);
      } else {
        // Regular tree correct: halve misconception strength for that concept
        world.misconceptions
          .filter((m) => m.conceptId === tree.conceptId)
          .forEach((m) => {
            updatedStrengths[m.id] = (updatedStrengths[m.id] || 0) * 0.5;
          });
      }

      let highestId: string | null = null;
      let highestVal = 0.3;
      Object.entries(updatedStrengths).forEach(([mId, val]) => {
        if (val > highestVal && !nextOvercome.includes(mId)) {
          highestVal = val;
          highestId = mId;
        }
      });

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

      // Save to localStorage
      try {
        localStorage.setItem(
          getStorageKey(world.subject),
          JSON.stringify({
            attempts: nextAttempts,
            thoughtProcessRecords,
            misconceptionStrength: updatedStrengths,
            activeMisconceptionId: highestId,
            overcomeMisconceptions: nextOvercome,
            predictionStats: nextStats,
            predictions,
            trees: finalTrees,
          })
        );
      } catch (e) {}

      const nextUnlocked = get().getUnlockedConcepts();
      if (nextUnlocked.length > prevUnlocked.length) {
        set({ soundTrigger: { type: 'unlock', time: Date.now() } });
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

      set({ lastFailedPayload: payload });

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

        const diagnosis: DiagnosisResponse = await res.json();
        const misObj = world.misconceptions.find((m) => m.id === diagnosis.misconceptionId);

        // Update strengths: Add 0.4
        const updatedStrengths = { ...get().misconceptionStrength };
        if (diagnosis.misconceptionId && diagnosis.misconceptionId !== 'unclassified') {
          updatedStrengths[diagnosis.misconceptionId] = Math.min(
            1,
            (updatedStrengths[diagnosis.misconceptionId] || 0) + 0.4
          );
        }

        let highestId: string | null = null;
        let highestVal = 0.3;
        Object.entries(updatedStrengths).forEach(([mId, val]) => {
          if (val > highestVal && !overcomeMisconceptions.includes(mId)) {
            highestVal = val;
            highestId = mId;
          }
        });

        // Create thought-process record
        const recordId = `thought_${Date.now()}`;
        const newRecord: ThoughtProcessRecord = {
          id: recordId,
          studentName: 'You',
          treeId,
          question: tree.question,
          choice: chosenChoice,
          misconceptionId: diagnosis.misconceptionId,
          misconceptionLabel: misObj?.label || 'Unclassified misconception',
          thoughtProcess: diagnosis.thoughtProcess,
          studentWords: null,
          confirmed: 'unanswered', // Always ask student to verify!
          at: Date.now(),
        };

        const updatedThoughts = [newRecord, ...get().thoughtProcessRecords];

        // Update latest attempt
        const attempts = [...get().attempts];
        if (attempts.length > 0 && attempts[0].treeId === treeId) {
          attempts[0].misconceptionId = diagnosis.misconceptionId;
          attempts[0].misconceptionLabel = misObj?.label || 'Unclassified misconception';
          attempts[0].hint = diagnosis.scaffoldHint;
          attempts[0].thoughtProcess = diagnosis.thoughtProcess;
        }

        set({
          isDiagnosing: false,
          diagnosisResult: diagnosis,
          currentThoughtRecord: newRecord,
          thoughtProcessRecords: updatedThoughts,
          misconceptionStrength: updatedStrengths,
          activeMisconceptionId: highestId,
          attempts,
        });

        // TARGETED SAPLING GENERATION (Item 3 in requirements):
        // Call Gemini to generate a variant question that directly targets this thought process with numbers changed and a slight twist!
        fetch('/api/generate-targeted-sapling', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalQuestion: tree.question,
            originalChoices: tree.choices,
            thoughtProcess: diagnosis.thoughtProcess,
            misconception: misObj,
            worldSubject: world.subject,
          }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((variant) => {
            if (variant && variant.question && Array.isArray(variant.choices)) {
              set((state) => ({
                trees: state.trees.map((t) =>
                  t.id === saplingId
                    ? {
                        ...t,
                        question: variant.question,
                        choices: variant.choices,
                        answerIndex: variant.answerIndex,
                        explanation: variant.explanation,
                        visual: variant.visual || t.visual,
                      }
                    : t
                ),
              }));
            }
          })
          .catch((e) => console.warn('Targeted sapling generation fallback to original:', e));

        // Save to localStorage
        try {
          localStorage.setItem(
            getStorageKey(world.subject),
            JSON.stringify({
              attempts,
              thoughtProcessRecords: updatedThoughts,
              misconceptionStrength: updatedStrengths,
              activeMisconceptionId: highestId,
              overcomeMisconceptions,
              predictionStats: nextStats,
              predictions: get().predictions,
              trees: finalTrees,
            })
          );
        } catch (e) {}

        get().updateTutorBeacon();
        get().refreshPredictions();
      } catch (err: any) {
        console.error('Diagnosis failed:', err);
        set({
          isDiagnosing: false,
          diagnosisError: err?.message || 'Could not connect to Professor Byte.',
        });
      }
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

      const finalTrees: TreeData[] = updatedTreesWithSpacing.map((t) => {
        if (t.id === treeId) return { ...t, state: nextState };
        return t;
      });

      const updatedStrengths = { ...misconceptionStrength };
      world.misconceptions
        .filter((m) => m.conceptId === tree.conceptId)
        .forEach((m) => {
          updatedStrengths[m.id] = (updatedStrengths[m.id] || 0) * 0.5;
        });

      let highestId: string | null = null;
      let highestVal = 0.3;
      Object.entries(updatedStrengths).forEach(([mId, val]) => {
        if (val > highestVal && !overcomeMisconceptions.includes(mId)) {
          highestVal = val;
          highestId = mId;
        }
      });

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

      // Save to localStorage
      try {
        localStorage.setItem(
          getStorageKey(world.subject),
          JSON.stringify({
            attempts: nextAttempts,
            thoughtProcessRecords,
            misconceptionStrength: updatedStrengths,
            activeMisconceptionId: highestId,
            overcomeMisconceptions,
            predictionStats: nextStats,
            predictions,
            trees: finalTrees,
          })
        );
      } catch (e) {}

      const nextUnlocked = get().getUnlockedConcepts();
      if (nextUnlocked.length > prevUnlocked.length) {
        set({ soundTrigger: { type: 'unlock', time: Date.now() } });
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

      const misObj = world.misconceptions.find((m) => m.conceptId === tree.conceptId) || world.misconceptions[0];
      const misId = misObj?.id || 'm_serve';

      const updatedStrengths = { ...get().misconceptionStrength };
      updatedStrengths[misId] = Math.min(1, (updatedStrengths[misId] || 0) + 0.4);

      let highestId: string | null = null;
      let highestVal = 0.3;
      Object.entries(updatedStrengths).forEach(([mId, val]) => {
        if (val > highestVal && !overcomeMisconceptions.includes(mId)) {
          highestVal = val;
          highestId = mId;
        }
      });

      const recordId = `thought_${Date.now()}`;
      const newRecord: ThoughtProcessRecord = {
        id: recordId,
        studentName: 'You',
        treeId,
        question: tree.question,
        choice: chosenChoice,
        misconceptionId: misId,
        misconceptionLabel: misObj?.label || 'Fraction portion vs slice count confusion',
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
          misconceptionId: misId,
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

      // Save to localStorage
      try {
        localStorage.setItem(
          getStorageKey(world.subject),
          JSON.stringify({
            attempts: [preliminaryAttempt, ...get().attempts],
            thoughtProcessRecords: updatedThoughts,
            misconceptionStrength: updatedStrengths,
            activeMisconceptionId: highestId,
            overcomeMisconceptions,
            predictionStats: nextStats,
            predictions: get().predictions,
            trees: finalTrees,
          })
        );
      } catch (e) {}

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

          set({
            isRevising: false,
            currentThoughtRecord: updatedRecord,
            thoughtProcessRecords: updatedThoughts,
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
              visual: q.visual,
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
            visual: q.visual,
            groveIndex: Math.max(0, conceptIdx),
          }));

          set((state) => ({
            trees: [...state.trees, ...plantExtraTrees(state.layout, state.trees, newQuestTrees)],
            teacherToast: `Quest deployed! 3 new trees planted for "${mis.label}".`,
          }));

          setTimeout(() => {
            set({ teacherToast: null });
          }, 4500);

          get().updateTutorBeacon();
        }
      }
    } catch (err) {
      console.error('Failed to deploy teacher quest:', err);
    }
  },

  retryDiagnosis: async () => {
    const { lastFailedPayload } = get();
    if (!lastFailedPayload) return;
    set({ isDiagnosing: true, diagnosisError: null });

    try {
      const res = await fetch('/api/diagnose-thought-process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lastFailedPayload),
      });

      if (!res.ok) throw new Error(`Diagnosis retry failed status ${res.status}`);
      const diagnosis: DiagnosisResponse = await res.json();

      set({
        isDiagnosing: false,
        diagnosisResult: diagnosis,
      });
    } catch (err: any) {
      set({
        isDiagnosing: false,
        diagnosisError: err?.message || 'Retry failed. Check connection.',
      });
    }
  },

  dismissFeedback: () => {
    set({
      selectedTree: null,
      showExplanationModal: false,
      lastAnswerResult: null,
      diagnosisResult: null,
      diagnosisError: null,
      currentThoughtRecord: null,
    });
  },
}));
