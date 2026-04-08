// === Socket.io Client Service — Singleton ===

import { io, Socket } from 'socket.io-client';
import { ConnectionState, SocketEvents } from './types';
import { getOrCreateToken, getPlayerId, SERVER_URL as DEFAULT_SERVER_URL } from './authService';

// Server URL — configurable via setServerUrl before connecting
let SERVER_URL = DEFAULT_SERVER_URL;

type Listener = (...args: any[]) => void;

class SocketService {
  private static instance: SocketService;
  private socket: Socket | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private stateListeners: Set<(state: ConnectionState) => void> = new Set();

  private constructor() {}

  static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  // --- Configuration ---

  setServerUrl(url: string): void {
    SERVER_URL = url;
  }

  getServerUrl(): string {
    return SERVER_URL;
  }

  // --- Connection State ---

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  private setConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.stateListeners.forEach((cb) => cb(state));
  }

  onConnectionStateChange(cb: (state: ConnectionState) => void): () => void {
    this.stateListeners.add(cb);
    return () => {
      this.stateListeners.delete(cb);
    };
  }

  // --- Connect / Disconnect ---

  async connect(options?: { playerId?: string; token?: string }): Promise<void> {
    if (this.socket?.connected) return;

    this.setConnectionState('connecting');

    try {
      // Obtain a valid JWT token (from cache or server)
      const token = options?.token ?? (await getOrCreateToken());
      const playerId = options?.playerId ?? (await getPlayerId()) ?? undefined;

      this.socket = io(SERVER_URL, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 10000,
        auth: {
          playerId,
          token,
        },
      });

      this.socket.on(SocketEvents.CONNECT, () => {
        this.setConnectionState('connected');
      });

      this.socket.on(SocketEvents.DISCONNECT, () => {
        this.setConnectionState('disconnected');
      });

      this.socket.on(SocketEvents.CONNECT_ERROR, () => {
        this.setConnectionState('error');
      });
    } catch (err) {
      console.error('[SocketService] Auth failed:', err);
      this.setConnectionState('error');
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.setConnectionState('disconnected');
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // --- Emit ---

  emit<T = any>(event: string, data?: T): void {
    if (!this.socket?.connected) {
      console.warn(`[SocketService] Cannot emit "${event}" — not connected`);
      return;
    }
    this.socket.emit(event, data);
  }

  emitWithAck<T = any, R = any>(event: string, data?: T): Promise<R> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error(`Cannot emit "${event}" — not connected`));
        return;
      }
      this.socket.emit(event, data, (response: R) => {
        resolve(response);
      });
    });
  }

  // --- Listen ---

  on(event: string, listener: Listener): void {
    this.socket?.on(event, listener);
  }

  off(event: string, listener?: Listener): void {
    if (listener) {
      this.socket?.off(event, listener);
    } else {
      this.socket?.off(event);
    }
  }

  once(event: string, listener: Listener): void {
    this.socket?.once(event, listener);
  }
}

// Export singleton
const socketService = SocketService.getInstance();
export default socketService;
