import { describe, it, expect } from 'vitest';
import { formatDateTime, parseApiDate } from './format';

describe('parseApiDate', () => {
  it('rechaza objetos vacíos del API', () => {
    expect(parseApiDate({})).toBeNull();
  });

  it('acepta ISO string', () => {
    const d = parseApiDate('2026-05-18T12:00:00.000Z');
    expect(d).toBeInstanceOf(Date);
    expect(Number.isNaN(d.getTime())).toBe(false);
  });
});

describe('formatDateTime', () => {
  it('no lanza con fecha_envio corrupta', () => {
    expect(() => formatDateTime({})).not.toThrow();
    expect(formatDateTime({})).toBe('—');
  });
});
