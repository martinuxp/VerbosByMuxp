'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Swords, Timer, ShieldCheck, Flag, Trophy, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { updateMatchProgress } from '@/services/versus';
import { verbLists } from '@/lib/verb-lists';
import { verbs as allVerbs, Verb } from '@/lib/verbs';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { playSelectSound, playResultSound, playConfirmSound, playWaitingLoopingSound, playSurrenderConfirmSound, playLosingSound, playWinningSound, playDuelBackgroundMusic } from '@/lib/sounds';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from './ui/alert-dialog';
import Confetti from 'react-confetti';
import Balatro from './Balatro';
import { useSettings } from '@/hooks/use-settings';

type VersusQuizProps = {
  roomCode: string;
  playerId: string;
  onExit: () => void;
};

export function VersusQuiz({ roomCode, playerId, onExit }: VersusQuizProps) {
  const { disableEffects } = useSettings();
  const [match, setMatch] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchMatch = async () => {
      const matchId = roomCode.toUpperCase();
      const { data } = await supabase.from('MATCHES').select('*').eq('id', matchId).single();
      if (active) {
        if (data) setMatch(data);
        setIsLoading(false);
      }
    };

    fetchMatch();
    const pollId = setInterval(fetchMatch, 2000);

    return () => {
      active = false;
      clearInterval(pollId);
    };
  }, [roomCode]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, string>>>({});
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    }
  }, []);

  const iconControls = useAnimation();

  useEffect(() => {
    if (match?.status === 'waiting') {
      const stopLoop = playWaitingLoopingSound((sec) => {
        if (sec === 0) {
          iconControls.start({
            scale: [1, 1.4, 1],
            filter: ['brightness(1)', 'brightness(1.8)', 'brightness(1)'],
            transition: { duration: 0.5, ease: 'easeOut' }
          });
        } else if (sec === 1) {
          iconControls.start({
            scale: [1, 1.15, 1],
            filter: ['brightness(1)', 'brightness(1.2)', 'brightness(1)'],
            transition: { duration: 0.5, ease: 'easeOut' }
          });
        }
      });
      return () => stopLoop();
    }
  }, [match?.status, iconControls]);

  useEffect(() => {
    if (match?.status === 'active') {
      const fadeOut = playDuelBackgroundMusic();
      return () => fadeOut();
    }
  }, [match?.status]);

  // Iniciar la cuenta regresiva cuando ambos están listos
  useEffect(() => {
    if (match?.status === 'active' && countdown === null && startTime === null) {
      setCountdown(3);
    }
  }, [match?.status, countdown, startTime]);

  // Manejar el progreso de la cuenta regresiva
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && startTime === null) {
      setStartTime(Date.now());
    }
  }, [countdown, startTime]);

  // Manejar el tiempo transcurrido
  useEffect(() => {
    let interval: any;
    if (startTime !== null && match?.status === 'active' && !finished) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [match?.status, finished, startTime]);

  // (Liderazgo movido abajo para estar después de la declaración de variables)

  const matchVerbs = useMemo(() => {
    if (!match) return [];
    const list = verbLists.find(l => l.name === match.listName);
    if (!list) return [];
    return allVerbs.filter(v => list.verbs.includes(v.infinitive));
  }, [match]);

  const currentVerb = matchVerbs[currentIndex];
  const forms = ['infinitive', 'pastSimple', 'pastParticiple'];

  const handleInputChange = (form: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentVerb.infinitive]: {
        ...(prev[currentVerb.infinitive] || {}),
        [form]: value
      }
    }));
  };

  const calculateScore = () => {
    let score = 0;
    matchVerbs.forEach(v => {
      forms.forEach(f => {
        const userAns = (answers[v.infinitive]?.[f] || '').trim().toLowerCase();
        const corrects = (v as any)[f].toLowerCase().split('/').map((s: string) => s.trim());
        if (corrects.includes(userAns)) score += 100;
      });
    });
    return score;
  };

  const syncProgress = (isFinal = false, targetIndex: number = currentIndex) => {
    if (!matchVerbs.length) return;
    const progress = Math.round(((targetIndex + (isFinal ? 1 : 0)) / matchVerbs.length) * 100);
    const score = calculateScore();
    updateMatchProgress(roomCode, playerId, progress, score, isFinal, elapsedTime);
  };

  const handleNext = () => {
    playSelectSound();
    if (currentIndex < matchVerbs.length - 1) {
      setCurrentIndex(prev => prev + 1);
      syncProgress(false, currentIndex + 1);
    } else {
      setFinished(true);
      const score = calculateScore();
      const finalScore = score + Math.max(0, 5000 - (elapsedTime * 10));
      updateMatchProgress(roomCode, playerId, 100, finalScore, true, elapsedTime);
      playResultSound(100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (idx < forms.length - 1) {
        inputRefs.current[idx + 1]?.focus();
      } else {
        handleNext();
      }
    }
  };

  const opponent = useMemo(() => {
    if (!match) return null;
    const opponentId = Object.keys(match.players).find(id => id !== playerId);
    return opponentId ? match.players[opponentId] : null;
  }, [match, playerId]);

  const myData = match?.players?.[playerId];

  const leadStatusRef = useRef<'winning' | 'losing' | 'tied'>('tied');
  const [leadAlert, setLeadAlert] = useState<'winning' | 'losing' | null>(null);
  const leadAlertTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (match?.status !== 'active') return;
    if (!myData || !opponent) return;

    const myScore = myData.score || 0;
    const oppScore = opponent.score || 0;

    const showAlert = (status: 'winning' | 'losing') => {
      setLeadAlert(status);
      if (leadAlertTimeoutRef.current) clearTimeout(leadAlertTimeoutRef.current);
      leadAlertTimeoutRef.current = setTimeout(() => setLeadAlert(null), 3000);
    };

    if (myScore > oppScore && leadStatusRef.current !== 'winning') {
      leadStatusRef.current = 'winning';
      if (myScore > 0) {
        playWinningSound();
        showAlert('winning');
      }
    } else if (myScore < oppScore && leadStatusRef.current !== 'losing') {
      leadStatusRef.current = 'losing';
      if (oppScore > 0) {
        playLosingSound();
        showAlert('losing');
      }
    } else if (myScore === oppScore && leadStatusRef.current !== 'tied') {
      leadStatusRef.current = 'tied';
    }
  }, [myData?.score, opponent?.score, match?.status]);

  if (isLoading || !match) return <div className="flex h-screen items-center justify-center">Conectando...</div>;

  if (match.status === 'waiting') {
    return (
      <div className="flex flex-col h-screen items-center justify-center p-8 text-center space-y-8 bg-background">
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="space-y-4">
          <motion.div animate={iconControls} className="bg-primary/20 p-6 rounded-full inline-block">
            <Swords size={64} className="text-primary" />
          </motion.div>
          <h1 className="text-4xl font-black">Esperando al oponente...</h1>
          <p className="text-on-surface-variant">Comparte este código para iniciar el duelo:</p>
          <div className="text-6xl font-black text-primary tracking-widest bg-surface-container p-6 rounded-xl border-2 border-dashed border-primary">
            {roomCode}
          </div>
        </motion.div>
        <Button variant="ghost" onClick={onExit}>Cancelar Batalla</Button>
      </div>
    );
  }

  if (match.status === 'abandoned') {
    return (
      <div className="flex flex-col h-screen items-center justify-center p-8 bg-background text-center space-y-6">
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
          <Flag size={80} className="text-destructive mx-auto" />
        </motion.div>
        <h1 className="text-5xl font-black text-primary">Duelo Cancelado</h1>
        <p className="text-xl text-muted-foreground font-bold">¡Tu rival se ha rendido!</p>
        <Button size="lg" onClick={onExit} className="font-bold px-12 h-14 text-lg mt-8">
          Salir al Menú
        </Button>
      </div>
    );
  }

  const isFinished = finished || (myData?.finished && opponent?.finished);
  const isCountdown = countdown !== null && countdown > 0;
  const localMyScore = calculateScore();
  const localMyProgress = isFinished ? 100 : (matchVerbs.length ? Math.round((currentIndex / matchVerbs.length) * 100) : 0);
  const iWon = localMyScore > (opponent?.score || 0) ||
    (localMyScore === (opponent?.score || 0) && (myData?.timeSeconds || 0) < (opponent?.timeSeconds || 0));

  return (
    <div className="flex flex-col h-screen relative overflow-hidden text-on-surface bg-background">
      {!disableEffects && (
        <motion.div
          className="absolute inset-0 pointer-events-none z-0"
          initial={{ opacity: 0, rotate: 0 }}
          animate={{
            opacity: isFinished ? 0 : 0.4,
            rotate: currentIndex * 90
          }}
          transition={{
            opacity: { duration: 3, ease: "easeInOut" },
            rotate: { duration: 1.2, ease: "easeInOut" }
          }}
        >
          <div style={{ width: '150vw', height: '150vh', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) scale(1.5)' }}>
            <Balatro
              spinRotation={-2}
              spinSpeed={7}
              color1="#8080c0"
              color2="#0080c0"
              color3="#162325"
              contrast={3.5}
              lighting={0.4}
              spinAmount={0.25}
              pixelFilter={1200}
            />
          </div>
        </motion.div>
      )}

      {isCountdown ? (
        <div className="relative z-10 flex flex-col h-screen items-center justify-center">
          <motion.div
            key={countdown}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="text-[12rem] font-black text-primary tracking-tighter drop-shadow-2xl"
          >
            {countdown}
          </motion.div>
          <h2 className="text-2xl font-bold text-primary mt-4 uppercase tracking-widest drop-shadow-md">PREPARATE!</h2>
        </div>
      ) : isFinished ? (
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6 space-y-8 text-center bg-background/60 backdrop-blur-sm">
          {iWon && dimensions.width > 0 && <Confetti width={dimensions.width} height={dimensions.height} />}
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-4">
            {iWon ? (
              <div className="space-y-2">
                <Trophy size={80} className="text-yellow-400 mx-auto drop-shadow-xl" />
                <h1 className="text-6xl font-black text-primary">¡VICTORIA!</h1>
              </div>
            ) : (
              <div className="space-y-2">
                <ShieldCheck size={80} className="text-muted-foreground mx-auto" />
                <h1 className="text-6xl font-black text-muted-foreground">¡Gran duelo!</h1>
              </div>
            )}
            <p className="text-2xl font-bold">Puntaje Final: {myData?.score?.toLocaleString() || 0}</p>
          </motion.div>

          <div className="grid grid-cols-2 gap-4 w-full max-w-md">
            <Card className="bg-surface-container-low border-0">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Tú ({myData?.name})</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-black text-primary">{myData?.score}</p>
                <p className="text-xs text-muted-foreground">{myData?.timeSeconds}s</p>
              </CardContent>
            </Card>
            <Card className="bg-surface-container-low border-0">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Rival ({opponent?.name})</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-black">{opponent?.score || 0}</p>
                <p className="text-xs text-muted-foreground">{opponent?.timeSeconds || 0}s</p>
              </CardContent>
            </Card>
          </div>

          <Button size="lg" onClick={onExit} className="font-bold px-12 h-14 text-lg">
            <RefreshCw className="mr-2" /> Salir al Menú
          </Button>
        </div>
      ) : (
        <>
          <header className="relative z-10 p-4 border-b flex justify-between items-center bg-surface-container-lowest/80 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Batalla Online</span>
                <span className="font-black text-primary flex items-center gap-1"><Swords size={16} /> {roomCode}</span>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2 text-xl font-black">
                <Timer size={20} className="text-primary" />
                {elapsedTime}s
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => playSurrenderConfirmSound()}><Flag size={20} /></Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader><AlertDialogTitle>¿Abandonar duelo?</AlertDialogTitle><AlertDialogDescription>Si sales ahora, la partida terminará inmediatamente para ambos.</AlertDialogDescription></AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Seguir luchando</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => {
                    await supabase.from('MATCHES').update({ status: 'abandoned' }).eq('id', roomCode.toUpperCase());
                    onExit();
                  }}>
                    Rendirse
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </header>

          <main className="relative z-10 flex-grow flex flex-col p-4 space-y-6 overflow-auto">
            <Card className="p-4 bg-surface-container-low/95 backdrop-blur-md shadow-xl border-0 space-y-5">
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-primary">
                  <span>Tú: {myData?.name}</span>
                  <span>{localMyProgress}%</span>
                </div>
                <Progress value={localMyProgress} className="h-4 bg-surface-container-high/50" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                  <span>Rival: {opponent?.name || '...'}</span>
                  <span>{opponent?.progress || 0}%</span>
                </div>
                <Progress value={opponent?.progress || 0} className="h-3 bg-surface-container/50 opacity-60" />
              </div>
            </Card>

            <div className="relative flex justify-center w-full z-50 h-0">
              <AnimatePresence>
                {leadAlert && (
                  <motion.div
                    initial={{ opacity: 0, y: -20, scale: 0.8 }}
                    animate={{ opacity: 1, y: -10, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.2, filter: "blur(5px)" }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className={`absolute top-0 px-6 py-2 rounded-xl border-4 font-black text-lg md:text-xl uppercase tracking-widest shadow-[0_0_30px_rgba(0,0,0,0.5)] whitespace-nowrap ${leadAlert === 'winning' ? 'bg-blue-500 text-white border-blue-300' : 'bg-destructive text-destructive-foreground border-red-400'
                      }`}
                  >
                    {leadAlert === 'winning' ? '¡Llevas la delantera!' : '¡Te estás quedando atrás!'}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex-grow flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="w-full max-w-md"
                >
                  <Card className="shadow-2xl border-0 bg-surface-container-low">
                    <CardHeader>
                      <CardTitle className="text-center text-4xl font-black capitalize text-primary">
                        {currentVerb.translation}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {forms.map((form, idx) => (
                        <div key={form} className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">
                            {form === 'infinitive' ? 'Infinitivo' : form === 'pastSimple' ? 'Pasado Simple' : 'Participio'}
                          </Label>
                          <Input
                            ref={(el) => { inputRefs.current[idx] = el; }}
                            autoFocus={idx === 0}
                            value={answers[currentVerb.infinitive]?.[form] || ''}
                            onChange={(e) => handleInputChange(form, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, idx)}
                            className="h-14 text-xl text-center font-bold bg-surface-container border-0 focus-visible:ring-2 focus-visible:ring-primary shadow-inner"
                            autoComplete="off"
                          />
                        </div>
                      ))}
                      <Button onClick={handleNext} className="w-full h-14 text-lg font-black shadow-lg">
                        {currentIndex === matchVerbs.length - 1 ? '¡TERMINAR!' : 'SIGUIENTE'}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </>
      )}
    </div>
  );
}
