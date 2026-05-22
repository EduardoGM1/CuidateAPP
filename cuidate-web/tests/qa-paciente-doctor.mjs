/**
 * QA API Doctor: pruebas GET/POST sobre un paciente existente y uno recién creado.
 *
 * Uso:
 *   API_BASE_URL=https://cuidateapp.com.mx \
 *   TEST_EMAIL=eduardolalito99@hotmail.com TEST_PASSWORD=Admin123! \
 *   PACIENTE_ID=1104 \
 *   node tests/qa-paciente-doctor.mjs
 */
const API = (process.env.API_BASE_URL || 'https://cuidateapp.com.mx').replace(/\/$/, '');
const EMAIL = process.env.TEST_EMAIL || 'eduardolalito99@hotmail.com';
const PASS = process.env.TEST_PASSWORD || 'Admin123!';
const PACIENTE_EXISTENTE = Number(process.env.PACIENTE_ID || '1104');

let passed = 0;
let failed = 0;
const failures = [];

function log(label, ok, detail = '') {
  const line = detail ? `${label} — ${detail}` : label;
  if (ok) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${line}`);
  } else {
    failed++;
    failures.push({ label, detail });
    console.log(`  \x1b[31m✗\x1b[0m ${line}`);
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
    data = { _raw: text?.slice(0, 220) };
  }
  return { ok: res.ok, status: res.status, data };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeCurp() {
  const n = String(Date.now()).slice(-6);
  return `QAQM${n}HDFRRL09`;
}

function signosBody(tag) {
  return {
    peso_kg: 70,
    talla_m: 1.65,
    medida_cintura_cm: 88,
    presion_sistolica: 118,
    presion_diastolica: 78,
    glucosa_mg_dl: 95,
    colesterol_mg_dl: 175,
    colesterol_ldl: 98,
    colesterol_hdl: 52,
    trigliceridos_mg_dl: 130,
    hba1c_porcentaje: 5.9,
    observaciones: `QA doctor ${tag} ${Date.now()}`,
  };
}

async function probarPaciente(id, token, idDoctor, label, { write = true } = {}) {
  console.log(`\n--- Paciente ${label} (id=${id}) ---\n`);

  const gets = [
    ['GET', `/api/pacientes/${id}`],
    ['GET', `/api/pacientes/${id}/resumen-medico`],
    ['GET', `/api/pacientes/${id}/signos-vitales?limit=5`],
    ['GET', `/api/pacientes/${id}/citas?limit=5`],
    ['GET', `/api/pacientes/${id}/diagnosticos?limit=5`],
    ['GET', `/api/pacientes/${id}/medicamentos?limit=5`],
    ['GET', `/api/pacientes/${id}/comorbilidades?limit=5`],
    ['GET', `/api/pacientes/${id}/red-apoyo?limit=5`],
    ['GET', `/api/pacientes/${id}/esquema-vacunacion?limit=5`],
    ['GET', `/api/pacientes/${id}/doctores`],
    ['GET', `/api/pacientes/${id}/detecciones-complicaciones?limit=5`],
    ['GET', `/api/pacientes/${id}/sesiones-educativas?limit=5`],
  ];

  for (const [method, path] of gets) {
    await sleep(120);
    const r = await req(method, path, null, token);
    const ok = r.ok || r.status === 404;
    log(`${method} ${path.split('?')[0]}`, ok, ok ? `HTTP ${r.status}` : (r.data?.error || r.status));
  }

  if (!write) return;

  await sleep(150);
  const sv = await req('POST', `/api/pacientes/${id}/signos-vitales`, signosBody(label), token);
  const signoId = sv.data?.data?.id_signo ?? sv.data?.data?.id_signo_vital ?? sv.data?.data?.id;
  log('POST /api/pacientes/:id/signos-vitales', sv.ok, sv.ok ? `id=${signoId ?? 'ok'}` : (sv.data?.error || sv.status));

  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 7);
  await sleep(150);
  const cita = await req(
    'POST',
    '/api/citas',
    {
      id_paciente: id,
      id_doctor: idDoctor,
      fecha_cita: fecha.toISOString(),
      motivo: `QA cita ${label}`,
      observaciones: `Prueba automatizada ${Date.now()}`,
      es_primera_consulta: false,
      estado: 'pendiente',
    },
    token
  );
  const citaId = cita.data?.data?.id_cita ?? cita.data?.data?.id;
  log('POST /api/citas', cita.ok, cita.ok ? `id_cita=${citaId ?? 'ok'}` : (cita.data?.error || cita.status));
}

async function crearPaciente(token, idModulo) {
  const ts = Date.now();
  const body = {
    nombre: 'Paciente',
    apellido_paterno: 'QA',
    apellido_materno: 'Auto',
    fecha_nacimiento: '1992-06-15',
    curp: makeCurp(),
    institucion_salud: 'IMSS',
    sexo: 'Hombre',
    direccion: 'Calle QA 100',
    estado: 'Jalisco',
    localidad: 'Guadalajara',
    numero_celular: `331${String(ts).slice(-7)}`,
    id_modulo: idModulo,
    activo: true,
    pin: '2847',
    device_id: `qa-device-${ts}`,
  };

  const r = await req('POST', '/api/pacientes/completo', body, token);
  if (!r.ok) {
    return { ok: false, error: r.data?.error || r.data?.missing_fields || r.status, data: r.data };
  }
  const id = r.data?.data?.id_paciente;
  const nombre = [body.nombre, body.apellido_paterno, body.apellido_materno].join(' ');
  return { ok: true, id, nombre };
}

async function asignarDoctor(idPaciente, idDoctor, token) {
  const r = await req('POST', `/api/pacientes/${idPaciente}/doctores`, { id_doctor: idDoctor }, token);
  if (r.ok) return { ok: true, detail: 'asignado' };
  if (r.status === 409) return { ok: true, detail: 'ya asignado' };
  return { ok: false, detail: r.data?.error || r.status };
}

async function main() {
  console.log('\n=== QA paciente — Doctor ===\n');
  console.log(`API: ${API}`);
  console.log(`Usuario: ${EMAIL}`);
  console.log(`Paciente existente: ${PACIENTE_EXISTENTE}\n`);

  const login = await req('POST', '/api/auth/login', { email: EMAIL, password: PASS });
  const token = login.data?.token;
  const user = login.data?.usuario ?? login.data?.user;
  const idDoctor = user?.id_doctor;
  log('POST /api/auth/login', login.ok && !!token, login.ok ? `Doctor id=${idDoctor}` : (login.data?.error || login.status));
  if (!token || !idDoctor) process.exit(1);

  await sleep(200);
  const doc = await req('GET', `/api/doctores/${idDoctor}`, null, token);
  const idModulo = doc.data?.data?.id_modulo ?? doc.data?.id_modulo;
  log('GET /api/doctores/:id (módulo)', doc.ok, doc.ok ? `id_modulo=${idModulo}` : (doc.data?.error || doc.status));
  if (!idModulo) {
    console.error('No se obtuvo id_modulo del doctor.');
    process.exit(1);
  }

  await probarPaciente(PACIENTE_EXISTENTE, token, idDoctor, `existente-${PACIENTE_EXISTENTE}`);

  console.log('\n--- Crear paciente nuevo ---\n');
  await sleep(200);
  const created = await crearPaciente(token, idModulo);
  if (!created.ok) {
    log('POST /api/pacientes/completo', false, JSON.stringify(created.error));
    console.log('\n--- Resumen ---');
    console.log(`  Pasaron: ${passed}`);
    console.log(`  Fallaron: ${failed}`);
    process.exit(1);
  }
  log('POST /api/pacientes/completo', true, `id=${created.id} — ${created.nombre}`);

  await sleep(200);
  const assign = await asignarDoctor(created.id, idDoctor, token);
  log('POST /api/pacientes/:id/doctores', assign.ok, assign.detail);

  await probarPaciente(created.id, token, idDoctor, `nuevo-${created.id}`);

  console.log('\n--- Resumen ---');
  console.log(`  Pasaron: ${passed}`);
  console.log(`  Fallaron: ${failed}`);
  console.log(`  Paciente nuevo id: ${created.id} (https://cuidateapp.com.mx/pacientes/${created.id})`);
  if (failures.length) {
    console.log('\n  Fallos:');
    failures.forEach((f) => console.log(`    - ${f.label}: ${f.detail}`));
  }
  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
