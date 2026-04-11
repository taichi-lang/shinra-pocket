// Game1 Timer — Move phase timer system

import { useRef, useCallback, useEffect, useState } from 'react';
import { type Game1TimerConfig, DEFAULT_TIMER_CONFIG } from './game1Types';

/**
 * ラウンドに応じた制限時間を計算
 */
export function getTimeForRound(
  round: number,
  config: Game1TimerConfig = DEFAULT_TIMER_CONFIG,
): number {
  const time = config.initialTime - (round - 1) * config.decrementPerRound;
  return Math.max(time, config.minimumTime);
}

/**
 * タイマーフック — 移動フェーズ用
 */
export function useGame1Timer(
  config: Game1TimerConfig = DEFAULT_TIMER_CONFIG,
) {
  const [timeLeft, setTimeLeft] = useState(config.initialTime);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTimeoutRef = useRef<(() => void) | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const startTimer = useCallback(
    (round: number, onTimeout: () => void) => {
      clearTimer();
      const duration = getTimeForRound(round, config);
      setTimeLeft(duration);
      setIsRunning(true);
      onTimeoutRef.current = onTimeout;

      let remaining = duration;
      intervalRef.current = setInterval(() => {
        remaining -= 1;
        setTimeLeft(remaining);
        if (remaining <= 0) {
          clearTimer();
          onTimeoutRef.current?.();
        }
      }, 1000);
    },
    [config, clearTimer],
  );

  const stopTimer = useCallback(() => {
    clearTimer();
  }, [clearTimer]);

  const resetTimer = useCallback(
    (round: number) => {
      clearTimer();
      const duration = getTimeForRound(round, config);
      setTimeLeft(duration);
    },
    [config, clearTimer],
  );

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    timeLeft,
    isRunning,
    startTimer,
    stopTimer,
    resetTimer,
  };
}
