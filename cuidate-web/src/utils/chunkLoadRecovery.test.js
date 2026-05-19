import { describe, it, expect } from 'vitest';
import { isChunkLoadError } from './chunkLoadRecovery';

describe('isChunkLoadError', () => {
  it('detecta error de import dinámico de Vite', () => {
    expect(
      isChunkLoadError(
        new TypeError('Failed to fetch dynamically imported module: https://cuidateapp.com.mx/assets/Dashboard-BAJmwt5c.js')
      )
    ).toBe(true);
  });

  it('detecta mensajes alternativos de navegadores', () => {
    expect(isChunkLoadError({ message: 'Importing a module script failed' })).toBe(true);
    expect(isChunkLoadError({ message: 'Loading chunk 42 failed' })).toBe(true);
  });

  it('ignora otros errores', () => {
    expect(isChunkLoadError(new Error('Network Error'))).toBe(false);
    expect(isChunkLoadError(null)).toBe(false);
  });
});
