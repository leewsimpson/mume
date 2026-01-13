interface ConnectionStatusProps {
  status: 'connected' | 'connecting' | 'disconnected';
}

export function ConnectionStatus({ status }: ConnectionStatusProps) {
  const title = status === 'connected' 
    ? 'Connected' 
    : status === 'connecting' 
    ? 'Connecting...' 
    : 'Disconnected';

  return (
    <div 
      className="connection-status" 
      data-testid="connection-status"
      title={title}
    >
      <span className={`status-indicator status-${status}`}></span>
    </div>
  );
}
