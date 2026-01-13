interface ConnectionStatusProps {
  status: 'connected' | 'connecting' | 'disconnected';
  reconnectAttempts?: number;
}

export function ConnectionStatus({ status, reconnectAttempts = 0 }: ConnectionStatusProps) {
  // Only show when there's a connection problem
  if (status === 'connected') {
    return null;
  }

  const getMessage = () => {
    if (status === 'disconnected') {
      return 'Connection lost - changes may not be saved';
    }
    if (status === 'connecting' && reconnectAttempts > 0) {
      return `Reconnecting... (attempt ${reconnectAttempts})`;
    }
    return 'Connecting to server...';
  };

  return (
    <div 
      className={`connection-status connection-status--${status}`}
      data-testid="connection-status"
      role="alert"
    >
      <span className={`status-indicator status-${status}`}></span>
      <span className="connection-status__message">{getMessage()}</span>
    </div>
  );
}
