'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface UseSocketOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onEvent?: (event: { type: string; data: unknown; timestamp: string }) => void;
}

export function useSocket(options: UseSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      options.onConnect?.();
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
      options.onDisconnect?.();
    });

    socketRef.current.on('event', (event) => {
      options.onEvent?.(event);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });
  }, [options]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const subscribe = useCallback((room: string) => {
    socketRef.current?.emit('subscribe', room);
  }, []);

  const unsubscribe = useCallback((room: string) => {
    socketRef.current?.emit('unsubscribe', room);
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    isConnected,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    socket: socketRef.current,
  };
}
