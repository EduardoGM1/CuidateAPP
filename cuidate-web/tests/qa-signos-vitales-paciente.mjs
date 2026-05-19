/**
 * QA API: crea registro de signos vitales para un paciente por nombre.
 *
 * Uso:
 *   API_BASE_URL=https://cuidateapp.com.mx \
 *   TEST_EMAIL=admin@clinica.com TEST_PASSWORD=Admin123! \
 *   E2E_PATIENT_NAME="armando perez aguilar" \
 *   node tests/qa-signos-vitales-paciente.mjs
 */
const API_BASE_URL = (process.env.API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const EMAIL = process.env.TEST_EMAIL || process.env.E2E_EMAIL || 'admin@clinica.com';
const PASSWORD = process.env.TEST_PASSWORD || process.env.E2E_PASSWORD || 'Admin123!';
const PATIENT_NAME = (process.env.E2E_PATIENT_NAME || 'armando perez aguilar').toLowerCase();

const suffix = Date.now();
const SIGNOS_BODY = {
  peso_kg: 72,
  talla_m: 1.7,
  medida_cintura_cm: 90,
  presion_sistolica: 120,
  presion_diastolica: 80,
  glucosa_mg_dl: 98,
  colesterol_mg_dl: 180,
  colesterol_ldl: 100,
  colesterol_hdl: 55,
  trigliceridos_mg_dl: 140,
  hba1c_porcentaje: 6.1,
  observaciones: `QA API signos vitales ${suffix}`,
};

async function request(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json', 'X-Client-Type': 'web' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { _raw: text?.slice(0, 300) };
  }
  return { ok: res.ok, status: res.status, data };
}

function nombreCompleto(p) {
  const parts = [p.nombre, p.apellido_paterno, p.apellido_materno, p.nombre_completo].filter(Boolean);
  return (p.nombre_completo || parts.join(' ')).toLowerCase();
}

function matchesPatient(p) {
  const n = nombreCompleto(p);
  return PATIENT_NAME.split(/\s+/).every((w) => n.includes(w));
}

async function main() {
  console.log('\n=== QA signos vitales (API) ===\n');
  console.log(`API: ${API_BASE_URL}`);
  console.log(`Paciente: ${PATIENT_NAME}\n`);

  const login = await request('POST', '/api/auth/login', { email: EMAIL, password: PASSWORD });
  if (!login.ok) {
    console.error('Login falló:', login.status, login.data?.error || login.data);
    process.exit(1);
  }
  const token = login.data?.token;
  console.log('✓ Login OK');

  const search = await request('GET', `/api/pacientes?search=${encodeURIComponent(PATIENT_NAME)}&limit=20`, null, token);
  if (!search.ok) {
    console.error('Búsqueda pacientes falló:', search.status, search.data?.error);
    process.exit(1);
  }
  const list = search.data?.pacientes ?? search.data?.data ?? search.data ?? [];
  const rows = Array.isArray(list) ? list : list.rows || [];
  const paciente = rows.find(matchesPatient);
  if (!paciente) {
    console.error('Paciente no encontrado:', PATIENT_NAME);
    console.error('Resultados:', rows.map((p) => nombreCompleto(p)).join(', ') || '(vacío)');
    process.exit(1);
  }
  const id = paciente.id_paciente ?? paciente.id;
  console.log(`✓ Paciente id=${id} — ${nombreCompleto(paciente)}`);

  const created = await request('POST', `/api/pacientes/${id}/signos-vitales`, SIGNOS_BODY, token);
  if (!created.ok) {
    console.error('POST signos-vitales falló:', created.status, created.data?.error || created.data);
    process.exit(1);
  }
  const signo = created.data?.data ?? created.data;
  console.log('✓ Registro creado:', {
    id: signo?.id_signo ?? signo?.id_signo_vital ?? signo?.id,
    peso_kg: signo?.peso_kg,
    observaciones: signo?.observaciones ?? SIGNOS_BODY.observaciones,
  });
  console.log('\nOK\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
