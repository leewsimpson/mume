import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import type { Awareness } from 'y-protocols/awareness';
import { WS_URL } from '../config/api';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface YjsProviderResult {
  ydoc: Y.Doc | null;
  ytext: Y.Text | null;
  provider: WebsocketProvider | null;
  awareness: Awareness | null;
  status: ConnectionStatus;
  error: string | null;
  reconnectAttempts: number;
}

/**
 * Generate a random distinct color for user presence
 * @returns Hex color string (e.g., '#FF5733')
 */
function generateUserColor(): string {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#FFA07A', // Light Salmon
    '#98D8C8', // Mint
    '#F7DC6F', // Yellow
    '#BB8FCE', // Purple
    '#85C1E2', // Sky Blue
    '#F8B88B', // Peach
    '#B8E994', // Light Green
  ];
  return colors[Math.floor(Math.random() * colors.length)] || '#999999';
}

/**
 * Custom hook to initialize Yjs WebSocket provider with Awareness
 * @param documentId - The document room/ID to connect to
 * @param userName - The name of the current user for presence
 * @param wsUrl - WebSocket URL (defaults to WS_URL from config)
 * @param avatarUrl - Optional GitHub avatar URL for the current user
 * @param githubId - Optional GitHub ID for the current user
 * @returns Yjs document, text type, provider, awareness, and connection status
 */
export function useYjsProvider(
  documentId: string,
  userName: string,
  wsUrl = WS_URL,
  avatarUrl = '',
  githubId = ''
): YjsProviderResult {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  const ydocRef = useRef<Y.Doc | null>(null);
  const ytextRef = useRef<Y.Text | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const userColorRef = useRef<string>(generateUserColor());
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Initialize Yjs document
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // Get or create Y.Text type named 'content'
    const ytext = ydoc.getText('content');
    ytextRef.current = ytext;

    // Initialize WebSocket provider with custom reconnection settings
    // maxBackoffTime set to 30000ms (30s) to match requirements
    const provider = new WebsocketProvider(wsUrl, documentId, ydoc, {
      maxBackoffTime: 30000,
    });
    providerRef.current = provider;

    // Get awareness instance from provider
    const awareness = provider.awareness;
    awarenessRef.current = awareness;

    // Set up connection status listeners
    provider.on('status', (event: { status: string }) => {
      if (event.status === 'connected') {
        setStatus('connected');
        setError(null);
        setReconnectAttempts(0);
        // Set local user state only after connection is established
        // This prevents duplicate entries during reconnection/refresh
        awareness.setLocalState({
          name: userName,
          color: userColorRef.current,
          avatarUrl,
          githubId,
        });
      } else if (event.status === 'connecting') {
        setStatus('connecting');
        setError(null);
      } else {
        setStatus('disconnected');
        // Track reconnection attempts
        setReconnectAttempts((prev) => {
          const attempts = prev + 1;
          // Calculate exponential backoff: 1s, 2s, 4s, 8s, max 30s
          const backoffTime = Math.min(Math.pow(2, attempts - 1) * 1000, 30000);

          // Clear any existing timeout
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
          }

          // Schedule reconnection attempt
          reconnectTimeoutRef.current = setTimeout(() => {
            if (provider.shouldConnect && provider.ws?.readyState !== WebSocket.OPEN) {
              provider.disconnect();
              provider.connect();
            }
          }, backoffTime);

          return attempts;
        });
      }
    });

    // Handle connection errors
    provider.on('connection-error', (event: Event) => {
      const errorMessage = event instanceof ErrorEvent && event.error
        ? event.error.message
        : 'Unknown connection error';
      setError(`Connection error: ${errorMessage}`);
    });

    // Handle sync event (successful connection)
    provider.on('sync', (isSynced: boolean) => {
      if (isSynced) {
        setError(null);
        setReconnectAttempts(0);
      }
    });

    // Clean up on unmount
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      // Explicitly clear local awareness state before destroying provider
      // This broadcasts that the user is leaving and prevents duplicate entries on reconnect
      awareness.setLocalState(null);
      provider.destroy();
      ydoc.destroy();
      ydocRef.current = null;
      ytextRef.current = null;
      providerRef.current = null;
      awarenessRef.current = null;
    };
  }, [documentId, wsUrl, userName, avatarUrl, githubId]);

  return {
    ydoc: ydocRef.current,
    ytext: ytextRef.current,
    provider: providerRef.current,
    awareness: awarenessRef.current,
    status,
    error,
    reconnectAttempts,
  };
}
