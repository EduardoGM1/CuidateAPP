import { PrivacyNoticeInlineLink } from './PrivacyNoticeContent';

/** Enlace al aviso en pantallas públicas de autenticación (web). */
export default function AuthPrivacyFooter() {
  return (
    <p className="login-footer" style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
      <PrivacyNoticeInlineLink />
    </p>
  );
}
