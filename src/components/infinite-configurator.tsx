'use client';

import { useState, useMemo, useCallback } from 'react';
import { Dices, Settings2, Search, ListChecks, HelpCircle, Infinity as InfinityIcon } from 'lucide-react';
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
import { playSelectSound, playConfirmSound } from '@/lib/sounds';

type VerbCategory = 'all' | 'regular' | 'irregular';

export function InfiniteConfigurator({ onStart }: { onStart: (verbs: Verb[]) => void }) {
  const [category, setCategory] = useState<VerbCategory>('all');
  const [selectedVerbs, setSelectedVerbs] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isRandomSelection, setIsRandomSelection] = useState(false);
  const [activeList, setActiveList] = useState<string | null>(null);
  const [activeListData, setActiveListData] = useState<VerbList | null>(null);
  const [listTypeFilter, setListTypeFilter] = useState<'all' | 'regular' | 'irregular'>('all');

  const displayVerbs = useMemo(() => {
    let filtered = verbs;
    if (category !== 'all') filtered = verbs.filter(v => v.type === category);
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(v =>
        v.infinitive.toLowerCase().includes(term) || v.translation.toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [category, searchTerm]);

  const handleVerbSelect = (infinitive: string) => {
    playSelectSound();
    setSelectedVerbs(prev => {
      const s = new Set(prev);
      s.has(infinitive) ? s.delete(infinitive) : s.add(infinitive);
      return s;
    });
    setIsRandomSelection(false);
    setActiveList(null);
  };

  const handleSelectAll = (checked: boolean) => {
    playSelectSound();
    setSelectedVerbs(checked ? new Set(displayVerbs.map(v => v.infinitive)) : new Set());
    setIsRandomSelection(false);
    setActiveList(null);
  };

  const handleRandom = () => {
    playSelectSound();
    if (isRandomSelection) {
      setSelectedVerbs(new Set());
      setIsRandomSelection(false);
      setActiveList(null);
    } else {
      const shuffled = [...displayVerbs].sort(() => 0.5 - Math.random()).slice(0, 20);
      setSelectedVerbs(new Set(shuffled.map(v => v.infinitive)));
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
    playConfirmSound();
    const selected = verbs.filter(v => selectedVerbs.has(v.infinitive));
    if (selected.length > 0) onStart(selected);
  };

  const isAllSelected = displayVerbs.length > 0 && displayVerbs.every(v => selectedVerbs.has(v.infinitive));

  return (
    <TooltipProvider>
      <CardHeader className="p-6">
        <CardTitle className="font-headline text-3xl flex items-center gap-2 font-bold">
          <InfinityIcon className="w-7 h-7" />
          Modo Infinito
        </CardTitle>
        <CardDescription>
          Selecciona los verbos con los que quieres sobrevivir. Siempre se pedirán las 3 formas verbales.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 pt-0 space-y-6">
        {/* Premade lists */}
        <div className="space-y-4">
          <Label className="text-lg font-bold font-headline flex items-center gap-2">
            <ListChecks size={18} /> Listas Prehechas
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {verbLists.map(list => (
              <button
                key={list.name}
                onClick={() => handleSelectList(list)}
                className={cn(
                  'p-3 text-left rounded-lg border transition-all duration-200 transform hover:scale-105 active:scale-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                  activeList === list.name
                    ? 'bg-primary text-primary-foreground border-transparent shadow-lg'
                    : 'bg-surface-container hover:bg-accent'
                )}
              >
                <p className="font-bold text-sm">{list.name}</p>
                <p className={cn('text-xs', activeList === list.name ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                  {list.description}
                </p>
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

        <Separator />

        {/* Manual selection */}
        <div className="space-y-4">
          <Label className="text-lg font-bold font-headline flex items-center gap-2">
            <Settings2 size={18} /> Selección Manual
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle size={14} className="text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Las listas prehechas se desactivan al seleccionar manualmente.</p>
              </TooltipContent>
            </Tooltip>
          </Label>

          <Tabs value={category} onValueChange={handleCategoryChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">Todos ({verbs.length})</TabsTrigger>
              <TabsTrigger value="regular">Regulares ({verbs.filter(v => v.type === 'regular').length})</TabsTrigger>
              <TabsTrigger value="irregular">Irregulares ({verbs.filter(v => v.type === 'irregular').length})</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <Label className="font-bold">Verbos ({selectedVerbs.size} seleccionados)</Label>
            <Button onClick={handleRandom} variant={isRandomSelection ? 'default' : 'outline'} size="sm">
              <Dices className="mr-2 h-4 w-4" />
              {isRandomSelection ? 'Limpiar' : '20 al azar'}
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por verbo o traducción…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 bg-surface-container"
            />
          </div>

          <ScrollArea className="h-64 border rounded-lg">
            <div className="p-4">
              <div className="flex items-center space-x-2 pb-2 border-b mb-4">
                <Checkbox
                  id="inf-select-all"
                  checked={isAllSelected}
                  onCheckedChange={e => handleSelectAll(e as boolean)}
                  disabled={activeList !== null && activeList !== 'random'}
                />
                <Label htmlFor="inf-select-all" className="font-bold cursor-pointer">
                  Seleccionar Todos ({displayVerbs.length})
                </Label>
              </div>
              {displayVerbs.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {displayVerbs.map(verb => (
                    <button
                      key={verb.infinitive}
                      onClick={() => handleVerbSelect(verb.infinitive)}
                      disabled={activeList !== null && activeList !== 'random'}
                      className={cn(
                        'p-2 text-sm text-left rounded-md border transition-all duration-200 transform hover:scale-105 active:scale-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                        selectedVerbs.has(verb.infinitive)
                          ? 'bg-primary text-primary-foreground border-transparent shadow-lg'
                          : 'bg-surface-container hover:bg-accent',
                        activeList !== null && activeList !== 'random' && 'cursor-not-allowed opacity-70'
                      )}
                    >
                      <p className="font-semibold capitalize">{verb.infinitive}</p>
                      <p className={cn('text-xs', selectedVerbs.has(verb.infinitive) ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                        {verb.translation}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-10">No se encontraron verbos.</div>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>

      <CardFooter className="p-6 bg-surface-container">
        <Button
          size="lg"
          className="w-full font-bold text-lg"
          disabled={selectedVerbs.size === 0}
          onClick={handleStart}
        >
          <InfinityIcon className="mr-2 h-5 w-5" />
          ¡Arrancar el Modo Infinito!
        </Button>
      </CardFooter>
    </TooltipProvider>
  );
}
