import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionStatus } from '../src/components/ConnectionStatus';

describe('ConnectionStatus', () => {
  describe('Connected State - Hidden', () => {
    it('should not render anything when status is connected', () => {
      const { container } = render(<ConnectionStatus status="connected" />);
      const statusDiv = container.querySelector('.connection-status');
      expect(statusDiv).not.toBeInTheDocument();
    });

    it('should return null when connected (no DOM elements)', () => {
      const { container } = render(<ConnectionStatus status="connected" />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Disconnected State', () => {
    it('should render connection status container when disconnected', () => {
      const { container } = render(<ConnectionStatus status="disconnected" />);
      const statusDiv = container.querySelector('.connection-status');
      expect(statusDiv).toBeInTheDocument();
    });

    it('should display clear warning message when disconnected', () => {
      render(<ConnectionStatus status="disconnected" />);
      expect(screen.getByText('Connection lost - changes may not be saved')).toBeInTheDocument();
    });

    it('should apply status-disconnected class to indicator when status is disconnected', () => {
      const { container } = render(<ConnectionStatus status="disconnected" />);
      const indicator = container.querySelector('.status-indicator');
      expect(indicator).toHaveClass('status-disconnected');
    });

    it('should apply connection-status--disconnected modifier class', () => {
      const { container } = render(<ConnectionStatus status="disconnected" />);
      const statusDiv = container.querySelector('.connection-status');
      expect(statusDiv).toHaveClass('connection-status--disconnected');
    });

    it('should have role="alert" for accessibility', () => {
      render(<ConnectionStatus status="disconnected" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('Connecting State', () => {
    it('should render connection status container when connecting', () => {
      const { container } = render(<ConnectionStatus status="connecting" />);
      const statusDiv = container.querySelector('.connection-status');
      expect(statusDiv).toBeInTheDocument();
    });

    it('should display "Connecting to server..." when connecting without reconnect attempts', () => {
      render(<ConnectionStatus status="connecting" />);
      expect(screen.getByText('Connecting to server...')).toBeInTheDocument();
    });

    it('should display reconnect attempt count when reconnecting', () => {
      render(<ConnectionStatus status="connecting" reconnectAttempts={3} />);
      expect(screen.getByText('Reconnecting... (attempt 3)')).toBeInTheDocument();
    });

    it('should apply status-connecting class to indicator when status is connecting', () => {
      const { container } = render(<ConnectionStatus status="connecting" />);
      const indicator = container.querySelector('.status-indicator');
      expect(indicator).toHaveClass('status-connecting');
    });

    it('should apply connection-status--connecting modifier class', () => {
      const { container } = render(<ConnectionStatus status="connecting" />);
      const statusDiv = container.querySelector('.connection-status');
      expect(statusDiv).toHaveClass('connection-status--connecting');
    });
  });

  describe('Real-time Updates', () => {
    it('should show component when status changes from connected to disconnected', () => {
      const { container, rerender } = render(<ConnectionStatus status="connected" />);
      expect(container.querySelector('.connection-status')).not.toBeInTheDocument();

      rerender(<ConnectionStatus status="disconnected" />);
      expect(container.querySelector('.connection-status')).toBeInTheDocument();
      expect(screen.getByText('Connection lost - changes may not be saved')).toBeInTheDocument();
    });

    it('should hide component when status changes from disconnected to connected', () => {
      const { container, rerender } = render(<ConnectionStatus status="disconnected" />);
      expect(container.querySelector('.connection-status')).toBeInTheDocument();

      rerender(<ConnectionStatus status="connected" />);
      expect(container.querySelector('.connection-status')).not.toBeInTheDocument();
    });

    it('should update message when status changes from disconnected to connecting', () => {
      const { rerender } = render(<ConnectionStatus status="disconnected" />);
      expect(screen.getByText('Connection lost - changes may not be saved')).toBeInTheDocument();

      rerender(<ConnectionStatus status="connecting" reconnectAttempts={1} />);
      expect(screen.getByText('Reconnecting... (attempt 1)')).toBeInTheDocument();
    });

    it('should hide component when status changes from connecting to connected', () => {
      const { container, rerender } = render(<ConnectionStatus status="connecting" />);
      expect(container.querySelector('.connection-status')).toBeInTheDocument();

      rerender(<ConnectionStatus status="connected" />);
      expect(container.querySelector('.connection-status')).not.toBeInTheDocument();
    });

    it('should update indicator class when status changes', () => {
      const { container, rerender } = render(<ConnectionStatus status="connecting" />);
      let indicator = container.querySelector('.status-indicator');
      expect(indicator).toHaveClass('status-connecting');

      rerender(<ConnectionStatus status="disconnected" />);
      indicator = container.querySelector('.status-indicator');
      expect(indicator).toHaveClass('status-disconnected');
      expect(indicator).not.toHaveClass('status-connecting');
    });
  });

  describe('UI Visibility', () => {
    it('should be visible when disconnected', () => {
      const { container } = render(<ConnectionStatus status="disconnected" />);
      const statusDiv = container.querySelector('.connection-status');
      expect(statusDiv).toBeVisible();
    });

    it('should be visible when connecting', () => {
      const { container } = render(<ConnectionStatus status="connecting" />);
      const statusDiv = container.querySelector('.connection-status');
      expect(statusDiv).toBeVisible();
    });

    it('should display both indicator and message together', () => {
      const { container } = render(<ConnectionStatus status="disconnected" />);
      const indicator = container.querySelector('.status-indicator');
      const message = container.querySelector('.connection-status__message');
      expect(indicator).toBeInTheDocument();
      expect(message).toBeInTheDocument();
    });
  });

  describe('CSS Class Application', () => {
    it('should apply correct base class to container when disconnected', () => {
      const { container } = render(<ConnectionStatus status="disconnected" />);
      const statusDiv = container.querySelector('.connection-status');
      expect(statusDiv).toHaveClass('connection-status');
    });

    it('should apply correct base class to indicator when disconnected', () => {
      const { container } = render(<ConnectionStatus status="disconnected" />);
      const indicator = container.querySelector('.status-indicator');
      expect(indicator).toHaveClass('status-indicator');
    });

    it('should apply correct class to message element', () => {
      const { container } = render(<ConnectionStatus status="disconnected" />);
      const message = container.querySelector('.connection-status__message');
      expect(message).toHaveClass('connection-status__message');
    });

    it('should apply dynamic status class to indicator based on status prop', () => {
      const { container, rerender } = render(<ConnectionStatus status="connecting" />);
      let indicator = container.querySelector('.status-indicator');
      expect(indicator?.className).toContain('status-connecting');

      rerender(<ConnectionStatus status="disconnected" />);
      indicator = container.querySelector('.status-indicator');
      expect(indicator?.className).toContain('status-disconnected');
    });
  });

  describe('Reconnect Attempts', () => {
    it('should show reconnect attempt count in message', () => {
      render(<ConnectionStatus status="connecting" reconnectAttempts={5} />);
      expect(screen.getByText('Reconnecting... (attempt 5)')).toBeInTheDocument();
    });

    it('should show initial connecting message when reconnectAttempts is 0', () => {
      render(<ConnectionStatus status="connecting" reconnectAttempts={0} />);
      expect(screen.getByText('Connecting to server...')).toBeInTheDocument();
    });

    it('should default reconnectAttempts to 0', () => {
      render(<ConnectionStatus status="connecting" />);
      expect(screen.getByText('Connecting to server...')).toBeInTheDocument();
    });
  });
});
