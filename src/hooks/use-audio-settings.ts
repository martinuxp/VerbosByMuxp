'use client';

import { useState, useEffect, useCallback } from 'react';

export interface AudioSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  setMusicEnabled: (v: boolean) => void;
  setSfxEnabled: (v: boolean) => void;
}

const MUSIC_KEY = 'audioMusicEnabled';
const SFX_KEY = 'audioSfxEnabled';

// Module-level flags so sounds.ts can read them synchronously without hooks
export let globalMusicEnabled = true;
export let globalSfxEnabled = true;

if (typeof window !== 'undefined') {
  const storedMusic = localStorage.getItem(MUSIC_KEY);
  const storedSfx = localStorage.getItem(SFX_KEY);
  if (storedMusic !== null) globalMusicEnabled = storedMusic !== 'false';
  if (storedSfx !== null) globalSfxEnabled = storedSfx !== 'false';
}

export function useAudioSettings(): AudioSettings {
  const [musicEnabled, setMusicState] = useState(globalMusicEnabled);
  const [sfxEnabled, setSfxState] = useState(globalSfxEnabled);

  useEffect(() => {
    const m = localStorage.getItem(MUSIC_KEY);
    const s = localStorage.getItem(SFX_KEY);
    if (m !== null) { const v = m !== 'false'; globalMusicEnabled = v; setMusicState(v); }
    if (s !== null) { const v = s !== 'false'; globalSfxEnabled = v; setSfxState(v); }
  }, []);

  const setMusicEnabled = useCallback((v: boolean) => {
    globalMusicEnabled = v;
    localStorage.setItem(MUSIC_KEY, String(v));
    setMusicState(v);
  }, []);

  const setSfxEnabled = useCallback((v: boolean) => {
    globalSfxEnabled = v;
    localStorage.setItem(SFX_KEY, String(v));
    setSfxState(v);
  }, []);

  return { musicEnabled, sfxEnabled, setMusicEnabled, setSfxEnabled };
}
