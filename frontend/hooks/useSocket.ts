// frontend/hooks/useSocket.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket, ManagerOptions, SocketOptions } from 'socket.io-client';

function resolveSocketUrl(): string {
  // Use environment variable if set (from .env file)
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    console.log('[Socket] Using NEXT_PUBLIC_SOCKET_URL:', process.env.NEXT_PUBLIC_SOCKET_URL);
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  
  // Fallback for development - use localhost for direct browser connections
  if (typeof window !== 'undefined') {
    console.log('[Socket] Using window.location.origin:', window.location.origin);
    return window.location.origin;
  }
  
  // Server-side fallback (should not be used for actual connections)
  console.log('[Socket] Using default localhost:5002');
  return 'http://localhost:5002';
}

const SOCKET_PATH = '/socket.io';

export const useSocket = (token?: string) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const cleanupSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const connectSocket = useCallback(() => {
    if (!token) {
      console.log('[Socket] No token, skipping connection');
      return;
    }

    cleanupSocket();
    setIsConnecting(true);
    setLastError(null);
    reconnectAttemptsRef.current = 0;

    const socketUrl = resolveSocketUrl();
    console.log(`[Socket] Connecting to ${socketUrl}${SOCKET_PATH}`);
    console.log(`[Socket] Token length: ${token.length}`);

    const socketOptions: Partial<ManagerOptions & SocketOptions> = {
      auth: { token },
      transports: ['websocket', 'polling'],
      path: SOCKET_PATH,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    };

    const socket = io(socketUrl, socketOptions);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected successfully:', socket.id);
      setIsConnected(true);
      setIsConnecting(false);
      setLastError(null);
      reconnectAttemptsRef.current = 0;
    });

    socket.on('connect_error', (err) => {
      const msg = err?.message || 'Connection failed';
      console.error('[Socket] Connection error:', msg);
      console.error('[Socket] Error details:', err);
      setLastError(msg);
      setIsConnected(false);
      setIsConnecting(false);
      
      // Attempt to reconnect manually after a delay
      if (reconnectAttemptsRef.current < 3) {
        reconnectAttemptsRef.current++;
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log(`[Socket] Reconnection attempt ${reconnectAttemptsRef.current}`);
          if (socketRef.current && !socketRef.current.connected) {
            socketRef.current.connect();
          }
        }, 2000);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, attempt reconnect
        if (reconnectAttemptsRef.current < 3) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`[Socket] Reconnecting after server disconnect: attempt ${reconnectAttemptsRef.current}`);
            socket.connect();
          }, 1000);
        }
      }
    });

    socket.on('error', (err) => {
      console.error('[Socket] Socket error:', err);
      setLastError(typeof err === 'string' ? err : 'Socket error');
    });

  }, [token, cleanupSocket]);

  useEffect(() => {
    connectSocket();
    return () => cleanupSocket();
  }, [connectSocket, cleanupSocket]);

  const emit = useCallback((event: string, data: unknown) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
      return true;
    }
    console.warn(`[Socket] Not connected, cannot emit ${event}`);
    return false;
  }, [isConnected]);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
      return () => {
        if (socketRef.current) {
          socketRef.current.off(event, callback);
        }
      };
    }
    return () => {};
  }, []);

  const reconnect = useCallback(() => {
    console.log('[Socket] Manual reconnect requested');
    connectSocket();
  }, [connectSocket]);

  return { isConnected, isConnecting, lastError, emit, on, reconnect };
};