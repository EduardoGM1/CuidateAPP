/**
 * Sondeo de seguridad contra API en producción (solo lectura / pruebas benignas).
 * Uso: API_BASE=https://cuidateapp.com.mx node scripts/security-probe-prod.mjs
 */
const BASE = (process.env.API_BASE || 'https://cuidateapp.com.mx').replace(/\/$/, '');

const results = { pass: [], fail: [], info: [] };

function log(ok, name, detail = '') {
  (ok ? results.pass : results.fail).push({ name, detail });
  const icon = ok ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m';
  console.log(`  ${icon} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function req(method, path, body = null, headers = {}) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const h = { 'Content-Type': 'application/json', 'X-Client-Type': 'web', ...headers };
  const res = await fetch(url, {
    method,
    headers: h,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { _raw: text?.slice(0, 300) };
  }
  return { status: res.status, data, headers: res.headers };
}

async function main() {
  console.log(`\n=== Security probe: ${BASE}\n`);

  // 1. Endpoints protegidos sin token
  const protectedPaths = [
    '/api/pacientes?limit=1',
    '/api/auth/usuarios',
    '/api/admin/auditoria?limit=1',
    '/api/dashboard/admin/summary',
  ];
  for (const p of protectedPaths) {
    const r = await req('GET', p);
    log(r.status === 401 || r.status === 403, `Sin token → ${p}`, `HTTP ${r.status}`);
  }

  // 2. Token JWT inválido
  const rBad = await req('GET', '/api/pacientes?limit=1', null, {
    Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.invalid',
  });
  log(rBad.status === 401 || rBad.status === 403, 'JWT malformado rechazado', `HTTP ${rBad.status}`);

  // 3. SQLi en login (debe fallar auth, no 500)
  const rSqli = await req('POST', '/api/auth/login', {
    email: "admin' OR '1'='1",
    password: "' OR '1'='1",
  });
  log(
    rSqli.status === 400 || rSqli.status === 401 || rSqli.status === 429,
    'SQLi login no autentica',
    `HTTP ${rSqli.status}`
  );
  log(rSqli.status !== 500, 'SQLi login sin error 500', `HTTP ${rSqli.status}`);

  // 4. Login vacío
  const rEmpty = await req('POST', '/api/auth/login', {});
  log(rEmpty.status === 400, 'Login sin credenciales → 400', `HTTP ${rEmpty.status}`);

  // 5. Health sin datos sensibles
  const rHealth = await req('GET', '/health');
  const healthStr = JSON.stringify(rHealth.data || {});
  log(rHealth.status === 200, 'Health público', `HTTP ${rHealth.status}`);
  log(
    !/password|secret|jwt|mysql/i.test(healthStr),
    'Health sin secretos en JSON',
    healthStr.slice(0, 80)
  );

  // 6. OPTIONS en ruta API (no debe exponer métodos peligrosos en Allow)
  const rOptions = await req('OPTIONS', '/api/auth/login');
  const allow = rOptions.headers?.get?.('allow') || '';
  log(!/TRACE/i.test(allow), 'Allow sin TRACE en auth', allow || `HTTP ${rOptions.status}`);

  // 7. CORS: origen malicioso (preflight simulado con Origin header en GET)
  const rCors = await fetch(`${BASE}/api/pacientes`, {
    method: 'GET',
    headers: {
      Origin: 'https://evil-attacker.example',
      Authorization: 'Bearer invalid',
    },
  });
  const acao = rCors.headers.get('access-control-allow-origin');
  log(
    acao !== 'https://evil-attacker.example',
    'CORS no refleja origen arbitrario',
    acao || 'sin ACAO'
  );

  // 8. Uploads sin firma ni token → 401
  const rUpload = await req('GET', '/uploads/audio/probe-nonexistent.m4a');
  log(rUpload.status === 401 || rUpload.status === 404, 'Upload sin auth rechazado (401/404)', `HTTP ${rUpload.status}`);

  // 9. Rate limit auth (múltiples fallos - solo si no está deshabilitado)
  let rateLimited = false;
  for (let i = 0; i < 8; i++) {
    const r = await req('POST', '/api/auth/login', { email: 'probe@test.com', password: 'wrong' });
    if (r.status === 429 || r.data?.code === 'AUTH_RATE_LIMIT_EXCEEDED') rateLimited = true;
  }
  if (rateLimited) {
    log(true, 'Rate limit auth activo tras intentos fallidos', '');
  } else {
    results.info.push({ name: 'Rate limit auth', detail: 'No activó 429 en 8 intentos (puede estar deshabilitado en QA)' });
    console.log(`  \x1b[33mINFO\x1b[0m Rate limit auth — no 429 en 8 intentos`);
  }

  console.log('\n--- Resumen ---');
  console.log(`  PASS: ${results.pass.length}`);
  console.log(`  FAIL: ${results.fail.length}`);
  console.log(`  INFO: ${results.info.length}`);
  if (results.fail.length) {
    console.log('\n  Fallos:');
    results.fail.forEach((f) => console.log(`    - ${f.name}: ${f.detail}`));
  }
  process.exit(results.fail.length > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
