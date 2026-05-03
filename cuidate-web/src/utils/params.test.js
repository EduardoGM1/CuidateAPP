import { describe, it, expect } from 'vitest';
import { buildQueryString, parsePositiveInt } from './params';

describe('buildQueryString', () => {
  it('devuelve cadena vacía para objeto vacío o null', () => {
    expect(buildQueryString({})).toBe('');
    expect(buildQueryString(null)).toBe('');
  });

  it('omite undefined, null y cadenas vacías', () => {
    expect(buildQueryString({ a: 1, b: '', c: undefined, d: null })).toBe('?a=1');
  });

  it('codifica claves y valores', () => {
    const q = buildQueryString({ nombre: 'José Pérez', tipo: 'a/b' });
    expect(q).toContain('nombre=');
    expect(q).toContain('tipo=');
    expect(q.startsWith('?')).toBe(true);
  });
});

describe('parsePositiveInt', () => {
  it('parsea enteros válidos', () => {
    expect(parsePositiveInt('42', 0)).toBe(42);
    expect(parsePositiveInt(7, 0)).toBe(7);
  });

  it('devuelve default ante NaN o negativos', () => {
    expect(parsePositiveInt('abc', 99)).toBe(99);
    expect(parsePositiveInt('-3', 5)).toBe(5);
    expect(parsePositiveInt(null, 1)).toBe(1);
  });
});
