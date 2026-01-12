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
      title={disabled ? 'No unsaved changes' : 'Save now (Ctrl+S / Cmd+S)'}
      style={{
        padding: '0.5rem 1rem',
        fontSize: '0.875rem',
        fontWeight: 600,
        color: disabled ? '#8b949e' : '#ffffff',
        backgroundColor: disabled ? '#21262d' : '#238636',
        border: 'none',
        borderRadius: '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        opacity: disabled ? 0.6 : 1,
        transition: 'background-color 0.2s, opacity 0.2s',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isSaving) {
          e.currentTarget.style.backgroundColor = '#2ea043';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isSaving) {
          e.currentTarget.style.backgroundColor = '#238636';
        }
      }}
    >
      {isSaving ? (
        <>
          <span>⏳</span>
          <span>Saving...</span>
        </>
      ) : (
        <>
          <span>💾</span>
          <span>Save Now</span>
        </>
      )}
    </button>
  );
}
