/**
 * Logo CuidaTeApp - mismo aspecto que la app móvil (ClinicaMovil).
 * Emoji 🏥 + texto "CuidaTeApp" en color primario.
 * @param {string} variant - 'stack' (emoji arriba, texto abajo) | 'inline' (emoji + texto en línea, para sidebar/header)
 * @param {boolean} onPrimary - si true, texto en blanco (para fondos verdes como header)
 */
export default function Logo({ size = 'medium', showText = true, variant = 'stack', onPrimary = false, className = '', style = {} }) {
  const sizes = {
    small: { emoji: 28, text: 1.125 },
    medium: { emoji: 40, text: 1.35 },
    large: { emoji: 56, text: 1.75 },
  };
  const s = sizes[size] || sizes.medium;
  const isInline = variant === 'inline';

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: isInline ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isInline ? '0.5rem' : '0.35rem',
        ...style,
      }}
    >
      <span style={{ fontSize: `${s.emoji}px`, lineHeight: 1, flexShrink: 0 }} aria-hidden="true">
        🏥
      </span>
      {showText && (
        <span
          style={{
            fontSize: `${s.text}rem`,
            fontWeight: 700,
            color: onPrimary ? 'var(--color-texto-en-primario)' : 'var(--color-primario)',
            letterSpacing: '-0.02em',
          }}
        >
          CuidaTeApp
        </span>
      )}
    </div>
  );
}
