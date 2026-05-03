import { http, HttpResponse } from 'msw';

/**
 * Handlers por defecto para tests de integración (API simulada).
 * Los tests pueden usar server.use(...handlers) para casos puntuales.
 */
export const defaultHandlers = [
  http.post('*/api/auth/login', async ({ request }) => {
    let body = {};
    try {
      body = await request.json();
    } catch {
      return HttpResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }
    if (body.password === '__bad__') {
      return HttpResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }
    return HttpResponse.json({
      token: 'test-jwt-token',
      user: { email: body.email ?? 'admin@test.com', rol: 'Admin' },
    });
  }),
];
