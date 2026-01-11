import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionStatus } from '../src/components/ConnectionStatus';

describe('ConnectionStatus', () => {
  describe('Component Rendering', () => {
    it('should render connection status container', () => {
      const { container } = render(<ConnectionStatus status="connected" />);
      const statusDiv = container.querySelector('.connection-status');
      expect(statusDiv).toBeInTheDocument();
    });

    it('should render status indicator element', () => {
      const { container } = render(<ConnectionStatus status="connected" />);
      const indicator = container.querySelector('.status-indicator');
      expect(indicator).toBeInTheDocument();
    });

    it('should render status text element', () => {
      const { container } = render(<ConnectionStatus status="connected" />);
      const statusText = container.querySelector('.status-text');
      expect(statusText).toBeInTheDocument();
    });
  });

  describe('Connected State', () => {
    it('should display "Connected" text when status is connected', () => {
      render(<ConnectionStatus status="connected" />);
      expect(screen.getByText('Connected')).toBeInTheDocument();
    });

    it('should apply status-connected class to indicator when status is connected', () => {
      const { container } = render(<ConnectionStatus status="connected" />);
      const indicator = container.querySelector('.status-indicator');
      expect(indicator).toHaveClass('status-connected');
    });

    it('should show green indicator for connected state (via CSS class)', () => {
      const { container } = render(<ConnectionStatus status="connected" />);
      const indicator = container.querySelector('.status-indicator');
      expect(indicator).toHaveClass('status-indicator');
      expect(indicator).toHaveClass('status-connected');
    });
  });

  describe('Disconnected State', () => {
    it('should display "Disconnected" text when status is disconnected', () => {
      render(<ConnectionStatus status="disconnected" />);
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
    });

    it('should apply status-disconnected class to indicator when status is disconnected', () => {
      const { container } = render(<ConnectionStatus status="disconnected" />);
      const indicator = container.querySelector('.status-indicator');
      expect(indicator).toHaveClass('status-disconnected');
    });

    it('should show red indicator for disconnected state (via CSS class)', () => {
      const { container } = render(<ConnectionStatus status="disconnected" />);
      const indicator = container.querySelector('.status-indicator');
      expect(indicator).toHaveClass('status-indicator');
      expect(indicator).toHaveClass('status-disconnected');
    });
  });

  describe('Connecting State', () => {
    it('should display "Connecting..." text when status is connecting', () => {
      render(<ConnectionStatus status="connecting" />);
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    it('should apply status-connecting class to indicator when status is connecting', () => {
      const { container } = render(<ConnectionStatus status="connecting" />);
      const indicator = container.querySelector('.status-indicator');
      expect(indicator).toHaveClass('status-connecting');
    });

    it('should show yellow/warning indicator for connecting state (via CSS class)', () => {
      const { container } = render(<ConnectionStatus status="connecting" />);
      const indicator = container.querySelector('.status-indicator');
      expect(indicator).toHaveClass('status-indicator');
      expect(indicator).toHaveClass('status-connecting');
    });
  });

  describe('Real-time Updates', () => {
    it('should update display when status changes from connected to disconnected', () => {
      const { rerender } = render(<ConnectionStatus status="connected" />);
      expect(screen.getByText('Connected')).toBeInTheDocument();

      rerender(<ConnectionStatus status="disconnected" />);
      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      expect(screen.queryByText('Connected')).not.toBeInTheDocument();
    });

    it('should update display when status changes from disconnected to connecting', () => {
      const { rerender } = render(<ConnectionStatus status="disconnected" />);
      expect(screen.getByText('Disconnected')).toBeInTheDocument();

      rerender(<ConnectionStatus status="connecting" />);
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
      expect(screen.queryByText('Disconnected')).not.toBeInTheDocument();
    });

    it('should update display when status changes from connecting to connected', () => {
      const { rerender } = render(<ConnectionStatus status="connecting" />);
      expect(screen.getByText('Connecting...')).toBeInTheDocument();

      rerender(<ConnectionStatus status="connected" />);
      expect(screen.getByText('Connected')).toBeInTheDocument();
      expect(screen.queryByText('Connecting...')).not.toBeInTheDocument();
    });

    it('should update indicator class when status changes', () => {
      const { container, rerender } = render(<ConnectionStatus status="connected" />);
      const indicator = container.querySelector('.status-indicator');
      expect(indicator).toHaveClass('status-connected');

      rerender(<ConnectionStatus status="disconnected" />);
      expect(indicator).toHaveClass('status-disconnected');
      expect(indicator).not.toHaveClass('status-connected');
    });
  });

  describe('UI Visibility', () => {
    it('should be visible in UI (not hidden)', () => {
      const { container } = render(<ConnectionStatus status="connected" />);
      const statusDiv = container.querySelector('.connection-status');
      expect(statusDiv).toBeVisible();
    });

    it('should display both indicator and text together', () => {
      const { container } = render(<ConnectionStatus status="connected" />);
      const indicator = container.querySelector('.status-indicator');
      const statusText = container.querySelector('.status-text');
      expect(indicator).toBeInTheDocument();
      expect(statusText).toBeInTheDocument();
    });
  });

  describe('CSS Class Application', () => {
    it('should apply correct base class to container', () => {
      const { container } = render(<ConnectionStatus status="connected" />);
      const statusDiv = container.querySelector('.connection-status');
      expect(statusDiv).toHaveClass('connection-status');
    });

    it('should apply correct base class to indicator', () => {
      const { container } = render(<ConnectionStatus status="connected" />);
      const indicator = container.querySelector('.status-indicator');
      expect(indicator).toHaveClass('status-indicator');
    });

    it('should apply correct base class to text', () => {
      const { container } = render(<ConnectionStatus status="connected" />);
      const statusText = container.querySelector('.status-text');
      expect(statusText).toHaveClass('status-text');
    });

    it('should apply dynamic status class to indicator based on status prop', () => {
      const { container, rerender } = render(<ConnectionStatus status="connected" />);
      const indicator = container.querySelector('.status-indicator');

      expect(indicator?.className).toContain('status-connected');

      rerender(<ConnectionStatus status="connecting" />);
      expect(indicator?.className).toContain('status-connecting');

      rerender(<ConnectionStatus status="disconnected" />);
      expect(indicator?.className).toContain('status-disconnected');
    });
  });
});
