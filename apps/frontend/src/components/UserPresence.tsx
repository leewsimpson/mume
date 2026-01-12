import { useEffect, useState } from 'react';
import type { Awareness } from 'y-protocols/awareness';

interface User {
  clientId: number;
  name: string;
  color: string;
  isCurrentUser: boolean;
  avatarUrl?: string;
  githubId?: string;
}

interface UserPresenceProps {
  awareness: Awareness | null;
}

/**
 * UserPresence component displays a list of active users with colored badges
 * Shows up to 10 users with overflow indicator
 */
export function UserPresence({ awareness }: UserPresenceProps) {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (!awareness) return;

    const updateUsers = () => {
      const states = awareness.getStates();
      const localClientId = awareness.clientID;
      const userList: User[] = [];

      states.forEach((state, clientId) => {
        if (state.name && state.color) {
          userList.push({
            clientId,
            name: state.name,
            color: state.color,
            isCurrentUser: clientId === localClientId,
            avatarUrl: state.avatarUrl,
            githubId: state.githubId,
          });
        }
      });

      // Sort: current user first, then alphabetically by name
      userList.sort((a, b) => {
        if (a.isCurrentUser) return -1;
        if (b.isCurrentUser) return 1;
        return a.name.localeCompare(b.name);
      });

      setUsers(userList);
    };

    // Initial update
    updateUsers();

    // Listen for awareness changes (users joining/leaving)
    awareness.on('change', updateUsers);

    return () => {
      awareness.off('change', updateUsers);
    };
  }, [awareness]);

  if (users.length === 0) {
    return null;
  }

  const displayedUsers = users.slice(0, 10);
  const overflowCount = users.length - displayedUsers.length;

  return (
    <div className="user-presence">
      <div className="user-list">
        {displayedUsers.map((user) => (
          <div
            key={user.clientId}
            className={`user-badge ${user.isCurrentUser ? 'current-user' : ''}`}
            title={user.isCurrentUser ? `${user.name} (You)` : user.name}
          >
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="user-avatar"
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: `3px solid ${user.color}`,
                }}
                onError={(e) => {
                  // Fallback to colored badge with initials
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) {
                    fallback.style.display = 'flex';
                  }
                }}
              />
            ) : null}
            <span
              className="user-color-indicator"
              style={{
                backgroundColor: user.color,
                display: user.avatarUrl ? 'none' : 'inline-block',
              }}
            ></span>
            <span className="user-name">
              {user.name}
              {user.isCurrentUser && ' (You)'}
            </span>
          </div>
        ))}
        {overflowCount > 0 && (
          <div className="user-overflow" title={`${overflowCount} more users`}>
            +{overflowCount}
          </div>
        )}
      </div>
    </div>
  );
}
