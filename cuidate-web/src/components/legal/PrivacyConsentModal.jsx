import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal, Button } from '../ui';
import {
  PRIVACY_CONSENT_LABELS,
  PRIVACY_CONSENT_UI,
} from '../../content/avisoPrivacidad';
import { savePrivacyConsent } from '../../utils/privacyConsent';

/**
 * Modal bloqueante para pacientes y doctores (primer inicio de sesión).
 * @param {{ open: boolean, userId?: string, onAccepted: () => void }} props
 */
export default function PrivacyConsentModal({ open, userId, onAccepted }) {
  const [privacyNotice, setPrivacyNotice] = useState(false);
  const [healthData, setHealthData] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = privacyNotice && healthData;

  function handleAccept() {
    if (!canSubmit) {
      setError('Debes aceptar ambas declaraciones para continuar.');
      return;
    }
    setError('');
    savePrivacyConsent({ privacyNotice, healthData, userId });
    onAccepted();
  }

  return (
    <Modal
      open={open}
      onClose={() => {}}
      title={PRIVACY_CONSENT_UI.modalTitle}
      footer={null}
      width={640}
      closable={false}
      maskClosable={false}
      keyboard={false}
    >
      <p
        style={{
          margin: '0 0 1rem',
          fontWeight: 600,
          color: 'var(--color-primario)',
          fontSize: '1rem',
        }}
      >
        {PRIVACY_CONSENT_UI.heading}
      </p>

      <label
        style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'flex-start',
          marginBottom: '0.75rem',
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={privacyNotice}
          onChange={(e) => setPrivacyNotice(e.target.checked)}
          style={{ marginTop: 4, flexShrink: 0 }}
        />
        <span style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>
          He leído y acepto el{' '}
          <Link to="/aviso-privacidad" target="_blank" rel="noopener noreferrer">
            Aviso de Privacidad
          </Link>{' '}
          y los{' '}
          <Link to="/aviso-privacidad" target="_blank" rel="noopener noreferrer">
            Términos y Condiciones de la aplicación
          </Link>
          .
        </span>
      </label>

      <label
        style={{
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'flex-start',
          marginBottom: '1rem',
          cursor: 'pointer',
        }}
      >
        <input
          type="checkbox"
          checked={healthData}
          onChange={(e) => setHealthData(e.target.checked)}
          style={{ marginTop: 4, flexShrink: 0 }}
        />
        <span style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{PRIVACY_CONSENT_LABELS.healthData}</span>
      </label>

      <p
        style={{
          margin: '0 0 1rem',
          fontSize: '0.85rem',
          color: 'var(--color-texto-secundario)',
          lineHeight: 1.5,
        }}
      >
        {PRIVACY_CONSENT_UI.footer}
      </p>

      {error && (
        <p role="alert" style={{ color: 'var(--color-error)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
          {error}
        </p>
      )}
      <Button variant="primary" onClick={handleAccept} disabled={!canSubmit} style={{ width: '100%' }}>
        {PRIVACY_CONSENT_UI.acceptButton}
      </Button>
    </Modal>
  );
}
