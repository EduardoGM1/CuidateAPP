import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { hasValidPrivacyConsent } from '../../utils/privacyConsent';
import PrivacyConsentModal from './PrivacyConsentModal';

/**
 * Bloquea el uso de la app autenticada hasta aceptar el aviso vigente.
 */
function isPacienteUser(user) {
  const rol = (user?.rol ?? user?.role ?? '').toString().toLowerCase();
  return rol === 'paciente';
}

/** Bloqueo de consentimiento solo para rol Paciente (primer inicio de sesión). */
export default function PrivacyConsentGate({ children }) {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id_paciente ?? user?.id ?? user?.id_usuario;
  const isPaciente = isPacienteUser(user);
  const [checked, setChecked] = useState(false);
  const [needsConsent, setNeedsConsent] = useState(false);

  useEffect(() => {
    if (!isPaciente) {
      setNeedsConsent(false);
      setChecked(true);
      return;
    }
    setChecked(false);
    const valid = hasValidPrivacyConsent(userId);
    setNeedsConsent(!valid);
    setChecked(true);
  }, [userId, isPaciente]);

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
