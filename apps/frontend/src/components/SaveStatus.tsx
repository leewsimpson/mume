import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faCheck, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';

interface SaveStatusProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
}

export function SaveStatus({ status }: SaveStatusProps) {
  if (status === 'idle') return null;

  const config = {
    saving: { icon: faSpinner, spin: true, text: 'Saving...', color: 'var(--color-warning)' },
    saved: { icon: faCheck, spin: false, text: 'Saved', color: 'var(--color-success)' },
    error: { icon: faExclamationTriangle, spin: false, text: 'Error', color: 'var(--color-danger)' },
  }[status];

  return (
    <div
      data-testid="save-status"
      className="save-status"
      style={{ color: config.color }}
    >
      <FontAwesomeIcon icon={config.icon} spin={config.spin} />
      <span>{config.text}</span>
    </div>
  );
}
