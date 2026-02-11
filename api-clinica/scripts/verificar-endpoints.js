/**
 * Verificación de endpoints de la API (Admin)
 * Uso: node scripts/verificar-endpoints.js
 * Requiere: API corriendo (pm2) y usuario admin@clinica.com / Admin123!
 */

import dotenv from 'dotenv';
dotenv.config();

const PORT = process.env.PORT || 3000;
const BASE = `http://127.0.0.1:${PORT}`;
const CREDENTIALS = {
  email: process.env.ADMIN_EMAIL || 'admin@clinica.com',
  password: process.env.ADMIN_PASSWORD || 'Admin123!'
};

let token = null;
const results = { ok: [], fail: [] };

async function fetchApi(method, path, body = null, useToken = true) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15000)
  };
  if (useToken && token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function login() {
  const { status, data } = await fetchApi('POST', '/api/auth/login', CREDENTIALS, false);
  if (status === 200 && data?.token) {
    token = data.token;
    return true;
  }
  console.error('Login falló:', status, data);
  return false;
}

function ok(name, status) {
  results.ok.push({ name, status });
  console.log(`  ✅ ${name} (${status})`);
}

function fail(name, status, msg) {
  results.fail.push({ name, status, msg });
  console.log(`  ❌ ${name} (${status}) ${msg || ''}`);
}

async function main() {
  console.log('\n========== VERIFICACIÓN DE ENDPOINTS ==========\n');
  console.log('Login como Admin...');
  if (!(await login())) {
    console.error('No se pudo obtener token. Abortando.');
    process.exit(1);
  }
  console.log('OK. Token obtenido.\n');

  // Sin auth
  let r = await fetchApi('GET', '/health', null, false);
  if (r.status === 200) ok('GET /health', r.status); else fail('GET /health', r.status, r.data?.error);

  r = await fetchApi('GET', '/', null, false);
  if (r.status === 200) ok('GET /', r.status); else fail('GET /', r.status);

  // Auth (Admin)
  r = await fetchApi('GET', '/api/auth/usuarios');
  if (r.status === 200 || r.status === 429) ok('GET /api/auth/usuarios', r.status); else fail('GET /api/auth/usuarios', r.status, r.data?.error);

  r = await fetchApi('GET', '/api/pacientes');
  if (r.status === 200) ok('GET /api/pacientes', r.status); else fail('GET /api/pacientes', r.status, r.data?.error);

  r = await fetchApi('GET', '/api/doctores');
  if (r.status === 200) ok('GET /api/doctores', r.status); else fail('GET /api/doctores', r.status, r.data?.error);

  r = await fetchApi('GET', '/api/citas');
  if (r.status === 200) ok('GET /api/citas', r.status); else fail('GET /api/citas', r.status, r.data?.error);

  r = await fetchApi('GET', '/api/comorbilidades');
  if (r.status === 200) ok('GET /api/comorbilidades', r.status); else fail('GET /api/comorbilidades', r.status, r.data?.error);

  r = await fetchApi('GET', '/api/medicamentos');
  if (r.status === 200) ok('GET /api/medicamentos', r.status); else fail('GET /api/medicamentos', r.status, r.data?.error);

  r = await fetchApi('GET', '/api/signos-vitales');
  if (r.status === 200) ok('GET /api/signos-vitales', r.status); else fail('GET /api/signos-vitales', r.status, r.data?.error);

  r = await fetchApi('GET', '/api/diagnosticos');
  if (r.status === 200) ok('GET /api/diagnosticos', r.status); else fail('GET /api/diagnosticos', r.status, r.data?.error);

  r = await fetchApi('GET', '/api/planes-medicacion');
  if (r.status === 200) ok('GET /api/planes-medicacion', r.status); else fail('GET /api/planes-medicacion', r.status, r.data?.error);

  r = await fetchApi('GET', '/api/red-apoyo');
  if (r.status === 200) ok('GET /api/red-apoyo', r.status); else fail('GET /api/red-apoyo', r.status, r.data?.error);

  r = await fetchApi('GET', '/api/modulos');
  if (r.status === 200) ok('GET /api/modulos', r.status); else fail('GET /api/modulos', r.status, r.data?.error);

  r = await fetchApi('GET', '/api/vacunas');
  if (r.status === 200) ok('GET /api/vacunas', r.status); else fail('GET /api/vacunas', r.status, r.data?.error);

  // Dashboard (Admin)
  r = await fetchApi('GET', '/api/dashboard/admin/summary');
  if (r.status === 200) ok('GET /api/dashboard/admin/summary', r.status); else fail('GET /api/dashboard/admin/summary', r.status, r.data?.error);

  r = await fetchApi('GET', '/api/dashboard/admin/metrics');
  if (r.status === 200) ok('GET /api/dashboard/admin/metrics', r.status); else fail('GET /api/dashboard/admin/metrics', r.status, r.data?.error);

  r = await fetchApi('GET', '/api/dashboard/health');
  if (r.status === 200) ok('GET /api/dashboard/health', r.status); else fail('GET /api/dashboard/health', r.status, r.data?.error);

  // Auditoría (Admin)
  r = await fetchApi('GET', '/api/admin/auditoria');
  if (r.status === 200) ok('GET /api/admin/auditoria', r.status); else fail('GET /api/admin/auditoria', r.status, r.data?.error);

  // Reportes (pueden devolver 400 si faltan params)
  r = await fetchApi('GET', '/api/reportes/estadisticas/html');
  if (r.status === 200 || r.status === 400) ok('GET /api/reportes/estadisticas/html', r.status); else fail('GET /api/reportes/estadisticas/html', r.status, r.data?.error);

  // Auth unificado
  r = await fetchApi('POST', '/api/auth-unified/login-doctor-admin', { email: CREDENTIALS.email, password: CREDENTIALS.password });
  if (r.status === 200 && r.data?.token) ok('POST /api/auth-unified/login-doctor-admin', r.status); else fail('POST /api/auth-unified/login-doctor-admin', r.status, r.data?.error);

  // Dashboard admin (más rutas)
  r = await fetchApi('GET', '/api/dashboard/admin/alerts');
  if (r.status === 200) ok('GET /api/dashboard/admin/alerts', r.status); else fail('GET /api/dashboard/admin/alerts', r.status, r.data?.error);

  r = await fetchApi('GET', '/api/dashboard/admin/analytics');
  if (r.status === 200) ok('GET /api/dashboard/admin/analytics', r.status); else fail('GET /api/dashboard/admin/analytics', r.status, r.data?.error);

  r = await fetchApi('GET', '/api/admin/auditoria/estadisticas');
  if (r.status === 200) ok('GET /api/admin/auditoria/estadisticas', r.status); else fail('GET /api/admin/auditoria/estadisticas', r.status, r.data?.error);

  // Medicamentos-toma (por paciente; 404 si no hay paciente 1)
  r = await fetchApi('GET', '/api/medicamentos-toma/paciente/1');
  if (r.status === 200 || r.status === 404) ok('GET /api/medicamentos-toma/paciente/:id', r.status); else fail('GET /api/medicamentos-toma/paciente/:id', r.status, r.data?.error);

  // Resumen
  const total = results.ok.length + results.fail.length;
  console.log('\n========== RESUMEN ==========');
  console.log(`Total: ${total}  ✅ OK: ${results.ok.length}  ❌ Fallidos: ${results.fail.length}`);
  if (results.fail.length > 0) {
    console.log('\nFallidos:');
    results.fail.forEach(({ name, status, msg }) => console.log(`  - ${name} (${status}) ${msg || ''}`));
  }
  console.log('');
  process.exit(results.fail.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
