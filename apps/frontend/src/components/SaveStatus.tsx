interface SaveStatusProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  message?: string;
}

export function SaveStatus({ status, message }: SaveStatusProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'saving':
        return '⏳';
      case 'saved':
        return '✓';
      case 'error':
        return '⚠️';
      default:
        return '💾';
    }
  };

  const getStatusText = () => {
    if (message) return message;

    switch (status) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'All changes saved';
      case 'error':
        return 'Error saving';
      default:
        return 'Auto-save enabled';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'saving':
        return '#f0883e'; // Orange
      case 'saved':
        return '#3fb950'; // Green
      case 'error':
        return '#f85149'; // Red
      default:
        return '#8b949e'; // Gray
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.25rem 0.75rem',
        fontSize: '0.875rem',
        color: getStatusColor(),
        borderRadius: '6px',
        backgroundColor: 'rgba(139, 148, 158, 0.1)',
      }}
    >
      <span>{getStatusIcon()}</span>
      <span>{getStatusText()}</span>
    </div>
  );
}
