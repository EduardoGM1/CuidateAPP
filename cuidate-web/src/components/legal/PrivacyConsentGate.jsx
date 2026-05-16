import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { hasValidPrivacyConsent } from '../../utils/privacyConsent';
import PrivacyConsentModal from './PrivacyConsentModal';

/**
 * Bloquea el uso de la app autenticada hasta aceptar el aviso vigente.
 */
function requiresPrivacyConsent(user) {
  const rol = (user?.rol ?? user?.role ?? '').toString().toLowerCase();
  return rol === 'paciente' || rol === 'doctor';
}

/** Bloqueo de consentimiento para Paciente y Doctor (primer inicio de sesión). */
export default function PrivacyConsentGate({ children }) {
  const user = useAuthStore((s) => s.user);
  const userId =
    user?.id_paciente ?? user?.id_doctor ?? user?.id ?? user?.id_usuario;
  const mustConsent = requiresPrivacyConsent(user);
  const [checked, setChecked] = useState(false);
  const [needsConsent, setNeedsConsent] = useState(false);

  useEffect(() => {
    if (!mustConsent) {
      setNeedsConsent(false);
      setChecked(true);
      return;
    }
    setChecked(false);
    const valid = hasValidPrivacyConsent(userId);
    setNeedsConsent(!valid);
    setChecked(true);
  }, [userId, mustConsent]);

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
