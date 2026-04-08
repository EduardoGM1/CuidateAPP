/**
 * Sin servidor: comprueba que cada escenario en mutationCatalog.js
 * genera un JSON que cumple su propio requestSchema (alineación web/app).
 */
import { describe, it, expect, beforeAll } from '@jest/globals';
import { buildScenarios } from '../../scripts/contract-tests/mutationCatalog.js';
import { validatePayloadTypes } from '../../scripts/contract-tests/validatePayloadTypes.js';

describe('mutationCatalog: cuerpos coherentes con requestSchema', () => {
  beforeAll(() => {
    if (!process.env.TEST_ADMIN_EMAIL) {
      process.env.TEST_ADMIN_EMAIL = 'contract@example.com';
    }
    if (!process.env.TEST_ADMIN_PASSWORD) {
      process.env.TEST_ADMIN_PASSWORD = 'contractpass123';
    }
  });

  it('cada escenario con body + requestSchema pasa validatePayloadTypes (ctx simulado)', () => {
    const mockCtx = {
      token: 'jwt-token',
      refreshToken: 'refresh-token',
      pacienteId: 1,
      doctorId: 2,
      citaId: 3,
      signoId: 4,
      diagnosticoId: 5,
      redApoyoId: 6,
    };

    for (const s of buildScenarios()) {
      if (!s.body || !s.requestSchema) continue;
      if (s.skipIf?.(mockCtx)) continue;
      const body = s.body(mockCtx);
      const { ok, errors } = validatePayloadTypes(body, s.requestSchema);
      expect({ id: s.id, errors }).toEqual({ id: s.id, errors: [] });
    }
  });
});
