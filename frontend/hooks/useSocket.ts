'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, '') || 'https://kyobodashboard-production.up.railway.app';

interface UseSocketOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onEvent?: (event: { type: string; data: unknown; timestamp: string }) => void;
  autoConnect?: boolean; // Default: false
}

export function useSocket(options: UseSocketOptions = {}) {
  const { autoConnect = false, ...callbacks } = options;
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    try {
      socketRef.current = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 2000,
        timeout: 10000,
      });

      socketRef.current.on('connect', () => {
        setIsConnected(true);
        callbacks.onConnect?.();
      });

      socketRef.current.on('disconnect', () => {
        setIsConnected(false);
        callbacks.onDisconnect?.();
      });

      socketRef.current.on('event', (event) => {
        callbacks.onEvent?.(event);
      });

      socketRef.current.on('connect_error', () => {
        // Connection error handled silently
      });
    } catch {
      // Socket initialization error handled silently
    }
  }, [callbacks]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const subscribe = useCallback((room: string) => {
    socketRef.current?.emit('subscribe', room);
  }, []);

  const unsubscribe = useCallback((room: string) => {
    socketRef.current?.emit('unsubscribe', room);
  }, []);

  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => disconnect();
  }, [autoConnect, connect, disconnect]);

  return {
    isConnected,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    socket: socketRef.current,
  };
}
