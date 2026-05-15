'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Timer, Zap, Target, RefreshCw } from 'lucide-react';
import { Infinity as InfinityIcon } from 'lucide-react';
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
  preloadInfiniteModeSounds
} from '@/lib/sounds';
import ShapeGrid from '@/components/shape-grid';
import { useToast } from '@/hooks/use-toast';
import FaultyTerminal from '@/components/FaultyTerminal';

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
  const [verbPool, setVerbPool] = useState<Verb[]>(() => shuffle(verbs));
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
  const [disableEffects, setDisableEffects] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem('disableEffects');
    if (stored) {
      setDisableEffects(stored === 'true');
    }
  }, []);

  const handleToggleEffects = (val: boolean) => {
    setDisableEffects(val);
    localStorage.setItem('disableEffects', val.toString());
  };

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
  const stateRef = useRef({ verbPool: shuffle(verbs), verbIndex: 0, formIndex: 0, loop: 1 });

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
      if (loop === 1 && !bgMusicCleanupRef.current) {
         bgMusicCleanupRef.current = playInfiniteBgMusic01_05();
      } else if (loop === 6) { 
         if (bgMusicCleanupRef.current) bgMusicCleanupRef.current();
         bgMusicCleanupRef.current = playInfiniteBgMusic06_xx();
      }
    } else {
      if (bgMusicCleanupRef.current) {
        bgMusicCleanupRef.current();
        bgMusicCleanupRef.current = undefined;
      }
    }
  }, [gamePhase, loop]);

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
  }, [stateRef.current.verbIndex, stateRef.current.formIndex, gamePhase]);

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
      {!disableEffects && (
        <div 
          className={cn(
            "absolute inset-0 z-0",
            gamePhase === 'playing' ? "opacity-50" : "opacity-0 pointer-events-none"
          )}
          style={{
            filter: displayTime <= 8 ? 'hue-rotate(143deg)' : 'none',
            transition: 'filter 0.5s ease-in-out, opacity 1s ease-in-out'
          }}
        >
          {terminalMounted && (
            <MemoizedFaultyTerminal
              scale={1.2}
              digitSize={1.2}
              scanlineIntensity={0.5}
              glitchAmount={0}
              flickerAmount={0.5}
              noiseAmp={0.8}
              chromaticAberration={0}
              dither={0}
              curvature={0}
              tint="#3B82F6"
              mouseReact={false}
              mouseStrength={0}
              pageLoadAnimation={false}
              brightness={0.6}
              dpr={0.25}
            />
          )}
        </div>
      )}

      {(gamePhase === 'how-to-play' || gamePhase === 'countdown') && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background overflow-hidden">
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
            <div className="relative z-10 w-full h-full">
              <HowToPlay 
                onStart={startGame} 
                onExit={onExit}
                disableEffects={disableEffects}
                onToggleEffects={handleToggleEffects}
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
            <Button variant="ghost" size="icon" onClick={onExit} className="w-9 h-9 flex-shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>

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
            <AnimatePresence mode="wait">
              <motion.div
                key={`${verbIndex}-${formIndex}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.15 }}
                className="w-full max-w-md"
              >
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
                    {/* Progress & form label */}
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {verbIndex + 1} / {verbPool.length}
                      </span>
                      <span className="text-xs font-black uppercase tracking-widest text-primary">
                        {FORM_LABELS[currentForm]}
                      </span>
                    </div>

                    {/* Translation hint */}
                    <div className="text-center">
                      <p className="text-4xl font-headline font-black capitalize text-primary leading-tight">
                        {currentVerb.translation}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-2 uppercase tracking-widest">
                        {currentVerb.type === 'irregular' ? '⚡ Irregular' : '📘 Regular'}
                      </p>
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
              </motion.div>
            </AnimatePresence>
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
        initial={{ scale: 0.85, opacity: 0, y: 30 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        className="w-full max-w-sm space-y-6"
      >
        {/* Death cause */}
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
        <Card className="bg-surface-container border-0 shadow-2xl">
          <CardContent className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <Timer size={16} className="text-primary" />, value: timeDisplay, label: 'Sobreviviste' },
                { icon: <InfinityIcon size={16} className="text-primary" />, value: loopsCompleted, label: 'Loops' },
                { icon: <Zap size={16} className="text-emerald-400" />, value: totalCorrect, label: 'Correctas', valueClass: 'text-emerald-400' },
                { icon: <Target size={16} className="text-red-400" />, value: `${totalErrors}/20`, label: 'Errores', valueClass: 'text-red-400' },
              ].map(({ icon, value, label, valueClass }) => (
                <div key={label} className="flex flex-col items-center gap-1 p-3 bg-surface-container-high rounded-xl">
                  {icon}
                  <span className={cn('text-xl font-black', valueClass)}>{value}</span>
                  <span className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>

            {/* Accuracy bar */}
            <div className="p-3 bg-surface-container-high rounded-xl space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Precisión</span>
                <span className="text-xl font-black text-primary">{accuracy}%</span>
              </div>
              <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${accuracy}%` }}
                  transition={{ duration: 0.9, delay: 0.3, ease: 'easeOut' }}
                  className="h-full bg-primary rounded-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={onExit} variant="outline" className="flex-1 h-12 font-bold">
            <ArrowLeft className="mr-2" size={16} /> Menú
          </Button>
          <Button onClick={onRestart} className="flex-1 h-12 font-black">
            <RefreshCw className="mr-2" size={16} /> Repetir
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
  onToggleEffects
}: { 
  onStart: () => void; 
  onExit: () => void;
  disableEffects: boolean;
  onToggleEffects: (val: boolean) => void;
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
        className="w-full max-w-sm space-y-5 relative z-10 max-h-full overflow-y-auto overflow-x-hidden no-scrollbar pb-10"
      >
        {/* Header */}
        <div className="text-center space-y-1">
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

        {/* Settings */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container border border-border">
          <div className="space-y-0.5">
            <Label htmlFor="disable-effects" className="text-sm font-bold">Modo Bajo Rendimiento</Label>
            <p className="text-[10px] text-muted-foreground leading-tight">Desactiva fondos animados para mayor fluidez</p>
          </div>
          <Switch 
            id="disable-effects" 
            checked={disableEffects}
            onCheckedChange={onToggleEffects}
          />
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
