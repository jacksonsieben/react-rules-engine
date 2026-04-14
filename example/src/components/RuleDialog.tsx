import type React from 'react';
import type { DialogEvent } from '@react-rules-engine/lib';
import { useTranslation } from 'react-i18next';

interface RuleDialogProps {
  dialog: DialogEvent | null;
  onConfirm: () => void;
  onDismiss: () => void;
}

export function RuleDialog({ dialog, onConfirm, onDismiss }: RuleDialogProps) {
  const { t } = useTranslation();
  if (!dialog) return null;

  const title = t(dialog.titleKey, { defaultValue: dialog.titleKey });
  const message = t(dialog.messageKey, { defaultValue: dialog.messageKey });
  const isConfirm = dialog.type === 'confirm';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(17, 24, 39, 0.45)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 999,
      }}
    >
      <div
        style={{
          width: 'min(90vw, 480px)',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          padding: '1rem 1rem 0.75rem',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1rem', color: '#111827' }}>{title}</h3>
        <p style={{ margin: '0.5rem 0 1rem', fontSize: '0.9rem', color: '#4b5563' }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          {isConfirm ? (
            <>
              <button type="button" onClick={onDismiss} style={secondaryButton}>
                {t('dialog.actions.cancel')}
              </button>
              <button type="button" onClick={onConfirm} style={primaryButton}>
                {t('dialog.actions.confirm')}
              </button>
            </>
          ) : (
            <button type="button" onClick={onDismiss} style={primaryButton}>
              {t('dialog.actions.ok')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const primaryButton: React.CSSProperties = {
  padding: '0.5rem 0.9rem',
  borderRadius: 6,
  border: 'none',
  background: '#2563eb',
  color: '#fff',
  fontWeight: 600,
  cursor: 'pointer',
};

const secondaryButton: React.CSSProperties = {
  ...primaryButton,
  background: '#f3f4f6',
  color: '#1f2937',
  border: '1px solid #d1d5db',
};
