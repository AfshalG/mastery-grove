/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { useGameStore } from './store/useGameStore';
import { StartScreen } from './components/ui/StartScreen';
import { TeacherScreen } from './components/ui/TeacherScreen';
import { ForestScene } from './components/3d/ForestScene';
import { HUD } from './components/ui/HUD';
import { QuestionModal } from './components/ui/QuestionModal';
import { ReflectionCard } from './components/ui/ReflectionCard';
import { TeachCard } from './components/ui/TeachCard';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import { sounds } from './utils/audio';

export default function App() {
  // Two fields only: reading the whole store here re-rendered the entire game on every change.
  const screen = useGameStore((s) => s.screen);
  const soundTrigger = useGameStore((s) => s.soundTrigger);

  useEffect(() => {
    if (!soundTrigger) return;
    if (soundTrigger.type === 'correct') {
      sounds.playCorrect();
    } else if (soundTrigger.type === 'wrong') {
      sounds.playWrong();
    } else if (soundTrigger.type === 'unlock') {
      sounds.playUnlock();
    }
  }, [soundTrigger]);

  if (screen === 'start') {
    return (
      <ErrorBoundary fallbackTitle="Mastery Grove Start">
        <StartScreen />
      </ErrorBoundary>
    );
  }

  if (screen === 'teacher') {
    return (
      <ErrorBoundary fallbackTitle="Teacher Console">
        <TeacherScreen />
      </ErrorBoundary>
    );
  }

  return (
    <div className="w-screen h-dvh overflow-hidden relative bg-slate-900 select-none">
      {/* 3D Forest Scene wrapped in Error Boundary */}
      <ErrorBoundary fallbackTitle="3D Forest Scene">
        <ForestScene />
      </ErrorBoundary>

      {/* Heads-up display & Navigation wrapped in Error Boundary */}
      <ErrorBoundary fallbackTitle="Forest Controls">
        <HUD />
      </ErrorBoundary>

      {/* Tree Question & Diagnosis Modal wrapped in Error Boundary */}
      <ErrorBoundary fallbackTitle="Question Dialogue">
        <QuestionModal />
        <TeachCard />
        <ReflectionCard />
      </ErrorBoundary>
    </div>
  );
}
