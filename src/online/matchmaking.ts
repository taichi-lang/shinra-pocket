// === Matchmaking Logic ===

import socketService from './socketService';
import { MatchFoundPayload, QueueStatus, SocketEvents } from './types';

type QueueStatusCallback = (status: QueueStatus) => void;
type MatchFoundCallback = (payload: MatchFoundPayload) => void;
type ErrorCallback = (message: string) => void;

interface MatchmakingCallbacks {
  onQueueStatus?: QueueStatusCallback;
  onMatchFound?: MatchFoundCallback;
  onError?: ErrorCallback;
}

class Matchmaking {
  private callbacks: MatchmakingCallbacks = {};
  private isInQueue = false;
  private listeners: Array<{ event: string; fn: (...args: any[]) => void }> = [];

  /**
   * Register event callbacks and start listening.
   */
  setup(callbacks: MatchmakingCallbacks): void {
    this.cleanup();
    this.callbacks = callbacks;

    const onQueueStatus = (status: QueueStatus) => {
      this.isInQueue = status.inQueue;
      this.callbacks.onQueueStatus?.(status);
    };

    const onMatchFound = (payload: MatchFoundPayload) => {
      this.isInQueue = false;
      this.callbacks.onMatchFound?.(payload);
    };

    const onError = (err: { code: string; message: string }) => {
      this.callbacks.onError?.(err.message);
    };

    socketService.on(SocketEvents.QUEUE_STATUS, onQueueStatus);
    socketService.on(SocketEvents.MATCH_FOUND, onMatchFound);
    socketService.on(SocketEvents.ERROR, onError);

    this.listeners = [
      { event: SocketEvents.QUEUE_STATUS, fn: onQueueStatus },
      { event: SocketEvents.MATCH_FOUND, fn: onMatchFound },
      { event: SocketEvents.ERROR, fn: onError },
    ];
  }

  /**
   * Join the matchmaking queue.
   */
  joinQueue(coin: string, gameId: string = 'game1'): void {
    if (this.isInQueue) {
      console.warn('[Matchmaking] Already in queue');
      return;
    }
    socketService.emit(SocketEvents.JOIN_QUEUE, { coin, gameId });
    this.isInQueue = true;
  }

  /**
   * Leave the matchmaking queue.
   */
  leaveQueue(): void {
    if (!this.isInQueue) return;
    socketService.emit(SocketEvents.LEAVE_QUEUE);
    this.isInQueue = false;
  }

  /**
   * Check if currently in queue.
   */
  getIsInQueue(): boolean {
    return this.isInQueue;
  }

  /**
   * Remove all listeners and reset state.
   */
  cleanup(): void {
    this.listeners.forEach(({ event, fn }) => {
      socketService.off(event, fn);
    });
    this.listeners = [];
    this.callbacks = {};
    this.isInQueue = false;
  }
}

// Export singleton
const matchmaking = new Matchmaking();
export default matchmaking;
