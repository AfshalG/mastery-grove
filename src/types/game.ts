export type TreeState = 'unanswered' | 'healthy' | 'withered' | 'sapling' | 'regrown';

export type ConfidenceLevel = 'Not sure' | 'Fairly sure' | 'Very sure';

export interface Citation {
  page: number;
  quote: string;
}

export type FractionVisual =
  | { kind: 'cake'; parts: number; shaded: number }
  | { kind: 'two-cakes'; left: { parts: number; shaded: number }; right: { parts: number; shaded: number } }
  | { kind: 'bar'; parts: number; shaded: number };

export interface ServeConfig {
  targetNumerator: number;
  targetDenominator: number;
  totalSlices: number; // N, multiple of denominator
}

export interface TreeData {
  id: string;
  conceptId: string;
  question: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  citation: Citation | null;
  state: TreeState;
  kind?: 'mcq' | 'serve';        // default 'mcq'
  visual?: FractionVisual;
  serveConfig?: ServeConfig;
  isSapling?: boolean;
  sourceTreeId?: string;
  position?: [number, number, number];
  groveIndex?: number;
  isTargeted?: boolean;          // "Made for you" targeted question tree (pink glow)
  isTeacherDeployed?: boolean;   // "From your teacher" focus tree (purple glow)
  isMemorySprout?: boolean;      // "Memory Sprout" retention check question tree (cyan/emerald glow)
  targetMisconceptionId?: string;
  answersSinceMiss?: number;     // Spacing counter: needs >= 2 to unlock
  nearTreeId?: string;           // Layout hint: plant this extra tree next to that one
}

export interface ConceptData {
  id: string;
  name: string;
  questName: string;
  prerequisites: string[];
}

export interface MisconceptionData {
  id: string;
  conceptId: string;
  label: string;
}

export interface WorldData {
  subject: string;
  concepts: ConceptData[];
  misconceptions: MisconceptionData[];
  trees: TreeData[];
}

export interface DiagnosisResponse {
  misconceptionId: string;
  confidence: number;
  thoughtProcess: string;
  scaffoldHint: string;
}

export interface TreePrediction {
  treeId: string;
  pCorrect: number; // 0.0 - 1.0
  predictedChoice: number; // 0 - 3
  misconceptionId: string | null;
  why: string;
}

export type PredictionHit = 'exact' | 'direction' | 'miss';

export interface ThoughtProcessRecord {
  id: string;
  studentName?: string;
  treeId: string;
  question: string;
  choice: string;
  misconceptionId: string | null;
  misconceptionLabel?: string;
  thoughtProcess: string;
  studentWords: string | null;
  confirmed: 'yes' | 'no' | 'unanswered';
  at: number;
}

export interface QuestionAttempt {
  treeId: string;
  choice: string;
  choiceIndex: number;
  correct: boolean;
  confidence: ConfidenceLevel;
  misconceptionId: string | null;
  misconceptionLabel?: string;
  hint: string | null;
  thoughtProcess?: string | null;
  prediction: TreePrediction | null;
  predictionHit: PredictionHit | null;
  at: number;
  question: string;
  correctAnswer: string;
  kind?: 'mcq' | 'serve' | 'teach';
}

export interface TeachBackResult {
  passed: boolean;
  hit: string[];
  missing: string[];
  miaReply: string;
}

export interface MiaTeachSpot {
  groveIndex: number;
  conceptId: string;
  conceptName: string;
  questName: string;
  misconceptionId: string;
  misconceptionLabel: string;
  puzzledThought: string;
  rubricPoints: string[];
  position: [number, number, number];
  isCompleted?: boolean;
}

export interface PredictionStats {
  exact: number;
  direction: number;
  miss: number;
}

export interface ClassmateData {
  id: string;
  name: string;
  avatarColor: string;
  isLiveStudent?: boolean;
  misconceptionStrength: Record<string, number>;
  activeMisconceptionId: string | null;
  overcomeMisconceptions?: string[];
  predictionStats: PredictionStats;
  attempts: QuestionAttempt[];
  flags: ThoughtProcessRecord[];
}

export interface RundownReport {
  topMisconceptions: Array<{
    misconceptionId: string;
    label: string;
    affectedStudents: string[];
    typicalReasoning: string;
    whyReteach: string;
    fiveMinuteActivity: string;
  }>;
  priorityOrderSummary: string;
  fullReportMarkdown: string;
}

export interface InterventionData {
  title: string;
  miniLessonBullets: string[];
  fiveMinuteActivity: string;
  pedagogicalInsight: string;
}

export interface WelcomeBackInfo {
  lastWorldSubject: string;
  thoughtPatternToWatch: string;
  unlockedGrovesCount: number;
  completedGrovesCount: number;
  streak: number;
}
