'use client';

import { globalMusicEnabled, globalSfxEnabled } from '@/hooks/use-audio-settings';

const audioPools = new Map<string, HTMLAudioElement[]>();

const getAudioInstance = (src: string): HTMLAudioElement => {
  if (typeof window === 'undefined') return new Audio(src);
  
  if (!audioPools.has(src)) {
    const initialAudio = new Audio(src);
    initialAudio.preload = 'auto';
    audioPools.set(src, [initialAudio]);
  }
  
  const pool = audioPools.get(src)!;
  let audio = pool.find(a => a.paused || a.ended);
  
  if (!audio) {
    audio = new Audio(src);
    audio.preload = 'auto';
    pool.push(audio);
  } else {
    audio.currentTime = 0;
  }
  
  return audio;
};

export const preloadInfiniteModeSounds = () => {
  if (typeof window === 'undefined') return;
  const files = [
    '/sounds/select.wav',
    '/sounds/countdown.wav',
    '/sounds/gameover-infinito.wav',
    '/sounds/infinito01-05.mp3',
    '/sounds/infinito06-xx.mp3',
    '/sounds/TeQuedasAtras.wav',
    '/sounds/SeguroDeRendirte.wav',
  ];
  files.forEach(src => getAudioInstance(src));
};

const playSound = (src: string, volume: number = 0.5) => {
  if (typeof window !== 'undefined' && globalSfxEnabled) {
    try {
      const audio = getAudioInstance(src);
      audio.volume = volume;

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // El error "The user aborted a request" es normal si se navega rápido
          if (error.name !== 'AbortError') {
            console.error(`Error al reproducir el sonido ${src}:`, error);
          }
        });
      }
    } catch (error) {
      console.error(`Error al crear el audio para ${src}:`, error);
    }
  }
};

export const playSelectSound = () => playSound('/sounds/select.wav', 0.7);

export const playStartSound = () => playSound('/sounds/start.wav');

export const playCountdownSound = () => playSound('/sounds/countdown.wav');

export const playChallengeModeSound = () => playSound('/sounds/desafio.wav');

export const playReviewModeSound = () => playSound('/sounds/repaso.wav');

export const playConfirmSound = () => playSound('/sounds/confirm.wav');

export const playResultSound = (scorePercentage: number) => {
  if (scorePercentage === 100) {
    playSound('/sounds/score_perfect.wav');
  } else if (scorePercentage >= 51) {
    playSound('/sounds/score_good.wav');
  } else {
    playSound('/sounds/score_bad.wav');
  }
};

export const playSurrenderConfirmSound = () => playSound('/sounds/SeguroDeRendirte.wav', 0.8);

export const playLosingSound = () => playSound('/sounds/TeQuedasAtras.wav', 0.8);

export const playWinningSound = () => playSound('/sounds/VasGanando.wav', 0.8);

export const playWaitingLoopingSound = (onTick?: (sec: number) => void) => {
  if (typeof window === 'undefined' || !globalSfxEnabled) return () => { };
  try {
    const audio = getAudioInstance('/sounds/EsperandoOponente.wav');
    audio.volume = 0.4;
    audio.loop = true;

    if (onTick) {
      let lastSec = -1;
      audio.addEventListener('timeupdate', () => {
        const currentSec = Math.floor(audio.currentTime);
        if (currentSec !== lastSec) {
          lastSec = currentSec;
          onTick(currentSec);
        }
      });
    }

    audio.play().catch(() => { });
    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  } catch (error) {
    return () => { };
  }
};

export const playDuelBackgroundMusic = () => {
  if (typeof window === 'undefined' || !globalMusicEnabled) return () => { };
  const tracks = ['/sounds/02DUELO.mp3', '/sounds/04DUELO.mp3', '/sounds/09DUELO.mp3', '/sounds/011DUELO.mp3'];
  const pTrack = tracks[Math.floor(Math.random() * tracks.length)];
  try {
    const audio = getAudioInstance(pTrack);
    audio.volume = 0.25;
    audio.loop = true;
    audio.play().catch(() => { });
    return () => {
      const fadeInterval = setInterval(() => {
        if (audio.volume > 0.03) {
          audio.volume -= 0.03;
        } else {
          audio.volume = 0;
          audio.pause();
          clearInterval(fadeInterval);
        }
      }, 100);
    };
  } catch (e) {
    return () => { };
  }
};

export const playSoloBackgroundMusic = () => {
  if (typeof window === 'undefined' || !globalMusicEnabled) return () => { };
  try {
    const audio = getAudioInstance('/sounds/01SOLO.mp3');
    audio.volume = 0.25;
    audio.loop = true;
    audio.play().catch(() => { });
    return () => {
      const fadeInterval = setInterval(() => {
        if (audio.volume > 0.03) {
          audio.volume -= 0.03;
        } else {
          audio.volume = 0;
          audio.pause();
          clearInterval(fadeInterval);
        }
      }, 100);
    };
  } catch (e) {
    return () => { };
  }
};

export const playGameOverInfinitoSound = () => playSound('/sounds/gameover-infinito.wav', 0.8);

export const playInfiniteBgMusic01_05 = () => {
  if (typeof window === 'undefined' || !globalMusicEnabled) return () => { };
  try {
    const audio = getAudioInstance('/sounds/infinito01-05.mp3');
    audio.volume = 0.25;
    audio.loop = true;
    audio.play().catch(() => { });
    return () => {
      const fadeInterval = setInterval(() => {
        if (audio.volume > 0.03) {
          audio.volume -= 0.03;
        } else {
          audio.volume = 0;
          audio.pause();
          clearInterval(fadeInterval);
        }
      }, 100);
    };
  } catch (e) {
    return () => { };
  }
};

export const playInfiniteBgMusic06_xx = () => {
  if (typeof window === 'undefined' || !globalMusicEnabled) return () => { };
  try {
    const audio = getAudioInstance('/sounds/infinito06-xx.mp3');
    audio.volume = 0.25;
    audio.loop = true;
    audio.play().catch(() => { });
    return () => {
      const fadeInterval = setInterval(() => {
        if (audio.volume > 0.03) {
          audio.volume -= 0.03;
        } else {
          audio.volume = 0;
          audio.pause();
          clearInterval(fadeInterval);
        }
      }, 100);
    };
  } catch (e) {
    return () => { };
  }
};
