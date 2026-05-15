
'use client';

import { useState } from 'react';
import { Sparkles, Trophy, Gamepad2, Swords, Zap, Infinity as InfinityIcon } from 'lucide-react';
import { QuizConfigurator, type QuizConfig } from '@/components/quiz-configurator';
import { Quiz } from '@/components/quiz';
import { Leaderboard } from '@/components/leaderboard';
import { VersusLobby } from '@/components/versus-lobby';
import { VersusQuiz } from '@/components/versus-quiz';
import { InfiniteConfigurator } from '@/components/infinite-configurator';
import { InfiniteQuiz } from '@/components/infinite-quiz';
import { Card } from '@/components/ui/card';
import { AnimatePresence, motion } from 'framer-motion';
import { QuizCountdown } from '@/components/quiz-countdown';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Balatro from '@/components/Balatro';
import LightRays from '@/components/LightRays';
import { type Verb } from '@/lib/verbs';
import packageJson from '../../package.json';
import ShapeGrid from '@/components/shape-grid';

// ========== CONFIGURACIÓN DE COLORES (HEX) ==========
// Cambia libremente estos códigos HEX. El sistema los convertirá automáticamente.
const THEME_NORMAL = '#007fff';      // Shadcn Blue default
const THEME_NORMAL_DARK = '#80bfff'; // Shadcn Blue dark

const THEME_VERSUS = '#800040';      // <--- Cambia el color principal del MODO DUELO aquí
const THEME_VERSUS_DARK = '#cc0066'; // Color para el modo oscuro del duelo

const THEME_INFINITE = '#dc143c';    // Carmesí para el Modo Infinito
const THEME_INFINITE_DARK = '#ff4d6d';
// ====================================================

// Convierte códigos HEX para que sean compatibles con el formato HSL de Shadcn sin romper la opacidad
function hexToHslString(hex: string) {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length === 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

type QuizState = 'configuring' | 'countingDown' | 'active' | 'versus-lobby' | 'versus-active' | 'infinite-active';

export default function Home() {
  const [quizConfig, setQuizConfig] = useState<QuizConfig | null>(null);
  const [quizState, setQuizState] = useState<QuizState>('configuring');
  const [versusMatch, setVersusMatch] = useState<{ roomCode: string, playerId: string } | null>(null);
  const [infiniteVerbs, setInfiniteVerbs] = useState<Verb[]>([]);
  const [activeTab, setActiveTab] = useState('play');

  const handleQuizStart = (config: QuizConfig) => {
    setQuizConfig(config);
    setQuizState('countingDown');
  };

  const handleCountdownFinish = () => {
    setQuizState('active');
  };

  const handleReset = () => {
    setQuizConfig(null);
    setVersusMatch(null);
    setQuizState('configuring');
  };

  const handleVersusStart = (roomCode: string, playerId: string) => {
    setVersusMatch({ roomCode, playerId });
    setQuizState('versus-active');
  };

  const handleInfiniteStart = (verbs: Verb[]) => {
    setInfiniteVerbs(verbs);
    setQuizState('infinite-active');
  };

  const renderContent = () => {
    switch (quizState) {
      case 'countingDown':
        return (
          <motion.div key="countdown" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="flex min-h-screen flex-col items-center justify-center">
            <QuizCountdown onCountdownFinish={handleCountdownFinish} />
          </motion.div>
        );
      case 'active':
        return (
          <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {quizConfig && <Quiz config={quizConfig} onReset={handleReset} />}
          </motion.div>
        );
      case 'versus-active':
        return (
          <motion.div key="versus-quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {versusMatch && (
              <VersusQuiz
                roomCode={versusMatch.roomCode}
                playerId={versusMatch.playerId}
                onExit={handleReset}
              />
            )}
          </motion.div>
        );
      case 'infinite-active':
        return (
          <motion.div key="infinite-quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <InfiniteQuiz verbs={infiniteVerbs} onExit={handleReset} />
          </motion.div>
        );
      case 'configuring':
      default:
        let tabInfo = {
          badge: "¡V3 LLEGA CON DUELOS Y EL RANK GLOBAL!",
          badgeIcon: <Zap size={14} />,
          title: "Solitario",
          titleIcon: <Sparkles className="w-12 h-12" />,
          description: "¡Aprende tus verbos de una forma divertida! Elige tu lista, activa el cronómetro y ahora sube al podio."
        };

        if (activeTab === 'infinite') {
          tabInfo = {
            badge: "¿Cuánto tiempo puedes aguantar?",
            badgeIcon: <InfinityIcon size={14} />,
            title: "Infinito",
            titleIcon: <InfinityIcon className="w-12 h-12" />,
            description: "Los verbos rotan sin fin. Acierta para ganar tiempo, falla y lo perderás. ¿Sobrevivirás?"
          };
        } else if (activeTab === 'versus') {
          tabInfo = {
            badge: "¿Te sientes seguro de tu nivel?",
            badgeIcon: <Swords size={14} />,
            title: "Duelos",
            titleIcon: <Swords className="w-12 h-12" />,
            description: "Invita a un amigo y compite en tiempo real para ver quién domina mejor los verbos."
          };
        } else if (activeTab === 'ranking') {
          tabInfo = {
            badge: "¡Escala el Ranking jugando!",
            badgeIcon: <Trophy size={14} />,
            title: "Clasificación",
            titleIcon: <Trophy className="w-12 h-12" />,
            description: "Revisa la tabla de global interactiva. ¿Conseguirás ser el número 1 absoluto?"
          };
        }

        return (
          <motion.main key="config" initial={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-12 text-on-surface bg-background relative overflow-hidden">
            <motion.div
              className="absolute inset-0 pointer-events-none z-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: activeTab === 'versus' ? 0.4 : 0 }}
              transition={{ duration: 1, ease: 'easeInOut' }}
            >
              <div style={{ width: '150vw', height: '150vh', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) scale(1.5)' }}>
                <Balatro
                  spinRotation={-2}
                  spinSpeed={7}
                  color1="#800040"
                  color2="#d5006a"
                  color3="#162325"
                  contrast={3.5}
                  lighting={0.4}
                  spinAmount={0.25}
                  pixelFilter={1200}
                />
              </div>
            </motion.div>
            <motion.div
              className="absolute inset-0 pointer-events-none z-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: activeTab === 'infinite' ? 0.4 : 0 }}
              transition={{ duration: 1, ease: 'easeInOut' }}
            >
              <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
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
            </motion.div>
            <motion.div
              className="absolute inset-0 pointer-events-none z-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: activeTab === 'ranking' ? 0.6 : 0 }}
              transition={{ duration: 1, ease: 'easeInOut' }}
            >
              <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
                <LightRays
                  raysOrigin="top-center"
                  raysColor="#ffcc00"
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
            <div className="w-full max-w-5xl space-y-12 relative z-10">
              <header className="text-center space-y-4">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab + "-header"}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="inline-flex items-center gap-2 bg-primary/10 px-4 py-1 rounded-full text-primary text-xs font-bold uppercase tracking-widest border border-primary/20">
                      {tabInfo.badgeIcon} {tabInfo.badge}
                    </div>
                    <h1 className="font-title text-5xl sm:text-7xl font-black tracking-tighter text-primary flex items-center justify-center gap-4">
                      {tabInfo.titleIcon}
                      {tabInfo.title}
                    </h1>
                    <p className="text-lg sm:text-2xl text-on-surface-variant max-w-3xl mx-auto font-medium">
                      {tabInfo.description}
                    </p>
                  </motion.div>
                </AnimatePresence>
              </header>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto h-14 p-1 bg-surface-container rounded-xl shadow-lg">
                  <TabsTrigger value="play" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">
                    <Gamepad2 className="mr-2 hidden sm:block" size={18} /> Jugar
                  </TabsTrigger>
                  <TabsTrigger value="infinite" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">
                    <InfinityIcon className="mr-2 hidden sm:block" size={18} /> Infinito
                  </TabsTrigger>
                  <TabsTrigger value="versus" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">
                    <Swords className="mr-2 hidden sm:block" size={18} /> DUELO
                  </TabsTrigger>
                  <TabsTrigger value="ranking" className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold">
                    <Trophy className="mr-2 hidden sm:block" size={18} /> Rank
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="play" className="mt-8">
                  <Card className="w-full shadow-2xl bg-surface-container-low overflow-hidden border-0">
                    <QuizConfigurator onStartQuiz={handleQuizStart} />
                  </Card>
                </TabsContent>

                <TabsContent value="infinite" className="mt-8">
                  <Card className="w-full shadow-2xl bg-surface-container-low overflow-hidden border-0">
                    <InfiniteConfigurator onStart={handleInfiniteStart} />
                  </Card>
                </TabsContent>

                <TabsContent value="versus" className="mt-8">
                  <VersusLobby onStartMatch={handleVersusStart} />
                </TabsContent>

                <TabsContent value="ranking" className="mt-8">
                  <Leaderboard />
                </TabsContent>
              </Tabs>

              <footer className="text-center text-on-surface-variant text-sm border-t border-border pt-8 opacity-50 hover:opacity-100 transition-opacity">
                <a
                  href="https://github.com/martinuxp/VerbosByMuxp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary transition-colors"
                >
                  Hecho por Muxp bajo Apache 2.0 (v{packageJson.version})
                </a>
              </footer>
            </div>
          </motion.main>
        );
    }
  }

  const isVersus = activeTab === 'versus' || quizState === 'versus-lobby' || quizState === 'versus-active';
  const isInfinite = activeTab === 'infinite' || quizState === 'infinite-active';

  const primaryLight = isVersus ? hexToHslString(THEME_VERSUS) : isInfinite ? hexToHslString(THEME_INFINITE) : hexToHslString(THEME_NORMAL);
  const primaryDark = isVersus ? hexToHslString(THEME_VERSUS_DARK) : isInfinite ? hexToHslString(THEME_INFINITE_DARK) : hexToHslString(THEME_NORMAL_DARK);

  return (
    <>
      <style>{`
        :root {
          --primary: ${primaryLight};
          --ring: ${primaryLight};
        }
        .dark {
          --primary: ${primaryDark};
          --ring: ${primaryDark};
        }
        .bg-primary, .text-primary, .border-primary, [data-state="active"], .ring-primary, .fill-primary, .stroke-primary {
          transition-property: background-color, color, border-color, box-shadow, fill, stroke;
          transition-duration: 1s;
        }
        button:hover, a:hover {
          transition-duration: 0.15s !important;
        }
      `}</style>
      <AnimatePresence mode="wait">
        {renderContent()}
      </AnimatePresence>
    </>
  );
}
