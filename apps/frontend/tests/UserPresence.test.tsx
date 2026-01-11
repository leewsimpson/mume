import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { UserPresence } from '../src/components/UserPresence';
import type { Awareness } from 'y-protocols/awareness';

describe('UserPresence', () => {
  let mockAwareness: Awareness;
  let mockGetStates: ReturnType<typeof vi.fn>;
  let mockOn: ReturnType<typeof vi.fn>;
  let mockOff: ReturnType<typeof vi.fn>;
  let changeHandler: ((event: any) => void) | null = null;

  beforeEach(() => {
    mockGetStates = vi.fn();
    mockOn = vi.fn((event: string, handler: (event: any) => void) => {
      if (event === 'change') {
        changeHandler = handler;
      }
    });
    mockOff = vi.fn();

    mockAwareness = {
      getStates: mockGetStates,
      on: mockOn,
      off: mockOff,
      clientID: 1,
    } as unknown as Awareness;

    // Reset change handler
    changeHandler = null;
  });

  describe('Component Rendering', () => {
    it('should render user list when awareness has users', () => {
      const users = new Map([
        [1, { name: 'Alice', color: '#ff0000' }],
        [2, { name: 'Bob', color: '#00ff00' }],
      ]);
      mockGetStates.mockReturnValue(users);

      render(<UserPresence awareness={mockAwareness} />);

      expect(screen.getByText('Alice (You)')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
    });

    it('should render nothing when no awareness provided', () => {
      const { container } = render(<UserPresence awareness={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render nothing when no users present', () => {
      mockGetStates.mockReturnValue(new Map());

      const { container } = render(<UserPresence awareness={mockAwareness} />);
      expect(container.firstChild).toBeNull();
    });

    it('should render nothing when users lack name or color', () => {
      const users = new Map([
        [1, { name: 'Alice' }], // Missing color
        [2, { color: '#00ff00' }], // Missing name
      ]);
      mockGetStates.mockReturnValue(users);

      const { container } = render(<UserPresence awareness={mockAwareness} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('User Display', () => {
    it('should display user names and colored badges', () => {
      const users = new Map([
        [1, { name: 'Alice', color: '#ff0000' }],
        [2, { name: 'Bob', color: '#00ff00' }],
      ]);
      mockGetStates.mockReturnValue(users);

      render(<UserPresence awareness={mockAwareness} />);

      // Check user names
      expect(screen.getByText('Alice (You)')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();

      // Check colored indicators exist
      const indicators = document.querySelectorAll('.user-color-indicator');
      expect(indicators).toHaveLength(2);
      expect(indicators[0]).toHaveStyle({ backgroundColor: '#ff0000' });
      expect(indicators[1]).toHaveStyle({ backgroundColor: '#00ff00' });
    });

    it('should highlight current user with special class', () => {
      const users = new Map([
        [1, { name: 'Alice', color: '#ff0000' }],
        [2, { name: 'Bob', color: '#00ff00' }],
      ]);
      mockGetStates.mockReturnValue(users);

      render(<UserPresence awareness={mockAwareness} />);

      const badges = document.querySelectorAll('.user-badge');
      expect(badges[0]).toHaveClass('current-user');
      expect(badges[1]).not.toHaveClass('current-user');
    });

    it('should display current user with "(You)" label', () => {
      const users = new Map([
        [1, { name: 'Alice', color: '#ff0000' }],
        [2, { name: 'Bob', color: '#00ff00' }],
      ]);
      mockGetStates.mockReturnValue(users);

      render(<UserPresence awareness={mockAwareness} />);

      expect(screen.getByText('Alice (You)')).toBeInTheDocument();
      expect(screen.queryByText('Bob (You)')).not.toBeInTheDocument();
    });

    it('should sort users with current user first', () => {
      const users = new Map([
        [1, { name: 'Charlie', color: '#ff0000' }], // Current user (clientID: 1)
        [2, { name: 'Alice', color: '#00ff00' }],
        [3, { name: 'Bob', color: '#0000ff' }],
      ]);
      mockGetStates.mockReturnValue(users);

      render(<UserPresence awareness={mockAwareness} />);

      const badges = document.querySelectorAll('.user-badge');
      expect(badges[0]).toHaveTextContent('Charlie (You)');
      expect(badges[1]).toHaveTextContent('Alice');
      expect(badges[2]).toHaveTextContent('Bob');
    });

    it('should sort other users alphabetically', () => {
      const users = new Map([
        [1, { name: 'Alice', color: '#ff0000' }], // Current user
        [2, { name: 'David', color: '#00ff00' }],
        [3, { name: 'Bob', color: '#0000ff' }],
        [4, { name: 'Charlie', color: '#ffff00' }],
      ]);
      mockGetStates.mockReturnValue(users);

      render(<UserPresence awareness={mockAwareness} />);

      const badges = document.querySelectorAll('.user-badge');
      expect(badges[0]).toHaveTextContent('Alice (You)');
      expect(badges[1]).toHaveTextContent('Bob');
      expect(badges[2]).toHaveTextContent('Charlie');
      expect(badges[3]).toHaveTextContent('David');
    });
  });

  describe('Maximum 10 Users Display', () => {
    it('should display all users when count is 10 or less', () => {
      const users = new Map(
        Array.from({ length: 10 }, (_, i) => [
          i + 1,
          { name: `User${i + 1}`, color: `#${i}${i}${i}${i}${i}${i}` },
        ])
      );
      mockGetStates.mockReturnValue(users);
      mockAwareness.clientID = 1;

      render(<UserPresence awareness={mockAwareness} />);

      const badges = document.querySelectorAll('.user-badge');
      expect(badges).toHaveLength(10);
      expect(screen.queryByText(/^\+\d+$/)).not.toBeInTheDocument();
    });

    it('should limit display to 10 users and show overflow indicator', () => {
      const users = new Map(
        Array.from({ length: 15 }, (_, i) => [
          i + 1,
          { name: `User${i + 1}`, color: `#${i}${i}${i}${i}${i}${i}` },
        ])
      );
      mockGetStates.mockReturnValue(users);
      mockAwareness.clientID = 1;

      render(<UserPresence awareness={mockAwareness} />);

      const badges = document.querySelectorAll('.user-badge');
      expect(badges).toHaveLength(10);
      expect(screen.getByText('+5')).toBeInTheDocument();
    });

    it('should show correct overflow count', () => {
      const users = new Map(
        Array.from({ length: 23 }, (_, i) => [
          i + 1,
          { name: `User${i + 1}`, color: `#${i}${i}${i}${i}${i}${i}` },
        ])
      );
      mockGetStates.mockReturnValue(users);
      mockAwareness.clientID = 1;

      render(<UserPresence awareness={mockAwareness} />);

      expect(screen.getByText('+13')).toBeInTheDocument();
    });

    it('should include overflow indicator title', () => {
      const users = new Map(
        Array.from({ length: 12 }, (_, i) => [
          i + 1,
          { name: `User${i + 1}`, color: `#${i}${i}${i}${i}${i}${i}` },
        ])
      );
      mockGetStates.mockReturnValue(users);
      mockAwareness.clientID = 1;

      render(<UserPresence awareness={mockAwareness} />);

      const overflowDiv = screen.getByText('+2').closest('.user-overflow');
      expect(overflowDiv).toHaveAttribute('title', '2 more users');
    });
  });

  describe('Real-time Updates', () => {
    it('should listen for awareness changes on mount', () => {
      mockGetStates.mockReturnValue(new Map());

      render(<UserPresence awareness={mockAwareness} />);

      expect(mockOn).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should update user list when users join', async () => {
      const initialUsers = new Map([
        [1, { name: 'Alice', color: '#ff0000' }],
      ]);
      mockGetStates.mockReturnValue(initialUsers);

      render(<UserPresence awareness={mockAwareness} />);

      expect(screen.getByText('Alice (You)')).toBeInTheDocument();
      expect(screen.queryByText('Bob')).not.toBeInTheDocument();

      // Simulate user joining
      const updatedUsers = new Map([
        [1, { name: 'Alice', color: '#ff0000' }],
        [2, { name: 'Bob', color: '#00ff00' }],
      ]);
      mockGetStates.mockReturnValue(updatedUsers);

      // Trigger change event
      await act(async () => {
        if (changeHandler) {
          changeHandler({});
        }
      });

      await waitFor(() => {
        expect(screen.getByText('Bob')).toBeInTheDocument();
      });
    });

    it('should update user list when users leave', async () => {
      const initialUsers = new Map([
        [1, { name: 'Alice', color: '#ff0000' }],
        [2, { name: 'Bob', color: '#00ff00' }],
      ]);
      mockGetStates.mockReturnValue(initialUsers);

      render(<UserPresence awareness={mockAwareness} />);

      expect(screen.getByText('Alice (You)')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();

      // Simulate user leaving
      const updatedUsers = new Map([
        [1, { name: 'Alice', color: '#ff0000' }],
      ]);
      mockGetStates.mockReturnValue(updatedUsers);

      // Trigger change event
      await act(async () => {
        if (changeHandler) {
          changeHandler({});
        }
      });

      await waitFor(() => {
        expect(screen.queryByText('Bob')).not.toBeInTheDocument();
      });
    });

    it('should handle multiple rapid user changes', async () => {
      mockGetStates.mockReturnValue(new Map([
        [1, { name: 'Alice', color: '#ff0000' }],
      ]));

      render(<UserPresence awareness={mockAwareness} />);

      // Simulate rapid changes
      await act(async () => {
        for (let i = 2; i <= 5; i++) {
          const users = new Map(
            Array.from({ length: i }, (_, j) => [
              j + 1,
              { name: `User${j + 1}`, color: `#${j}${j}${j}${j}${j}${j}` },
            ])
          );
          mockGetStates.mockReturnValue(users);
          if (changeHandler) {
            changeHandler({});
          }
        }
      });

      await waitFor(() => {
        expect(screen.getByText('User5')).toBeInTheDocument();
      });

      const badges = document.querySelectorAll('.user-badge');
      expect(badges).toHaveLength(5);
    });
  });

  describe('Cleanup', () => {
    it('should unsubscribe from awareness changes on unmount', () => {
      const users = new Map([
        [1, { name: 'Alice', color: '#ff0000' }],
      ]);
      mockGetStates.mockReturnValue(users);

      const { unmount } = render(<UserPresence awareness={mockAwareness} />);

      unmount();

      expect(mockOff).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should call off with same handler as on', () => {
      const users = new Map([
        [1, { name: 'Alice', color: '#ff0000' }],
      ]);
      mockGetStates.mockReturnValue(users);

      const { unmount } = render(<UserPresence awareness={mockAwareness} />);

      const onHandler = mockOn.mock.calls.find(
        (call) => call[0] === 'change'
      )?.[1];

      unmount();

      const offHandler = mockOff.mock.calls.find(
        (call) => call[0] === 'change'
      )?.[1];

      expect(onHandler).toBe(offHandler);
    });
  });

  describe('Edge Cases', () => {
    it('should handle awareness changing from null to valid', () => {
      const { rerender } = render(<UserPresence awareness={null} />);

      const users = new Map([
        [1, { name: 'Alice', color: '#ff0000' }],
      ]);
      mockGetStates.mockReturnValue(users);

      rerender(<UserPresence awareness={mockAwareness} />);

      expect(screen.getByText('Alice (You)')).toBeInTheDocument();
    });

    it('should handle user with very long name', () => {
      const longName = 'A'.repeat(100);
      const users = new Map([
        [1, { name: longName, color: '#ff0000' }],
      ]);
      mockGetStates.mockReturnValue(users);

      render(<UserPresence awareness={mockAwareness} />);

      expect(screen.getByText(`${longName} (You)`)).toBeInTheDocument();
    });

    it('should handle users with special characters in name', () => {
      const users = new Map([
        [1, { name: 'Alice <script>', color: '#ff0000' }],
        [2, { name: 'Bob & Co.', color: '#00ff00' }],
      ]);
      mockGetStates.mockReturnValue(users);

      render(<UserPresence awareness={mockAwareness} />);

      expect(screen.getByText('Alice <script> (You)')).toBeInTheDocument();
      expect(screen.getByText('Bob & Co.')).toBeInTheDocument();
    });

    it('should handle emoji in user names', () => {
      const users = new Map([
        [1, { name: 'Alice 👋', color: '#ff0000' }],
        [2, { name: '🎨 Bob', color: '#00ff00' }],
      ]);
      mockGetStates.mockReturnValue(users);

      render(<UserPresence awareness={mockAwareness} />);

      expect(screen.getByText('Alice 👋 (You)')).toBeInTheDocument();
      expect(screen.getByText('🎨 Bob')).toBeInTheDocument();
    });
  });

  describe('User Badge Tooltips', () => {
    it('should include title attribute for current user', () => {
      const users = new Map([
        [1, { name: 'Alice', color: '#ff0000' }],
      ]);
      mockGetStates.mockReturnValue(users);

      render(<UserPresence awareness={mockAwareness} />);

      const badge = screen.getByText('Alice (You)').closest('.user-badge');
      expect(badge).toHaveAttribute('title', 'Alice (You)');
    });

    it('should include title attribute for other users', () => {
      const users = new Map([
        [1, { name: 'Alice', color: '#ff0000' }],
        [2, { name: 'Bob', color: '#00ff00' }],
      ]);
      mockGetStates.mockReturnValue(users);

      render(<UserPresence awareness={mockAwareness} />);

      const bobBadge = screen.getByText('Bob').closest('.user-badge');
      expect(bobBadge).toHaveAttribute('title', 'Bob');
    });
  });
});
