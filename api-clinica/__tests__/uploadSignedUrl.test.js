import {
  signUploadPublicUrl,
  verifyUploadSignature,
  normalizeUploadPath,
  persistUploadPath,
  decodeHtmlEntitiesInUrl,
  serializeWithSignedUploads,
} from '../utils/uploadSignedUrl.js';

describe('uploadSignedUrl', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-upload-signing-min-32-chars!!';
  });

  it('normaliza rutas bajo /uploads/', () => {
    expect(normalizeUploadPath('/uploads/audio/x.m4a')).toBe('/uploads/audio/x.m4a');
    expect(normalizeUploadPath('/uploads/../etc/passwd')).toBeNull();
  });

  it('firma y verifica URL de upload', () => {
    const signed = signUploadPublicUrl('/uploads/audio/test.m4a', 120);
    const u = new URL(signed, 'https://example.com');
    const path = u.pathname;
    const ok = verifyUploadSignature(path, u.searchParams.get('exp'), u.searchParams.get('sig'));
    expect(ok).toBe(true);
  });

  it('rechaza firma expirada o inválida', () => {
    expect(verifyUploadSignature('/uploads/audio/a.m4a', '1', 'deadbeef')).toBe(false);
  });

  it('recupera URLs corruptas por HTML entities y firma de nuevo', () => {
    const corrupted =
      '&#x2F;uploads&#x2F;audio&#x2F;x.m4a?exp&#x3D;1&amp;sig&#x3D;abc';
    expect(persistUploadPath(corrupted)).toBe('/uploads/audio/x.m4a');
    const out = serializeWithSignedUploads([
      { id_mensaje: 2, mensaje_audio_url: corrupted },
    ]);
    expect(out[0].mensaje_audio_url).toMatch(/^\/uploads\/audio\/x\.m4a\?exp=/);
  });

  it('serializa Date como ISO (no como objeto vacío)', () => {
    const fecha = new Date('2026-05-18T15:30:00.000Z');
    const out = serializeWithSignedUploads([
      { id_mensaje: 1, mensaje_texto: 'Hola', fecha_envio: fecha },
    ]);
    expect(typeof out[0].fecha_envio).toBe('string');
    expect(out[0].fecha_envio).toContain('2026');
    expect(out[0].fecha_envio).not.toEqual({});
  });
});
