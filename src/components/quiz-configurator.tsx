'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Dices, BookOpenCheck, Settings2, Search, ListChecks, HelpCircle } from 'lucide-react';
import { verbs, type Verb } from '@/lib/verbs';
import { verbLists, type VerbList } from '@/lib/verb-lists';
import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
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
import { playSelectSound, playStartSound, playChallengeModeSound, playReviewModeSound, playConfirmSound } from '@/lib/sounds';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';


export type VerbForm = 'infinitive' | 'pastSimple' | 'pastParticiple';
export type QuizMode = 'challenge' | 'review';

export type QuizConfig = {
  verbs: Verb[];
  forms: VerbForm[];
  mode: QuizMode;
};

type VerbCategory = 'all' | 'regular' | 'irregular';

export function QuizConfigurator({ onStartQuiz }: { onStartQuiz: (config: QuizConfig) => void }) {
  const [category, setCategory] = useState<VerbCategory>('all');
  const [selectedVerbs, setSelectedVerbs] = useState<Set<string>>(new Set());
  const [selectedForms, setSelectedForms] = useState<Set<VerbForm>>(new Set(['infinitive', 'pastSimple', 'pastParticiple']));
  const [searchTerm, setSearchTerm] = useState('');
  const [isRandomSelection, setIsRandomSelection] = useState(false);
  const [activeList, setActiveList] = useState<string | null>(null);
  const [activeListData, setActiveListData] = useState<VerbList | null>(null);
  const [listTypeFilter, setListTypeFilter] = useState<'all' | 'regular' | 'irregular'>('all');
  const [quizMode, setQuizMode] = useState<QuizMode>('challenge');
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem('solo_htp_seen');
    if (!hasSeen) setShowHowToPlay(true);
  }, []);

  const handleCloseHowToPlay = () => {
    localStorage.setItem('solo_htp_seen', '1');
    setShowHowToPlay(false);
  };

  const displayVerbs = useMemo(() => {
    let filtered = verbs;
    if (category !== 'all') {
        filtered = verbs.filter((v) => v.type === category);
    }
    if (searchTerm.trim() !== '') {
      const lowercasedTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(v => 
        v.infinitive.toLowerCase().includes(lowercasedTerm) ||
        v.translation.toLowerCase().includes(lowercasedTerm)
      );
    }
    return filtered;
  }, [category, searchTerm]);

  const handleVerbSelect = (infinitive: string) => {
    playSelectSound();
    setSelectedVerbs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(infinitive)) {
        newSet.delete(infinitive);
      } else {
        newSet.add(infinitive);
      }
      return newSet;
    });
    setIsRandomSelection(false);
    setActiveList(null);
  };

  const handleFormSelect = (form: VerbForm, checked: boolean) => {
    playSelectSound();
    setSelectedForms((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(form);
      } else {
        newSet.delete(form);
      }
      return newSet;
    });
  };
  
  const handleSelectAllVerbs = (checked: boolean) => {
    playSelectSound();
    if (checked) {
      setSelectedVerbs(new Set(displayVerbs.map(v => v.infinitive)));
    } else {
      setSelectedVerbs(new Set());
    }
    setIsRandomSelection(false);
    setActiveList(null);
  };

  const handleRandom20 = () => {
    playSelectSound();
    if (isRandomSelection) {
      setSelectedVerbs(new Set());
      setIsRandomSelection(false);
      setActiveList(null);
    } else {
      const shuffled = [...displayVerbs].sort(() => 0.5 - Math.random());
      const randomVerbs = shuffled.slice(0, 20);
      setSelectedVerbs(new Set(randomVerbs.map((v) => v.infinitive)));
      setIsRandomSelection(true);
      setActiveList('random');
    }
  };

  const applyListWithFilter = useCallback((list: VerbList, typeFilter: 'all' | 'regular' | 'irregular') => {
    const verbSet = new Set(list.verbs);
    const filtered = verbs
      .filter(v => verbSet.has(v.infinitive))
      .filter(v => typeFilter === 'all' || v.type === typeFilter);
    setSelectedVerbs(new Set(filtered.map(v => v.infinitive)));
  }, []);

  const handleSelectList = (list: VerbList) => {
    playSelectSound();
    if (activeList === list.name) {
      setSelectedVerbs(new Set());
      setActiveList(null);
      setActiveListData(null);
      setListTypeFilter('all');
    } else {
      setActiveList(list.name);
      setActiveListData(list);
      setIsRandomSelection(false);
      setListTypeFilter('all');
      applyListWithFilter(list, 'all');
    }
  };

  const handleListTypeFilter = (type: 'all' | 'regular' | 'irregular') => {
    playSelectSound();
    setListTypeFilter(type);
    if (activeListData) applyListWithFilter(activeListData, type);
  };
  
  const handleCategoryChange = (value: string) => {
    playSelectSound();
    setCategory(value as VerbCategory);
    setSelectedVerbs(new Set());
    setIsRandomSelection(false);
    setActiveList(null);
    setActiveListData(null);
    setListTypeFilter('all');
  };

  const handleStart = () => {
    playStartSound();
    const quizVerbs = verbs.filter((v) => selectedVerbs.has(v.infinitive));
    const formOrder: VerbForm[] = ['infinitive', 'pastSimple', 'pastParticiple'];
    if (quizVerbs.length > 0 && selectedForms.size > 0) {
      onStartQuiz({
        verbs: quizVerbs,
        forms: formOrder.filter(form => selectedForms.has(form)),
        mode: quizMode,
      });
    }
  };
  
  const isAllSelected = displayVerbs.length > 0 && displayVerbs.every(v => selectedVerbs.has(v.infinitive));

  const sortedSelectedVerbs = useMemo(() => Array.from(selectedVerbs).sort(), [selectedVerbs]);
  
  const handleModeChange = (value: QuizMode) => {
    if (value === 'challenge') {
      playChallengeModeSound();
    } else if (value === 'review') {
      playReviewModeSound();
    }
    setQuizMode(value);
  }

  return (
    <TooltipProvider>
      <CardHeader className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="font-headline text-3xl flex items-center gap-2 font-bold">
              <Settings2 className="w-7 h-7" />
              Crea tu Quiz
            </CardTitle>
            <CardDescription className="mt-1">
              Personaliza tu sesión de práctica. Elige un modo, una lista rápida o selecciona manualmente los verbos.
            </CardDescription>
          </div>
          <Dialog open={showHowToPlay} onOpenChange={(open) => { if (!open) handleCloseHowToPlay(); else setShowHowToPlay(true); }}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full w-9 h-9 flex-shrink-0 bg-surface-container hover:bg-accent border border-border/50 mt-1">
                <HelpCircle className="w-4 h-4 text-muted-foreground" />
                <span className="sr-only">Cómo jugar</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl font-headline font-black tracking-tight flex items-center gap-2">
                  🎮 Cómo jugar — Solitario
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5 pt-2">

                {/* Modes */}
                <div className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Modos de Juego</p>
                  <div className="space-y-2">
                    <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">⚔️</span>
                        <span className="font-black text-primary">Desafío</span>
                        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Recomendado</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-snug">
                        Los verbos aparecen uno por uno. Escribe la forma pedida y presiona <kbd className="px-1.5 py-0.5 rounded bg-surface-container text-xs font-mono border">Enter</kbd> para confirmar. Puedes navegar entre verbos con los botones de flecha.
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-surface-container border border-border">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">📋</span>
                        <span className="font-black">Repaso (lista)</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-snug">
                        Todos los verbos aparecen en una tabla. Rellena las celdas a tu ritmo y confirma todo al final. Ideal para estudiar sin presión.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Verb forms */}
                <div className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Formas Verbales</p>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { label: 'Infinitivo', example: 'go', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
                      { label: 'Pasado Simple', example: 'went', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
                      { label: 'Pasado Participio', example: 'gone', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
                    ]).map(({ label, example, color, bg }) => (
                      <div key={label} className={`p-3 rounded-xl border text-center ${bg}`}>
                        <p className={`text-base font-black font-mono ${color}`}>{example}</p>
                        <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{label}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Puedes elegir practicar una, dos o las tres formas. Los verbos con múltiples formas aceptadas (p. ej. <span className="font-mono text-primary">learned/learnt</span>) son válidas por igual.
                  </p>
                </div>

                {/* Scoring */}
                <div className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Puntuación</p>
                  <div className="p-4 rounded-xl bg-surface-container border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2">✅ Respuesta correcta</span>
                      <span className="font-black text-emerald-400">+100 pts</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2">⚡ Bonus por velocidad</span>
                      <span className="font-black text-amber-400">hasta +5000 pts</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm flex items-center gap-2">🏆 Bonus perfecto</span>
                      <span className="font-black text-primary">solo con 100% acierto</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground border-t border-border pt-2 mt-1">
                      La puntuación se sube automáticamente al ranking global al terminar el quiz.
                    </p>
                  </div>
                </div>

                {/* Tips */}
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Consejos</p>
                  <ul className="space-y-1.5">
                    {[
                      '💡 Las listas prehechas son una gran forma de empezar si no sabes qué verbos elegir.',
                      '🎲 Usa los 20 al azar para sesiones rápidas y variadas.',
                      '⌨️ En Desafío, usa Enter para confirmar y las flechas para navegar.',
                      '🔁 Practica los verbos incorrectos con la opción de repetir al final.',
                    ].map((tip) => (
                      <li key={tip} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="flex-shrink-0">{tip.slice(0, 2)}</span>
                        <span>{tip.slice(3)}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button onClick={handleCloseHowToPlay} className="w-full h-11 font-black rounded-xl">
                  ¡Entendido, a jugar!
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-0 space-y-6">

        <div className="space-y-4">
          <Label className="text-lg font-bold font-headline flex items-center gap-2">1. Elige el Modo de Práctica</Label>
          <RadioGroup 
            value={quizMode} 
            onValueChange={(value) => handleModeChange(value as QuizMode)}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <Label htmlFor="mode-challenge" className={cn("flex flex-col items-start text-left p-4 rounded-lg border cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transform hover:scale-105 active:scale-100", quizMode === 'challenge' ? "bg-primary text-primary-foreground border-transparent shadow-lg" : "bg-surface-container hover:bg-accent")}>
              <div className="flex justify-between w-full items-center">
                <span className="font-bold text-base">Desafío</span>
                <RadioGroupItem value="challenge" id="mode-challenge" className={cn(quizMode === 'challenge' && 'border-primary-foreground text-primary-foreground')} />
              </div>
              <p className={cn("text-sm mt-1", quizMode === 'challenge' ? 'text-primary-foreground/90' : 'text-muted-foreground')}>Responde los verbos uno por uno. Ideal para ponerte a prueba.</p>
            </Label>
            <Label htmlFor="mode-review" className={cn("flex flex-col items-start text-left p-4 rounded-lg border cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transform hover:scale-105 active:scale-100", quizMode === 'review' ? "bg-primary text-primary-foreground border-transparent shadow-lg" : "bg-surface-container hover:bg-accent")}>
              <div className="flex justify-between w-full items-center">
                <span className="font-bold text-base">Repaso (lista)</span>
                <RadioGroupItem value="review" id="mode-review" className={cn(quizMode === 'review' && 'border-primary-foreground text-primary-foreground')} />
              </div>
              <p className={cn("text-sm mt-1", quizMode === 'review' ? 'text-primary-foreground/90' : 'text-muted-foreground')}>Visualiza todos los verbos en una tabla para completar. Perfecto para estudiar.</p>
            </Label>
          </RadioGroup>
        </div>

        <Separator />
        
        <div className="space-y-4">
          <Label className="text-lg font-bold font-headline flex items-center gap-2">2. Selecciona Verbos</Label>
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2"><ListChecks size={18}/> Prehechos</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {verbLists.map((list) => (
                <button
                  key={list.name}
                  onClick={() => handleSelectList(list)}
                  className={cn(
                    "p-3 text-left rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transform hover:scale-105 active:scale-100",
                    activeList === list.name
                      ? "bg-primary text-primary-foreground border-transparent shadow-lg"
                      : "bg-surface-container hover:bg-accent"
                  )}
                >
                  <p className="font-bold text-sm">{list.name}</p>
                  <p className={cn("text-xs", activeList === list.name ? 'text-primary-foreground/90' : 'text-muted-foreground')}>{list.description}</p>
                </button>
              ))}
            </div>

            {/* List type filter — only shown when a premade list is active */}
            {activeList && activeList !== 'random' && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-muted-foreground font-semibold shrink-0">Tipo:</span>
                {([
                  { value: 'all', label: 'Ambos' },
                  { value: 'regular', label: 'Regulares' },
                  { value: 'irregular', label: 'Irregulares' },
                ] as const).map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => handleListTypeFilter(value)}
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-bold border transition-all',
                      listTypeFilter === value
                        ? 'bg-primary text-primary-foreground border-transparent shadow'
                        : 'bg-surface-container border-border hover:bg-accent'
                    )}
                  >
                    {label}
                  </button>
                ))}
                <span className="text-xs text-muted-foreground ml-auto">{selectedVerbs.size} verbos</span>
              </div>
            )}
          </div>
          
          <Separator orientation='horizontal' className='my-4' />

          <div className='space-y-4'>
            <h3 className="font-semibold flex items-center gap-2">
              <Settings2 size={18}/> Selección Manual
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle size={14} className="text-muted-foreground cursor-help"/>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Elige una categoría o busca verbos específicos. <br /> Las listas prehechas se desactivan al seleccionar manualmente.</p>
                </TooltipContent>
              </Tooltip>
            </h3>
            <Tabs value={category} onValueChange={handleCategoryChange} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">Todos ({verbs.length})</TabsTrigger>
                <TabsTrigger value="regular">Regulares ({verbs.filter(v => v.type === 'regular').length})</TabsTrigger>
                <TabsTrigger value="irregular">Irregulares ({verbs.filter(v => v.type === 'irregular').length})</TabsTrigger>
              </TabsList>
            </Tabs>
          
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <Label className="font-bold">Verbos a incluir ({selectedVerbs.size} seleccionados)</Label>
                <div className="flex gap-2">
                    <Button onClick={handleRandom20} variant={isRandomSelection ? 'default' : 'outline'} size="sm" className="flex-grow sm:flex-grow-0">
                        <Dices className="mr-2 h-4 w-4" />
                        {isRandomSelection ? 'Limpiar selección' : '20 al azar'}
                    </Button>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar por verbo o traducción..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-surface-container"
                />
            </div>
          
            <ScrollArea className="h-64 border rounded-lg">
              <div className="p-4">
                <div className="flex items-center space-x-2 pb-2 border-b mb-4">
                  <Checkbox 
                    id="select-all" 
                    checked={isAllSelected}
                    onCheckedChange={(e) => handleSelectAllVerbs(e as boolean)}
                    disabled={activeList !== null && activeList !== 'random'}
                  />
                  <Label htmlFor="select-all" className="font-bold cursor-pointer">Seleccionar Todos ({displayVerbs.length})</Label>
                </div>
                {displayVerbs.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                    {displayVerbs.map((verb) => (
                      <button
                        key={verb.infinitive}
                        onClick={() => handleVerbSelect(verb.infinitive)}
                        disabled={activeList !== null && activeList !== 'random'}
                        className={cn(
                          "p-2 text-sm text-left rounded-md border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transform hover:scale-105 active:scale-100",
                          selectedVerbs.has(verb.infinitive)
                            ? "bg-primary text-primary-foreground border-transparent shadow-lg"
                            : "bg-surface-container hover:bg-accent",
                          activeList !== null && activeList !== 'random' && "cursor-not-allowed opacity-70"
                        )}
                      >
                        <p className="font-semibold capitalize">{verb.infinitive}</p>
                        <p className={cn("text-xs", selectedVerbs.has(verb.infinitive) ? 'text-primary-foreground/80' : 'text-muted-foreground')}>{verb.translation}</p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-10">
                    <p>No se encontraron verbos.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <Separator />
        
        <div className="space-y-4">
          <Label className="text-lg font-bold font-headline">3. Elige las Formas Verbales</Label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(['infinitive', 'pastSimple', 'pastParticiple'] as VerbForm[]).map((form) => (
              <div key={form} className="flex items-center space-x-2 p-4 rounded-lg bg-surface-container">
                <Checkbox
                  id={form}
                  checked={selectedForms.has(form)}
                  onCheckedChange={(checked) => handleFormSelect(form, checked as boolean)}
                />
                <Label htmlFor={form} className="text-base cursor-pointer capitalize">
                  {form.replace('pastSimple', 'Pasado Simple').replace('pastParticiple', 'Pasado Participio').replace('infinitive', 'Infinitivo')}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-6 bg-surface-container">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="lg" className="w-full font-bold text-lg" disabled={selectedVerbs.size === 0 || selectedForms.size === 0} onClick={() => playConfirmSound()}>
              <BookOpenCheck className="mr-2 h-5 w-5" />
              Empezar
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Listo para empezar?</AlertDialogTitle>
              <AlertDialogDescription>
                Vas a iniciar un quiz en modo <span className='font-bold text-primary'>{quizMode === 'challenge' ? 'Desafío' : 'Repaso'}</span> con los siguientes {selectedVerbs.size} verbos:
              </AlertDialogDescription>
            </AlertDialogHeader>
            <ScrollArea className="h-40 w-full rounded-md border">
              <div className="p-4 text-sm">
                <ul className="list-disc list-inside columns-2">
                  {sortedSelectedVerbs.map(verb => <li key={verb} className="capitalize">{verb}</li>)}
                </ul>
              </div>
            </ScrollArea>
            <AlertDialogFooter>
              <AlertDialogCancel>Volver</AlertDialogCancel>
              <AlertDialogAction onClick={handleStart}>Seguir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </TooltipProvider>
  );
}
