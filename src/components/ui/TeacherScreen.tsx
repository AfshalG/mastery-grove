import React, { useState, useMemo } from 'react';
import {
  GraduationCap,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TreePine,
  Sparkles,
  Bot,
  BrainCircuit,
  Target,
  Users,
  Activity,
  Award,
  AlertTriangle,
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
      name: 'You (Current Student)',
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
        fullReportMarkdown: '# End of Session Pedagogical Rundown\n*(Quick summary (AI unavailable))*',
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

    let markdown = `# Mastery Grove — End of Session Pedagogical Rundown\n*(Quick summary (AI unavailable))*\n\n`;
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
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col p-4 sm:p-8 select-none">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Navigation Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <button
            onClick={() => setScreen('game')}
            data-testid="back-to-forest-btn"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold transition-all border border-slate-700 shadow-md hover:shadow-lg w-fit"
          >
            <ArrowLeft className="w-4 h-4 text-emerald-400" />
            <span>Back to the forest</span>
          </button>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Export Brief Button */}
            <button
              onClick={handleExportBrief}
              data-testid="export-brief-btn"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all border border-slate-700 shadow-md"
              title="Copy markdown summary of class misconceptions"
            >
              {copiedBriefToast ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copiedBriefToast ? 'Copied Brief!' : 'Export Brief'}</span>
            </button>

            {/* End of session rundown button */}
            <button
              onClick={handleGenerateRundown}
              data-testid="rundown-btn"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md"
            >
              <FileText className="w-4 h-4" />
              <span>End of session rundown</span>
            </button>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center shadow-xs">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block leading-none">
                  Teacher View
                </span>
                <span className="text-[11px] text-slate-400">
                  Adaptive Cognitive Briefing
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Toast if Quest Deployed or Sprout Planted */}
        {teacherToast && (
          <div className="p-3 bg-purple-950/80 border border-purple-500 rounded-2xl text-xs text-purple-200 flex items-center gap-2 animate-in fade-in">
            <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="font-semibold">{teacherToast}</span>
          </div>
        )}

        {/* Tabs: Heatmap vs Live Flags Feed */}
        <div className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800 max-w-sm">
          <button
            type="button"
            data-testid="tab-heatmap"
            onClick={() => setActiveTab('heatmap')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'heatmap' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Misconception Map</span>
          </button>
          <button
            type="button"
            data-testid="tab-flags"
            onClick={() => setActiveTab('flags')}
            className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'flags' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flag className="w-3.5 h-3.5 text-amber-400" />
            <span>Flags Feed ({allFlags.length})</span>
          </button>
        </div>

        {activeTab === 'heatmap' && (
          <>
            {/* Class Roster Selector Tabs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  Class Roster
                </label>
                <span className="text-[11px] text-slate-400">Click a student to view diagnosis or generate intervention</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {allStudents.map((st) => {
                  const isSelected = st.id === selectedStudentId;
                  return (
                    <div
                      key={st.id}
                      className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-950/80 border-indigo-500 ring-2 ring-indigo-400/30 shadow-lg'
                          : 'bg-slate-900/80 border-slate-800 hover:bg-slate-800/80 text-slate-300'
                      }`}
                    >
                      <button
                        type="button"
                        data-testid={`select-student-${st.id}`}
                        onClick={() => setSelectedStudentId(st.id)}
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <span className="font-bold text-xs truncate text-white">{st.name}</span>
                          {!st.isLiveStudent && (
                            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 shrink-0 font-medium">
                              sample data
                            </span>
                          )}
                          {st.isLiveStudent && (
                            <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-blue-950 text-blue-300 border border-blue-700 shrink-0 font-bold animate-pulse">
                              Live
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400 space-y-0.5">
                          <div>
                            Accuracy: <strong className="text-slate-200">{getStudentAccuracy(st)}</strong>
                          </div>
                          <div className="truncate">
                            Active:{' '}
                            {st.activeMisconceptionId ? (
                              <span className="text-amber-400 font-semibold">{st.activeMisconceptionId.toUpperCase()}</span>
                            ) : (
                              <span className="text-emerald-400 font-bold">Clear</span>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Mini Intervention Button on Student Card */}
                      <button
                        type="button"
                        onClick={() => handleGenerateIntervention('student', st.id)}
                        data-testid={`intervention-student-${st.id}`}
                        className="mt-2 pt-1.5 border-t border-slate-800/80 w-full inline-flex items-center justify-center gap-1 text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        <Sparkles className="w-3 h-3 text-indigo-400" />
                        <span>Plan Intervention</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Misconception Map Matrix */}
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-400" />
                  <div>
                    <h2 className="text-sm font-bold text-white">Class Misconception Map</h2>
                    <p className="text-xs text-slate-400">
                      Click any cell to inspect the student’s thinking process and trigger a targeted lesson plan.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-xs bg-emerald-950 border border-emerald-500" /> Green = Overcome
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-xs bg-amber-950 border border-amber-500" /> Yellow = Active
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-xs bg-rose-950 border border-rose-500" /> Red = Severe (≥60%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-xs bg-slate-800 border border-slate-700" /> Gray = Untested
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-2.5 px-3 font-semibold min-w-[220px]">Misconception</th>
                      {allStudents.map((st) => (
                        <th key={st.id} className="py-2.5 px-2 font-semibold text-center min-w-[90px]">
                          <span className={st.id === selectedStudentId ? 'text-indigo-300 font-bold' : ''}>
                            {st.name.split(' ')[0]}
                          </span>
                        </th>
                      ))}
                      <th className="py-2.5 px-3 font-semibold text-center min-w-[80px]">Status</th>
                      <th className="py-2.5 px-3 font-semibold text-right min-w-[170px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
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
                        <tr key={mis.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-amber-400 mr-2 text-[11px]">
                              {mis.id.toUpperCase()}
                            </span>
                            <span className="text-slate-200">{mis.label}</span>
                          </td>

                          {allStudents.map((st) => {
                            const { status, strength } = getCellStatus(st, mis.id, mis.conceptId);
                            const isCurrentCol = st.id === selectedStudentId;

                            let cellBadge = 'Untested';
                            let cellClass = 'bg-slate-900/60 text-slate-500 border-slate-800';

                            if (status === 'overcome') {
                              cellBadge = 'Overcome ✓';
                              cellClass = 'bg-emerald-950/70 text-emerald-300 border-emerald-600/60 font-bold';
                            } else if (status === 'severe') {
                              cellBadge = `Severe ${Math.round(strength * 100)}%`;
                              cellClass = 'bg-rose-950/90 text-rose-200 border-rose-500/80 font-extrabold ring-1 ring-rose-500/30';
                            } else if (status === 'active') {
                              cellBadge = `Active ${Math.round(strength * 100)}%`;
                              cellClass = 'bg-amber-950/70 text-amber-300 border-amber-600/60 font-bold';
                            }

                            return (
                              <td key={st.id} className="py-2 px-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => setSelectedCell({ student: st, misconception: mis, status, strength })}
                                  data-testid={`cell-${st.id}-${mis.id}`}
                                  className={`w-full py-1.5 px-1 rounded-lg border text-[11px] transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs ${cellClass} ${
                                    isCurrentCol ? 'ring-1 ring-indigo-400' : ''
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
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : activeCount > 0
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
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
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl text-[11px] font-bold border border-slate-700 transition-all shadow-xs"
                                title="Generate targeted mini-lesson & 5-minute activity for this misconception"
                              >
                                <Sparkles className="w-3 h-3 text-indigo-400" />
                                <span>Intervention</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeployQuest(mis.id)}
                                disabled={isDeploying}
                                data-testid={`deploy-quest-${mis.id}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white rounded-xl text-[11px] font-bold transition-all shadow-xs"
                              >
                                {isDeploying ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Sparkles className="w-3 h-3 text-purple-300" />
                                )}
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
            <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base sm:text-lg font-bold text-white">
                      {selectedStudent.name}
                    </span>
                    {!selectedStudent.isLiveStudent && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700">
                        Sample Data
                      </span>
                    )}
                    {selectedStudent.isLiveStudent && (
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-900 text-blue-200 border border-blue-600 font-bold">
                        Live Session
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Calibration ratio, accuracy score, and cognitive thought-process audits
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleGenerateIntervention('student', selectedStudent.id)}
                  data-testid="generate-student-intervention-btn"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Intervention for {selectedStudent.name.split(' ')[0]}</span>
                </button>
              </div>

              {/* 4 Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-blue-400" />
                    Accuracy
                  </span>
                  <p className="text-lg font-extrabold text-white">{getStudentAccuracy(selectedStudent)}</p>
                  <span className="text-[11px] text-slate-500 block">Total questions mastered</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-400" />
                    Calibration
                  </span>
                  <p className="text-lg font-extrabold text-amber-300">{getStudentCalibration(selectedStudent)}</p>
                  <span className="text-[11px] text-slate-500 block">"Very sure" answers that were correct</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    Active Misconception
                  </span>
                  <p className="text-sm font-bold truncate text-white">
                    {selectedStudent.activeMisconceptionId ? (
                      <span className="text-rose-400">
                        {selectedStudent.activeMisconceptionId.toUpperCase()}:{' '}
                        {world?.misconceptions.find((m) => m.id === selectedStudent.activeMisconceptionId)?.label || 'Detected'}
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-bold">None (Clear)</span>
                    )}
                  </p>
                  <span className="text-[11px] text-slate-500 block">Strongest idea &gt; 30% resistance</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
                    Tutor Prediction Score
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-extrabold text-indigo-200">
                      {selectedStudent.predictionStats.exact + selectedStudent.predictionStats.direction} /{' '}
                      {selectedStudent.predictionStats.exact + selectedStudent.predictionStats.direction + selectedStudent.predictionStats.miss}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex gap-2">
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
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <BrainCircuit className="w-4 h-4 text-indigo-400" />
                    "Predicted vs Actual" Cognitive Log ({selectedStudent.attempts.length})
                  </h3>
                  <span className="text-[11px] text-slate-500">Latest attempt at top</span>
                </div>

                {selectedStudent.attempts.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                    No questions attempted yet by {selectedStudent.name}.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {selectedStudent.attempts.map((att, idx) => {
                      const hit = att.predictionHit;
                      return (
                        <div key={idx} className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800/80 pb-2">
                            <span className="font-bold text-white text-sm">{att.question}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                  att.correct
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                                }`}
                              >
                                {att.correct ? <>✓ Correct</> : <>✗ Withered</>}
                              </span>
                              {hit && (
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                    hit === 'exact'
                                      ? 'bg-indigo-950 text-indigo-300 border border-indigo-700'
                                      : hit === 'direction'
                                      ? 'bg-sky-950 text-sky-300 border border-sky-800'
                                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                                  }`}
                                >
                                  {hit === 'exact' && 'Prediction: exact ✓'}
                                  {hit === 'direction' && 'Prediction: right direction ✓'}
                                  {hit === 'miss' && 'Prediction: missed ✗'}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                            <div className="p-2.5 rounded-xl bg-indigo-950/30 border border-indigo-800/30 space-y-1">
                              <span className="text-[10px] uppercase font-bold text-indigo-400 block">
                                Tutor Prediction:
                              </span>
                              {att.prediction ? (
                                <div className="text-[11px] text-indigo-200">
                                  <p className="font-semibold text-white">
                                    {att.prediction.pCorrect >= 0.5
                                      ? `Predicted Correct (${Math.round(att.prediction.pCorrect * 100)}%)`
                                      : `Predicted Distractor: "${world?.trees.find((t) => t.id === att.treeId)?.choices[att.prediction.predictedChoice] || 'Choice'}"`}
                                  </p>
                                  <p className="text-indigo-300/80 italic mt-0.5">"{att.prediction.why}"</p>
                                </div>
                              ) : (
                                <div className="text-[11px] text-indigo-200">
                                  <p className="font-semibold text-white">
                                    Predicted from common grade-level misconceptions
                                  </p>
                                  <p className="text-indigo-300/80 italic mt-0.5">
                                    "Predicted student may default to intuitive numerator comparison or whole-number addition before calibration."
                                  </p>
                                </div>
                              )}
                            </div>

                            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                Actual Response:
                              </span>
                              <div className="text-[11px] text-slate-200">
                                <p>Chosen: <strong className="text-white font-semibold">"{att.choice}"</strong></p>
                                <p className="text-slate-400">Confidence: <strong className="text-amber-300">{att.confidence}</strong></p>
                              </div>
                            </div>
                          </div>

                          {att.thoughtProcess && (
                            <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-[11px] text-amber-200">
                              <strong>Diagnosed Thought Process:</strong> "{att.thoughtProcess}"
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
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Flag className="w-5 h-5 text-amber-400" />
                  Live Flags Feed
                </h2>
                <p className="text-xs text-slate-400">
                  Live stream of student thought processes diagnosed today. Filterable by misconception.
                </p>
              </div>

              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 w-fit">
                {filteredFlags.length} Events Displayed
              </span>
            </div>

            {/* Misconception Filter Pills */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-indigo-400" />
                Filter by Misconception:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  data-testid="filter-all-flags"
                  onClick={() => setSelectedFlagFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    selectedFlagFilter === 'all'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750'
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
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750'
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
              <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                No thought processes found matching this filter. When students answer incorrectly, their diagnosed reasoning will stream here!
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFlags.map((flag) => (
                  <div
                    key={flag.id}
                    className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition-all space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">{flag.studentName || 'Student'}</span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                          {flag.misconceptionId?.toUpperCase() || 'Misconception'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            flag.confirmed === 'yes'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : flag.confirmed === 'no'
                              ? 'bg-sky-950 text-sky-300 border-sky-800'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {flag.confirmed === 'yes' && 'Confirmed: Yes, that’s it'}
                          {flag.confirmed === 'no' && 'Revised: Not quite'}
                          {flag.confirmed === 'unanswered' && 'Pending Verification'}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-300">
                      <span className="text-slate-500 font-semibold">Question:</span> "{flag.question}"
                    </div>

                    <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200">
                      <span className="font-bold text-amber-300 block mb-0.5">Diagnosed Reasoning:</span>
                      "{flag.thoughtProcess}"
                    </div>

                    {flag.studentWords && (
                      <div className="p-2.5 rounded-xl bg-sky-950/30 border border-sky-800/40 text-xs text-sky-200 flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-sky-300">Student's own words:</strong> "{flag.studentWords}"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div
            role="dialog"
            aria-labelledby="cell-detail-title"
            className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 text-white space-y-4 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wide">
                  Misconception Audit Cell
                </span>
                <h3 id="cell-detail-title" className="text-base font-bold text-white">
                  {selectedCell.student.name} × {selectedCell.misconception.id.toUpperCase()}
                </h3>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                data-testid="close-cell-modal-btn"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs text-slate-400 font-semibold block">Misconception Description:</span>
              <p className="text-xs text-slate-200 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                {selectedCell.misconception.label}
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
              <span className="text-slate-400">Current Status:</span>
              <span
                className={`font-bold px-2.5 py-0.5 rounded-full border ${
                  selectedCell.status === 'overcome'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : selectedCell.status === 'severe'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800'
                    : selectedCell.status === 'active'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
              >
                {selectedCell.status.toUpperCase()} {selectedCell.strength > 0 ? `(${Math.round(selectedCell.strength * 100)}%)` : ''}
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 block">
                Observed Thought Processes:
              </span>
              {selectedCell.student.flags.filter((f) => f.misconceptionId === selectedCell.misconception.id).length === 0 ? (
                <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 text-xs text-slate-400 italic">
                  No specific thought-process flags recorded for this misconception yet.
                </div>
              ) : (
                selectedCell.student.flags
                  .filter((f) => f.misconceptionId === selectedCell.misconception.id)
                  .map((f, i) => (
                    <div key={i} className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs space-y-1">
                      <p className="text-amber-200 italic font-medium">"{f.thoughtProcess}"</p>
                      {f.studentWords && (
                        <p className="text-sky-300 text-[11px]">
                          <strong>Student explained:</strong> "{f.studentWords}"
                        </p>
                      )}
                    </div>
                  ))
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  const st = selectedCell.student;
                  setSelectedCell(null);
                  handleGenerateIntervention('student', st.id);
                }}
                data-testid="generate-cell-intervention-btn"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Intervention</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Intervention Generator Modal */}
      {showInterventionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div
            role="dialog"
            aria-labelledby="intervention-modal-title"
            className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 text-white space-y-5 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 id="intervention-modal-title" className="text-lg font-bold">
                  Targeted Pedagogical Intervention
                </h3>
              </div>
              <button
                onClick={() => setShowInterventionModal(false)}
                data-testid="close-intervention-modal-btn"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {isLoadingIntervention ? (
              <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                <p className="text-sm font-semibold text-slate-200">
                  Professor Byte is crafting a tailored lesson plan & 5-minute activity…
                </p>
                <p className="text-xs text-slate-500">
                  Grounding recommendations in the exact cognitive misconceptions and quotes observed.
                </p>
              </div>
            ) : interventionData ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-700/60 space-y-1">
                  <h4 className="text-sm font-extrabold text-white">{interventionData.title}</h4>
                  <p className="text-xs text-indigo-200 italic">{interventionData.pedagogicalInsight}</p>
                </div>

                {/* 3-Bullet Mini-Lesson Plan */}
                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                    3-Bullet Mini-Lesson Plan
                  </span>
                  <div className="space-y-2">
                    {interventionData.miniLessonBullets.map((bullet, idx) => (
                      <div
                        key={idx}
                        data-testid="intervention-bullets"
                        className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 flex items-start gap-2.5"
                      >
                        <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center shrink-0 border border-indigo-500/30">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 5-Minute Offline Activity */}
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-200 space-y-1.5">
                  <strong className="text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    5-Minute Concrete Offline Activity
                  </strong>
                  <p data-testid="intervention-activity" className="leading-relaxed font-medium">
                    {interventionData.fiveMinuteActivity}
                  </p>
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <span className="text-xs text-slate-400">
                    Ready to copy into your lesson plan.
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyIntervention}
                    data-testid="copy-intervention-btn"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div
            role="dialog"
            aria-labelledby="rundown-modal-title"
            className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 text-white space-y-5 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <h3 id="rundown-modal-title" className="text-lg font-bold">
                  End of Session Pedagogical Rundown
                </h3>
              </div>
              <button
                onClick={() => setShowRundownModal(false)}
                data-testid="close-rundown-btn"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {isLoadingRundown ? (
              <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                <p className="text-sm font-semibold text-slate-200">
                  Professor Byte is analyzing all class attempts and thought-process records…
                </p>
                <p className="text-xs text-slate-500">
                  Synthesizing top misconceptions, quoting student logic, and drafting 5-minute reteach activities.
                </p>
              </div>
            ) : rundownError && !rundownData ? (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-md">
                  <p className="text-sm font-bold text-white">Could not generate AI rundown</p>
                  <p className="text-xs text-slate-400">{rundownError}</p>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateRundown}
                  data-testid="retry-rundown-btn"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Try again</span>
                </button>
              </div>
            ) : rundownData ? (
              <div className="space-y-5">
                {/* Priority Order Executive Summary */}
                <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-700/60 space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                    What to Reteach First (Executive Summary)
                  </span>
                  <p className="text-sm font-medium text-slate-200 leading-relaxed">
                    {rundownData.priorityOrderSummary}
                  </p>
                </div>

                {/* Top 3 Misconceptions Breakdown */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Top 3 Class Misconceptions & 5-Minute Activities
                  </h4>

                  <div className="space-y-3">
                    {rundownData.topMisconceptions.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center justify-center border border-amber-500/40">
                              #{idx + 1}
                            </span>
                            <span className="text-sm font-bold text-white">{item.label}</span>
                          </div>
                          <span className="text-[11px] text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-full border border-amber-800">
                            Affects: {item.affectedStudents.join(', ')}
                          </span>
                        </div>

                        <div className="text-xs text-slate-300 space-y-1">
                          <p>
                            <strong className="text-slate-400">Typical Student Reasoning:</strong>{' '}
                            <span className="italic font-medium text-amber-200">"{item.typicalReasoning}"</span>
                          </p>
                          <p>
                            <strong className="text-slate-400">Why Address First:</strong> {item.whyReteach}
                          </p>
                        </div>

                        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-200">
                          <strong className="text-emerald-300 flex items-center gap-1.5 mb-0.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            Concrete 5-Minute Reteach Activity:
                          </strong>
                          <span>{item.fiveMinuteActivity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Copy Action Bar */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <span className="text-xs text-slate-400">
                    Ready to paste into lesson notes or LMS.
                  </span>
                  <button
                    onClick={handleCopyRundown}
                    data-testid="copy-rundown-btn"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
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
