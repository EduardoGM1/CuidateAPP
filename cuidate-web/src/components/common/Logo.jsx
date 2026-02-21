/**
 * Logo CuidaTeApp - mismo logotipo que la app móvil (ClinicaMovil).
 * Imagen: corazón verde con ECG, hoja, elementos tecnológicos y texto "CuidaTeApp".
 * Ruta de la imagen: /logo.png (copiada desde ClinicaMovil/src/assets/images/logo.png).
 *
 * @param {string} size - 'small' | 'medium' | 'large'
 * @param {string} variant - 'stack' (imagen centrada) | 'inline' (imagen + texto en línea para sidebar/header)
 * @param {boolean} showText - si true, muestra además el texto "CuidaTeApp" (útil cuando la imagen es pequeña)
 * @param {boolean} onPrimary - si true, texto en blanco (para fondos verdes como header)
 */
const SIZE_PX = { small: 100, medium: 180, large: 240 };

export default function Logo({
  size = 'medium',
  showText = false,
  variant = 'stack',
  onPrimary = false,
  className = '',
  style = {},
}) {
  const px = SIZE_PX[size] || SIZE_PX.medium;
  const isInline = variant === 'inline';

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: isInline ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: isInline ? '0.5rem' : '0.5rem',
        ...style,
      }}
    >
      <img
        src="/logo.png"
        alt="CuidaTeApp"
        width={px}
        height={px}
        style={{ objectFit: 'contain', flexShrink: 0, display: 'block' }}
      />
      {showText && (
        <span
          style={{
            fontSize: size === 'small' ? '1.125rem' : size === 'large' ? '1.75rem' : '1.35rem',
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
