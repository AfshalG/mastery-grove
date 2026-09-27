import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TreePine,
  Bot,
  BrainCircuit,
  Target,
  Users,
  Activity,
  Award,
  AlertTriangle,
  AlertCircle,
  Flame,
  FileText,
  Copy,
  Check,
  RefreshCw,
  Send,
  Flag,
  MessageSquare,
  ShieldAlert,
  Download,
  BookOpen,
  Filter,
  CheckCheck,
} from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import {
  WorldData,
  ClassmateData,
  QuestionAttempt,
  ThoughtProcessRecord,
  RundownReport,
  InterventionData,
  MisconceptionData,
} from '../../types/game';

export const TeacherScreen: React.FC = () => {
  const {
    world,
    attempts: liveAttempts,
    thoughtProcessRecords: liveThoughtRecords,
    misconceptionStrength: liveStrengths,
    activeMisconceptionId: liveActiveMisconceptionId,
    overcomeMisconceptions: liveOvercomeMisconceptions,
    predictionStats: livePredictionStats,
    setScreen,
    deployTeacherQuest,
    teacherToast,
  } = useGameStore();

  const [selectedStudentId, setSelectedStudentId] = useState<string>('student-you');
  const [activeTab, setActiveTab] = useState<'heatmap' | 'flags'>('heatmap');
  const [deployingMisId, setDeployingMisId] = useState<string | null>(null);

  // Flags filter state
  const [selectedFlagFilter, setSelectedFlagFilter] = useState<string>('all');

  // Cell inspection popover/modal
  const [selectedCell, setSelectedCell] = useState<{
    student: ClassmateData;
    misconception: MisconceptionData;
    status: 'overcome' | 'active' | 'severe' | 'untested';
    strength: number;
  } | null>(null);

  // Intervention generator state
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [isLoadingIntervention, setIsLoadingIntervention] = useState(false);
  const [interventionData, setInterventionData] = useState<InterventionData | null>(null);
  const [copiedIntervention, setCopiedIntervention] = useState(false);

  // Rundown report state
  const [showRundownModal, setShowRundownModal] = useState(false);
  const [isLoadingRundown, setIsLoadingRundown] = useState(false);
  const [rundownError, setRundownError] = useState<string | null>(null);
  const [rundownData, setRundownData] = useState<RundownReport | null>(null);
  const [copiedRundown, setCopiedRundown] = useState(false);

  // Export Brief notification toast
  const [copiedBriefToast, setCopiedBriefToast] = useState(false);

  // Generate simulated classmates tailored to current world's concepts & misconceptions
  const classmates = useMemo<ClassmateData[]>(() => {
    if (!world || world.misconceptions.length === 0) return [];

    const m = world.misconceptions;
    const t = world.trees;

    const m1 = m[0]?.id || 'm1';
    const m2 = m[1]?.id || 'm2';
    const m3 = m[2]?.id || 'm3';
    const m4 = m[3]?.id || 'm4';
    const m5 = m[4]?.id || 'm5';
    const m6 = m[5]?.id || 'm6';

    const alexAttempts: QuestionAttempt[] = [
      {
        treeId: t[0]?.id || 't1',
        question: t[0]?.question || 'Simplify fraction',
        choice: t[0]?.choices[1] || 'Wrong choice',
        choiceIndex: 1,
        correct: false,
        confidence: 'Very sure',
        misconceptionId: m2,
        misconceptionLabel: m[1]?.label || 'divides only the numerator',
        hint: 'Are you sure? Check what happened to denominator?',
        thoughtProcess: 'You divided only the top number by 2 and left the bottom number untouched.',
        prediction: {
          treeId: t[0]?.id || 't1',
          pCorrect: 0.25,
          predictedChoice: 1,
          misconceptionId: m2,
          why: 'Alex frequently overlooks converting the denominator.',
        },
        predictionHit: 'exact',
        at: Date.now() - 1000 * 60 * 18,
        correctAnswer: t[0] ? t[0].choices[t[0].answerIndex] : '',
      },
      {
        treeId: t[1]?.id || 't2',
        question: t[1]?.question || 'Equivalent fractions',
        choice: t[1]?.choices[t[1].answerIndex] || 'Correct',
        choiceIndex: t[1]?.answerIndex ?? 0,
        correct: true,
        confidence: 'Fairly sure',
        misconceptionId: null,
        hint: null,
        prediction: {
          treeId: t[1]?.id || 't2',
          pCorrect: 0.65,
          predictedChoice: t[1]?.answerIndex ?? 0,
          misconceptionId: null,
          why: 'Alex understood simplest form with visual diagram.',
        },
        predictionHit: 'direction',
        at: Date.now() - 1000 * 60 * 14,
        correctAnswer: t[1] ? t[1].choices[t[1].answerIndex] : '',
      },
    ];

    const alexFlags: ThoughtProcessRecord[] = [
      {
        id: 'flag-alex-1',
        studentName: 'Alex Chen',
        treeId: t[0]?.id || 't1',
        question: t[0]?.question || 'Simplify fraction 4/8',
        choice: t[0]?.choices[1] || '2/8',
        misconceptionId: m2,
        misconceptionLabel: m[1]?.label || 'divides only the numerator',
        thoughtProcess: 'You divided only the top number by 2 and left the bottom number untouched.',
        studentWords: null,
        confirmed: 'yes',
        at: Date.now() - 1000 * 60 * 18,
      },
    ];

    const marcusAttempts: QuestionAttempt[] = [
      {
        treeId: t[4]?.id || 't5',
        question: t[4]?.question || 'Which is larger: 3/4 or 5/8?',
        choice: t[4]?.choices[0] || '5/8 because 5 is greater than 3',
        choiceIndex: 0,
        correct: false,
        confidence: 'Very sure',
        misconceptionId: m3,
        misconceptionLabel: m[2]?.label || 'compares fractions by numerator alone',
        hint: 'Are you sure? Check what size each fractional piece is!',
        thoughtProcess: 'You looked at the numerators: 5 is greater than 3, so 5/8 appeared bigger.',
        prediction: {
          treeId: t[4]?.id || 't5',
          pCorrect: 0.2,
          predictedChoice: 0,
          misconceptionId: m3,
          why: 'Marcus looks only at the numerator 5 vs 3.',
        },
        predictionHit: 'exact',
        at: Date.now() - 1000 * 60 * 16,
        correctAnswer: t[4]?.choices[t[4].answerIndex] || '',
      },
    ];

    const marcusFlags: ThoughtProcessRecord[] = [
      {
        id: 'flag-marcus-1',
        studentName: 'Marcus Rodriguez',
        treeId: t[4]?.id || 't5',
        question: t[4]?.question || 'Which is larger: 3/4 or 5/8?',
        choice: '5/8 because 5 > 3',
        misconceptionId: m3,
        misconceptionLabel: m[2]?.label || 'compares fractions by numerator alone',
        thoughtProcess: 'You compared the top numbers 5 and 3, assuming larger numerator always wins.',
        studentWords: null,
        confirmed: 'yes',
        at: Date.now() - 1000 * 60 * 16,
      },
    ];

    const zoeAttempts: QuestionAttempt[] = [
      {
        treeId: t[8]?.id || 't9',
        question: t[8]?.question || 'What is 1/2 + 1/3?',
        choice: t[8]?.choices[0] || '2/5',
        choiceIndex: 0,
        correct: false,
        confidence: 'Very sure',
        misconceptionId: m5,
        misconceptionLabel: m[4]?.label || 'adds numerators and denominators separately',
        hint: 'Are you sure? Check if halves and thirds can be combined directly.',
        thoughtProcess: 'You added top numbers (1+1=2) and bottom numbers (2+3=5) separately.',
        prediction: {
          treeId: t[8]?.id || 't9',
          pCorrect: 0.15,
          predictedChoice: 0,
          misconceptionId: m5,
          why: 'Student defaults to whole-number addition logic (1+1)/(2+3).',
        },
        predictionHit: 'exact',
        at: Date.now() - 1000 * 60 * 22,
        correctAnswer: t[8]?.choices[t[8].answerIndex] || '',
      },
    ];

    const zoeFlags: ThoughtProcessRecord[] = [
      {
        id: 'flag-zoe-1',
        studentName: 'Zoe Kim',
        treeId: t[8]?.id || 't9',
        question: t[8]?.question || 'What is 1/2 + 1/3?',
        choice: '2/5',
        misconceptionId: m5,
        misconceptionLabel: m[4]?.label || 'adds numerators and denominators separately',
        thoughtProcess: 'You added the numerators 1+1=2 and denominators 2+3=5 separately.',
        studentWords: 'I thought fractions add straight across like multiplication.',
        confirmed: 'no',
        at: Date.now() - 1000 * 60 * 22,
      },
    ];

    const sophiaAttempts: QuestionAttempt[] = [
      {
        treeId: t[0]?.id || 't1',
        question: t[0]?.question || 'Simplify fraction 4/8',
        choice: t[0]?.choices[t[0].answerIndex] || '1/2',
        choiceIndex: t[0]?.answerIndex ?? 0,
        correct: true,
        confidence: 'Very sure',
        misconceptionId: null,
        hint: null,
        prediction: {
          treeId: t[0]?.id || 't1',
          pCorrect: 0.88,
          predictedChoice: t[0]?.answerIndex ?? 0,
          misconceptionId: null,
          why: 'Sophia demonstrates strong number sense.',
        },
        predictionHit: 'exact',
        at: Date.now() - 1000 * 60 * 25,
        correctAnswer: t[0] ? t[0].choices[t[0].answerIndex] : '',
      },
      {
        treeId: t[4]?.id || 't5',
        question: t[4]?.question || 'Comparing fractions',
        choice: t[4]?.choices[t[4].answerIndex] || 'Correct',
        choiceIndex: t[4]?.answerIndex ?? 0,
        correct: true,
        confidence: 'Very sure',
        misconceptionId: null,
        hint: null,
        prediction: {
          treeId: t[4]?.id || 't5',
          pCorrect: 0.82,
          predictedChoice: t[4]?.answerIndex ?? 0,
          misconceptionId: null,
          why: 'Sophia finds common denominators consistently.',
        },
        predictionHit: 'exact',
        at: Date.now() - 1000 * 60 * 12,
        correctAnswer: t[4]?.choices[t[4].answerIndex] || '',
      },
    ];

    return [
      {
        id: 'student-alex',
        name: 'Alex Chen',
        avatarColor: '#3b82f6',
        misconceptionStrength: { [m1]: 0, [m2]: 0.8, [m3]: 0.2, [m4]: 0, [m5]: 0.1, [m6]: 0 },
        activeMisconceptionId: m2,
        overcomeMisconceptions: [m1],
        predictionStats: { exact: 3, direction: 2, miss: 1 },
        attempts: alexAttempts,
        flags: alexFlags,
      },
      {
        id: 'student-sophia',
        name: 'Sophia Patel',
        avatarColor: '#10b981',
        misconceptionStrength: { [m1]: 0, [m2]: 0, [m3]: 0.1, [m4]: 0, [m5]: 0, [m6]: 0 },
        activeMisconceptionId: null,
        overcomeMisconceptions: [m1, m2],
        predictionStats: { exact: 5, direction: 1, miss: 0 },
        attempts: sophiaAttempts,
        flags: [],
      },
      {
        id: 'student-marcus',
        name: 'Marcus Rodriguez',
        avatarColor: '#f59e0b',
        misconceptionStrength: { [m1]: 0.1, [m2]: 0, [m3]: 0.75, [m4]: 0.3, [m5]: 0, [m6]: 0 },
        activeMisconceptionId: m3,
        overcomeMisconceptions: [],
        predictionStats: { exact: 2, direction: 3, miss: 1 },
        attempts: marcusAttempts,
        flags: marcusFlags,
      },
      {
        id: 'student-zoe',
        name: 'Zoe Kim',
        avatarColor: '#ec4899',
        misconceptionStrength: { [m1]: 0, [m2]: 0.1, [m3]: 0, [m4]: 0.2, [m5]: 0.85, [m6]: 0.1 },
        activeMisconceptionId: m5,
        overcomeMisconceptions: [],
        predictionStats: { exact: 2, direction: 2, miss: 2 },
        attempts: zoeAttempts,
        flags: zoeFlags,
      },
    ];
  }, [world]);

  // Combine live session student with simulated classmates
  const allStudents = useMemo<ClassmateData[]>(() => {
    const liveStudent: ClassmateData = {
      id: 'student-you',
      name: 'You (playing now)',
      avatarColor: '#6366f1',
      isLiveStudent: true,
      misconceptionStrength: liveStrengths,
      activeMisconceptionId: liveActiveMisconceptionId,
      overcomeMisconceptions: liveOvercomeMisconceptions || [],
      predictionStats: livePredictionStats,
      attempts: liveAttempts,
      flags: liveThoughtRecords,
    };

    return [liveStudent, ...classmates];
  }, [liveStrengths, liveActiveMisconceptionId, liveOvercomeMisconceptions, livePredictionStats, liveAttempts, liveThoughtRecords, classmates]);

  const selectedStudent = useMemo(() => {
    return allStudents.find((s) => s.id === selectedStudentId) || allStudents[0];
  }, [allStudents, selectedStudentId]);

  // All flags across all students
  const allFlags = useMemo(() => {
    const list: ThoughtProcessRecord[] = [];
    allStudents.forEach((st) => {
      st.flags.forEach((f) => {
        list.push({
          ...f,
          studentName: st.name,
        });
      });
    });
    return list.sort((a, b) => b.at - a.at);
  }, [allStudents]);

  // Filtered flags feed
  const filteredFlags = useMemo(() => {
    if (selectedFlagFilter === 'all') return allFlags;
    return allFlags.filter((f) => f.misconceptionId === selectedFlagFilter);
  }, [allFlags, selectedFlagFilter]);

  // Cell status evaluator
  const getCellStatus = (st: ClassmateData, misId: string, conceptId: string) => {
    const isOvercome = (st.overcomeMisconceptions || []).includes(misId);
    const strength = st.misconceptionStrength[misId] ?? 0;

    const hasAttemptForConcept = st.attempts.some((a) => {
      const t = world?.trees.find((tr) => tr.id === a.treeId);
      return t?.conceptId === conceptId;
    });

    if (isOvercome) return { status: 'overcome' as const, strength: 0 };
    if (strength >= 0.6) return { status: 'severe' as const, strength };
    if (strength > 0) return { status: 'active' as const, strength };
    if (!hasAttemptForConcept) return { status: 'untested' as const, strength: 0 };
    return { status: 'overcome' as const, strength: 0 };
  };

  const getStudentAccuracy = (st: ClassmateData) => {
    if (st.attempts.length === 0) return '0%';
    const correctCount = st.attempts.filter((a) => a.correct).length;
    return `${Math.round((correctCount / st.attempts.length) * 100)}% (${correctCount}/${st.attempts.length})`;
  };

  const getStudentCalibration = (st: ClassmateData) => {
    const verySureAttempts = st.attempts.filter((a) => a.confidence === 'Very sure');
    if (verySureAttempts.length === 0) return 'N/A';
    const correctVerySure = verySureAttempts.filter((a) => a.correct).length;
    return `${correctVerySure} / ${verySureAttempts.length} (${Math.round(
      (correctVerySure / verySureAttempts.length) * 100
    )}%)`;
  };

  const handleDeployQuest = async (misId: string) => {
    setDeployingMisId(misId);
    try {
      await deployTeacherQuest(misId);
    } finally {
      setDeployingMisId(null);
    }
  };

  // Intervention Generator call
  const handleGenerateIntervention = async (targetType: 'student' | 'misconception', targetId: string) => {
    if (!world) return;
    setIsLoadingIntervention(true);
    setShowInterventionModal(true);
    setCopiedIntervention(false);

    let targetName = '';
    let misconceptionLabel = '';
    let studentThinkingPatterns: string[] = [];

    if (targetType === 'student') {
      const st = allStudents.find((s) => s.id === targetId) || selectedStudent;
      targetName = st.name;
      const mis = world.misconceptions.find((m) => m.id === st.activeMisconceptionId) || world.misconceptions[0];
      misconceptionLabel = mis?.label || 'Core concept rules';
      studentThinkingPatterns = st.flags.map((f) => f.thoughtProcess);
      if (studentThinkingPatterns.length === 0 && st.attempts.length > 0) {
        studentThinkingPatterns = st.attempts.filter((a) => a.thoughtProcess).map((a) => a.thoughtProcess!);
      }
    } else {
      const mis = world.misconceptions.find((m) => m.id === targetId);
      misconceptionLabel = mis?.label || 'Class-wide misconception';
      targetName = 'Class Focus Group';
      studentThinkingPatterns = allFlags.filter((f) => f.misconceptionId === targetId).map((f) => f.thoughtProcess);
    }

    try {
      const res = await fetch('/api/generate-intervention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetName,
          misconceptionLabel,
          studentThinkingPatterns,
          worldSubject: world.subject,
        }),
      });

      if (!res.ok) throw new Error('Intervention generation failed');
      const data: InterventionData = await res.json();
      setInterventionData(data);
    } catch (e) {
      console.error('Intervention error:', e);
    } finally {
      setIsLoadingIntervention(false);
    }
  };

  const handleCopyIntervention = () => {
    if (!interventionData) return;
    const text = `# ${interventionData.title}\n\n## 3-Bullet Mini-Lesson Plan:\n${interventionData.miniLessonBullets.map((b) => `- ${b}`).join('\n')}\n\n## 5-Minute Offline Activity:\n${interventionData.fiveMinuteActivity}\n\n## Pedagogical Insight:\n${interventionData.pedagogicalInsight}`;
    navigator.clipboard.writeText(text);
    setCopiedIntervention(true);
    setTimeout(() => setCopiedIntervention(false), 2500);
  };

  // Export Brief summary
  const handleExportBrief = () => {
    if (!world) return;

    let brief = `# Mastery Grove — Pedagogical Class Brief\n`;
    brief += `**Subject:** ${world.subject}\n`;
    brief += `**Date:** ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}\n\n`;

    brief += `## 1. Class Misconception Status\n`;
    world.misconceptions.forEach((mis) => {
      let overcome = 0;
      let severe = 0;
      let active = 0;
      let untested = 0;

      allStudents.forEach((st) => {
        const { status } = getCellStatus(st, mis.id, mis.conceptId);
        if (status === 'overcome') overcome++;
        else if (status === 'severe') severe++;
        else if (status === 'active') active++;
        else untested++;
      });

      brief += `### [${mis.id.toUpperCase()}] ${mis.label}\n`;
      brief += `- Overcome: ${overcome} student(s)\n`;
      brief += `- Severe (≥60%): ${severe} student(s)\n`;
      brief += `- Active: ${active} student(s)\n`;
      brief += `- Untested: ${untested} student(s)\n\n`;
    });

    brief += `## 2. Live Diagnosed Thought Processes\n`;
    allFlags.slice(0, 8).forEach((f) => {
      brief += `- **${f.studentName || 'Student'}**: "${f.thoughtProcess}"`;
      if (f.studentWords) brief += ` (Student words: "${f.studentWords}")`;
      brief += ` [Confirmed: ${f.confirmed}]\n`;
    });

    brief += `\n## 3. Recommended Class Action Plan\n`;
    brief += `- Run targeted 5-minute offline manipulatives for high-severity misconceptions.\n`;
    brief += `- Encourage students to solve review Memory Sprouts on completed groves.\n`;

    navigator.clipboard.writeText(brief);
    setCopiedBriefToast(true);
    setTimeout(() => setCopiedBriefToast(false), 3000);
  };

  const buildClientFallbackRundown = (): RundownReport => {
    if (!world) {
      return {
        topMisconceptions: [],
        priorityOrderSummary: 'Quick summary (AI unavailable): Review core concepts.',
        fullReportMarkdown: '# What to reteach\n*(Quick summary: Gemini was unavailable)*',
      };
    }

    const summaries = world.misconceptions.map((m) => {
      const affected = allStudents.filter((st) => {
        const { status } = getCellStatus(st, m.id, m.conceptId);
        return status === 'severe' || status === 'active' || st.activeMisconceptionId === m.id;
      });
      const quotes = allFlags
        .filter((f) => f.misconceptionId === m.id && f.thoughtProcess)
        .map((f) => f.thoughtProcess)
        .slice(0, 3);
      return {
        misconceptionId: m.id,
        label: m.label,
        affectedCount: affected.length,
        affectedStudents: affected.map((a) => a.name),
        quotes: quotes.length > 0 ? quotes : [`Common misconception with ${m.label}`],
      };
    });

    const sorted = [...summaries].sort((a, b) => b.affectedCount - a.affectedCount);
    const top3 = sorted.slice(0, 3);

    const topMisconceptions = top3.map((item, idx) => ({
      misconceptionId: item.misconceptionId,
      label: item.label,
      affectedStudents: item.affectedStudents.length > 0 ? item.affectedStudents : ['Class general observation'],
      typicalReasoning: item.quotes[0] || `Student assumption regarding ${item.label}`,
      whyReteach: `Addresses foundational misconception affecting ${Math.max(1, item.affectedCount)} student(s) before advancing to complex problems.`,
      fiveMinuteActivity:
        item.label.toLowerCase().includes('numerator') || item.label.toLowerCase().includes('denominator')
          ? 'Draw two identical cake circles on paper: divide one into 4 slices and one into 8 slices. Shade 3/4 vs 5/8 to physically verify piece sizes.'
          : item.label.toLowerCase().includes('add')
          ? 'Use colored fractional paper strips (halves and thirds) laid side by side against a whole strip to demonstrate why denominators must match before adding.'
          : 'Conduct a 5-minute offline manipulative check contrasting the numerator slice count with denominator piece size.',
    }));

    const priorityOrderSummary = topMisconceptions.length > 0
      ? `Priority 1 is "${topMisconceptions[0].label}" (affects ${topMisconceptions[0].affectedStudents.join(', ')}). Reteach using concrete physical models before advancing.`
      : 'Review core foundational concepts with visual fraction models.';

    let markdown = `# Mastery Grove: what to reteach\n*(Quick summary: Gemini was unavailable)*\n\n`;
    markdown += `**Subject:** ${world.subject}\n\n`;
    markdown += `## Executive Priority Summary\n${priorityOrderSummary}\n\n`;
    markdown += `## Top Misconceptions & Reteach Plan\n`;
    topMisconceptions.forEach((item, i) => {
      markdown += `\n### ${i + 1}. ${item.label}\n`;
      markdown += `- **Affects:** ${item.affectedStudents.join(', ')}\n`;
      markdown += `- **Observed Reasoning:** "${item.typicalReasoning}"\n`;
      markdown += `- **Why Address First:** ${item.whyReteach}\n`;
      markdown += `- **5-Minute Activity:** ${item.fiveMinuteActivity}\n`;
    });

    return {
      topMisconceptions,
      priorityOrderSummary: `${priorityOrderSummary} (Quick summary (AI unavailable))`,
      fullReportMarkdown: markdown,
    };
  };

  const handleGenerateRundown = async () => {
    if (!world) return;
    setIsLoadingRundown(true);
    setRundownError(null);
    setShowRundownModal(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 40000); // 40-second timeout ensures modal never stays stuck

    try {
      // Build compact misconception summaries: counts, affected students, up to 3 quotes each
      const misconceptionSummaries = world.misconceptions.map((m) => {
        const affected = allStudents.filter((st) => {
          const { status } = getCellStatus(st, m.id, m.conceptId);
          return status === 'severe' || status === 'active' || st.activeMisconceptionId === m.id;
        });
        const quotes = allFlags
          .filter((f) => f.misconceptionId === m.id && f.thoughtProcess)
          .map((f) => f.thoughtProcess)
          .slice(0, 3);
        return {
          misconceptionId: m.id,
          label: m.label,
          affectedCount: affected.length,
          affectedStudents: affected.map((a) => a.name),
          quotes: quotes.length > 0 ? quotes : [`Common misconception with ${m.label}`],
        };
      });

      const res = await fetch('/api/generate-rundown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          worldSubject: world.subject,
          misconceptions: world.misconceptions,
          misconceptionSummaries,
        }),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Rundown request failed with status ${res.status}`);
      }
      const data: RundownReport = await res.json();
      setRundownData(data);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn('Rundown generation encountered issue, using fallback:', err);
      try {
        const fallback = buildClientFallbackRundown();
        setRundownData(fallback);
      } catch (fallbackErr) {
        setRundownError(err?.message || 'Could not compile rundown at this time.');
      }
    } finally {
      setIsLoadingRundown(false);
    }
  };

  const handleCopyRundown = () => {
    if (!rundownData?.fullReportMarkdown) return;
    navigator.clipboard.writeText(rundownData.fullReportMarkdown);
    setCopiedRundown(true);
    setTimeout(() => setCopiedRundown(false), 2500);
  };

  return (
    <div className="min-h-dvh w-full bg-[#efe6d2] text-ink flex flex-col p-4 sm:p-8">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-paper-edge pb-4">
          <button
            onClick={() => setScreen('game')}
            data-testid="back-to-forest-btn"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-paper-deep hover:bg-paper-edge text-ink text-xs font-bold transition-all border border-paper-edge shadow-md hover:shadow-[0_3px_0_var(--color-paper-edge)] w-fit"
          >
            <ArrowLeft className="w-4 h-4 text-leaf-deep" />
            <span>Back to the forest</span>
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Export Brief Button */}
            <button
              onClick={handleExportBrief}
              data-testid="export-brief-btn"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-paper-deep hover:bg-paper-edge text-ink hover:text-ink text-xs font-bold transition-all border border-paper-edge shadow-md"
              title="Copy markdown summary of class misconceptions"
            >
              {copiedBriefToast ? <Check className="w-4 h-4 text-leaf-deep" /> : <Copy className="w-4 h-4 text-ink-soft" />}
              <span>{copiedBriefToast ? 'Copied!' : 'Copy brief'}</span>
            </button>

            {/* End of session rundown button */}
            <button
              onClick={handleGenerateRundown}
              data-testid="rundown-btn"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sun hover:brightness-105 text-ink text-xs font-bold transition-all shadow-md"
            >
              <FileText className="w-4 h-4" />
              <span>What to reteach</span>
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-paper-edge">
              <div className="w-8 h-8 rounded-xl bg-sun text-leaf-deep border border-paper-edge flex items-center justify-center shadow-xs">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-leaf-deep block leading-none">
                  Teacher View
                </span>
                <span className="text-[11px] text-ink-soft">
                  What your class is thinking
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Toast if Quest Deployed or Sprout Planted */}
        {teacherToast && (
          <div className="p-3 bg-paper-deep border border-paper-edge rounded-2xl text-xs text-leaf-deep flex items-center gap-2 rise-in">
            <span className="font-semibold">{teacherToast}</span>
          </div>
        )}

        {/* Tabs: Heatmap vs Live Flags Feed */}
        <div className="flex items-center gap-2 bg-paper p-1.5 rounded-2xl border border-paper-edge max-w-sm">
          <button
            type="button"
            data-testid="tab-heatmap"
            onClick={() => setActiveTab('heatmap')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'heatmap' ? 'bg-sun text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Class map</span>
          </button>
          <button
            type="button"
            data-testid="tab-flags"
            onClick={() => setActiveTab('flags')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'flags' ? 'bg-sun text-ink shadow-sm' : 'text-ink-soft hover:text-ink'
            }`}
          >
            <Flag className="w-3.5 h-3.5 text-sun-deep" />
            <span>Just flagged ({allFlags.length})</span>
          </button>
        </div>

        {activeTab === 'heatmap' && (
          <>
            {/* Class Roster Selector Tabs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-leaf-deep" />
                  Your class
                </label>
                <span className="text-[11px] text-ink-soft">Pick a student to see their thinking</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {allStudents.map((st) => {
                  const isSelected = st.id === selectedStudentId;
                  return (
                    <div
                      key={st.id}
                      className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                        isSelected
                          ? 'bg-paper-deep border-paper-edge ring-2 ring-sun shadow-[0_3px_0_var(--color-paper-edge)]'
                          : 'bg-paper border-paper-edge hover:bg-paper-deep text-ink-soft'
                      }`}
                    >
                      <button
                        type="button"
                        data-testid={`select-student-${st.id}`}
                        onClick={() => setSelectedStudentId(st.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <span className="font-bold text-xs truncate text-ink">{st.name}</span>
                          {!st.isLiveStudent && (
                            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-paper-deep text-ink-soft border border-paper-edge shrink-0 font-medium">
                              sample
                            </span>
                          )}
                          {st.isLiveStudent && (
                            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-paper-deep text-leaf-deep border border-paper-edge shrink-0 font-bold animate-pulse">
                              Live
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-ink-soft space-y-0.5">
                          <div>
                            Accuracy: <strong className="text-ink">{getStudentAccuracy(st)}</strong>
                          </div>
                          <div className="truncate">
                            Active:{' '}
                            {st.activeMisconceptionId ? (
                              <span className="text-sun-deep font-semibold">{st.activeMisconceptionId.toUpperCase()}</span>
                            ) : (
                              <span className="text-leaf-deep font-bold">Clear</span>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Mini Intervention Button on Student Card */}
                      <button
                        type="button"
                        onClick={() => handleGenerateIntervention('student', st.id)}
                        data-testid={`intervention-student-${st.id}`}
                        className="mt-2 pt-1.5 border-t border-paper-edge w-full inline-flex items-center justify-center gap-1 text-[10px] font-bold text-leaf-deep hover:text-leaf-deep transition-colors"
                      >
                        <span>Plan help</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Misconception Map Matrix */}
            <div className="p-6 rounded-3xl bg-paper border border-paper-edge shadow-[0_3px_0_var(--color-paper-edge)] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-sun-deep" />
                  <div>
                    <h2 className="text-sm font-bold text-ink">Mix-ups across the class</h2>
                    <p className="text-xs text-ink-soft">
                      Tap a box to see what that student was thinking.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-xs bg-leaf-soft border border-leaf/40" /> Green = Overcome
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-xs bg-sun-soft border border-sun" /> Yellow = Active
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-xs bg-berry-soft border border-berry/50" /> Red = Severe (≥60%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-xs bg-paper-deep border border-paper-edge" /> Gray = Untested
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-paper-edge text-ink-soft">
                      <th className="py-2.5 px-3 font-semibold min-w-[220px]">Misconception</th>
                      {allStudents.map((st) => (
                        <th key={st.id} className="py-2.5 px-2 font-semibold text-center min-w-[90px]">
                          <span className={st.id === selectedStudentId ? 'text-leaf-deep font-bold' : ''}>
                            {st.name.split(' ')[0]}
                          </span>
                        </th>
                      ))}
                      <th className="py-2.5 px-3 font-semibold text-center min-w-[80px]">Status</th>
                      <th className="py-2.5 px-3 font-semibold text-right min-w-[170px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-paper-edge">
                    {world?.misconceptions.map((mis) => {
                      let severeCount = 0;
                      let activeCount = 0;
                      allStudents.forEach((st) => {
                        const cell = getCellStatus(st, mis.id, mis.conceptId);
                        if (cell.status === 'severe') severeCount++;
                        else if (cell.status === 'active') activeCount++;
                      });

                      const isDeploying = deployingMisId === mis.id;

                      return (
                        <tr key={mis.id} className="hover:bg-paper-deep transition-colors">
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-sun-deep mr-2 text-[11px]">
                              {mis.id.toUpperCase()}
                            </span>
                            <span className="text-ink">{mis.label}</span>
                          </td>

                          {allStudents.map((st) => {
                            const { status, strength } = getCellStatus(st, mis.id, mis.conceptId);
                            const isCurrentCol = st.id === selectedStudentId;

                            let cellBadge = 'Untested';
                            let cellClass = 'bg-paper text-ink-soft border-paper-edge';

                            if (status === 'overcome') {
                              cellBadge = 'Overcome ✓';
                              cellClass = 'bg-leaf-soft text-leaf-deep border-leaf/40 font-bold';
                            } else if (status === 'severe') {
                              cellBadge = `Severe ${Math.round(strength * 100)}%`;
                              cellClass = 'bg-berry-soft text-berry-deep border-berry/50 font-extrabold ring-1 ring-berry/40';
                            } else if (status === 'active') {
                              cellBadge = `Active ${Math.round(strength * 100)}%`;
                              cellClass = 'bg-sun-soft text-sun-deep border-sun font-bold';
                            }

                            return (
                              <td key={st.id} className="py-2 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => setSelectedCell({ student: st, misconception: mis, status, strength })}
                                  data-testid={`cell-${st.id}-${mis.id}`}
                                  className={`w-full py-1.5 px-1 rounded-lg border text-[11px] transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs ${cellClass} ${
                                    isCurrentCol ? 'ring-1 ring-sun' : ''
                                  }`}
                                  title={`Click to view ${st.name}'s thought processes for ${mis.id.toUpperCase()}`}
                                >
                                  {cellBadge}
                                </button>
                              </td>
                            );
                          })}

                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                severeCount > 0
                                  ? 'bg-berry-soft text-berry-deep border border-berry/50'
                                  : activeCount > 0
                                  ? 'bg-sun-soft text-sun-deep border border-sun'
                                  : 'bg-leaf-soft text-leaf-deep border border-leaf/40'
                              }`}
                            >
                              {severeCount > 0 ? `${severeCount} Severe` : activeCount > 0 ? `${activeCount} Active` : 'Clear'}
                            </span>
                          </td>

                          {/* Action Buttons: Intervention & Deploy Quest */}
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleGenerateIntervention('misconception', mis.id)}
                                data-testid={`intervention-mis-${mis.id}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-paper-deep hover:bg-paper-edge text-leaf-deep rounded-xl text-[11px] font-bold border border-paper-edge transition-all shadow-xs"
                                title="Generate targeted mini-lesson & 5-minute activity for this misconception"
                              >
                                <span>Lesson plan</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeployQuest(mis.id)}
                                disabled={isDeploying}
                                data-testid={`deploy-quest-${mis.id}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-sun hover:brightness-105 disabled:opacity-50 text-ink rounded-xl text-[11px] font-bold transition-all shadow-xs"
                              >
                                {isDeploying && <RefreshCw className="w-3 h-3 animate-spin" />}
                                <span>Deploy Quest</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected Student Metrics & Calibration Dashboard */}
            <div className="p-6 rounded-3xl bg-paper border border-paper-edge shadow-[0_3px_0_var(--color-paper-edge)] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-paper-edge pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg font-bold text-ink">
                      {selectedStudent.name}
                    </span>
                    {!selectedStudent.isLiveStudent && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-paper-deep text-ink-soft border border-paper-edge">
                        Sample
                      </span>
                    )}
                    {selectedStudent.isLiveStudent && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-paper-deep text-leaf-deep border border-paper-edge font-bold">
                        Live Session
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-soft">
                    How sure they were, how often they were right, and what they were thinking
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleGenerateIntervention('student', selectedStudent.id)}
                  data-testid="generate-student-intervention-btn"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-sun hover:brightness-105 text-ink rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <span>Lesson plan for {selectedStudent.name.split(' ')[0]}</span>
                </button>
              </div>

              {/* 4 Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-paper-deep border border-paper-edge space-y-1">
                  <span className="text-xs text-ink-soft flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-leaf-deep" />
                    Accuracy
                  </span>
                  <p className="text-lg font-extrabold text-ink">{getStudentAccuracy(selectedStudent)}</p>
                  <span className="text-[11px] text-ink-soft block">Answered right</span>
                </div>

                <div className="p-4 rounded-2xl bg-paper-deep border border-paper-edge space-y-1">
                  <span className="text-xs text-ink-soft flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-sun-deep" />
                    Calibration
                  </span>
                  <p className="text-lg font-extrabold text-sun-deep">{getStudentCalibration(selectedStudent)}</p>
                  <span className="text-[11px] text-ink-soft block">"Very sure" answers that were correct</span>
                </div>

                <div className="p-4 rounded-2xl bg-paper-deep border border-paper-edge space-y-1">
                  <span className="text-xs text-ink-soft flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-berry-deep" />
                    Current mix-up
                  </span>
                  <p className="text-sm font-bold truncate text-ink">
                    {selectedStudent.activeMisconceptionId ? (
                      <span className="text-berry-deep">
                        {selectedStudent.activeMisconceptionId.toUpperCase()}:{' '}
                        {world?.misconceptions.find((m) => m.id === selectedStudent.activeMisconceptionId)?.label || 'Detected'}
                      </span>
                    ) : (
                      <span className="text-leaf-deep font-bold">None (Clear)</span>
                    )}
                  </p>
                  <span className="text-[11px] text-ink-soft block">Their strongest mix-up right now</span>
                </div>

                <div className="p-4 rounded-2xl bg-paper-deep border border-paper-edge space-y-1">
                  <span className="text-xs text-ink-soft flex items-center gap-1.5">
                    <BrainCircuit className="w-3.5 h-3.5 text-leaf-deep" />
                    Byte's guesses
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-extrabold text-leaf-deep">
                      {selectedStudent.predictionStats.exact + selectedStudent.predictionStats.direction} /{' '}
                      {selectedStudent.predictionStats.exact + selectedStudent.predictionStats.direction + selectedStudent.predictionStats.miss}
                    </span>
                  </div>
                  <div className="text-[10px] text-ink-soft flex gap-2">
                    <span>{selectedStudent.predictionStats.exact} exact</span>
                    <span>•</span>
                    <span>{selectedStudent.predictionStats.direction} direction</span>
                    <span>•</span>
                    <span>{selectedStudent.predictionStats.miss} miss</span>
                  </div>
                </div>
              </div>

              {/* "Predicted vs Actual" Log */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
                    <BrainCircuit className="w-4 h-4 text-leaf-deep" />
                    Byte's guess vs what happened ({selectedStudent.attempts.length})
                  </h3>
                  <span className="text-[11px] text-ink-soft">Latest attempt at top</span>
                </div>

                {selectedStudent.attempts.length === 0 ? (
                  <div className="py-8 text-center text-xs text-ink-soft border border-dashed border-paper-edge rounded-2xl">
                    No questions attempted yet by {selectedStudent.name}.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedStudent.attempts.map((att, idx) => {
                      const hit = att.predictionHit;
                      return (
                        <div key={idx} className="p-4 rounded-2xl bg-paper-deep border border-paper-edge text-xs space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-paper-edge pb-2">
                            <span className="font-bold text-ink text-sm">{att.question}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                  att.correct
                                    ? 'bg-leaf-soft text-leaf-deep border border-leaf/40'
                                    : 'bg-berry-soft text-berry-deep border border-berry/50'
                                }`}
                              >
                                {att.correct ? <>✓ Correct</> : <>✗ Withered</>}
                              </span>
                              {hit && (
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                    hit === 'exact'
                                      ? 'bg-paper-deep text-leaf-deep border border-paper-edge'
                                      : hit === 'direction'
                                      ? 'bg-paper-deep text-leaf-deep border border-paper-edge'
                                      : 'bg-paper-deep text-ink-soft border border-paper-edge'
                                  }`}
                                >
                                  {hit === 'exact' && 'Byte guessed it exactly'}
                                  {hit === 'direction' && 'Byte was close'}
                                  {hit === 'miss' && 'Byte guessed wrong'}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            <div className="p-2.5 rounded-xl bg-paper-deep border border-paper-edge space-y-1">
                              <span className="text-[10px] uppercase font-bold text-leaf-deep block">
                                Byte guessed:
                              </span>
                              {att.prediction ? (
                                <div className="text-[11px] text-leaf-deep">
                                  <p className="font-semibold text-ink">
                                    {att.prediction.pCorrect >= 0.5
                                      ? `Predicted Correct (${Math.round(att.prediction.pCorrect * 100)}%)`
                                      : `Predicted Distractor: "${world?.trees.find((t) => t.id === att.treeId)?.choices[att.prediction.predictedChoice] || 'Choice'}"`}
                                  </p>
                                  <p className="text-leaf-deep italic mt-0.5">"{att.prediction.why}"</p>
                                </div>
                              ) : (
                                <p className="text-[11px] font-semibold text-ink-soft">Byte didn't guess this one.</p>
                              )}
                            </div>

                            <div className="p-2.5 rounded-xl bg-paper border border-paper-edge space-y-1">
                              <span className="text-[10px] uppercase font-bold text-ink-soft block">
                                What happened:
                              </span>
                              <div className="text-[11px] text-ink">
                                <p>Chosen: <strong className="text-ink font-semibold">"{att.choice}"</strong></p>
                                <p className="text-ink-soft">Confidence: <strong className="text-sun-deep">{att.confidence}</strong></p>
                              </div>
                            </div>
                          </div>

                          {att.thoughtProcess && (
                            <div className="p-2.5 rounded-xl bg-sun-soft border border-sun text-[11px] text-sun-deep">
                              <strong>What they were thinking:</strong> "{att.thoughtProcess}"
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Tab 2: Live Flags Feed */}
        {activeTab === 'flags' && (
          <div className="p-6 rounded-3xl bg-paper border border-paper-edge shadow-[0_3px_0_var(--color-paper-edge)] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-paper-edge pb-4">
              <div>
                <h2 className="text-base font-bold text-ink flex items-center gap-2">
                  <Flag className="w-5 h-5 text-sun-deep" />
                  Just flagged
                </h2>
                <p className="text-xs text-ink-soft">
                  Live stream of student thought processes diagnosed today. Filterable by misconception.
                </p>
              </div>

              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-sun text-sun-deep border border-sun w-fit">
                {filteredFlags.length} Events Displayed
              </span>
            </div>

            {/* Misconception Filter Pills */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-ink-soft uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-leaf-deep" />
                Filter by Misconception:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid="filter-all-flags"
                  onClick={() => setSelectedFlagFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    selectedFlagFilter === 'all'
                      ? 'bg-sun text-ink border-paper-edge shadow-sm'
                      : 'bg-paper-deep text-ink-soft border-paper-edge hover:bg-paper-edge'
                  }`}
                >
                  All Misconceptions ({allFlags.length})
                </button>
                {world?.misconceptions.map((mis) => {
                  const count = allFlags.filter((f) => f.misconceptionId === mis.id).length;
                  const isSelected = selectedFlagFilter === mis.id;
                  return (
                    <button
                      key={mis.id}
                      type="button"
                      data-testid={`filter-flag-${mis.id}`}
                      onClick={() => setSelectedFlagFilter(mis.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-sun text-ink border-paper-edge shadow-sm'
                          : 'bg-paper-deep text-ink-soft border-paper-edge hover:bg-paper-edge'
                      }`}
                    >
                      <span>{mis.id.toUpperCase()}</span>
                      <span className="opacity-70">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredFlags.length === 0 ? (
              <div className="py-12 text-center text-xs text-ink-soft border border-dashed border-paper-edge rounded-2xl">
                Nothing here yet. When a student gets one wrong, what they were thinking shows up here.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFlags.map((flag) => (
                  <div
                    key={flag.id}
                    className="p-4 rounded-2xl bg-paper-deep border border-paper-edge hover:border-paper-edge transition-all space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-ink">{flag.studentName || 'Student'}</span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-sun-soft text-sun-deep border border-sun">
                          {flag.misconceptionId?.toUpperCase() || 'Misconception'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            flag.confirmed === 'yes'
                              ? 'bg-leaf-soft text-leaf-deep border-leaf/40'
                              : flag.confirmed === 'no'
                              ? 'bg-paper-deep text-leaf-deep border-paper-edge'
                              : 'bg-paper-deep text-ink-soft border-paper-edge'
                          }`}
                        >
                          {flag.confirmed === 'yes' && 'Confirmed: Yes, that’s it'}
                          {flag.confirmed === 'no' && 'Revised: Not quite'}
                          {flag.confirmed === 'unanswered' && 'Pending Verification'}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-ink-soft">
                      <span className="text-ink-soft font-semibold">Question:</span> "{flag.question}"
                    </div>

                    <div className="p-3 rounded-xl bg-sun-soft border border-sun text-xs text-sun-deep">
                      <span className="font-bold text-sun-deep block mb-0.5">Diagnosed Reasoning:</span>
                      "{flag.thoughtProcess}"
                    </div>

                    {flag.studentWords && (
                      <div className="p-2.5 rounded-xl bg-paper-deep border border-paper-edge text-xs text-leaf-deep flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-leaf-deep shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-leaf-deep">Student's own words:</strong> "{flag.studentWords}"
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cell Detail Modal (shows thought processes behind clicked matrix cell) */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-paper-deep">
          <div
            role="dialog"
            aria-labelledby="cell-detail-title"
            className="w-full max-w-lg bg-paper border border-paper-edge rounded-3xl shadow-[0_3px_0_var(--color-paper-edge)] p-6 text-ink space-y-4 max-h-[85vh] overflow-y-auto rise-in"
          >
            <div className="flex items-center justify-between border-b border-paper-edge pb-3">
              <div>
                <span className="text-[11px] font-bold text-sun-deep uppercase tracking-wide">
                  One student, one mix-up
                </span>
                <h3 id="cell-detail-title" className="text-base font-bold text-ink">
                  {selectedCell.student.name} × {selectedCell.misconception.id.toUpperCase()}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                data-testid="close-cell-modal-btn"
                className="p-1 rounded-lg text-ink-soft hover:text-ink hover:bg-paper-deep"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs text-ink-soft font-semibold block">Misconception Description:</span>
              <p className="text-xs text-ink bg-paper-deep p-3 rounded-xl border border-paper-edge">
                {selectedCell.misconception.label}
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-paper-deep border border-paper-edge text-xs">
              <span className="text-ink-soft">Current Status:</span>
              <span
                className={`font-bold px-2.5 py-0.5 rounded-full border ${
                  selectedCell.status === 'overcome'
                    ? 'bg-leaf-soft text-leaf-deep border-leaf/40'
                    : selectedCell.status === 'severe'
                    ? 'bg-berry-soft text-berry-deep border border-berry/50'
                    : selectedCell.status === 'active'
                    ? 'bg-sun-soft text-sun-deep border border-sun'
                    : 'bg-paper-deep text-ink-soft border-paper-edge'
                }`}
              >
                {selectedCell.status.toUpperCase()} {selectedCell.strength > 0 ? `(${Math.round(selectedCell.strength * 100)}%)` : ''}
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-ink-soft block">
                Observed Thought Processes:
              </span>
              {selectedCell.student.flags.filter((f) => f.misconceptionId === selectedCell.misconception.id).length === 0 ? (
                <div className="p-3 rounded-xl bg-paper-deep border border-paper-edge text-xs text-ink-soft italic">
                  No specific thought-process flags recorded for this misconception yet.
                </div>
              ) : (
                selectedCell.student.flags
                  .filter((f) => f.misconceptionId === selectedCell.misconception.id)
                  .map((f, i) => (
                    <div key={i} className="p-3 rounded-xl bg-sun-soft border border-sun text-xs space-y-1">
                      <p className="text-sun-deep italic font-medium">"{f.thoughtProcess}"</p>
                      {f.studentWords && (
                        <p className="text-leaf-deep text-[11px]">
                          <strong>Student explained:</strong> "{f.studentWords}"
                        </p>
                      )}
                    </div>
                  ))
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-paper-edge">
              <button
                type="button"
                onClick={() => {
                  const st = selectedCell.student;
                  setSelectedCell(null);
                  handleGenerateIntervention('student', st.id);
                }}
                data-testid="generate-cell-intervention-btn"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-sun hover:brightness-105 text-ink rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <span>Generate Intervention</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Intervention Generator Modal */}
      {showInterventionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-paper-deep">
          <div
            role="dialog"
            aria-labelledby="intervention-modal-title"
            className="w-full max-w-2xl bg-paper border border-paper-edge rounded-3xl shadow-[0_3px_0_var(--color-paper-edge)] p-6 text-ink space-y-5 max-h-[85vh] overflow-y-auto rise-in"
          >
            <div className="flex items-center justify-between border-b border-paper-edge pb-3">
              <div className="flex items-center gap-2">
                <h3 id="intervention-modal-title" className="text-lg font-bold">
                  A short lesson plan
                </h3>
              </div>
              <button
                onClick={() => setShowInterventionModal(false)}
                data-testid="close-intervention-modal-btn"
                className="p-1 rounded-lg text-ink-soft hover:text-ink hover:bg-paper-deep"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {isLoadingIntervention ? (
              <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-leaf-deep animate-spin" />
                <p className="text-sm font-semibold text-ink">
                  Byte is writing a short lesson plan…
                </p>
                <p className="text-xs text-ink-soft">
                  It uses what your students actually said.
                </p>
              </div>
            ) : interventionData ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-paper-deep border border-paper-edge space-y-1">
                  <h4 className="text-sm font-extrabold text-ink">{interventionData.title}</h4>
                  <p className="text-xs text-leaf-deep italic">{interventionData.pedagogicalInsight}</p>
                </div>

                {/* 3-Bullet Mini-Lesson Plan */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-soft flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-leaf-deep" />
                    3-Bullet Mini-Lesson Plan
                  </span>
                  <div className="space-y-2">
                    {interventionData.miniLessonBullets.map((bullet, idx) => (
                      <div
                        key={idx}
                        data-testid="intervention-bullets"
                        className="p-3 rounded-xl bg-paper-deep border border-paper-edge text-xs text-ink flex items-start gap-2.5"
                      >
                        <span className="w-5 h-5 rounded-full bg-sun text-leaf-deep font-bold flex items-center justify-center shrink-0 border border-paper-edge">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5-Minute Offline Activity */}
                <div className="p-4 rounded-2xl bg-leaf-soft border border-leaf/40 text-xs text-leaf-deep space-y-1.5">
                  <strong className="text-leaf-deep flex items-center gap-1.5">
                    5-Minute Concrete Offline Activity
                  </strong>
                  <p data-testid="intervention-activity" className="leading-relaxed font-medium">
                    {interventionData.fiveMinuteActivity}
                  </p>
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-between pt-3 border-t border-paper-edge">
                  <span className="text-xs text-ink-soft">
                    Ready to copy into your lesson plan.
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyIntervention}
                    data-testid="copy-intervention-btn"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-leaf hover:brightness-105 text-paper rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    {copiedIntervention ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedIntervention ? 'Copied Plan!' : 'Copy Plan'}</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* End of session rundown report modal */}
      {showRundownModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-paper-deep">
          <div
            role="dialog"
            aria-labelledby="rundown-modal-title"
            className="w-full max-w-3xl bg-paper border border-paper-edge rounded-3xl shadow-[0_3px_0_var(--color-paper-edge)] p-6 text-ink space-y-5 max-h-[90vh] overflow-y-auto rise-in"
          >
            <div className="flex items-center justify-between border-b border-paper-edge pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-leaf-deep" />
                <h3 id="rundown-modal-title" className="text-lg font-bold">
                  What to reteach
                </h3>
              </div>
              <button
                onClick={() => setShowRundownModal(false)}
                data-testid="close-rundown-btn"
                className="p-1 rounded-lg text-ink-soft hover:text-ink hover:bg-paper-deep"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {isLoadingRundown ? (
              <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-leaf-deep animate-spin" />
                <p className="text-sm font-semibold text-ink">
                  Byte is reading today's answers…
                </p>
                <p className="text-xs text-ink-soft">
                  Finding the biggest mix-ups, with a 5-minute activity for each.
                </p>
              </div>
            ) : rundownError && !rundownData ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-berry text-berry-deep flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-md">
                  <p className="text-sm font-bold text-ink">Could not generate AI rundown</p>
                  <p className="text-xs text-ink-soft">{rundownError}</p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateRundown}
                  data-testid="retry-rundown-btn"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sun hover:brightness-105 text-ink font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try again</span>
                </button>
              </div>
            ) : rundownData ? (
              <div className="space-y-5">
                {/* Priority Order Executive Summary */}
                <div className="p-4 rounded-2xl bg-paper-deep border border-paper-edge space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-leaf-deep">
                    Reteach first
                  </span>
                  <p className="text-sm font-medium text-ink leading-relaxed">
                    {rundownData.priorityOrderSummary}
                  </p>
                </div>

                {/* Top 3 Misconceptions Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                    Top 3 Class Misconceptions & 5-Minute Activities
                  </h4>

                  <div className="space-y-3">
                    {rundownData.topMisconceptions.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-paper-deep border border-paper-edge space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-sun text-sun-deep text-xs font-bold flex items-center justify-center border border-sun">
                              #{idx + 1}
                            </span>
                            <span className="text-sm font-bold text-ink">{item.label}</span>
                          </div>
                          <span className="text-[11px] text-sun-deep bg-sun-soft px-2 py-0.5 rounded-full border border-sun">
                            Affects: {item.affectedStudents.join(', ')}
                          </span>
                        </div>

                        <div className="text-xs text-ink-soft space-y-1">
                          <p>
                            <strong className="text-ink-soft">Typical Student Reasoning:</strong>{' '}
                            <span className="italic font-medium text-sun-deep">"{item.typicalReasoning}"</span>
                          </p>
                          <p>
                            <strong className="text-ink-soft">Why Address First:</strong> {item.whyReteach}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-leaf-soft border border-leaf/40 text-xs text-leaf-deep">
                          <strong className="text-leaf-deep flex items-center gap-1.5 mb-0.5">
                            Concrete 5-Minute Reteach Activity:
                          </strong>
                          <span>{item.fiveMinuteActivity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Copy Action Bar */}
                <div className="flex items-center justify-between pt-3 border-t border-paper-edge">
                  <span className="text-xs text-ink-soft">
                    Ready to paste into lesson notes or LMS.
                  </span>
                  <button
                    onClick={handleCopyRundown}
                    data-testid="copy-rundown-btn"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-leaf hover:brightness-105 text-paper rounded-xl text-xs font-bold transition-all shadow-md"
                  >
                    {copiedRundown ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedRundown ? 'Copied to Clipboard!' : 'Copy Full Report'}</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
