import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { hasValidPrivacyConsent } from '../../utils/privacyConsent';
import PrivacyConsentModal from './PrivacyConsentModal';

/**
 * Bloquea el uso de la app autenticada hasta aceptar el aviso vigente.
 */
export default function PrivacyConsentGate({ children }) {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? user?.id_usuario ?? user?.id_doctor ?? user?.id_paciente;
  const [checked, setChecked] = useState(false);
  const [needsConsent, setNeedsConsent] = useState(false);

  useEffect(() => {
    setChecked(false);
    const valid = hasValidPrivacyConsent(userId);
    setNeedsConsent(!valid);
    setChecked(true);
  }, [userId]);

  if (!checked) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-texto-secundario)' }}>
        Cargando…
      </div>
    );
  }

  return (
    <>
      {children}
      <PrivacyConsentModal
        open={needsConsent}
        userId={userId}
        onAccepted={() => setNeedsConsent(false)}
      />
    </>
  );
}
