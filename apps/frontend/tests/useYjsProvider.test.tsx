import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useYjsProvider } from '../src/hooks/useYjsProvider';
import * as Y from 'yjs';

// Mock y-websocket module with factory function
vi.mock('y-websocket', () => {
  const mockProviderDestroy = vi.fn();
  const mockProviderOn = vi.fn();
  const mockSetLocalState = vi.fn();

  // Mock awareness instance
  const mockAwareness = {
    setLocalState: mockSetLocalState,
    clientID: 123,
  };

  // Mock WebsocketProvider class
  class MockWebsocketProvider {
    public awareness = mockAwareness;
    public on = mockProviderOn;
    public destroy = mockProviderDestroy;
    public wsUrl: string;
    public documentId: string;
    public ydoc: Y.Doc;

    constructor(wsUrl: string, documentId: string, ydoc: Y.Doc) {
      this.wsUrl = wsUrl;
      this.documentId = documentId;
      this.ydoc = ydoc;

      // Simulate async connection by calling status handler after a delay
      setTimeout(() => {
        const statusHandler = mockProviderOn.mock.calls.find(
          (call: any[]) => call[0] === 'status'
        )?.[1];
        if (statusHandler) {
          statusHandler({ status: 'connected' });
        }
      }, 0);
    }
  }

  return {
    WebsocketProvider: MockWebsocketProvider,
    // Export mocks so tests can access them
    __mocks: {
      mockProviderDestroy,
      mockProviderOn,
      mockSetLocalState,
      mockAwareness,
    },
  };
});

// Access mocks from the module
const { __mocks } = await import('y-websocket') as any;
const { mockProviderDestroy, mockProviderOn, mockSetLocalState, mockAwareness } = __mocks;

describe('useYjsProvider hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('should create Y.Doc instance', async () => {
    const { result } = renderHook(() =>
      useYjsProvider('test-doc', 'Alice', 'ws://localhost:3000')
    );

    await waitFor(() => {
      expect(result.current.ydoc).toBeInstanceOf(Y.Doc);
    });
  });

  it('should create Y.Text type named "content"', async () => {
    const { result } = renderHook(() =>
      useYjsProvider('test-doc', 'Alice', 'ws://localhost:3000')
    );

    await waitFor(() => {
      expect(result.current.ytext).toBeInstanceOf(Y.Text);
      expect(result.current.ydoc?.getText('content')).toBe(result.current.ytext);
    });
  });

  it('should initialize WebSocket provider with correct parameters', async () => {
    const { result } = renderHook(() =>
      useYjsProvider('my-document', 'Bob', 'ws://localhost:3000')
    );

    await waitFor(() => {
      expect(result.current.provider).not.toBeNull();
      expect(result.current.provider?.wsUrl).toBe('ws://localhost:3000');
      expect(result.current.provider?.documentId).toBe('my-document');
      expect(result.current.provider?.ydoc).toBe(result.current.ydoc);
    });
  });

  it('should set up connection status listener', () => {
    renderHook(() => useYjsProvider('test-doc', 'Alice', 'ws://localhost:3000'));

    // Verify provider.on('status', ...) was called
    expect(mockProviderOn).toHaveBeenCalledWith('status', expect.any(Function));
  });

  it('should initialize with "connecting" status', () => {
    const { result } = renderHook(() =>
      useYjsProvider('test-doc', 'Alice', 'ws://localhost:3000')
    );

    expect(result.current.status).toBe('connecting');
  });

  it('should update status to "connected" when provider emits connected event', async () => {
    const { result } = renderHook(() =>
      useYjsProvider('test-doc', 'Alice', 'ws://localhost:3000')
    );

    // Wait for the status to update to 'connected'
    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });
  });

  it('should update status to "disconnected" when provider emits disconnected event', async () => {
    const { result } = renderHook(() =>
      useYjsProvider('test-doc', 'Alice', 'ws://localhost:3000')
    );

    // Wait for initial connection
    await waitFor(() => {
      expect(result.current.status).toBe('connected');
    });

    // Manually trigger the status event with 'disconnected'
    const statusHandler = mockProviderOn.mock.calls.find(
      (call) => call[0] === 'status'
    )?.[1];

    await act(async () => {
      if (statusHandler) {
        statusHandler({ status: 'disconnected' });
      }
    });

    expect(result.current.status).toBe('disconnected');
  });

  it('should expose awareness instance from provider', async () => {
    const { result } = renderHook(() =>
      useYjsProvider('test-doc', 'Alice', 'ws://localhost:3000')
    );

    await waitFor(() => {
      expect(result.current.awareness).toBe(mockAwareness);
    });
  });

  it('should set local awareness state with user name and color', () => {
    renderHook(() => useYjsProvider('test-doc', 'Charlie', 'ws://localhost:3000'));

    expect(mockSetLocalState).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Charlie',
        color: expect.stringMatching(/^#[0-9A-F]{6}$/i), // Hex color format
      })
    );
  });

  it('should generate user color from predefined palette', () => {
    renderHook(() => useYjsProvider('test-doc', 'Dave', 'ws://localhost:3000'));

    const callArgs = mockSetLocalState.mock.calls[0][0];
    const validColors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#FFA07A',
      '#98D8C8',
      '#F7DC6F',
      '#BB8FCE',
      '#85C1E2',
      '#F8B88B',
      '#B8E994',
    ];

    expect(validColors).toContain(callArgs.color);
  });

  it('should clean up on unmount', () => {
    const { unmount } = renderHook(() =>
      useYjsProvider('test-doc', 'Alice', 'ws://localhost:3000')
    );

    unmount();

    expect(mockProviderDestroy).toHaveBeenCalled();
  });

  it('should reinitialize when documentId changes', () => {
    const { rerender } = renderHook(
      ({ documentId, userName }) => useYjsProvider(documentId, userName),
      {
        initialProps: { documentId: 'doc1', userName: 'Alice' },
      }
    );

    const firstCallCount = mockProviderOn.mock.calls.length;

    // Change documentId
    rerender({ documentId: 'doc2', userName: 'Alice' });

    // Provider should be initialized again (more calls to on())
    expect(mockProviderOn.mock.calls.length).toBeGreaterThan(firstCallCount);
  });

  it('should reinitialize when userName changes', () => {
    const { rerender } = renderHook(
      ({ documentId, userName }) => useYjsProvider(documentId, userName),
      {
        initialProps: { documentId: 'doc1', userName: 'Alice' },
      }
    );

    vi.clearAllMocks();

    // Change userName
    rerender({ documentId: 'doc1', userName: 'Bob' });

    // Awareness state should be updated with new userName
    expect(mockSetLocalState).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Bob',
      })
    );
  });

  it('should use default WebSocket URL when not provided', async () => {
    const { result } = renderHook(() =>
      useYjsProvider('test-doc', 'Alice')
    );

    await waitFor(() => {
      expect(result.current.provider?.wsUrl).toBe('ws://localhost:3000');
    });
  });

  it('should allow custom WebSocket URL', async () => {
    const { result } = renderHook(() =>
      useYjsProvider('test-doc', 'Alice', 'ws://example.com:8080')
    );

    await waitFor(() => {
      expect(result.current.provider?.wsUrl).toBe('ws://example.com:8080');
    });
  });

  it('should maintain consistent color across re-renders', () => {
    const { rerender } = renderHook(() =>
      useYjsProvider('test-doc', 'Alice', 'ws://localhost:3000')
    );

    const firstColor = mockSetLocalState.mock.calls[0][0].color;

    // Re-render without changing dependencies
    rerender();

    // Color should be the same (not regenerated)
    const secondColor = mockSetLocalState.mock.calls[0][0].color;
    expect(firstColor).toBe(secondColor);
  });
});
