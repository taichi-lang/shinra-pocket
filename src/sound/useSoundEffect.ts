/**
 * useSoundEffect — React hook for playing sound effects in ShinraPocket
 * Provides easy play-by-name and preloading capabilities.
 */

import { useCallback, useEffect, useRef } from 'react';
import {
  loadSound,
  loadSounds,
  playSound,
  stopSound,
  unloadSound,
} from './audioService';
import { SFX_MAP, SFXName, getLoadableSFX } from './soundMap';

// ============================================================
// useSoundEffect — Play a single sound by name
// ============================================================

/**
 * Hook to play a specific sound effect.
 *
 * @example
 * const { play } = useSoundEffect('uiTap');
 * <TouchableOpacity onPress={play}>
 */
export function useSoundEffect(name: SFXName) {
  const loadedRef = useRef(false);

  useEffect(() => {
    const def = SFX_MAP[name];
    if (def?.source != null && !loadedRef.current) {
      loadSound(def.key, def.source).then(ok => {
        loadedRef.current = ok;
      });
    }

    return () => {
      if (loadedRef.current) {
        unloadSound(name);
        loadedRef.current = false;
      }
    };
  }, [name]);

  const play = useCallback(
    (volumeOverride?: number) => {
      const def = SFX_MAP[name];
      if (def) {
        playSound(def.key, { volume: volumeOverride ?? def.volume });
      }
    },
    [name]
  );

  const stop = useCallback(() => {
    stopSound(name);
  }, [name]);

  return { play, stop };
}

// ============================================================
// usePreloadSounds — Preload a set of sounds
// ============================================================

/**
 * Hook to preload multiple sounds at mount time.
 * Unloads them on unmount.
 *
 * @example
 * // Preload specific sounds for a game screen
 * usePreloadSounds(['coinPlace', 'coinMove', 'victory', 'defeat']);
 */
export function usePreloadSounds(names: SFXName[]) {
  const loadedKeysRef = useRef<string[]>([]);

  useEffect(() => {
    const toLoad: Array<[string, number]> = [];

    for (const name of names) {
      const def = SFX_MAP[name];
      if (def?.source != null) {
        toLoad.push([def.key, def.source]);
      }
    }

    if (toLoad.length > 0) {
      loadSounds(toLoad as Array<[string, number | { uri: string }]>).then(() => {
        loadedKeysRef.current = toLoad.map(([key]) => key);
      });
    }

    return () => {
      loadedKeysRef.current.forEach(key => unloadSound(key));
      loadedKeysRef.current = [];
    };
  }, [names.join(',')]);

  const play = useCallback(
    (name: SFXName, volumeOverride?: number) => {
      const def = SFX_MAP[name];
      if (def) {
        playSound(def.key, { volume: volumeOverride ?? def.volume });
      }
    },
    []
  );

  return { play };
}

// ============================================================
// usePreloadAllSounds — Preload every available sound
// ============================================================

/**
 * Hook to preload ALL available SFX at app startup.
 * Use sparingly — only in the root component or lobby screen.
 *
 * @example
 * // In App.tsx or LobbyScreen
 * usePreloadAllSounds();
 */
export function usePreloadAllSounds() {
  useEffect(() => {
    const loadable = getLoadableSFX();
    if (loadable.length > 0) {
      loadSounds(loadable).then(() => {
        console.log(`[useSoundEffect] Preloaded ${loadable.length} sounds`);
      });
    }

    return () => {
      loadable.forEach(([key]) => unloadSound(key));
    };
  }, []);
}

// ============================================================
// useSFXCallback — Create a memoized callback that plays a sound
// ============================================================

/**
 * Returns a stable callback that plays a sound.
 * Useful for passing directly to event handlers.
 *
 * @example
 * const onTap = useSFXCallback('uiTap', () => {
 *   // your logic here
 * });
 * <TouchableOpacity onPress={onTap}>
 */
export function useSFXCallback(
  name: SFXName,
  callback?: (...args: any[]) => void
) {
  const { play } = useSoundEffect(name);

  return useCallback(
    (...args: any[]) => {
      play();
      callback?.(...args);
    },
    [play, callback]
  );
}

export default useSoundEffect;
