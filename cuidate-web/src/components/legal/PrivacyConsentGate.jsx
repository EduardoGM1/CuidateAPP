import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { PRIVACY_CONSENT_UI } from '../../content/avisoPrivacidad';
import { clearPrivacyConsent, hasValidPrivacyConsent } from '../../utils/privacyConsent';
import PrivacyConsentModal from './PrivacyConsentModal';

/**
 * Bloquea el uso de la app autenticada hasta aceptar el aviso vigente.
 */
function requiresPrivacyConsent(user) {
  const rol = (user?.rol ?? user?.role ?? '').toString().toLowerCase();
  return rol === 'paciente' || rol === 'doctor';
}

/** Bloqueo de consentimiento para Paciente y Doctor tras cada inicio de sesión sin aceptación. */
export default function PrivacyConsentGate({ children }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const userId =
    user?.id_paciente ?? user?.id_doctor ?? user?.id ?? user?.id_usuario;
  const mustConsent = requiresPrivacyConsent(user);
  const [checked, setChecked] = useState(false);
  const [needsConsent, setNeedsConsent] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!mustConsent) {
        if (!cancelled) {
          setNeedsConsent(false);
          setChecked(true);
        }
        return;
      }
      setChecked(false);
      try {
        const valid = await hasValidPrivacyConsent(userId);
        if (!cancelled) {
          setNeedsConsent(!valid);
          setChecked(true);
        }
      } catch {
        if (!cancelled) {
          setNeedsConsent(true);
          setChecked(true);
        }
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [userId, mustConsent]);

  const handleReject = useCallback(() => {
    const confirmed = window.confirm(
      `${PRIVACY_CONSENT_UI.rejectConfirmTitle}\n\n${PRIVACY_CONSENT_UI.rejectConfirmMessage}`
    );
    if (!confirmed) return;
    clearPrivacyConsent();
    logout();
  }, [logout]);

  if (!checked) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-texto-secundario)' }}>
        Cargando…
      </div>
    );
  }

  if (mustConsent && needsConsent) {
    return (
      <PrivacyConsentModal
        open
        userId={userId}
        onAccepted={() => setNeedsConsent(false)}
        onRejected={handleReject}
      />
    );
  }

  return children;
}

