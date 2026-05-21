import { describe, it, expect } from 'vitest';
import { normalizeTallaInput } from './signosVitalesFormUtils';

describe('normalizeTallaInput', () => {
  it('convierte 155 cm a 1.55 m', () => {
    expect(normalizeTallaInput('155')).toEqual({ value: '1.55', convertedFromCm: true });
  });

  it('deja 1.70 sin cambios', () => {
    expect(normalizeTallaInput('1.70')).toEqual({ value: '1.70', convertedFromCm: false });
  });
});
