interface ConnectionStatusProps {
  status: 'connected' | 'connecting' | 'disconnected';
}

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  return (
    <div className="connection-status">
      <span className={`status-indicator status-${status}`}></span>
      <span className="status-text">
        {status === 'connected' && 'Connected'}
        {status === 'connecting' && 'Connecting...'}
        {status === 'disconnected' && 'Disconnected'}
      </span>
    </div>
  );
}
