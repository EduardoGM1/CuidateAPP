import { Card } from 'antd';

/**
 * Card clicable para abrir un modal de sección en detalle de paciente.
 * Reutilizable: icon + label, hover y accesibilidad.
 *
 * @param {string} icon - Emoji o carácter para el icono
 * @param {string} label - Texto de la sección
 * @param {() => void} onClick - Al hacer clic (abrir modal)
 * @param {string} [className] - Clases CSS adicionales
 */
export default function SectionCard({ icon, label, onClick, className = '' }) {
  return (
    <Card
      hoverable
      className={`patient-section-card-clickable ${className}`.trim()}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-label={`Abrir ${label}`}
    >
      <div className="patient-section-card-clickable-content">
        {icon && (
          <span className="patient-section-card-clickable-icon" aria-hidden>
            {icon}
          </span>
        )}
        <span className="patient-section-card-clickable-label">{label}</span>
      </div>
    </Card>
  );
}
