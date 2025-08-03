import { useRef, useEffect, useCallback, useState } from 'react';
import io from 'socket.io-client';

export const useEventWebSocket = (eventData) => {
  const socketRef = useRef(null);
  const [connectionState, setConnectionState] = useState('disconnected'); // 'connecting', 'connected', 'disconnected', 'error'

  const initializeWebSocket = useCallback(() => {
    if (!eventData) return null;

    // Set connecting state
    setConnectionState('connecting');

    // Connecting to socket server with better timeout settings
    const socket = io('https://speechdev.onrender.com', {
      transports: ['websocket'],
      timeout: 10000, // 10 second timeout
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 2000
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionState('connected');
      socket.emit('join_room', { room: eventData.id });
    });

    socket.on('connect_error', (err) => {
      console.error('[WebSocket] Connection error:', err);
      setConnectionState('error');
    });

    socket.on('disconnect', (reason) => {
      setConnectionState('disconnected');
      if (reason === 'io server disconnect') {
        // Server disconnected us, try to reconnect
        socket.connect();
      }
    });

    socket.on('reconnect', (attemptNumber) => {
      setConnectionState('connected');
    });

    socket.on('reconnect_failed', () => {
      setConnectionState('error');
    });

    return socket;
  }, [eventData]);

  const cleanup = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setConnectionState('disconnected');
  }, []);

  // Initialize socket when eventData is available
  useEffect(() => {
    if (eventData) {
      initializeWebSocket();
    }

    return cleanup;
  }, [eventData, initializeWebSocket, cleanup]);

  const retryConnection = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    setConnectionState('connecting');
    initializeWebSocket();
  }, [initializeWebSocket]);

  return {
    socketRef,
    connectionState,
    isConnecting: connectionState === 'connecting',
    isConnected: connectionState === 'connected',
    isDisconnected: connectionState === 'disconnected',
    hasError: connectionState === 'error',
    retry: retryConnection,
    cleanup
  };
};
