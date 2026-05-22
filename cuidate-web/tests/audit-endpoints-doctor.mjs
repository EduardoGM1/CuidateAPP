/**
 * Auditoría de endpoints API con cuenta Doctor (web).
 * Uso: API_BASE_URL=https://cuidateapp.com.mx TEST_EMAIL=... TEST_PASSWORD=... node tests/audit-endpoints-doctor.mjs
 */
const API = (process.env.API_BASE_URL || 'https://cuidateapp.com.mx').replace(/\/$/, '');
const EMAIL = process.env.TEST_EMAIL || process.env.DOCTOR_EMAIL || 'eduardolalito99@hotmail.com';
const PASS = process.env.TEST_PASSWORD || process.env.DOCTOR_PASS || 'Admin123!';

let passed = 0;
let failed = 0;
const failures = [];

function log(name, ok, detail = '') {
  if (ok) {
    passed++;
    console.log(`  \x1b[32mOK\x1b[0m  ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed++;
    failures.push({ name, detail });
    console.log(`  \x1b[31mFAIL\x1b[0m ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function req(method, path, body = null, token = null) {
  const url = path.startsWith('http') ? path : `${API}${path}`;
  const headers = { 'Content-Type': 'application/json', 'X-Client-Type': 'web' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { _raw: text?.slice(0, 180) };
  }
  return { ok: res.ok, status: res.status, data };
}

function pickList(data) {
  if (Array.isArray(data?.data?.pacientes)) return data.data.pacientes;
  if (Array.isArray(data?.pacientes)) return data.pacientes;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  console.log('\n=== Auditoría endpoints — Doctor ===\n');
  console.log(`API: ${API}`);
  console.log(`Usuario: ${EMAIL}\n`);

  const health = await req('GET', '/health');
  log('GET /health', health.ok, `status ${health.status}`);

  await sleep(200);
  const login = await req('POST', '/api/auth/login', { email: EMAIL, password: PASS });
  const token = login.data?.token;
  const user = login.data?.usuario ?? login.data?.user;
  const rol = user?.rol ?? '';
  const idDoctor = user?.id_doctor;
  log('POST /api/auth/login', login.ok && !!token, login.ok ? `rol=${rol} id_doctor=${idDoctor ?? '—'}` : (login.data?.error || login.status));

  if (!token) {
    console.log('\nSin token. Abortando.\n');
    process.exit(1);
  }

  const cases = [
    ['GET', '/api/dashboard/doctor/summary', null, (r) => r.ok],
    ['GET', '/api/pacientes?limit=5&estado=activos', null, (r) => r.ok],
    ['GET', '/api/citas?limit=5&offset=0', null, (r) => r.ok],
    ['GET', '/api/medicamentos?limit=5', null, (r) => r.ok],
    ['GET', '/api/comorbilidades?limit=5', null, (r) => r.ok],
    ['GET', '/api/modulos?limit=5', null, (r) => r.ok],
    ['GET', '/api/vacunas?limit=5', null, (r) => r.ok],
    ['GET', '/api/instituciones-salud?limit=5', null, (r) => r.ok || r.status === 404],
    ['GET', '/api/citas/solicitudes-reprogramacion?limit=5', null, (r) => r.ok],
    ['GET', '/api/doctores/soporte/mios', null, (r) => r.ok],
    ['GET', '/api/privacy-consent/status?version=1.0', null, (r) => r.ok || r.status === 404],
    ['GET', '/api/doctores?limit=5', null, (r) => r.ok],
  ];

  const now = new Date();
  cases.push([
    'GET',
    `/api/reportes/forma-lista?mes=${now.getMonth() + 1}&anio=${now.getFullYear()}`,
    null,
    (r) => r.ok,
  ]);

  if (idDoctor) {
    cases.push(
      ['GET', `/api/doctores/${idDoctor}`, null, (r) => r.ok],
      ['GET', `/api/doctores/${idDoctor}/notificaciones?limit=5&estado=enviada`, null, (r) => r.ok],
      ['GET', `/api/mensajes-chat/doctor/${idDoctor}/conversaciones`, null, (r) => r.ok]
    );
  }

  // Admin-only: esperado 403
  cases.push(
    ['GET', '/api/admin/auditoria?limit=1', null, (r) => r.status === 403, '403'],
    ['GET', '/api/auth/usuarios?limit=1', null, (r) => r.status === 403, '403'],
    ['GET', '/api/admin/operations/system/status', null, (r) => r.status === 403, '403'],
    ['GET', '/api/dashboard/admin/summary', null, (r) => r.status === 403, '403']
  );

  for (const [method, path, body, check, label] of cases) {
    await sleep(150);
    const r = await req(method, path, body, token);
    const ok = typeof check === 'function' ? check(r) : r.ok;
    const detail = label || (ok ? `HTTP ${r.status}` : (r.data?.error || `HTTP ${r.status}`));
    log(`${method} ${path.split('?')[0]}`, ok, detail);
  }

  await sleep(150);
  const rPac = await req('GET', '/api/pacientes?limit=3&estado=todos', null, token);
  const pacientes = pickList(rPac.data);
  if (pacientes.length > 0) {
    const idPac = pacientes[0].id_paciente ?? pacientes[0].id;
    const sub = [
      ['GET', `/api/pacientes/${idPac}`, null, (r) => r.ok],
      ['GET', `/api/pacientes/${idPac}/resumen-medico`, null, (r) => r.ok],
      ['GET', `/api/pacientes/${idPac}/signos-vitales?limit=5`, null, (r) => r.ok],
      ['GET', `/api/pacientes/${idPac}/citas?limit=5`, null, (r) => r.ok || r.status === 404],
    ];
    for (const [method, path, body, check] of sub) {
      await sleep(150);
      const r = await req(method, path, body, token);
      const ok = check(r);
      log(`${method} ${path}`, ok, ok ? `HTTP ${r.status} id=${idPac}` : (r.data?.error || r.status));
    }
  } else {
    log('GET paciente detalle (skip)', true, 'sin pacientes en lista');
  }

  await sleep(150);
  const rCitas = await req('GET', '/api/citas?limit=3', null, token);
  const citas = Array.isArray(rCitas.data?.data) ? rCitas.data.data : pickList(rCitas.data);
  if (citas.length > 0) {
    const idCita = citas[0].id_cita ?? citas[0].id;
    const rCita = await req('GET', `/api/citas/${idCita}`, null, token);
    log('GET /api/citas/:id', rCita.ok, rCita.ok ? `id=${idCita}` : (rCita.data?.error || rCita.status));
  } else {
    log('GET /api/citas/:id (skip)', true, 'sin citas');
  }

  console.log('\n--- Resumen ---');
  console.log(`  OK: ${passed}`);
  console.log(`  FAIL: ${failed}`);
  if (failures.length) {
    console.log('\n  Fallos:');
    failures.forEach((f) => console.log(`    - ${f.name}: ${f.detail}`));
  }
  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
