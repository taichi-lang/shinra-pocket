/**
 * AudioService — Audio manager for ShinraPocket
 * Handles BGM, SFX loading/playback, and volume control using expo-av.
 */

import { Audio } from 'expo-av';

// ============================================================
// Types
// ============================================================

export interface AudioConfig {
  masterVolume: number;   // 0.0 - 1.0
  bgmVolume: number;      // 0.0 - 1.0
  sfxVolume: number;      // 0.0 - 1.0
  isMuted: boolean;
}

interface SoundEntry {
  sound: Audio.Sound;
  isLoaded: boolean;
}

// ============================================================
// State
// ============================================================

const config: AudioConfig = {
  masterVolume: 1.0,
  bgmVolume: 0.7,
  sfxVolume: 1.0,
  isMuted: false,
};

const loadedSounds: Map<string, SoundEntry> = new Map();
let currentBGM: { key: string; sound: Audio.Sound } | null = null;
let isInitialized = false;

// ============================================================
// Initialization
// ============================================================

/**
 * Initialize the audio service. Sets audio mode for background playback.
 * Call once at app startup.
 */
export async function initAudio(): Promise<void> {
  if (isInitialized) return;

  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    isInitialized = true;
    console.log('[AudioService] Initialized');
  } catch (error) {
    console.error('[AudioService] Init failed:', error);
  }
}

// ============================================================
// Sound Loading
// ============================================================

/**
 * Load a sound from a require() source and register it with a key.
 * @param key - Unique identifier for the sound
 * @param source - require('path/to/sound.mp3')
 */
export async function loadSound(
  key: string,
  source: number | { uri: string }
): Promise<boolean> {
  try {
    // Unload existing if already loaded
    if (loadedSounds.has(key)) {
      await unloadSound(key);
    }

    const { sound } = await Audio.Sound.createAsync(source, {
      shouldPlay: false,
      volume: getEffectiveVolume('sfx'),
    });

    loadedSounds.set(key, { sound, isLoaded: true });
    return true;
  } catch (error) {
    console.warn(`[AudioService] Failed to load sound "${key}":`, error);
    return false;
  }
}

/**
 * Load multiple sounds at once.
 * @param sounds - Array of [key, source] tuples
 */
export async function loadSounds(
  sounds: Array<[string, number | { uri: string }]>
): Promise<void> {
  await Promise.all(sounds.map(([key, source]) => loadSound(key, source)));
}

/**
 * Unload a specific sound and free memory.
 */
export async function unloadSound(key: string): Promise<void> {
  const entry = loadedSounds.get(key);
  if (entry) {
    try {
      await entry.sound.unloadAsync();
    } catch (_) {
      // Sound may already be unloaded
    }
    loadedSounds.delete(key);
  }
}

/**
 * Unload all loaded sounds.
 */
export async function unloadAllSounds(): Promise<void> {
  const keys = Array.from(loadedSounds.keys());
  await Promise.all(keys.map(key => unloadSound(key)));
  if (currentBGM) {
    try {
      await currentBGM.sound.unloadAsync();
    } catch (_) {}
    currentBGM = null;
  }
}

// ============================================================
// SFX Playback
// ============================================================

/**
 * Play a loaded sound effect by key.
 * @param key - The sound key registered via loadSound()
 * @param options - Optional: volume override, loop
 */
export async function playSound(
  key: string,
  options?: { volume?: number; loop?: boolean }
): Promise<void> {
  if (config.isMuted) return;

  const entry = loadedSounds.get(key);
  if (!entry || !entry.isLoaded) {
    console.warn(`[AudioService] Sound not loaded: "${key}"`);
    return;
  }

  try {
    const volume = options?.volume ?? getEffectiveVolume('sfx');
    await entry.sound.setPositionAsync(0);
    await entry.sound.setVolumeAsync(volume);
    await entry.sound.setIsLoopingAsync(options?.loop ?? false);
    await entry.sound.playAsync();
  } catch (error) {
    console.warn(`[AudioService] Failed to play "${key}":`, error);
  }
}

/**
 * Stop a currently playing sound.
 */
export async function stopSound(key: string): Promise<void> {
  const entry = loadedSounds.get(key);
  if (entry?.isLoaded) {
    try {
      await entry.sound.stopAsync();
    } catch (_) {}
  }
}

// ============================================================
// BGM (Background Music)
// ============================================================

/**
 * Play background music. Stops any currently playing BGM.
 * @param key - Unique key for the BGM track
 * @param source - require() path or URI
 * @param fadeIn - Whether to fade in (duration in ms)
 */
export async function playBGM(
  key: string,
  source: number | { uri: string },
  fadeIn: number = 0
): Promise<void> {
  // If same track is already playing, do nothing
  if (currentBGM?.key === key) return;

  // Stop current BGM
  await stopBGM();

  if (config.isMuted) return;

  try {
    const targetVolume = getEffectiveVolume('bgm');
    const { sound } = await Audio.Sound.createAsync(source, {
      shouldPlay: true,
      isLooping: true,
      volume: fadeIn > 0 ? 0 : targetVolume,
    });

    currentBGM = { key, sound };

    // Simple fade-in
    if (fadeIn > 0) {
      const steps = 10;
      const stepDuration = fadeIn / steps;
      for (let i = 1; i <= steps; i++) {
        await new Promise(r => setTimeout(r, stepDuration));
        if (currentBGM?.key !== key) return; // BGM changed during fade
        await sound.setVolumeAsync((targetVolume * i) / steps);
      }
    }
  } catch (error) {
    console.warn(`[AudioService] Failed to play BGM "${key}":`, error);
  }
}

/**
 * Stop the current background music.
 * @param fadeOut - Fade out duration in ms (0 = immediate)
 */
export async function stopBGM(fadeOut: number = 0): Promise<void> {
  if (!currentBGM) return;

  const bgm = currentBGM;
  currentBGM = null;

  try {
    if (fadeOut > 0) {
      const status = await bgm.sound.getStatusAsync();
      if (status.isLoaded) {
        const startVolume = status.volume ?? getEffectiveVolume('bgm');
        const steps = 10;
        const stepDuration = fadeOut / steps;
        for (let i = steps - 1; i >= 0; i--) {
          await new Promise(r => setTimeout(r, stepDuration));
          await bgm.sound.setVolumeAsync((startVolume * i) / steps);
        }
      }
    }
    await bgm.sound.stopAsync();
    await bgm.sound.unloadAsync();
  } catch (_) {
    // Sound may already be unloaded
  }
}

/**
 * Pause BGM (e.g., when app goes to background).
 */
export async function pauseBGM(): Promise<void> {
  if (currentBGM) {
    try {
      await currentBGM.sound.pauseAsync();
    } catch (_) {}
  }
}

/**
 * Resume paused BGM.
 */
export async function resumeBGM(): Promise<void> {
  if (currentBGM && !config.isMuted) {
    try {
      await currentBGM.sound.playAsync();
    } catch (_) {}
  }
}

// ============================================================
// Volume Control
// ============================================================

function getEffectiveVolume(type: 'bgm' | 'sfx'): number {
  if (config.isMuted) return 0;
  const channelVolume = type === 'bgm' ? config.bgmVolume : config.sfxVolume;
  return config.masterVolume * channelVolume;
}

/**
 * Set master volume (0.0 - 1.0).
 */
export function setMasterVolume(volume: number): void {
  config.masterVolume = Math.max(0, Math.min(1, volume));
  applyVolumeChanges();
}

/**
 * Set BGM volume (0.0 - 1.0).
 */
export function setBGMVolume(volume: number): void {
  config.bgmVolume = Math.max(0, Math.min(1, volume));
  applyVolumeChanges();
}

/**
 * Set SFX volume (0.0 - 1.0).
 */
export function setSFXVolume(volume: number): void {
  config.sfxVolume = Math.max(0, Math.min(1, volume));
  applyVolumeChanges();
}

/**
 * Toggle mute state.
 */
export function toggleMute(): boolean {
  config.isMuted = !config.isMuted;
  applyVolumeChanges();
  return config.isMuted;
}

/**
 * Set mute state.
 */
export function setMuted(muted: boolean): void {
  config.isMuted = muted;
  applyVolumeChanges();
}

/**
 * Get current audio config.
 */
export function getAudioConfig(): Readonly<AudioConfig> {
  return { ...config };
}

/**
 * Apply volume changes to all active sounds.
 */
async function applyVolumeChanges(): Promise<void> {
  // Update BGM volume
  if (currentBGM) {
    try {
      await currentBGM.sound.setVolumeAsync(getEffectiveVolume('bgm'));
    } catch (_) {}
  }

  // Update SFX volumes
  const sfxVolume = getEffectiveVolume('sfx');
  for (const [, entry] of loadedSounds) {
    if (entry.isLoaded) {
      try {
        await entry.sound.setVolumeAsync(sfxVolume);
      } catch (_) {}
    }
  }
}

export default {
  initAudio,
  loadSound,
  loadSounds,
  unloadSound,
  unloadAllSounds,
  playSound,
  stopSound,
  playBGM,
  stopBGM,
  pauseBGM,
  resumeBGM,
  setMasterVolume,
  setBGMVolume,
  setSFXVolume,
  toggleMute,
  setMuted,
  getAudioConfig,
};
