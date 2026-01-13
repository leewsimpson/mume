import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faFloppyDisk } from '@fortawesome/free-solid-svg-icons';

interface SaveNowButtonProps {
  onSave: () => void;
  isSaving: boolean;
  disabled: boolean;
}

export function SaveNowButton({ onSave, isSaving, disabled }: SaveNowButtonProps) {
  return (
    <button
      onClick={onSave}
      disabled={disabled || isSaving}
      title={isSaving ? 'Saving...' : disabled ? 'No unsaved changes' : 'Save now (Ctrl+S / Cmd+S)'}
      className="btn btn--icon btn--ghost"
      style={{
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
      }}
    >
      <FontAwesomeIcon icon={isSaving ? faSpinner : faFloppyDisk} spin={isSaving} />
    </button>
  );
}
