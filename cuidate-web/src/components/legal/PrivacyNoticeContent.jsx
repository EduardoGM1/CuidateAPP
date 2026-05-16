import { Link } from 'react-router-dom';
import {
  PRIVACY_NOTICE_BODY_PLACEHOLDER,
  PRIVACY_NOTICE_BODY_VISIBLE,
  PRIVACY_NOTICE_META,
  PRIVACY_NOTICE_SECTIONS,
  PRIVACY_NOTICE_VERSION,
} from '../../content/avisoPrivacidad';

/**
 * Contenido del aviso de privacidad (lectura).
 * @param {{ compact?: boolean, showVersion?: boolean, showFullBody?: boolean }} props
 */
export default function PrivacyNoticeContent({
  compact = false,
  showVersion = true,
  showFullBody = false,
}) {
  const showBody = PRIVACY_NOTICE_BODY_VISIBLE || showFullBody;

  if (!showBody) {
    return (
      <article className="privacy-notice-content" style={{ fontSize: compact ? '0.9rem' : '0.95rem', lineHeight: 1.6 }}>
        <p style={{ margin: 0, color: 'var(--color-texto-secundario)' }}>{PRIVACY_NOTICE_BODY_PLACEHOLDER}</p>
      </article>
    );
  }

  return (
    <article className="privacy-notice-content" style={{ fontSize: compact ? '0.9rem' : '0.95rem', lineHeight: 1.6 }}>
      {showVersion && (
        <p style={{ color: 'var(--color-texto-secundario)', marginBottom: '1rem', fontSize: '0.85rem' }}>
          Versión {PRIVACY_NOTICE_VERSION} · Última actualización: {PRIVACY_NOTICE_META.lastUpdated}
        </p>
      )}
      <p style={{ marginBottom: '1rem' }}>
        <strong>{PRIVACY_NOTICE_META.responsibleLabel}:</strong> {PRIVACY_NOTICE_META.responsibleName}
        <br />
        <strong>Contacto:</strong>{' '}
        <a href={`mailto:${PRIVACY_NOTICE_META.contactEmail}`}>{PRIVACY_NOTICE_META.contactEmail}</a>
      </p>
      {PRIVACY_NOTICE_SECTIONS.map((section) => (
        <section key={section.id} style={{ marginBottom: compact ? '0.75rem' : '1.25rem' }}>
          <h2
            style={{
              fontSize: compact ? '1rem' : '1.1rem',
              fontWeight: 600,
              color: 'var(--color-texto-primario)',
              margin: '0 0 0.5rem',
            }}
          >
            {section.title}
          </h2>
          {section.paragraphs.map((p, i) => (
            <p key={i} style={{ margin: '0 0 0.5rem', color: 'var(--color-texto-secundario)' }}>
              {p}
            </p>
          ))}
        </section>
      ))}
      <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--color-texto-secundario)' }}>
        Este aviso se rige por la legislación mexicana en materia de protección de datos personales.
      </p>
    </article>
  );
}

export function PrivacyNoticeInlineLink({ to = '/aviso-privacidad' }) {
  return (
    <Link to={to} style={{ color: 'var(--color-primario)', textDecoration: 'underline' }}>
      Aviso de Privacidad
    </Link>
  );
}
