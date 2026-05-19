/**
 * Pruebas de funcionalidad API según rol del usuario (Admin o Doctor).
 *
 * Variables de entorno:
 *   API_BASE_URL, TEST_EMAIL, TEST_PASSWORD
 *   (alias: E2E_EMAIL, E2E_PASSWORD, ADMIN_EMAIL, ADMIN_PASS)
 */
const API_BASE_URL = (process.env.API_BASE_URL || process.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const TEST_EMAIL = process.env.TEST_EMAIL || process.env.E2E_EMAIL || process.env.ADMIN_EMAIL || 'admin@clinica.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || process.env.E2E_PASSWORD || process.env.ADMIN_PASS || 'Admin123!';

let passed = 0;
let failed = 0;
const failures = [];

function log(name, ok, detail = '') {
  if (ok) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed++;
    failures.push({ name, detail });
    console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function request(method, path, body = null, token = null) {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', 'X-Client-Type': 'web' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { _raw: text?.slice(0, 200) };
  }
  return { ok: res.ok, status: res.status, data };
}

function pickList(data, keys = ['data', 'pacientes', 'citas', 'doctores', 'tickets', 'conversaciones']) {
  if (Array.isArray(data)) return data;
  for (const k of keys) {
    const v = data?.[k];
    if (Array.isArray(v)) return v;
    if (Array.isArray(v?.rows)) return v.rows;
  }
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function isAdmin(rol) {
  const r = (rol || '').toString().toLowerCase();
  return r === 'admin';
}

async function login() {
  const { ok, status, data } = await request('POST', '/api/auth/login', { email: TEST_EMAIL, password: TEST_PASSWORD });
  const user = data?.usuario ?? data?.user ?? null;
  const token = data?.token ?? data?.data?.token ?? null;
  const rol = user?.rol ?? data?.rol ?? '';
  return { ok: ok && !!token, status, data, token, user, rol };
}

async function run() {
  console.log('\n=== Pruebas completas API (rol-aware) ===\n');
  console.log(`API: ${API_BASE_URL}`);
  console.log(`Usuario: ${TEST_EMAIL}\n`);

  const auth = await login();
  if (auth.data?.code === 'AUTH_RATE_LIMIT_EXCEEDED') {
    console.error('\n⚠ Rate limit de login. Espera 15 min o prueba desde otra IP.\n');
    process.exit(2);
  }
  log('POST /api/auth/login', auth.ok, auth.ok ? `rol: ${auth.rol || '—'}` : (auth.data?.error || `status ${auth.status}`));
  if (!auth.token) {
    console.log('\nAbortando: sin token.\n');
    process.exit(1);
  }

  const token = auth.token;
  const admin = isAdmin(auth.rol);

  // Dashboard según rol
  if (admin) {
    const r = await request('GET', '/api/dashboard/admin/summary', null, token);
    log('GET /api/dashboard/admin/summary', r.ok, r.ok ? '' : (r.data?.error || `status ${r.status}`));
  } else {
    const r = await request('GET', '/api/dashboard/doctor/summary', null, token);
    log('GET /api/dashboard/doctor/summary', r.ok, r.ok ? '' : (r.data?.error || `status ${r.status}`));
  }

  const rPac = await request('GET', '/api/pacientes?limit=5&offset=0', null, token);
  const pacientes = pickList(rPac.data);
  log('GET /api/pacientes', rPac.ok, rPac.ok ? `items: ${pacientes.length}` : (rPac.data?.error || `status ${rPac.status}`));

  const rCitas = await request('GET', '/api/citas?limit=5&offset=0', null, token);
  const citas = pickList(rCitas.data);
  log('GET /api/citas', rCitas.ok, rCitas.ok ? `items: ${citas.length}` : (rCitas.data?.error || `status ${rCitas.status}`));

  if (citas.length > 0) {
    const idCita = citas[0].id_cita ?? citas[0].id;
    const rCita = await request('GET', `/api/citas/${idCita}`, null, token);
    log('GET /api/citas/:id', rCita.ok, rCita.ok ? `id: ${idCita}` : (rCita.data?.error || `status ${rCita.status}`));
  } else {
    log('GET /api/citas/:id (skip)', true, 'sin citas');
  }

  if (pacientes.length > 0) {
    const idPac = pacientes[0].id_paciente ?? pacientes[0].id;
    const rDet = await request('GET', `/api/pacientes/${idPac}`, null, token);
    log('GET /api/pacientes/:id', rDet.ok, rDet.ok ? `id: ${idPac}` : (rDet.data?.error || `status ${rDet.status}`));
  } else {
    log('GET /api/pacientes/:id (skip)', true, 'sin pacientes');
  }

  const rRep = await request('GET', '/api/reportes/forma-lista', null, token);
  log('GET /api/reportes/forma-lista', rRep.ok, rRep.ok ? '' : (rRep.data?.error || `status ${rRep.status}`));

  const rMed = await request('GET', '/api/medicamentos?limit=5', null, token);
  log('GET /api/medicamentos', rMed.ok, rMed.ok ? '' : (rMed.data?.error || `status ${rMed.status}`));

  const rCom = await request('GET', '/api/comorbilidades?limit=5', null, token);
  log('GET /api/comorbilidades', rCom.ok, rCom.ok ? '' : (rCom.data?.error || `status ${rCom.status}`));

  const rMod = await request('GET', '/api/modulos?limit=5', null, token);
  log('GET /api/modulos', rMod.ok, rMod.ok ? '' : (rMod.data?.error || `status ${rMod.status}`));

  const rSol = await request('GET', '/api/citas/solicitudes-reprogramacion?limit=5', null, token);
  log('GET /api/citas/solicitudes-reprogramacion', rSol.ok, rSol.ok ? '' : (rSol.data?.error || `status ${rSol.status}`));

  const idDoctor = auth.user?.id_doctor;
  if (idDoctor) {
    const rNotif = await request('GET', `/api/notificaciones/doctor/${idDoctor}?limit=5&estado=enviada`, null, token);
    log('GET /api/notificaciones/doctor/:id', rNotif.ok, rNotif.ok ? '' : (rNotif.data?.error || `status ${rNotif.status}`));

    const rChat = await request('GET', `/api/mensajes-chat/doctor/${idDoctor}/conversaciones`, null, token);
    log('GET /api/mensajes-chat/doctor/:id/conversaciones', rChat.ok, rChat.ok ? '' : (rChat.data?.error || `status ${rChat.status}`));
  } else if (!admin) {
    log('GET notificaciones/chat (skip)', true, 'sin id_doctor en token');
  }

  const rTickets = await request('GET', '/api/doctores/soporte/mios', null, token);
  log('GET /api/doctores/soporte/mios', rTickets.ok || rTickets.status === 403, rTickets.ok ? '' : (admin ? 'N/A admin' : (rTickets.data?.error || `status ${rTickets.status}`)));

  if (admin) {
    const rDoc = await request('GET', '/api/doctores?limit=5', null, token);
    log('GET /api/doctores', rDoc.ok, rDoc.ok ? '' : (rDoc.data?.error || `status ${rDoc.status}`));

    const rAud = await request('GET', '/api/admin/auditoria?limit=3', null, token);
    log('GET /api/admin/auditoria', rAud.ok, rAud.ok ? '' : (rAud.data?.error || `status ${rAud.status}`));

    const rUsu = await request('GET', '/api/auth/usuarios?limit=5', null, token);
    log('GET /api/auth/usuarios', rUsu.ok, rUsu.ok ? '' : (rUsu.data?.error || `status ${rUsu.status}`));

    const rOps = await request('GET', '/api/admin/operations/status', null, token);
    log('GET /api/admin/operations/status', rOps.ok || rOps.status === 404, rOps.ok ? '' : (rOps.data?.error || `status ${rOps.status}`));
  } else {
    const rDoc403 = await request('GET', '/api/admin/auditoria?limit=1', null, token);
    log('GET /api/admin/auditoria (esperado 403 doctor)', rDoc403.status === 403, rDoc403.status === 403 ? 'OK' : `inesperado ${rDoc403.status}`);
  }

  console.log('\n--- Resumen ---');
  console.log(`  Pasaron: ${passed}`);
  console.log(`  Fallaron: ${failed}`);
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
