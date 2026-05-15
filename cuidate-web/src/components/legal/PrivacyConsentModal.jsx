import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Modal, Button } from '../ui';
import PrivacyNoticeContent from './PrivacyNoticeContent';
import { PRIVACY_CONSENT_LABELS } from '../../content/avisoPrivacidad';
import { savePrivacyConsent } from '../../utils/privacyConsent';

/**
 * Modal bloqueante para aceptar aviso de privacidad (LFPDPPP).
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
      title="Aviso de Privacidad y consentimiento"
      footer={null}
      width={640}
      closable={false}
      maskClosable={false}
      keyboard={false}
    >
      <div
        style={{
          maxHeight: '40vh',
          overflowY: 'auto',
          marginBottom: '1rem',
          padding: '0.75rem',
          border: '1px solid var(--color-borde-claro)',
          borderRadius: 'var(--radius)',
          background: 'var(--color-fondo-secundario)',
        }}
      >
        <PrivacyNoticeContent compact showVersion />
      </div>
      <p style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>
        <Link to="/aviso-privacidad" target="_blank" rel="noopener noreferrer">
          Ver aviso completo en pantalla dedicada
        </Link>
      </p>
      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '0.75rem', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={privacyNotice}
          onChange={(e) => setPrivacyNotice(e.target.checked)}
          style={{ marginTop: 4 }}
        />
        <span style={{ fontSize: '0.9rem' }}>{PRIVACY_CONSENT_LABELS.privacyNotice}</span>
      </label>
      <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginBottom: '1rem', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={healthData}
          onChange={(e) => setHealthData(e.target.checked)}
          style={{ marginTop: 4 }}
        />
        <span style={{ fontSize: '0.9rem' }}>{PRIVACY_CONSENT_LABELS.healthData}</span>
      </label>
      {error && (
        <p role="alert" style={{ color: 'var(--color-error)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
          {error}
        </p>
      )}
      <Button variant="primary" onClick={handleAccept} disabled={!canSubmit} style={{ width: '100%' }}>
        Aceptar y continuar
      </Button>
    </Modal>
  );
}
