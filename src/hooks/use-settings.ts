'use client';

import { useState, useEffect, useCallback } from 'react';

export interface Settings {
  disableEffects: boolean;
  setDisableEffects: (v: boolean) => void;
}

const EFFECTS_KEY = 'disableEffects';
const EFFECTS_EVENT = 'settings:disableEffects';

export let globalDisableEffects = false;

if (typeof window !== 'undefined') {
  const stored = localStorage.getItem(EFFECTS_KEY);
  if (stored !== null) globalDisableEffects = stored === 'true';
}

export function useSettings(): Settings {
  const [disableEffects, setDisableEffectsState] = useState(globalDisableEffects);

  useEffect(() => {
    // Sync on mount in case another instance already changed the value
    const stored = localStorage.getItem(EFFECTS_KEY);
    if (stored !== null) {
      const v = stored === 'true';
      globalDisableEffects = v;
      setDisableEffectsState(v);
    }

    // Listen for cross-instance sync events
    const handler = (e: Event) => {
      const v = (e as CustomEvent<boolean>).detail;
      setDisableEffectsState(v);
    };
    window.addEventListener(EFFECTS_EVENT, handler);
    return () => window.removeEventListener(EFFECTS_EVENT, handler);
  }, []);

  const setDisableEffects = useCallback((v: boolean) => {
    globalDisableEffects = v;
    localStorage.setItem(EFFECTS_KEY, String(v));
    setDisableEffectsState(v);
    // Notify all other useSettings() instances on the page
    window.dispatchEvent(new CustomEvent(EFFECTS_EVENT, { detail: v }));
  }, []);

  return { disableEffects, setDisableEffects };
}
