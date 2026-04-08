// === React Hook — Socket.io Game Connection ===

import { useCallback, useEffect, useRef, useState } from 'react';
import socketService from './socketService';
import {
  ConnectionState,
  GameMove,
  GameResult,
  MatchFoundPayload,
  MatchState,
  QueueStatus,
  SocketEvents,
} from './types';

interface UseGameSocketOptions {
  autoConnect?: boolean;
  serverUrl?: string;
  playerId?: string;
}

interface UseGameSocketReturn {
  // Connection
  connectionState: ConnectionState;
  connect: () => void;
  disconnect: () => void;

  // Matchmaking
  queueStatus: QueueStatus | null;
  matchFound: MatchFoundPayload | null;
  joinQueue: (coin: string) => void;
  leaveQueue: () => void;

  // Game
  matchState: MatchState | null;
  gameResult: GameResult | null;
  sendMove: (move: GameMove) => void;
  surrender: () => void;

  // Meta
  error: string | null;
  clearError: () => void;
}

export function useGameSocket(options: UseGameSocketOptions = {}): UseGameSocketReturn {
  const { autoConnect = false, serverUrl, playerId } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>(
    socketService.getConnectionState()
  );
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [matchFound, setMatchFound] = useState<MatchFoundPayload | null>(null);
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Track current room/player for emits
  const roomRef = useRef<string | null>(null);
  const playerRef = useRef<string | null>(playerId ?? null);

  // --- Connection ---

  const connect = useCallback(() => {
    if (serverUrl) {
      socketService.setServerUrl(serverUrl);
    }
    // connect is now async (obtains JWT before connecting)
    void socketService.connect({ playerId });
  }, [serverUrl, playerId]);

  const disconnect = useCallback(() => {
    socketService.disconnect();
    setQueueStatus(null);
    setMatchFound(null);
    setMatchState(null);
    setGameResult(null);
  }, []);

  // --- Matchmaking ---

  const joinQueue = useCallback((coin: string) => {
    socketService.emit(SocketEvents.JOIN_QUEUE, { coin });
  }, []);

  const leaveQueue = useCallback(() => {
    socketService.emit(SocketEvents.LEAVE_QUEUE);
    setQueueStatus(null);
  }, []);

  // --- Game Actions ---

  const sendMove = useCallback(
    (move: Omit<GameMove, 'roomId' | 'playerId'>) => {
      if (!roomRef.current || !playerRef.current) {
        console.warn('[useGameSocket] Cannot send move — no room or playerId');
        return;
      }
      socketService.emit(SocketEvents.GAME_MOVE, {
        ...move,
        roomId: roomRef.current,
        playerId: playerRef.current,
      });
    },
    []
  );

  const surrender = useCallback(() => {
    if (!roomRef.current || !playerRef.current) return;
    socketService.emit(SocketEvents.GAME_SURRENDER, {
      roomId: roomRef.current,
      playerId: playerRef.current,
    });
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // --- Lifecycle: listeners ---

  useEffect(() => {
    // Connection state
    const unsubState = socketService.onConnectionStateChange((state) => {
      setConnectionState(state);
      if (state === 'error') {
        setError('Connection failed');
      }
    });

    // Queue status updates
    const onQueueStatus = (status: QueueStatus) => setQueueStatus(status);
    socketService.on(SocketEvents.QUEUE_STATUS, onQueueStatus);

    // Match found
    const onMatchFound = (payload: MatchFoundPayload) => {
      roomRef.current = payload.roomId;
      playerRef.current = payload.playerId;
      setMatchFound(payload);
      setQueueStatus(null);
    };
    socketService.on(SocketEvents.MATCH_FOUND, onMatchFound);

    // Game state updates
    const onGameState = (state: MatchState) => setMatchState(state);
    socketService.on(SocketEvents.GAME_STATE_UPDATE, onGameState);

    // Game result
    const onGameResult = (result: GameResult) => setGameResult(result);
    socketService.on(SocketEvents.GAME_RESULT, onGameResult);

    // Errors
    const onError = (err: { message: string }) => setError(err.message);
    socketService.on(SocketEvents.ERROR, onError);

    // Auto-connect
    if (autoConnect) {
      connect();
    }

    return () => {
      unsubState();
      socketService.off(SocketEvents.QUEUE_STATUS, onQueueStatus);
      socketService.off(SocketEvents.MATCH_FOUND, onMatchFound);
      socketService.off(SocketEvents.GAME_STATE_UPDATE, onGameState);
      socketService.off(SocketEvents.GAME_RESULT, onGameResult);
      socketService.off(SocketEvents.ERROR, onError);
    };
  }, [autoConnect, connect]);

  return {
    connectionState,
    connect,
    disconnect,
    queueStatus,
    matchFound,
    joinQueue,
    leaveQueue,
    matchState,
    gameResult,
    sendMove,
    surrender,
    error,
    clearError,
  };
}
