import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  BookOpen,
  FileText,
  Upload,
  ArrowRight,
  AlertCircle,
  Clock,
  CheckCircle2,
  TreePine,
  Bot,
  RefreshCw,
  Compass,
} from 'lucide-react';
import { useGameStore } from '../../store/useGameStore';
import { WorldData } from '../../types/game';

export const StartScreen: React.FC = () => {
  const { loadWorld, loadSampleWorld } = useGameStore();

  const [activeTab, setActiveTab] = useState<'topic' | 'text' | 'file'>('topic');
  const [topicInput, setTopicInput] = useState('Primary 5 Fractions');
  const [textInput, setTextInput] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{
    name: string;
    mimeType: string;
    base64: string;
    size: string;
  } | null>(null);

  const [isGrowing, setIsGrowing] = useState(false);
  const [growProgressIndex, setGrowProgressIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const timerRef = useRef<any>(null);

  const progressSteps = [
    'Reading the worksheet… planting groves…',
    'Analyzing student misconceptions & edge cases…',
    'Cultivating 3D question trees along the path…',
    'Awakening Professor Byte and lighting tutor beacons…',
  ];

  useEffect(() => {
    let interval: any;
    if (isGrowing) {
      interval = setInterval(() => {
        setGrowProgressIndex((prev) => (prev + 1) % progressSteps.length);
      }, 3500);

      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setElapsedSeconds(0);
      setGrowProgressIndex(0);
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGrowing]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      // Strip off base64 data header e.g. "data:image/png;base64,"
      const base64Content = resultStr.split(',')[1] || '';
      setUploadedFile({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64: base64Content,
        size: `${(file.size / 1024).toFixed(1)} KB`,
      });
      setErrorMsg(null);
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read the uploaded file.');
    };
    reader.readAsDataURL(file);
  };

  const handleGrowWorld = async () => {
    setIsGrowing(true);
    setErrorMsg(null);
    setElapsedSeconds(0);

    const payload: {
      topic?: string;
      text?: string;
      fileData?: { mimeType: string; base64: string };
    } = {};

    if (activeTab === 'topic') {
      if (!topicInput.trim()) {
        setErrorMsg('Please enter a topic name.');
        setIsGrowing(false);
        return;
      }
      payload.topic = topicInput.trim();
    } else if (activeTab === 'text') {
      if (!textInput.trim()) {
        setErrorMsg('Please paste worksheet text.');
        setIsGrowing(false);
        return;
      }
      payload.text = textInput.trim();
    } else if (activeTab === 'file') {
      if (!uploadedFile) {
        setErrorMsg('Please select a photo or PDF worksheet first.');
        setIsGrowing(false);
        return;
      }
      payload.fileData = {
        mimeType: uploadedFile.mimeType,
        base64: uploadedFile.base64,
      };
    }

    try {
      const res = await fetch('/api/generate-world', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.error || `Server returned error (${res.status})`);
      }

      const worldData: WorldData = await res.json();
      if (!worldData.concepts || !worldData.trees || worldData.trees.length === 0) {
        throw new Error('Received invalid world structure from generator.');
      }

      setIsGrowing(false);
      loadWorld(worldData);
    } catch (err: any) {
      console.error('Failed to grow world:', err);
      setIsGrowing(false);
      setErrorMsg(
        err?.message ||
          'Gemini could not generate this world right now. Please check your network or try the sample world!'
      );
    }
  };

  return (
    <div className="min-h-screen w-full bg-linear-to-b from-slate-900 via-emerald-950 to-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 select-none relative overflow-hidden">
      {/* Decorative background glow rings */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <main className="w-full max-w-2xl z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-['Outfit',sans-serif]">
            Mastery Grove
          </h1>

          <p className="text-sm sm:text-base text-slate-300 max-w-md mx-auto">
            Turn any worksheet into a forest you can walk through.
          </p>
        </div>

        {/* Main Creation Card */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Make a forest
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                From a topic, some text, or a photo of a worksheet.
              </p>
            </div>

            {/* Quick Play Sample World Button */}
            <button
              onClick={loadSampleWorld}
              data-testid="play-sample-btn"
              disabled={isGrowing}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Try the fractions forest</span>
            </button>
          </div>

          {/* Input Method Tabs */}
          <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800">
            <button
              type="button"
              data-testid="tab-topic"
              onClick={() => setActiveTab('topic')}
              disabled={isGrowing}
              className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'topic'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Topic</span>
            </button>

            <button
              type="button"
              data-testid="tab-text"
              onClick={() => setActiveTab('text')}
              disabled={isGrowing}
              className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'text'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Paste Text</span>
            </button>

            <button
              type="button"
              data-testid="tab-file"
              onClick={() => setActiveTab('file')}
              disabled={isGrowing}
              className={`py-2 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'file'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Photo / PDF</span>
            </button>
          </div>

          {/* Tab Content Fields */}
          <div className="space-y-3">
            {activeTab === 'topic' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  Topic or Curriculum Standard:
                </label>
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="e.g. Primary 5 Fractions, 4th Grade Photosynthesis..."
                  disabled={isGrowing}
                  className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400">Suggestions:</span>
                  {['Primary 5 Fractions', 'Ecosystems & Food Chains', 'Solving Linear Equations'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTopicInput(s)}
                      className="text-[11px] text-emerald-400 hover:underline hover:text-emerald-300"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'text' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  Paste Worksheet or Quiz Text:
                </label>
                <textarea
                  rows={4}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="Paste teacher worksheet questions, answer keys, or curriculum notes here..."
                  disabled={isGrowing}
                  className="w-full px-4 py-3 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-mono text-xs leading-relaxed"
                />
              </div>
            )}

            {activeTab === 'file' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  Upload Worksheet Photo or PDF:
                </label>
                <div className="border-2 border-dashed border-slate-700 rounded-2xl p-6 text-center hover:border-emerald-500/70 transition-all bg-slate-950/40">
                  <input
                    type="file"
                    id="worksheet-file"
                    accept="image/*,application/pdf"
                    onChange={handleFileUpload}
                    disabled={isGrowing}
                    className="hidden"
                  />
                  <label
                    htmlFor="worksheet-file"
                    className="cursor-pointer flex flex-col items-center justify-center space-y-2"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                      <Upload className="w-6 h-6" />
                    </div>
                    {uploadedFile ? (
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-emerald-400 flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          {uploadedFile.name}
                        </p>
                        <p className="text-xs text-slate-400">{uploadedFile.size}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm font-semibold text-slate-200">
                          Click to select a photo or PDF
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Supports PNG, JPG, WebP, or PDF worksheets
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Growing Progress Indicator */}
          {isGrowing && (
            <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-700/50 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center animate-spin">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-emerald-200">
                    Planting your forest…
                  </p>
                  <p className="text-xs text-emerald-400/80">
                    {elapsedSeconds}s
                  </p>
                </div>
              </div>

              {/* If taking longer than 60 seconds, offer sample world */}
              {elapsedSeconds >= 60 && (
                <div className="pt-2 border-t border-emerald-800/60 flex items-center justify-between text-xs text-amber-300">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Taking a bit longer than usual.</span>
                  </div>
                  <button
                    onClick={loadSampleWorld}
                    data-testid="offer-sample-btn"
                    className="font-bold underline hover:text-white"
                  >
                    Try the fractions forest instead
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Error Message with Retry */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-200 space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                <p className="text-sm font-semibold">That didn't work</p>
              </div>
              <p className="text-xs text-rose-300 leading-relaxed">{errorMsg}</p>
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={handleGrowWorld}
                  data-testid="retry-grow-btn"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try again</span>
                </button>
                <button
                  onClick={loadSampleWorld}
                  data-testid="play-sample-world-btn"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 hover:text-amber-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Try the fractions forest</span>
                </button>
              </div>
            </div>
          )}

          {/* Bottom Action Bar */}
          <div className="pt-2">
            <button
              onClick={handleGrowWorld}
              data-testid="grow-world-btn"
              disabled={isGrowing}
              className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-emerald-600/30"
            >
              <span>Grow it</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Feature Line */}
        <p className="text-center text-xs text-slate-300">
          Wrong answers tell us why. Right answers grow trees.
        </p>

        {/* Small Footer */}
        <footer className="text-center text-[11px] text-slate-500 pt-2">
          Made by Afshal at the Berkeley × DeepMind hackathon · Mastery Grove v1 was built with Zen and Roshan.
        </footer>
      </main>
    </div>
  );
};
