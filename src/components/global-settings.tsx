'use client';

import * as React from 'react';
import { 
  Settings, 
  Volume2, 
  VolumeX, 
  Music, 
  Music2, 
  Zap, 
  ZapOff,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { useAudioSettings } from '@/hooks/use-audio-settings';
import { useSettings } from '@/hooks/use-settings';

export function GlobalSettings() {
  const { musicEnabled, sfxEnabled, setMusicEnabled, setSfxEnabled } = useAudioSettings();
  const { disableEffects, setDisableEffects } = useSettings();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full w-10 h-10 bg-surface-container/50 hover:bg-surface-container border border-border/50 backdrop-blur-sm transition-all duration-300 group"
        >
          <Settings className="w-5 h-5 text-on-surface-variant group-hover:rotate-90 transition-transform duration-500" />
          <span className="sr-only">Ajustes</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 mt-2 bg-surface-container-high/95 backdrop-blur-md border-border shadow-2xl p-1 rounded-xl">
        <DropdownMenuLabel className="px-3 py-2 text-xs font-black uppercase tracking-widest text-muted-foreground">
          Preferencias
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator className="bg-border/50" />
        
        <DropdownMenuCheckboxItem
          checked={musicEnabled}
          onCheckedChange={setMusicEnabled}
          className="flex items-center gap-3 py-2.5 px-3 rounded-lg cursor-pointer focus:bg-primary/10 focus:text-primary transition-colors"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
            {musicEnabled ? <Music className="w-4 h-4" /> : <Music2 className="w-4 h-4 opacity-50" />}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold">Música</span>
            <span className="text-[10px] text-muted-foreground font-medium">Fondo musical</span>
          </div>
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={sfxEnabled}
          onCheckedChange={setSfxEnabled}
          className="flex items-center gap-3 py-2.5 px-3 rounded-lg cursor-pointer focus:bg-primary/10 focus:text-primary transition-colors"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
            {sfxEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 opacity-50" />}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold">Sonidos</span>
            <span className="text-[10px] text-muted-foreground font-medium">Efectos de sonido</span>
          </div>
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator className="bg-border/50" />

        <DropdownMenuCheckboxItem
          checked={!disableEffects}
          onCheckedChange={(v) => setDisableEffects(!v)}
          className="flex items-center gap-3 py-2.5 px-3 rounded-lg cursor-pointer focus:bg-primary/10 focus:text-primary transition-colors"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
            {!disableEffects ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4 opacity-50" />}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold">Efectos</span>
            <span className="text-[10px] text-muted-foreground font-medium">Fondos animados</span>
          </div>
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator className="bg-border/50" />
        
        <div className="p-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-9 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all active:scale-95"
            onClick={() => {
              setMusicEnabled(false);
              setSfxEnabled(false);
            }}
          >
            <VolumeX className="w-3.5 h-3.5 mr-2" />
            Silenciar Todo
          </Button>
        </div>

        <div className="px-3 pb-2 text-[9px] text-center text-muted-foreground/60 font-medium italic">
          Los ajustes se guardan automáticamente
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
