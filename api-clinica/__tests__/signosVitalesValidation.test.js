import { describe, it, expect } from '@jest/globals';
import {
  normalizeTallaMetros,
  validateAndNormalizeSignosVitalesBody,
} from '../utils/signosVitalesValidation.js';

describe('signosVitalesValidation', () => {
  it('convierte talla en centímetros a metros', () => {
    const r = normalizeTallaMetros(155);
    expect(r.value).toBe(1.55);
    expect(r.normalizedFromCm).toBe(true);
    expect(r.error).toBeNull();
  });

  it('rechaza talla fuera de rango sin conversión', () => {
    const r = normalizeTallaMetros(3.5);
    expect(r.error).toMatch(/metros/i);
  });

  it('acepta payload con talla 155 en create', () => {
    const r = validateAndNormalizeSignosVitalesBody({
      peso_kg: 68,
      talla_m: 155,
      presion_sistolica: 120,
      presion_diastolica: 80,
    });
    expect(r.ok).toBe(true);
    expect(r.values.talla_m).toBe(1.55);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});
