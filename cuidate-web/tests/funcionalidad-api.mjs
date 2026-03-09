/**
 * Pruebas de funcionalidad: login y peticiones autenticadas a la API.
 * Usa credenciales Admin y Doctor definidas en el proyecto.
 *
 * Ejecutar: node tests/funcionalidad-api.mjs
 * Variables de entorno opcionales:
 *   API_BASE_URL  - base de la API (default: http://localhost:3000)
 *   ADMIN_EMAIL   - email admin (default: admin@clinica.com)
 *   ADMIN_PASS    - contraseña admin (default: Admin123!)
 *   DOCTOR_EMAIL  - email doctor (default: doctor@clinica.com)
 *   DOCTOR_PASS   - contraseña doctor (default: Doctor123!)
 */

const API_BASE_URL = (process.env.API_BASE_URL || process.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@clinica.com';
const ADMIN_PASS = process.env.ADMIN_PASS || 'Admin123!';
const DOCTOR_EMAIL = process.env.DOCTOR_EMAIL || 'doctor@clinica.com';
const DOCTOR_PASS = process.env.DOCTOR_PASS || 'Doctor123!';

let passed = 0;
let failed = 0;

function log(name, ok, detail = '') {
  if (ok) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${name}${detail ? ` — ${detail}` : ''}`);
  } else {
    failed++;
    console.log(`  \x1b[31m✗\x1b[0m ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function request(method, path, body = null, token = null) {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const headers = { 'Content-Type': 'application/json', 'X-Client-Type': 'web' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { _raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

async function login(email, password) {
  const { ok, status, data } = await request('POST', '/api/auth/login', { email, password });
  const token = data?.token ?? data?.data?.token ?? null;
  return { ok, status, data, token };
}

async function runTests() {
  console.log('\n--- Pruebas de funcionalidad API (web)\n');
  console.log(`API_BASE_URL: ${API_BASE_URL}\n`);

  // —— Login Admin ——
  console.log('1. Login Administrador');
  const adminLogin = await login(ADMIN_EMAIL, ADMIN_PASS);
  log('POST /api/auth/login (Admin)', adminLogin.ok && !!adminLogin.token, adminLogin.ok ? `rol: ${adminLogin.data?.user?.rol ?? adminLogin.data?.rol ?? '—'}` : (adminLogin.data?.error || `status ${adminLogin.status}`));
  if (!adminLogin.token) {
    console.log('   No se pudo obtener token de Admin. Revisa API_BASE_URL y credenciales.\n');
  } else {
    const adminToken = adminLogin.token;
    const rDashboard = await request('GET', '/api/dashboard/admin/summary', null, adminToken);
    log('GET /api/dashboard/admin/summary', rDashboard.ok, rDashboard.ok ? '' : (rDashboard.data?.error || `status ${rDashboard.status}`));

    const rPacientes = await request('GET', '/api/pacientes?limit=5&offset=0', null, adminToken);
    log('GET /api/pacientes', rPacientes.ok, rPacientes.ok ? `total: ${rPacientes.data?.total ?? rPacientes.data?.pacientes?.length ?? '—'}` : (rPacientes.data?.error || `status ${rPacientes.status}`));

    const rCitas = await request('GET', '/api/citas?limit=5&offset=0', null, adminToken);
    log('GET /api/citas', rCitas.ok, rCitas.ok ? '' : (rCitas.data?.error || `status ${rCitas.status}`));

    const rDoctores = await request('GET', '/api/doctores?limit=5', null, adminToken);
    log('GET /api/doctores', rDoctores.ok, rDoctores.ok ? '' : (rDoctores.data?.error || `status ${rDoctores.status}`));

    const rAuditoria = await request('GET', '/api/admin/auditoria?limit=3', null, adminToken);
    log('GET /api/admin/auditoria', rAuditoria.ok, rAuditoria.ok ? '' : (rAuditoria.data?.error || `status ${rAuditoria.status}`));

    // Plan de medicación (campos completos: fecha_fin, horarios, vía, observaciones)
    const rPacientesForPlan = await request('GET', '/api/pacientes?limit=1&offset=0', null, adminToken);
    const pacientesList = Array.isArray(rPacientesForPlan.data?.data) ? rPacientesForPlan.data.data : (Array.isArray(rPacientesForPlan.data?.pacientes) ? rPacientesForPlan.data.pacientes : (Array.isArray(rPacientesForPlan.data) ? rPacientesForPlan.data : []));
    const rMedicamentos = await request('GET', '/api/medicamentos?limit=5', null, adminToken);
    const medicamentosList = Array.isArray(rMedicamentos.data?.data) ? rMedicamentos.data.data : (Array.isArray(rMedicamentos.data?.medicamentos) ? rMedicamentos.data.medicamentos : (Array.isArray(rMedicamentos.data) ? rMedicamentos.data : []));
    if (pacientesList.length > 0 && medicamentosList.length > 0) {
      const pacienteId = pacientesList[0].id_paciente ?? pacientesList[0].id;
      const idMed = medicamentosList[0].id_medicamento ?? medicamentosList[0].id;
      const hoy = new Date().toISOString().slice(0, 10);
      const planPayload = {
        fecha_inicio: hoy,
        fecha_fin: undefined,
        observaciones: 'Prueba funcionalidad API',
        medicamentos: [
          {
            id_medicamento: idMed,
            dosis: '500 mg',
            frecuencia: 'cada 8 h',
            horarios: ['08:00', '14:00', '20:00'],
            via_administracion: 'Oral',
            observaciones: 'En ayunas',
          },
        ],
      };
      const rCreatePlan = await request('POST', `/api/pacientes/${pacienteId}/planes-medicacion`, planPayload, adminToken);
      const planCreado = rCreatePlan.ok && rCreatePlan.data?.data?.id_plan;
      log('POST /api/pacientes/:id/planes-medicacion (con horarios, vía, observaciones)', rCreatePlan.ok, planCreado ? `id_plan: ${rCreatePlan.data?.data?.id_plan}` : (rCreatePlan.data?.error || `status ${rCreatePlan.status}`));
      if (planCreado) {
        const idPlan = rCreatePlan.data.data.id_plan;
        const rUpdatePlan = await request('PUT', `/api/pacientes/${pacienteId}/planes-medicacion/${idPlan}`, { ...planPayload, observaciones: 'Plan actualizado' }, adminToken);
        log('PUT /api/pacientes/:id/planes-medicacion/:planId', rUpdatePlan.ok, rUpdatePlan.ok ? '' : (rUpdatePlan.data?.error || `status ${rUpdatePlan.status}`));
        await request('DELETE', `/api/pacientes/${pacienteId}/planes-medicacion/${idPlan}`, null, adminToken);
      }
    } else {
      log('POST plan medicación (skip)', true, 'Sin pacientes o medicamentos en catálogo');
    }
  }

  // —— Login Doctor ——
  console.log('\n2. Login Doctor');
  const doctorLogin = await login(DOCTOR_EMAIL, DOCTOR_PASS);
  log('POST /api/auth/login (Doctor)', doctorLogin.ok && !!doctorLogin.token, doctorLogin.ok ? `rol: ${doctorLogin.data?.user?.rol ?? doctorLogin.data?.rol ?? '—'}` : (doctorLogin.data?.error || `status ${doctorLogin.status}`));
  if (!doctorLogin.token) {
    console.log('   No se pudo obtener token de Doctor.\n');
  } else {
    const doctorToken = doctorLogin.token;
    const rDashDoctor = await request('GET', '/api/dashboard/doctor/summary', null, doctorToken);
    log('GET /api/dashboard/doctor/summary', rDashDoctor.ok, rDashDoctor.ok ? '' : (rDashDoctor.data?.error || `status ${rDashDoctor.status}`));

    const rPacientesDoctor = await request('GET', '/api/pacientes?limit=5&estado=activos', null, doctorToken);
    log('GET /api/pacientes (doctor)', rPacientesDoctor.ok, rPacientesDoctor.ok ? '' : (rPacientesDoctor.data?.error || `status ${rPacientesDoctor.status}`));

    const rCitasDoctor = await request('GET', '/api/citas?limit=5', null, doctorToken);
    log('GET /api/citas (doctor)', rCitasDoctor.ok, rCitasDoctor.ok ? '' : (rCitasDoctor.data?.error || `status ${rCitasDoctor.status}`));
  }

  // —— Resumen ——
  console.log('\n--- Resumen');
  console.log(`  Pasaron: ${passed}`);
  console.log(`  Fallaron: ${failed}`);
  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Error ejecutando pruebas:', err);
  process.exit(1);
});
