'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, Timer, Zap, Trophy, Infinity as InfinityIcon, Play, HelpCircle, Volume2, Music, Settings, ZapOff, Target, RefreshCw } from 'lucide-react';
import { useAudioSettings } from '@/hooks/use-audio-settings';
import { useSettings } from '@/hooks/use-settings';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem
} from '@/components/ui/dropdown-menu';
import { TooltipProvider } from '@/components/ui/tooltip';
import { type Verb } from '@/lib/verbs';
import { type VerbForm } from '@/components/quiz-configurator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { 
  playSelectSound, 
  playCountdownSound,
  playGameOverInfinitoSound,
  playInfiniteBgMusic01_05,
  playInfiniteBgMusic06_xx,
  playLosingSound,
  playSurrenderConfirmSound,
  playConfirmSound,
  preloadInfiniteModeSounds
} from '@/lib/sounds';
import ShapeGrid from '@/components/shape-grid';
import { useToast } from '@/hooks/use-toast';
import FaultyTerminal from '@/components/FaultyTerminal';
import { GlobalSettings } from './global-settings';

const MemoizedFaultyTerminal = React.memo(FaultyTerminal);
const INITIAL_TIME = 30;
const CORRECT_BONUS = 4;
const WRONG_PENALTY = 6;
const MAX_ERRORS = 20;
const DRAIN_RATE_BASE = 1;        // seconds drained per second
const LOOP_DRAIN_INCREASE = 0.1;  // +10% drain speed per loop

const FORMS: VerbForm[] = ['infinitive', 'pastSimple', 'pastParticiple'];
const FORM_LABELS: Record<VerbForm, string> = {
  infinitive: 'Infinitivo',
  pastSimple: 'Pasado Simple',
  pastParticiple: 'Pasado Participio',
};

const FORM_COLORS: Record<VerbForm, string> = {
  infinitive: 'text-sky-600 dark:text-sky-400 bg-sky-500/15 border-sky-500/30',
  pastSimple: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  pastParticiple: 'text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-500/15 border-fuchsia-500/30',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Types ────────────────────────────────────────────────────────────────────
type GamePhase = 'how-to-play' | 'countdown' | 'playing' | 'game-over';
type DeathCause = 'time' | 'errors';

// ── Main Component ────────────────────────────────────────────────────────────
export function InfiniteQuiz({ verbs, onExit }: { verbs: Verb[]; onExit: () => void }) {
  // Use a ref to initialize the shuffled list of verbs once so state and ref are synced on mount
  const initialPoolRef = useRef<Verb[] | null>(null);
  if (!initialPoolRef.current) {
    initialPoolRef.current = shuffle(verbs);
  }

  const [verbPool, setVerbPool] = useState<Verb[]>(initialPoolRef.current);
  const [verbIndex, setVerbIndex] = useState(0);
  const [formIndex, setFormIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);
  const [loop, setLoop] = useState(1);
  const [gamePhase, setGamePhase] = useState<GamePhase>('how-to-play');
  const [deathCause, setDeathCause] = useState<DeathCause>('time');
  const [inputValue, setInputValue] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [survivalTime, setSurvivalTime] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const { disableEffects, setDisableEffects } = useSettings();
  const { musicEnabled, sfxEnabled, setMusicEnabled, setSfxEnabled } = useAudioSettings();
  const { toast } = useToast();

  // Refs for values used inside intervals/callbacks
  const timeLeftRef = useRef(INITIAL_TIME);
  const totalErrorsRef = useRef(0);
  const drainRateRef = useRef(DRAIN_RATE_BASE);
  const wasLowTimeRef = useRef(false);
  const bgMusicCleanupRef = useRef<() => void>();
  const gamePhaseRef = useRef<GamePhase>('how-to-play');
  const startTimeRef = useRef(Date.now());
  const inputRef = useRef<HTMLInputElement>(null);
  // Keep a ref to latest verbPool/verbIndex/formIndex for use in callbacks
  const stateRef = useRef({ verbPool: initialPoolRef.current, verbIndex: 0, formIndex: 0, loop: 1 });

  const [terminalMounted, setTerminalMounted] = useState(false);

  // Defer mounting heavy components so the initial page transition doesn't freeze
  useEffect(() => {
    const timer = setTimeout(() => setTerminalMounted(true), 150);
    return () => clearTimeout(timer);
  }, []);

  // Background music — start only when game actually starts
  useEffect(() => {
    preloadInfiniteModeSounds();
  }, []);

  useEffect(() => {
    if (gamePhase === 'playing') {
      // Re-evaluate music if setting changes or loop changes
      if (musicEnabled) {
        if (loop <= 5 && !bgMusicCleanupRef.current) {
          bgMusicCleanupRef.current = playInfiniteBgMusic01_05();
        } else if (loop >= 6) {
          if (bgMusicCleanupRef.current) bgMusicCleanupRef.current();
          bgMusicCleanupRef.current = playInfiniteBgMusic06_xx();
        }
      } else {
        if (bgMusicCleanupRef.current) {
          bgMusicCleanupRef.current();
          bgMusicCleanupRef.current = undefined;
        }
      }
    }
    
    return () => {
      if (bgMusicCleanupRef.current) {
        bgMusicCleanupRef.current();
        bgMusicCleanupRef.current = undefined;
      }
    };
  }, [gamePhase, loop, musicEnabled]);

  // Prevent Alt key from hijacking focus/triggering browser menus during gameplay
  useEffect(() => {
    if (gamePhase !== 'playing') return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [gamePhase]);

  // Countdown Phase
  useEffect(() => {
    if (gamePhase === 'countdown') {
      if (countdown > 0) {
        playCountdownSound();
        const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
        return () => clearTimeout(timer);
      } else {
        startTimeRef.current = Date.now();
        gamePhaseRef.current = 'playing';
        setGamePhase('playing');
        setCountdown(3);
      }
    }
  }, [gamePhase, countdown]);

  // Focus input when the current verb/form changes
  useEffect(() => {
    if (gamePhase === 'playing') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [verbIndex, formIndex, gamePhase]);

  // Timer tick (100ms for smooth animation)
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    const interval = setInterval(() => {
      timeLeftRef.current -= drainRateRef.current * 0.1;
      setTimeLeft(timeLeftRef.current);

      const isLowTime = timeLeftRef.current <= 8;
      if (isLowTime && !wasLowTimeRef.current) {
        playSurrenderConfirmSound();
        wasLowTimeRef.current = true;
      } else if (!isLowTime && wasLowTimeRef.current) {
        wasLowTimeRef.current = false;
      }

      if (timeLeftRef.current <= 0 && gamePhaseRef.current === 'playing') {
        gamePhaseRef.current = 'game-over';
        playGameOverInfinitoSound();
        setSurvivalTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
        setDeathCause('time');
        setGamePhase('game-over');
      }
    }, 100);
    return () => clearInterval(interval);
  }, [gamePhase]);

  const handleSubmit = useCallback(() => {
    if (gamePhaseRef.current !== 'playing') return;

    const { verbPool: pool, verbIndex: vi, formIndex: fi, loop: currentLoop } = stateRef.current;
    const currentVerb = pool[vi];
    const currentForm = FORMS[fi];
    const userAnswer = inputValue.trim().toLowerCase();
    const correctAnswers = currentVerb[currentForm].toLowerCase().split('/').map(a => a.trim());
    const isCorrect = correctAnswers.includes(userAnswer);

    if (isCorrect) {
      playSelectSound();
      timeLeftRef.current = Math.min(timeLeftRef.current + CORRECT_BONUS, 99);
      setTimeLeft(timeLeftRef.current);
      setTotalCorrect(prev => prev + 1);
      setFeedback('correct');
    } else {
      const newErrors = totalErrorsRef.current + 1;
      totalErrorsRef.current = newErrors;
      timeLeftRef.current = Math.max(timeLeftRef.current - WRONG_PENALTY, 0);
      setTimeLeft(timeLeftRef.current);
      setTotalErrors(newErrors);
      setFeedback('wrong');

      if (newErrors >= MAX_ERRORS) {
        gamePhaseRef.current = 'game-over';
        playGameOverInfinitoSound();
        setSurvivalTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
        setDeathCause('errors');
        setGamePhase('game-over');
        return;
      }
    }

    setTimeout(() => setFeedback(null), 350);

    // Advance to next form / verb / loop
    let nextFi = fi;
    let nextVi = vi;
    let nextPool = pool;
    let nextLoop = currentLoop;

    if (nextFi < FORMS.length - 1) {
      nextFi++;
    } else {
      nextFi = 0;
      nextVi++;
      if (nextVi >= nextPool.length) {
        nextPool = shuffle(verbs);
        nextVi = 0;
        nextLoop++;
        drainRateRef.current = DRAIN_RATE_BASE * (1 + (nextLoop - 1) * LOOP_DRAIN_INCREASE);
        setLoop(nextLoop);
        setVerbPool(nextPool);
        
        playLosingSound();
        toast({
          title: "¡Drenaje Aumentado!",
          description: `Loop ${nextLoop} - El tiempo vuela más rápido 🏃💨`,
          variant: "destructive",
        });
      }
    }

    stateRef.current = { verbPool: nextPool, verbIndex: nextVi, formIndex: nextFi, loop: nextLoop };
    setVerbIndex(nextVi);
    setFormIndex(nextFi);
    setInputValue('');
  }, [inputValue, verbs, toast]);

  const startGame = () => {
    setGamePhase('countdown');
  };

  const restart = () => {
    const freshPool = shuffle(verbs);
    stateRef.current = { verbPool: freshPool, verbIndex: 0, formIndex: 0, loop: 1 };
    setVerbPool(freshPool);
    setVerbIndex(0);
    setFormIndex(0);
    timeLeftRef.current = INITIAL_TIME;
    wasLowTimeRef.current = false;
    setTimeLeft(INITIAL_TIME);
    totalErrorsRef.current = 0;
    setTotalErrors(0);
    setTotalCorrect(0);
    drainRateRef.current = DRAIN_RATE_BASE;
    setLoop(1);
    setInputValue('');
    setFeedback(null);
    gamePhaseRef.current = 'how-to-play';
    setGamePhase('how-to-play');
  };

  const currentVerb = verbPool[verbIndex] || verbPool[0] || verbs[0];
  const currentForm = FORMS[formIndex] || FORMS[0];
  const displayTime = Math.max(0, Math.ceil(timeLeft));
  const timePercentage = Math.max(0, Math.min(100, (timeLeft / INITIAL_TIME) * 100));

  const timeBarColor =
    displayTime > 15 ? 'bg-emerald-500' :
    displayTime > 8  ? 'bg-amber-500' :
                       'bg-red-500';
  const timeTextColor =
    displayTime > 15 ? 'text-emerald-400' :
    displayTime > 8  ? 'text-amber-400' :
                       'text-red-400';

  const totalAnswered = totalCorrect + totalErrors;
  const accuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;
  const loopsCompleted = stateRef.current.loop - 1;

  return (
    <div className="flex flex-col h-screen bg-background text-on-surface overflow-hidden relative">
      {/* Background Effects */}
      {!disableEffects && terminalMounted && (
        <div 
          className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-1000"
          style={{
            opacity: (gamePhase === 'playing' || gamePhase === 'game-over' || gamePhase === 'countdown' || gamePhase === 'how-to-play') ? 0.4 : 0,
          }}
        >
          <MemoizedFaultyTerminal 
            scale={2.5}
            gridMul={[2, 1.5]}
            digitSize={1.8}
            timeScale={0.15}
            scanlineIntensity={0.4}
            glitchAmount={displayTime <= 8 ? 1.5 : 1}
            flickerAmount={displayTime <= 5 ? 1.4 : 1.1}
            noiseAmp={0.05}
            curvature={0.15}
            brightness={displayTime <= 5 ? 1.3 : 1}
            tint={displayTime <= 8 ? "#EF4444" : "#dc143c"}
            dpr={0.5}
          />
        </div>
      )/* [BUGFIX] changed 'results' to 'game-over' and added 'how-to-play' for smoother transition. Increased dpr to 0.5. */}

      {(gamePhase === 'how-to-play' || gamePhase === 'countdown') && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-transparent overflow-hidden">
          {!disableEffects && (
            <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
              <ShapeGrid 
                shape="circle"
                direction="down"
                speed={1.5}
                squareSize={60}
                borderColor="rgba(255, 255, 255, 0.08)"
                hoverFillColor="rgba(255, 255, 255, 0.03)"
              />
            </div>
          )}
          
          {gamePhase === 'how-to-play' && (
            <div className="relative z-10 w-full h-full flex items-center justify-center p-4">
              <HowToPlay 
                onStart={startGame}
                onExit={onExit}
                disableEffects={disableEffects}
                onDisableEffectsChange={setDisableEffects}
                musicEnabled={musicEnabled}
                onMusicEnabledChange={setMusicEnabled}
                sfxEnabled={sfxEnabled}
                onSfxEnabledChange={setSfxEnabled}
              />
            </div>
          )}

          {gamePhase === 'countdown' && (
            <AnimatePresence mode="wait">
              <motion.div
                key={countdown}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="text-9xl font-black font-headline text-primary z-10"
              >
                {countdown > 0 ? countdown : '¡Ya!'}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      )}

      {gamePhase === 'game-over' && (
        <InfiniteResults
          survivalTime={survivalTime}
          totalCorrect={totalCorrect}
          totalErrors={totalErrors}
          accuracy={accuracy}
          loopsCompleted={loopsCompleted}
          deathCause={deathCause}
          onRestart={restart}
          onExit={onExit}
        />
      )}

      {gamePhase === 'playing' && (
        <>
          {/* ── Header / Timer ──────────────────────────────────────────────── */}
          <header className="flex-shrink-0 flex items-center gap-3 p-3 border-b border-border bg-background/60 backdrop-blur-md z-10 relative">
            <div className="flex items-center gap-2 sm:gap-4">
              <TooltipProvider>
                <Button variant="ghost" size="icon" onClick={onExit} className="w-10 h-10 flex-shrink-0 bg-surface-container/50 hover:bg-surface-container border border-border/50 backdrop-blur-sm rounded-full transition-all">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </TooltipProvider>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-10 h-10 flex-shrink-0 bg-surface-container/50 hover:bg-surface-container border border-border/50 backdrop-blur-sm rounded-full transition-all group">
                    <Settings className="h-5 w-5 group-hover:rotate-90 transition-transform duration-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 mt-2 bg-surface-container-high/95 backdrop-blur-md border-border shadow-2xl p-1 rounded-xl">
                  <DropdownMenuLabel className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    Ajustes de Juego
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuCheckboxItem
                    checked={musicEnabled}
                    onCheckedChange={setMusicEnabled}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-lg cursor-pointer"
                  >
                    <Music className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold">Música</span>
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={sfxEnabled}
                    onCheckedChange={setSfxEnabled}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-lg cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold">Sonidos</span>
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator className="bg-border/50" />
                  <DropdownMenuCheckboxItem
                    checked={!disableEffects}
                    onCheckedChange={(v) => setDisableEffects(!v)}
                    className="flex items-center gap-3 py-2.5 px-3 rounded-lg cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-sm font-bold">Efectos Visuales</span>
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Time bar */}
            <div className="flex-1 space-y-1">
              <div className="flex justify-between items-center">
                <span className={cn('text-xs font-mono font-black tabular-nums', timeTextColor)}>
                  {displayTime}s
                </span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                  Loop {loop}
                </span>
              </div>
              <div className="h-2.5 bg-surface-container rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-100 ease-linear',
                    timeBarColor,
                    displayTime < 8 && 'animate-pulse'
                  )}
                  style={{ width: `${timePercentage}%` }}
                />
              </div>
            </div>

            {/* Error counter */}
            <div className="flex-shrink-0 flex items-center gap-1 bg-surface-container px-2.5 py-1 rounded-lg">
              <span className="text-xs">❌</span>
              <span className="text-sm font-black tabular-nums">{totalErrors}</span>
              <span className="text-xs text-muted-foreground">/20</span>
            </div>
          </header>

          {/* ── Verb card ───────────────────────────────────────────────────── */}
          <main className="flex-grow flex items-center justify-center p-4 relative z-10">
            <div className="w-full max-w-md">
              <motion.div
                animate={
                  feedback === 'correct'
                    ? { boxShadow: '0 0 50px rgba(16,185,129,0.45)', scale: [1, 1.02, 1] }
                    : feedback === 'wrong'
                    ? { boxShadow: '0 0 50px rgba(239,68,68,0.45)', x: [-6, 6, -6, 6, 0] }
                    : { boxShadow: '0 20px 60px rgba(0,0,0,0.2)', x: 0, scale: 1 }
                }
                transition={{ duration: 0.35 }}
                className={cn(
                  'rounded-2xl border-2 transition-colors duration-300 bg-surface-container-low shadow-2xl',
                  feedback === 'correct' ? 'border-emerald-500' :
                  feedback === 'wrong'   ? 'border-red-500' :
                                          'border-transparent'
                )}
              >
                <div className="p-8 space-y-6">
                  {/* Top Row: Progress & Verb Type */}
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span>{verbIndex + 1} / {verbPool.length}</span>
                    <span>{currentVerb.type === 'irregular' ? '⚡ Irregular' : '📘 Regular'}</span>
                  </div>

                  {/* Centered required form badge & Translation Hint with AnimatePresence */}
                  <div className="min-h-[110px] flex flex-col justify-center relative">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`${verbIndex}-${formIndex}`}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.15 }}
                        className="space-y-4 flex flex-col items-center justify-center w-full"
                      >
                        {/* Centered required form badge */}
                        <span className={cn(
                          "inline-flex items-center gap-1.5 px-4 py-2 border font-black uppercase tracking-widest text-xs rounded-full shadow-inner transition-colors duration-300",
                          FORM_COLORS[currentForm]
                        )}>
                          🎯 {FORM_LABELS[currentForm]}
                        </span>

                        {/* Translation hint */}
                        <div className="text-center">
                          <p className="text-4xl font-headline font-black capitalize text-primary leading-tight">
                            {currentVerb.translation}
                          </p>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                    {/* Answer input */}
                    <div className="space-y-1">
                      <Input
                        ref={inputRef}
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        placeholder="Escribe y presiona Enter…"
                        className={cn(
                          'text-xl text-center h-16 bg-surface-container border-0 focus-visible:ring-2 shadow-inner font-bold rounded-xl',
                          feedback === 'correct' ? 'focus-visible:ring-emerald-500' :
                          feedback === 'wrong'   ? 'focus-visible:ring-red-500' :
                                                  'focus-visible:ring-primary'
                        )}
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                      />
                      <p className="text-center text-[10px] text-muted-foreground">↵ Enter para confirmar</p>
                    </div>

                    {/* Live stats */}
                    <div className="flex justify-center gap-8">
                      <div className="flex flex-col items-center">
                        <span className="text-emerald-400 font-black text-xl">{totalCorrect}</span>
                        <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Correctas</span>
                      </div>
                      <div className="w-px bg-border" />
                      <div className="flex flex-col items-center">
                        <span className="text-red-400 font-black text-xl">{totalErrors}</span>
                        <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Errores</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </main>
        </>
      )}
    </div>
  );
}

// ── Results Screen ────────────────────────────────────────────────────────────
type InfiniteResultsProps = {
  survivalTime: number;
  totalCorrect: number;
  totalErrors: number;
  accuracy: number;
  loopsCompleted: number;
  deathCause: DeathCause;
  onRestart: () => void;
  onExit: () => void;
};

function InfiniteResults({
  survivalTime, totalCorrect, totalErrors, accuracy,
  loopsCompleted, deathCause, onRestart, onExit,
}: InfiniteResultsProps) {
  const minutes = Math.floor(survivalTime / 60);
  const seconds = survivalTime % 60;
  const timeDisplay = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background p-4 text-center overflow-auto"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm space-y-6 relative"
      >
        <div className="absolute -top-4 -right-4 z-20 scale-90">
          <GlobalSettings />
        </div>

        <div className="space-y-2">
          <div className={cn(
            'inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border',
            deathCause === 'time'
              ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400',
          )}>
            {deathCause === 'time' ? '⏱️ Se acabó el tiempo' : '💀 Demasiados errores'}
          </div>
          <h1 className="text-5xl font-headline font-black tracking-tighter">Game Over</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: <Timer size={18} className="text-primary" />, value: timeDisplay, label: 'Supervivencia' },
            { icon: <InfinityIcon size={18} className="text-primary" />, value: loopsCompleted, label: 'Loops' },
            { icon: <Zap size={18} className="text-emerald-400" />, value: totalCorrect, label: 'Aciertos', valueClass: 'text-emerald-400' },
            { icon: <Target size={18} className="text-red-400" />, value: `${totalErrors}/20`, label: 'Errores', valueClass: 'text-red-400' },
          ].map(({ icon, value, label, valueClass }) => (
            <motion.div 
              key={label} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-1.5 p-4 bg-surface-container/80 backdrop-blur-sm rounded-2xl border border-border/50"
            >
              <div className="p-2 rounded-lg bg-background/50">{icon}</div>
              <span className={cn('text-2xl font-black tracking-tight', valueClass)}>{value}</span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{label}</span>
            </motion.div>
          ))}
        </div>

        {/* Accuracy Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 bg-surface-container/80 backdrop-blur-sm rounded-3xl border border-border/50 space-y-3"
        >
          <div className="flex justify-between items-end">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Efectividad</span>
              <h3 className="text-3xl font-black text-primary leading-none">{accuracy}%</h3>
            </div>
            <div className="text-[10px] font-bold text-muted-foreground pb-1">
              {accuracy > 90 ? '¡LEGENDARIO!' : accuracy > 75 ? 'Excelente' : 'Buen trabajo'}
            </div>
          </div>
          <div className="h-3 bg-background/50 rounded-full overflow-hidden p-0.5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${accuracy}%` }}
              transition={{ duration: 1.2, ease: 'circOut' }}
              className="h-full bg-primary rounded-full relative"
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </motion.div>
          </div>
        </motion.div>

        {/* Actions */}
        <div className="flex gap-4 pt-2">
          <Button onClick={onExit} variant="outline" className="flex-1 h-14 rounded-2xl font-bold border-2 hover:bg-surface-container transition-all">
            <ArrowLeft className="mr-2" size={18} /> Salir
          </Button>
          <Button onClick={onRestart} className="flex-1 h-14 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 hover:scale-105 transition-all">
            <RefreshCw className="mr-2" size={18} /> Reintentar
          </Button>
        </div>
      </motion.div>
    </motion.main>
  );
}

// ── How To Play Screen ────────────────────────────────────────────────────────
function HowToPlay({ 
  onStart, 
  onExit,
  disableEffects, 
  onDisableEffectsChange,
  musicEnabled,
  onMusicEnabledChange,
  sfxEnabled,
  onSfxEnabledChange
}: { 
  onStart: () => void;
  onExit: () => void;
  disableEffects: boolean; 
  onDisableEffectsChange: (v: boolean) => void;
  musicEnabled: boolean;
  onMusicEnabledChange: (v: boolean) => void;
  sfxEnabled: boolean;
  onSfxEnabledChange: (v: boolean) => void;
}) {
  const rules = [
    {
      emoji: '⏱️',
      title: 'Tiempo límite',
      desc: 'Empiezas con 30 segundos. El tiempo se drena constantemente — ¡no pares!',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      emoji: '✅',
      title: 'Acierto',
      desc: '+4 segundos al contador. Escribe la forma correcta del verbo y presiona Enter.',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      emoji: '❌',
      title: 'Error',
      desc: '−6 segundos al contador. Acumula 20 errores y es Game Over.',
      color: 'text-red-400',
      bg: 'bg-red-500/10 border-red-500/20',
    },
    {
      emoji: '🔄',
      title: 'Loops',
      desc: 'Cada vuelta a la lista de verbos aumenta la velocidad de drenaje un 10%.',
      color: 'text-primary',
      bg: 'bg-primary/10 border-primary/20',
    },
  ];

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background p-4 overflow-hidden"
    >
      {!disableEffects && (
        <div className="absolute inset-0 z-0 opacity-40">
          <ShapeGrid 
            shape="triangle"
            direction="diagonal"
            speed={0.4}
            squareSize={50}
            borderColor="rgba(255, 255, 255, 0.08)"
            hoverFillColor="rgba(255, 255, 255, 0.03)"
            hoverTrailAmount={4}
          />
        </div>
      )}

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 24 }}
        className="w-full max-w-sm space-y-6 relative z-10 max-h-full overflow-y-auto overflow-x-hidden no-scrollbar pb-10"
      >
        <div className="absolute -top-4 -right-4 z-20 scale-90">
          <GlobalSettings />
        </div>
        
        {/* Header */}
        <div className="relative text-center space-y-1 py-4">

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border bg-primary/10 border-primary/20 text-primary mb-2">
            ♾️ Modo Infinito
          </div>
          <h1 className="text-4xl font-headline font-black tracking-tighter">Cómo Jugar</h1>
          <p className="text-sm text-muted-foreground">Sobrevive todo el tiempo que puedas</p>
        </div>

        {/* Rules */}
        <div className="space-y-2.5">
          {rules.map(({ emoji, title, desc, color, bg }) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
              className={`flex items-start gap-3 p-3.5 rounded-xl border ${bg}`}
            >
              <span className="text-2xl leading-none mt-0.5">{emoji}</span>
              <div>
                <p className={`text-sm font-black ${color}`}>{title}</p>
                <p className="text-xs text-muted-foreground leading-snug mt-0.5">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Controls hint */}
        <div className="p-3.5 rounded-xl bg-surface-container border border-border space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Controles</p>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'Enter ↵', action: 'Confirmar respuesta' },
              { key: 'Escribir', action: 'Ingresa la forma del verbo en inglés' },
            ].map(({ key, action }) => (
              <div key={key} className="flex items-center gap-2">
                <kbd className="inline-flex items-center px-2 py-0.5 rounded bg-surface-container-high border border-border text-[11px] font-mono font-bold">
                  {key}
                </kbd>
                <span className="text-xs text-muted-foreground">{action}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Game-over conditions summary */}
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-xl">⏳</p>
            <p className="text-xs font-black text-amber-400 mt-1">Tiempo en 0</p>
            <p className="text-[10px] text-muted-foreground">Game Over</p>
          </div>
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-xl">💀</p>
            <p className="text-xs font-black text-red-400 mt-1">20 errores</p>
            <p className="text-[10px] text-muted-foreground">Game Over</p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-container/50 border border-border/50 hover:bg-surface-container transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Zap size={20} />
              </div>
              <div className="space-y-0.5">
                <Label htmlFor="disable-effects" className="text-sm font-bold">Modo Bajo Rendimiento</Label>
                <p className="text-[11px] text-muted-foreground leading-tight">Desactiva fondos animados para mayor fluidez</p>
              </div>
            </div>
            <Switch 
              id="disable-effects" 
              checked={disableEffects} 
              onCheckedChange={onDisableEffectsChange}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-container/50 border border-border/50 hover:bg-surface-container transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Music size={20} />
              </div>
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Música</Label>
                <p className="text-[11px] text-muted-foreground leading-tight">Música de fondo para el modo infinito</p>
              </div>
            </div>
            <Switch 
              checked={musicEnabled} 
              onCheckedChange={onMusicEnabledChange}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-container/50 border border-border/50 hover:bg-surface-container transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Volume2 size={20} />
              </div>
              <div className="space-y-0.5">
                <Label className="text-sm font-bold">Sonidos</Label>
                <p className="text-[11px] text-muted-foreground leading-tight">Efectos de acierto y error</p>
              </div>
            </div>
            <Switch 
              checked={sfxEnabled} 
              onCheckedChange={onSfxEnabledChange}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button onClick={onExit} variant="outline" className="flex-1 h-12 font-bold">
            <ArrowLeft className="mr-2" size={16} /> Volver
          </Button>
          <Button
            onClick={onStart}
            className="flex-1 h-14 font-black text-base tracking-wide"
          >
            ¡Empezar!
          </Button>
        </div>
      </motion.div>
    </motion.main>
  );
}
