import { describe, it, expect } from '@jest/globals';
import { validatePayloadTypes } from '../../scripts/contract-tests/validatePayloadTypes.js';

describe('validatePayloadTypes', () => {
  it('acepta payload alineado con esquema', () => {
    const body = {
      id_paciente: 1,
      fecha_cita: new Date().toISOString(),
      motivo: 'x',
      es_primera_consulta: false,
    };
    const { ok, errors } = validatePayloadTypes(body, {
      id_paciente: 'integer',
      fecha_cita: 'isoDate',
      motivo: 'string',
      es_primera_consulta: 'boolean',
    });
    expect(ok).toBe(true);
    expect(errors).toHaveLength(0);
  });

  it('rechaza tipos incorrectos (como enviar number donde va string)', () => {
    const { ok, errors } = validatePayloadTypes(
      { email: 123, password: 'x' },
      { email: 'string', password: 'string' },
    );
    expect(ok).toBe(false);
    expect(errors.some((e) => e.includes('email'))).toBe(true);
  });

  it('integerFlexible acepta número o string entero', () => {
    expect(validatePayloadTypes({ id: 5 }, { id: 'integerFlexible' }).ok).toBe(true);
    expect(validatePayloadTypes({ id: '12' }, { id: 'integerFlexible' }).ok).toBe(true);
    expect(validatePayloadTypes({ id: 'x' }, { id: 'integerFlexible' }).ok).toBe(false);
  });
});
