/**
 * Lista de contactos de red de apoyo (paridad con app móvil).
 * Reutilizado en AgregarPaciente y EditarPaciente.
 * Cada contacto: nombre_contacto, numero_celular, email, direccion, localidad, parentesco.
 * Items pueden tener id_contacto (existente en API) para edición.
 */
import { Input, Button } from '../ui';

const blockStyle = {
  marginBottom: '1rem',
  padding: '0.75rem',
  background: 'var(--color-fondo-secundario)',
  borderRadius: 8,
};

export default function RedApoyoFormFields({
  list,
  onAdd,
  onRemove,
  onUpdate,
  disabled = false,
  canRemove = true,
  addLabel = '+ Agregar otro contacto',
}) {
  return (
    <>
      <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: 'var(--color-texto-secundario)' }}>
        Puedes registrar uno o más contactos de red de apoyo. Podrás agregar más después desde el detalle del paciente.
      </p>
      {list.map((contacto, index) => (
        <div key={contacto.id_contacto ?? `new-${index}`} style={blockStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Contacto {index + 1}</span>
            {canRemove && list.length > 1 && (
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() => onRemove(index)}
                disabled={disabled}
              >
                Quitar
              </Button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <Input
              label="Nombre del contacto"
              value={contacto.nombre_contacto ?? ''}
              onChange={(e) => onUpdate(index, 'nombre_contacto', e.target.value)}
              placeholder="Ej. María López"
              disabled={disabled}
            />
            <Input
              label="Teléfono del contacto"
              type="tel"
              value={contacto.numero_celular ?? ''}
              onChange={(e) => onUpdate(index, 'numero_celular', e.target.value)}
              placeholder="Ej. 55 9876 5432"
              disabled={disabled}
            />
            <Input
              label="Email (opcional)"
              type="email"
              value={contacto.email ?? ''}
              onChange={(e) => onUpdate(index, 'email', e.target.value)}
              placeholder="Ej. contacto@email.com"
              disabled={disabled}
            />
            <Input
              label="Dirección (opcional)"
              value={contacto.direccion ?? ''}
              onChange={(e) => onUpdate(index, 'direccion', e.target.value)}
              placeholder="Calle, número, colonia"
              disabled={disabled}
            />
            <Input
              label="Localidad (opcional)"
              value={contacto.localidad ?? ''}
              onChange={(e) => onUpdate(index, 'localidad', e.target.value)}
              placeholder="Ciudad o localidad"
              disabled={disabled}
            />
            <Input
              label="Parentesco (opcional)"
              value={contacto.parentesco ?? ''}
              onChange={(e) => onUpdate(index, 'parentesco', e.target.value)}
              placeholder="Ej. Cónyuge, hijo/a"
              disabled={disabled}
            />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="small" onClick={onAdd} disabled={disabled}>
        {addLabel}
      </Button>
    </>
  );
}
