import { useEffect, useState, useRef } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface YjsProviderResult {
  ydoc: Y.Doc | null;
  ytext: Y.Text | null;
  provider: WebsocketProvider | null;
  status: ConnectionStatus;
}

/**
 * Custom hook to initialize Yjs WebSocket provider
 * @param documentId - The document room/ID to connect to
 * @param wsUrl - WebSocket URL (defaults to ws://localhost:3000)
 * @returns Yjs document, text type, provider, and connection status
 */
export function useYjsProvider(documentId: string, wsUrl = 'ws://localhost:3000'): YjsProviderResult {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const ydocRef = useRef<Y.Doc | null>(null);
  const ytextRef = useRef<Y.Text | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);

  useEffect(() => {
    // Initialize Yjs document
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // Get or create Y.Text type named 'content'
    const ytext = ydoc.getText('content');
    ytextRef.current = ytext;

    // Initialize WebSocket provider
    const provider = new WebsocketProvider(wsUrl, documentId, ydoc);
    providerRef.current = provider;

    // Set up connection status listeners
    provider.on('status', (event: { status: string }) => {
      if (event.status === 'connected') {
        setStatus('connected');
      } else if (event.status === 'connecting') {
        setStatus('connecting');
      } else {
        setStatus('disconnected');
      }
    });

    // Clean up on unmount
    return () => {
      provider.destroy();
      ydoc.destroy();
      ydocRef.current = null;
      ytextRef.current = null;
      providerRef.current = null;
    };
  }, [documentId, wsUrl]);

  return {
    ydoc: ydocRef.current,
    ytext: ytextRef.current,
    provider: providerRef.current,
    status,
  };
}
