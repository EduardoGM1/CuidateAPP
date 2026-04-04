/**
 * Integración API (misma superficie que la app móvil): login con usuario real,
 * lecturas autenticadas y pruebas de escritura opcionales.
 *
 * Recomendado contra API local para no chocar con rate-limit del VPS:
 *   API_BASE_URL=http://127.0.0.1:3000 ^
 *   TEST_ADMIN_EMAIL=admin@clinica.com ^
 *   TEST_ADMIN_PASSWORD=TuPassword ^
 *   node scripts/test-api-integracion-completa.js
 *
 * Variables:
 *   API_BASE_URL          — sin /api al final (default: http://127.0.0.1:3000)
 *   TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD — Doctor o Admin (POST /api/auth/login, igual que la web)
 *   TEST_DOCTOR_EMAIL / TEST_DOCTOR_PASSWORD — opcional; si no hay admin, se usa doctor
 *   REQUEST_DELAY_MS      — pausa entre peticiones (default 400; sube en producción)
 *   ENABLE_WRITE_TESTS=1  — registro de usuario probe + borrado con admin (mutación BD)
 *   TEST_PACIENTE_PIN / TEST_PACIENTE_ID — opcional: prueba POST /auth-unified/login-paciente
 */

const axios = require('axios');

const BASE =
  (process.env.API_BASE_URL || 'http://127.0.0.1:3000').replace(/\/$/, '');
const DELAY = Math.max(0, parseInt(process.env.REQUEST_DELAY_MS || '400', 10) || 0);
const WRITE = process.env.ENABLE_WRITE_TESTS === '1' || process.env.ENABLE_WRITE_TESTS === 'true';

const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || process.env.TEST_DOCTOR_EMAIL;
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || process.env.TEST_DOCTOR_PASSWORD;

const MOBILE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Client-Type': 'app',
  'X-Platform': 'android',
  'X-Device-ID': 'integration-test',
  'X-App-Version': '1.0.0',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let passed = 0;
let failed = 0;

function ok(name, detail = '') {
  passed++;
  console.log(`✅ ${name}${detail ? ` — ${detail}` : ''}`);
}

function bad(name, detail = '') {
  failed++;
  console.log(`❌ ${name}${detail ? ` — ${detail}` : ''}`);
}

async function req(method, path, { token, body, query } = {}) {
  const url = `${BASE}/api${path.startsWith('/') ? path : `/${path}`}${query ? `?${query}` : ''}`;
  const cfg = {
    method,
    url,
    timeout: 45000,
    validateStatus: () => true,
    headers: { ...MOBILE_HEADERS },
  };
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  if (body != null && method !== 'get' && method !== 'delete') {
    cfg.data = body;
  }
  return axios(cfg);
}

async function main() {
  console.log('\n═══ Integración API (ClinicaMovil ↔ backend) ═══');
  console.log(`Base: ${BASE}`);
  console.log(`Escritura: ${WRITE ? 'SÍ (ENABLE_WRITE_TESTS)' : 'no (solo lecturas)'}\n`);

  // --- Salud ---
  let h = await axios.get(`${BASE}/health`, { timeout: 15000, validateStatus: () => true });
  if (h.status >= 200 && h.status < 300) ok(`GET /health → ${h.status}`);
  else bad(`GET /health → ${h.status}`);

  await sleep(DELAY);
  let cfg = await req('get', '/mobile/config');
  if (cfg.status === 200) ok(`GET /api/mobile/config → ${cfg.status}`);
  else bad(`GET /api/mobile/config → ${cfg.status}`, JSON.stringify(cfg.data).slice(0, 120));

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log(
      '\n⚠️  Sin TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD: omito login y pruebas autenticadas.\n',
    );
    console.log(`Resumen: ${passed} OK, ${failed} fallos\n`);
    process.exit(failed ? 1 : 0);
  }

  await sleep(DELAY);
  const login = await req('post', '/auth/login', {
    body: {
      email: ADMIN_EMAIL.trim().toLowerCase(),
      password: ADMIN_PASSWORD,
    },
  });

  if (login.status !== 200 || !login.data?.token) {
    bad(
      'POST /api/auth/login',
      `status ${login.status} ${JSON.stringify(login.data || {}).slice(0, 200)}`,
    );
    console.log(`\nResumen: ${passed} OK, ${failed} fallos\n`);
    process.exit(1);
  }
  ok('POST /api/auth/login', `rol ${login.data.usuario?.rol || '?'}`);
  const token = login.data.token;
  const refresh = login.data.refresh_token || login.data.refreshToken;

  await sleep(DELAY);
  if (refresh) {
    const ref = await req('post', '/mobile/refresh-token', {
      body: { refresh_token: refresh },
    });
    if (ref.status === 200 && ref.data?.token) ok('POST /api/mobile/refresh-token');
    else bad('POST /api/mobile/refresh-token', `status ${ref.status}`);
  }

  const authedGets = [
    ['GET', '/pacientes', 'listado pacientes'],
    ['GET', '/doctores', 'listado doctores'],
    ['GET', '/citas', 'listado citas'],
    ['GET', '/medicamentos', 'medicamentos'],
    ['GET', '/modulos', 'módulos'],
    ['GET', '/instituciones-salud', 'instituciones'],
    ['GET', '/comorbilidades', 'comorbilidades'],
    ['GET', '/vacunas', 'vacunas'],
    ['GET', '/dashboard/admin/summary', 'dashboard admin summary'],
    ['GET', '/dashboard/admin/metrics', 'dashboard admin metrics'],
    ['GET', '/dashboard/health', 'dashboard health'],
    ['GET', '/admin/auditoria/usuarios', 'auditoría usuarios'],
    ['GET', '/auth/usuarios', 'auth usuarios'],
  ];

  for (const [method, path, label] of authedGets) {
    await sleep(DELAY);
    const r = await req(method.toLowerCase(), path, { token });
    if (r.status >= 200 && r.status < 300) ok(`${method} ${path} (${label})`);
    else if (r.status === 403)
      bad(`${method} ${path} (${label})`, `403 — rol sin permiso (esperable si no es Admin)`);
    else bad(`${method} ${path} (${label})`, `status ${r.status}`);
  }

  // Detalle si hay datos
  await sleep(DELAY);
  const pacRes = await req('get', '/pacientes', { token });
  let pid = null;
  if (pacRes.status === 200) {
    const data = pacRes.data?.data ?? pacRes.data;
    const list = Array.isArray(data?.pacientes)
      ? data.pacientes
      : Array.isArray(data)
        ? data
        : [];
    if (list.length && list[0].id_paciente != null) {
      pid = list[0].id_paciente;
      await sleep(DELAY);
      const one = await req('get', `/pacientes/${pid}`, { token });
      if (one.status === 200) ok(`GET /api/pacientes/${pid} (detalle)`);
      else bad(`GET /api/pacientes/${pid}`, String(one.status));

      const sub = [
        `/pacientes/${pid}/citas`,
        `/pacientes/${pid}/signos-vitales`,
        `/pacientes/${pid}/diagnosticos`,
        `/pacientes/${pid}/medicamentos`,
      ];
      for (const p of sub) {
        await sleep(DELAY);
        const sr = await req('get', p, { token });
        if (sr.status === 200) ok(`GET /api${p}`);
        else bad(`GET /api${p}`, String(sr.status));
      }
    } else {
      console.log('ℹ️  Sin pacientes en listado: omito subrutas de paciente.');
    }
  }

  await sleep(DELAY);
  const docRes = await req('get', '/doctores', { token });
  let did = null;
  if (docRes.status === 200) {
    const data = docRes.data?.data ?? docRes.data;
    const list = Array.isArray(data?.doctores)
      ? data.doctores
      : Array.isArray(data)
        ? data
        : [];
    if (list.length && list[0].id_doctor != null) {
      did = list[0].id_doctor;
      await sleep(DELAY);
      const one = await req('get', `/doctores/${did}`, { token });
      if (one.status === 200) ok(`GET /api/doctores/${did} (detalle doctor)`);
      else bad(`GET /api/doctores/${did}`, String(one.status));
    }
  }

  // Login paciente (PIN) opcional — no muta datos si PIN mal
  const testPin = process.env.TEST_PACIENTE_PIN;
  const testPid = process.env.TEST_PACIENTE_ID;
  if (testPin && testPid) {
    await sleep(DELAY);
    const pr = await req('post', '/auth-unified/login-paciente', {
      body: {
        id_paciente: testPid,
        pin: String(testPin),
        device_id: 'integration-test',
      },
    });
    if (pr.status === 200 && pr.data?.success) ok('POST /auth-unified/login-paciente (PIN)');
    else bad('POST /auth-unified/login-paciente', `status ${pr.status}`);
  }

  // --- Escritura opcional: registrar usuario y borrar ---
  if (WRITE) {
    const email = `probe_${Date.now()}@api-test.local`;
    const password = 'ProbeTest1!Aa';

    await sleep(DELAY);
    const reg = await req('post', '/auth/register', {
      body: { email, password, rol: 'Paciente' },
    });
    if (reg.status !== 201) {
      bad('POST /api/auth/register (probe)', `status ${reg.status}`);
    } else {
      ok('POST /api/auth/register (probe)', email);
      const newId = reg.data?.usuario?.id_usuario;
      if (newId != null) {
        await sleep(DELAY);
        const del = await req('delete', `/auth/usuarios/${newId}`, { token });
        if (del.status === 200 || del.status === 204) ok(`DELETE /api/auth/usuarios/${newId}`);
        else if (del.status === 403)
          bad(
            `DELETE /api/auth/usuarios/${newId}`,
            '403 — hace falta usuario Admin para borrar usuarios',
          );
        else bad(`DELETE /api/auth/usuarios/${newId}`, `status ${del.status}`);
      }
    }
  }

  console.log(`\nResumen: ${passed} OK, ${failed} fallos\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
