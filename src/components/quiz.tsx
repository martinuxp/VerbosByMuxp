'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Confetti from 'react-confetti';
import { AnimatePresence, motion, useAnimation } from 'framer-motion';
import { ArrowLeft, CheckCircle2, RefreshCw, ChevronLeft, ChevronRight, Check, Flag, Save, Timer, Zap, Trophy, Target, Loader2 } from 'lucide-react';
import { type QuizConfig, type VerbForm } from './quiz-configurator';
import { type Verb } from '@/lib/verbs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { playResultSound, playStartSound, playSelectSound, playConfirmSound, playSoloBackgroundMusic } from '@/lib/sounds';
import CurvedLoop from './ui/CurvedLoop';
import './ui/CurvedLoop.css';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import Dock, { type DockItemConfig } from './ui/Dock';
import './ui/Dock.css';
import { submitScore } from '@/services/ranking';
import { useToast } from '@/hooks/use-toast';
import LightRays from '@/components/LightRays';
import { useSettings } from '@/hooks/use-settings';

type UserAnswers = Record<string, Partial<Record<VerbForm, string>>>;
type Results = Record<string, Partial<Record<VerbForm, boolean>>>;
type IncorrectAnswer = { verb: Verb, answers: Partial<Record<VerbForm, string>>, results: Partial<Record<VerbForm, boolean>> };

const FORM_LABELS: Record<VerbForm, string> = {
  infinitive: 'Infinitivo',
  pastSimple: 'Pasado Simple',
  pastParticiple: 'Pasado Participio',
};

export function Quiz({ config, onReset }: { config: QuizConfig; onReset: () => void }) {
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [results, setResults] = useState<Results | null>(null);
  const [score, setScore] = useState(0);
  const [finalScore, setFinalScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const { disableEffects } = useSettings();

  useEffect(() => {
    const fadeOut = playSoloBackgroundMusic();
    return () => fadeOut();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
      const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  useEffect(() => {
    let interval: any;
    if (!isFinished) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isFinished, startTime]);

  const totalQuestions = config.verbs.length * config.forms.length;

  const handleInputChange = (infinitive: string, form: VerbForm, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [infinitive]: {
        ...prev[infinitive],
        [form]: value,
      },
    }));
  };

  const checkAnswers = () => {
    setIsFinished(true);
    let currentScore = 0;
    const newResults: Results = {};

    config.verbs.forEach((verb) => {
      newResults[verb.infinitive] = {};
      config.forms.forEach((form) => {
        const userAnswer = (answers[verb.infinitive]?.[form] || '').trim().toLowerCase();
        const correctAnswers = verb[form].toLowerCase().split('/').map(a => a.trim());
        const isCorrect = correctAnswers.includes(userAnswer);

        if (isCorrect) currentScore++;
        newResults[verb.infinitive][form] = isCorrect;
      });
    });

    const baseScore = currentScore * 100;
    const speedBonus = Math.max(0, 5000 - (elapsedTime * 10));
    const finalCompetitiveScore = baseScore + (currentScore === totalQuestions ? speedBonus : 0);

    const scorePercentage = totalQuestions > 0 ? (currentScore / totalQuestions) * 100 : 0;
    playResultSound(scorePercentage);
    setScore(currentScore);
    setFinalScore(Math.round(finalCompetitiveScore));
    setResults(newResults);

    if (scorePercentage === 100) {
      setShowConfetti(true);
    }
  };

  const resetQuiz = () => {
    playStartSound();
    window.location.reload();
  }

  const scorePercentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
  const incorrectAnswers: IncorrectAnswer[] = useMemo(() => {
    if (!results) return [];
    return config.verbs
      .map(verb => ({
        verb,
        answers: answers[verb.infinitive] || {},
        results: results[verb.infinitive] || {},
      }))
      .filter(item => Object.values(item.results).some(r => !r));
  }, [results, config.verbs, answers]);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen bg-background text-on-surface relative overflow-hidden">
        {showConfetti && (dimensions.width > 0) && (
          <div className="relative z-50">
            <Confetti width={dimensions.width} height={dimensions.height} recycle={false} numberOfPieces={400} gravity={0.3} />
          </div>
        )}
        <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-border bg-background/80 backdrop-blur relative z-10">
          <Button variant="ghost" size="icon" onClick={onReset} className="w-10 h-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col items-center">
            <h1 className="font-title text-xl sm:text-2xl font-extrabold tracking-tight">
              {config.mode === 'challenge' ? 'Desafío' : 'Repaso'}
            </h1>
            <div className="flex items-center gap-2 text-xs font-mono bg-surface-container px-2 py-0.5 rounded-full text-primary animate-pulse">
              <Timer size={12} /> {elapsedTime}s
            </div>
          </div>
          <div className="w-10"></div>
        </header>

        <main className="flex-grow flex flex-col relative z-10 overflow-hidden">
          {results ? (
            <ResultsScreen
              score={score}
              totalQuestions={totalQuestions}
              scorePercentage={scorePercentage}
              incorrectAnswers={incorrectAnswers}
              config={config}
              onResetQuiz={resetQuiz}
              finalScore={finalScore}
              timeSeconds={elapsedTime}
            />
          ) : (
            <>
              {config.mode === 'challenge' ? (
                <ChallengeMode config={config} answers={answers} onInputChange={handleInputChange} onCheckAnswers={checkAnswers} />
              ) : (
                <ReviewMode config={config} answers={answers} onInputChange={handleInputChange} onCheckAnswers={checkAnswers} />
              )}
            </>
          )}
        </main>
      </div>
    </TooltipProvider>
  );
}

function ChallengeMode({ config, answers, onInputChange, onCheckAnswers }: { config: QuizConfig, answers: UserAnswers, onInputChange: (inf: string, form: VerbForm, val: string) => void, onCheckAnswers: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const currentVerb = config.verbs[currentIndex];

  const bgControls = useAnimation();

  useEffect(() => {
    inputRefs.current[0]?.focus();

    // Trigger pulse on verb change
    bgControls.start({
      scale: [1, 1.1, 1],
      opacity: [0.6, 0.9, 0.6],
      filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)'],
      transition: { duration: 2, ease: 'easeInOut' }
    });
  }, [currentIndex, bgControls]);

  const handleNext = () => {
    playSelectSound();
    if (currentIndex < config.verbs.length - 1) setCurrentIndex(currentIndex + 1);
  };

  const handlePrev = () => {
    playSelectSound();
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, formIndex: number) => {
    if (e.key === 'Enter') {
      if (formIndex < config.forms.length - 1) {
        inputRefs.current[formIndex + 1]?.focus();
      } else {
        currentIndex < config.verbs.length - 1 ? handleNext() : onCheckAnswers();
      }
    }
  };

  const progress = ((currentIndex + 1) / config.verbs.length) * 100;
  const dockItems: DockItemConfig[] = [
    { icon: <ChevronLeft />, label: 'Anterior', onClick: handlePrev, disabled: currentIndex === 0 },
    { icon: <Flag className="text-destructive" />, label: 'Rendirse', onClick: () => { } },
    { icon: currentIndex === config.verbs.length - 1 ? <Check /> : <ChevronRight />, label: currentIndex === config.verbs.length - 1 ? 'Terminar' : 'Siguiente', onClick: currentIndex === config.verbs.length - 1 ? onCheckAnswers : handleNext }
  ];

  return (
    <div className="flex flex-col flex-grow relative">
      {!disableEffects && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-0 overflow-hidden"
          initial={{ opacity: 0.6 }}
          animate={bgControls}
        >
          <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
            <LightRays
              raysOrigin="top-center"
              raysColor="#007fff"
              raysSpeed={0.9}
              lightSpread={1}
              rayLength={1.6}
              pulsating={false}
              fadeDistance={1}
              saturation={1}
              followMouse
              mouseInfluence={0.1}
              noiseAmount={0}
              distortion={0.15}
            />
          </div>
        </motion.div>
      )}

      <div className='p-4 space-y-2 relative z-10'>
        <Progress value={progress} className="h-2" />
        <div className='flex justify-between items-center text-[10px] uppercase tracking-widest font-bold text-muted-foreground'>
          <span>{currentIndex + 1} / {config.verbs.length}</span>
          <span>Modo {config.mode}</span>
        </div>
      </div>
      <main className="flex-grow flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          <motion.div key={currentIndex} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="w-full max-w-md">
            <Card className='shadow-2xl border-0 bg-surface-container-low'>
              <CardHeader>
                <CardTitle className='text-center text-4xl font-headline font-extrabold capitalize text-primary'>{currentVerb.translation}</CardTitle>
              </CardHeader>
              <CardContent className='space-y-6'>
                {config.forms.map((form, index) => (
                  <div key={form} className='space-y-1'>
                    <Label className='text-[10px] uppercase font-bold text-muted-foreground ml-1'>{FORM_LABELS[form]}</Label>
                    <Input
                      ref={el => { inputRefs.current[index] = el; }}
                      value={answers[currentVerb.infinitive]?.[form] || ''}
                      onChange={(e) => onInputChange(currentVerb.infinitive, form, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      className="text-xl text-center h-14 bg-surface-container border-0 focus-visible:ring-2 focus-visible:ring-primary shadow-inner"
                      autoComplete="off"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="p-4 pb-8 flex justify-center">
        <AlertDialog>
          <Dock items={[
            dockItems[0],
            { ...dockItems[1], icon: <AlertDialogTrigger asChild onClick={() => playConfirmSound()}>{dockItems[1].icon}</AlertDialogTrigger> },
            dockItems[2]
          ]} />
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>¿Te rindes?</AlertDialogTitle><AlertDialogDescription>Se calificarán solo las respuestas enviadas hasta ahora.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Seguir</AlertDialogCancel><AlertDialogAction onClick={onCheckAnswers}>Terminar</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </footer>
    </div>
  );
}

function ReviewMode({ config, answers, onInputChange, onCheckAnswers }: { config: QuizConfig, answers: UserAnswers, onInputChange: (inf: string, form: VerbForm, val: string) => void, onCheckAnswers: () => void }) {
  return (
    <div className='flex flex-col flex-grow h-full'>
      <main className="flex-grow overflow-auto p-4">
        <Table>
          <TableHeader><TableRow><TableHead>Traducción</TableHead>{config.forms.map(f => <TableHead key={f}>{FORM_LABELS[f]}</TableHead>)}</TableRow></TableHeader>
          <TableBody>
            {config.verbs.map(v => (
              <TableRow key={v.infinitive}>
                <TableCell className="font-bold italic text-muted-foreground capitalize">{v.translation}</TableCell>
                {config.forms.map(f => (
                  <TableCell key={f}><Input value={answers[v.infinitive]?.[f] || ''} onChange={e => onInputChange(v.infinitive, f, e.target.value)} className="bg-surface-container border-0" /></TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </main>
      <footer className="p-4 border-t bg-background"><Button onClick={onCheckAnswers} className="w-full h-12 font-bold text-lg">Calificar Todo</Button></footer>
    </div>
  );
}

function ResultsScreen({ score, totalQuestions, scorePercentage, incorrectAnswers, onResetQuiz, finalScore, timeSeconds, config }: { score: number, totalQuestions: number, scorePercentage: number, incorrectAnswers: IncorrectAnswer[], onResetQuiz: () => void, finalScore: number, timeSeconds: number, config: QuizConfig }) {
  const [userName, setUserName] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSaveScore = () => {
    if (!userName.trim()) return;

    submitScore({
      name: userName,
      score: finalScore,
      timeSeconds,
      verbsCount: config.verbs.length,
      mode: config.mode
    });

    setIsSubmitted(true);
    toast({ title: "¡Puntuación enviada!", description: "Se guardará en el Ranking Global optimísticamente." });
  };

  const renderResultCell = (verb: Verb, form: VerbForm, userAnswer: string | undefined, isCorrect: boolean | undefined) => {
    if (isCorrect) return <div className="text-green-400 flex items-center gap-1"><CheckCircle2 size={14} /> {userAnswer}</div>;
    return <div className="flex flex-col text-xs"><span className="line-through text-destructive">{userAnswer || '-'}</span><span className="text-green-400 font-bold">{verb[form]}</span></div>;
  }

  if (scorePercentage === 100) {
    return (
      <main className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background p-4 text-center overflow-auto">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-8 max-w-2xl w-full py-12">
          <CurvedLoop marqueeText="✦ 100% DE ACIERTOS ✦ ¡PERFECTO! ✦ " speed={1} curveAmount={40} className="text-primary text-5xl font-black" />

          <div className="space-y-2">
            <Trophy className="w-24 h-24 text-yellow-400 mx-auto drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]" />
            <h2 className="text-6xl font-headline font-black text-on-surface tracking-tighter">{finalScore}</h2>
            <p className="text-primary font-bold tracking-widest uppercase">Puntuación Perfecta</p>
          </div>

          {!isSubmitted ? (
            <Card className="bg-surface-container border-2 border-primary shadow-2xl overflow-hidden max-w-md mx-auto">
              <CardHeader className="bg-primary py-3">
                <CardTitle className="text-sm font-bold flex items-center justify-center gap-2 text-primary-foreground">
                  <Save size={16} /> INMORTALIZA TU NOMBRE
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <Input
                  placeholder="Tu nombre aquí..."
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  className="bg-surface-container-high border-0 h-14 text-center text-2xl font-black uppercase"
                  maxLength={15}
                />
                <Button
                  onClick={handleSaveScore}
                  className="w-full h-14 text-lg font-black"
                  disabled={!userName.trim()}
                >
                  <Trophy className="mr-2" />
                  SUBIR AL PODIO
                </Button>
              </CardContent>
            </Card>
          ) : (
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="p-4 bg-green-500/20 rounded-xl border border-green-500/50 text-green-400 font-bold">
              ¡Puntaje enviado con éxito!
            </motion.div>
          )}

          <div className="flex gap-4 justify-center">
            <Button onClick={onResetQuiz} size="lg" className="h-16 px-12 font-black text-xl bg-on-surface text-background hover:bg-on-surface/90">
              <RefreshCw className="mr-3" /> REPETIR
            </Button>
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="flex-grow overflow-auto p-4 sm:p-8 space-y-8">
      <div className="text-center space-y-4">
        <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="inline-block p-6 rounded-full bg-primary/10 border-4 border-primary">
          <Trophy className="w-12 h-12 text-primary mx-auto" />
          <h2 className="text-5xl font-headline font-black mt-2">{finalScore}</h2>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Puntos Totales</p>
        </motion.div>

        <div className="flex justify-center gap-8 text-sm">
          <div className="flex flex-col items-center">
            <Zap className="text-yellow-500 mb-1" size={18} />
            <span className="font-bold">{scorePercentage}%</span>
            <span className="text-[10px] text-muted-foreground">Precisión</span>
          </div>
          <div className="flex flex-col items-center">
            <Timer className="text-blue-500 mb-1" size={18} />
            <span className="font-bold">{timeSeconds}s</span>
            <span className="text-[10px] text-muted-foreground">Tiempo</span>
          </div>
        </div>
      </div>

      {!isSubmitted && scorePercentage > 0 && (
        <Card className="bg-surface-container border-2 border-primary/20 shadow-xl overflow-hidden">
          <CardHeader className="bg-primary/5 py-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2"><Save size={16} /> ¡Guarda tu record!</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <Input
              placeholder="Escribe tu nombre o apodo..."
              value={userName}
              onChange={e => setUserName(e.target.value)}
              className="bg-surface-container-high border-0 h-12 text-center text-lg font-bold"
              maxLength={15}
            />
            <Button
              onClick={handleSaveScore}
              className="w-full h-12 font-bold"
              disabled={!userName.trim()}
            >
              <Trophy className="mr-2" />
              Subir al Ranking
            </Button>
          </CardContent>
        </Card>
      )}

      {incorrectAnswers.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-headline font-bold flex items-center gap-2"><Target className="text-destructive" /> Errores a repasar:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {incorrectAnswers.map(({ verb, answers, results }) => (
              <Card key={verb.infinitive} className="bg-surface-container border-0 shadow-md">
                <CardContent className="p-4">
                  <p className="font-headline font-bold text-lg capitalize mb-3 text-primary">{verb.infinitive} <span className="text-xs text-muted-foreground font-normal">({verb.translation})</span></p>
                  <div className="grid grid-cols-3 gap-2">
                    {config.forms.map(f => (
                      <div key={f} className="flex flex-col gap-1">
                        <span className="text-[8px] uppercase font-bold text-muted-foreground">{FORM_LABELS[f]}</span>
                        {renderResultCell(verb, f, answers[f], results[f])}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 pt-8">
        <Button onClick={onResetQuiz} variant="outline" className="flex-1 h-12 font-bold border-primary text-primary hover:bg-primary/5">
          <RefreshCw className="mr-2" size={18} /> Intentar de nuevo
        </Button>
      </div>
    </main>
  );
}
