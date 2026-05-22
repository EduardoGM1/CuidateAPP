/**
 * CRUD completo paciente QA — todos los módulos del dashboard.
 * POST → PUT → DELETE (admin si el doctor recibe 403 en DELETE).
 *
 * Uso:
 *   API_BASE_URL=https://cuidateapp.com.mx \
 *   TEST_EMAIL=eduardolalito99@hotmail.com TEST_PASSWORD=Admin123! \
 *   ADMIN_EMAIL=admin@clinica.com ADMIN_PASSWORD=Admin123! \
 *   PACIENTE_ID=1123 \
 *   node tests/qa-crud-paciente-1123.mjs
 */
const API = (process.env.API_BASE_URL || 'https://cuidateapp.com.mx').replace(/\/$/, '');
const DOCTOR_EMAIL = process.env.TEST_EMAIL || 'eduardolalito99@hotmail.com';
const DOCTOR_PASS = process.env.TEST_PASSWORD || 'Admin123!';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@clinica.com';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'Admin123!';
const PACIENTE_ID = Number(process.env.PACIENTE_ID || '1123');

let passed = 0;
let failed = 0;
const failures = [];
const created = { ids: {} };

function log(step, ok, detail = '') {
  const line = detail ? `${step} — ${detail}` : step;
  if (ok) {
    passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${line}`);
  } else {
    failed++;
    failures.push({ step, detail });
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
    data = { _raw: text?.slice(0, 280) };
  }
  return { ok: res.ok, status: res.status, data };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function pickId(data, ...keys) {
  const row = data?.data ?? data;
  if (!row || typeof row !== 'object') return null;
  for (const k of keys) {
    if (row[k] != null) return row[k];
  }
  return null;
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function signosFull(tag, idCita = null) {
  return {
    peso_kg: 71.5,
    talla_m: 1.66,
    medida_cintura_cm: 87,
    presion_sistolica: 122,
    presion_diastolica: 79,
    glucosa_mg_dl: 102,
    colesterol_mg_dl: 190,
    colesterol_ldl: 110,
    colesterol_hdl: 48,
    trigliceridos_mg_dl: 145,
    hba1c_porcentaje: 6.2,
    edad_paciente_en_medicion: 33,
    id_cita: idCita,
    observaciones: `QA CRUD ${tag} ${Date.now()}`,
  };
}

async function login(email, password) {
  const r = await req('POST', '/api/auth/login', { email, password });
  return r.ok ? r.data?.token : null;
}

async function del(path, doctorToken, adminToken, label) {
  let r = await req('DELETE', path, null, doctorToken);
  if (r.status === 403 && adminToken) {
    r = await req('DELETE', path, null, adminToken);
    log(`DELETE ${label}`, r.ok, r.ok ? `HTTP ${r.status} (admin)` : (r.data?.error || r.status));
    return r.ok;
  }
  log(`DELETE ${label}`, r.ok || r.status === 404, r.ok ? `HTTP ${r.status}` : (r.data?.error || r.status));
  return r.ok || r.status === 404;
}

async function fetchCatalogs(token) {
  const [meds, com, vac] = await Promise.all([
    req('GET', '/api/medicamentos?limit=5', null, token),
    req('GET', '/api/comorbilidades?limit=5', null, token),
    req('GET', '/api/vacunas?limit=5', null, token),
  ]);
  const medicamentos = Array.isArray(meds.data?.data) ? meds.data.data : meds.data?.medicamentos || [];
  const comorbilidades = Array.isArray(com.data?.data) ? com.data.data : com.data?.comorbilidades || [];
  const vacunas = Array.isArray(vac.data?.data) ? vac.data.data : vac.data?.vacunas || [];
  return {
    idMedicamento: medicamentos[0]?.id_medicamento ?? medicamentos[0]?.id,
    idComorbilidad: comorbilidades[0]?.id_comorbilidad ?? comorbilidades[0]?.id,
    idVacuna: vacunas[0]?.id_vacuna ?? vacunas[0]?.id,
  };
}

async function run() {
  console.log('\n=== CRUD completo paciente QA ===\n');
  console.log(`API: ${API}`);
  console.log(`Paciente: ${PACIENTE_ID}`);
  console.log(`Doctor: ${DOCTOR_EMAIL}\n`);

  const doctorToken = await login(DOCTOR_EMAIL, DOCTOR_PASS);
  log('Login doctor', !!doctorToken);
  if (!doctorToken) process.exit(1);

  const adminToken = await login(ADMIN_EMAIL, ADMIN_PASS);
  log('Login admin (DELETE restringidos)', !!adminToken);

  const loginDoc = await req('POST', '/api/auth/login', { email: DOCTOR_EMAIL, password: DOCTOR_PASS });
  const idDoctor = loginDoc.data?.usuario?.id_doctor ?? loginDoc.data?.user?.id_doctor;

  const cat = await fetchCatalogs(doctorToken);
  log('Catálogos', !!(cat.idMedicamento && cat.idComorbilidad), `med=${cat.idMedicamento} com=${cat.idComorbilidad} vac=${cat.idVacuna}`);

  // —— Cita base (historial / vínculos) ——
  await sleep(120);
  const fechaCita = new Date();
  fechaCita.setDate(fechaCita.getDate() + 14);
  const citaPost = await req(
    'POST',
    '/api/citas',
    {
      id_paciente: PACIENTE_ID,
      id_doctor: idDoctor,
      fecha_cita: fechaCita.toISOString(),
      motivo: 'QA consulta CRUD completa',
      observaciones: 'Cita prueba todos los campos',
      es_primera_consulta: false,
      estado: 'pendiente',
    },
    doctorToken
  );
  const idCita = pickId(citaPost.data, 'id_cita', 'id');
  log('POST /api/citas', citaPost.ok, idCita ? `id_cita=${idCita}` : (citaPost.data?.error || citaPost.status));
  if (idCita) created.ids.cita = idCita;

  if (idCita) {
    await sleep(120);
    const citaPut = await req(
      'PUT',
      `/api/citas/${idCita}`,
      { motivo: 'QA consulta actualizada', observaciones: 'PUT todos los campos', estado: 'pendiente' },
      doctorToken
    );
    log('PUT /api/citas/:id', citaPut.ok, citaPut.ok ? `HTTP ${citaPut.status}` : (citaPut.data?.error || citaPut.status));
  }

  // —— Consulta completa (historial) ——
  await sleep(120);
  const consulta = await req(
    'POST',
    '/api/citas/consulta-completa',
    {
      cita: {
        id_paciente: PACIENTE_ID,
        id_doctor: idDoctor,
        fecha_cita: new Date(Date.now() + 86400000 * 21).toISOString(),
        motivo: 'Consulta completa QA',
        observaciones: 'Historial consulta completa',
        es_primera_consulta: false,
      },
      signos_vitales: signosFull('consulta-completa'),
      diagnostico: { descripcion: 'Diagnóstico QA consulta completa — hipertensión controlada' },
      plan_medicacion: cat.idMedicamento
        ? {
            fecha_inicio: today(),
            observaciones: 'Plan desde consulta completa',
            medicamentos: [
              {
                id_medicamento: cat.idMedicamento,
                dosis: '500mg',
                frecuencia: 'cada 12h',
                horario: '08:00',
                horarios: ['08:00', '20:00'],
                via_administracion: 'oral',
                observaciones: 'Con alimentos',
              },
            ],
          }
        : undefined,
    },
    doctorToken
  );
  log('POST /api/citas/consulta-completa', consulta.ok, consulta.ok ? 'OK' : (consulta.data?.error || consulta.status));

  // —— Signos vitales (cita + monitoreo sin cita) ——
  await sleep(120);
  const svPost = await req('POST', `/api/pacientes/${PACIENTE_ID}/signos-vitales`, signosFull('signos-cita', idCita), doctorToken);
  const idSigno = pickId(svPost.data, 'id_signo', 'id_signo_vital', 'id');
  log('POST signos-vitales (con cita)', svPost.ok, idSigno ? `id=${idSigno}` : (svPost.data?.error || svPost.status));
  if (idSigno) created.ids.signo = idSigno;

  await sleep(120);
  const monPost = await req('POST', `/api/pacientes/${PACIENTE_ID}/signos-vitales`, signosFull('monitoreo-continuo', null), doctorToken);
  const idMon = pickId(monPost.data, 'id_signo', 'id_signo_vital', 'id');
  log('POST signos-vitales (monitoreo continuo)', monPost.ok, idMon ? `id=${idMon}` : (monPost.data?.error || monPost.status));
  if (idMon) created.ids.monitoreo = idMon;

  if (idSigno) {
    await sleep(120);
    const svPut = await req(
      'PUT',
      `/api/pacientes/${PACIENTE_ID}/signos-vitales/${idSigno}`,
      { peso_kg: 72, presion_sistolica: 118, observaciones: 'PUT signos actualizado' },
      doctorToken
    );
    log('PUT signos-vitales/:id', svPut.ok, svPut.ok ? 'OK' : (svPut.data?.error || svPut.status));
  }

  // —— Diagnóstico ——
  await sleep(120);
  const dxPost = await req(
    'POST',
    `/api/pacientes/${PACIENTE_ID}/diagnosticos`,
    { id_cita: idCita, descripcion: 'Diagnóstico QA CRUD — diabetes tipo 2 en control' },
    doctorToken
  );
  const idDx = pickId(dxPost.data, 'id_diagnostico', 'id');
  log('POST diagnosticos', dxPost.ok, idDx ? `id=${idDx}` : (dxPost.data?.error || dxPost.status));
  if (idDx) created.ids.diagnostico = idDx;

  if (idDx) {
    await sleep(120);
    const dxPut = await req(
      'PUT',
      `/api/pacientes/${PACIENTE_ID}/diagnosticos/${idDx}`,
      { descripcion: 'Diagnóstico QA actualizado — seguimiento trimestral' },
      doctorToken
    );
    log('PUT diagnosticos/:id', dxPut.ok, dxPut.ok ? 'OK' : (dxPut.data?.error || dxPut.status));
  }

  // —— Plan medicación ——
  if (cat.idMedicamento) {
    await sleep(120);
    const planPost = await req(
      'POST',
      `/api/pacientes/${PACIENTE_ID}/planes-medicacion`,
      {
        id_cita: idCita,
        fecha_inicio: today(),
        fecha_fin: null,
        observaciones: 'Plan medicación QA todos los campos',
        medicamentos: [
          {
            id_medicamento: cat.idMedicamento,
            dosis: '10mg',
            frecuencia: '1 vez al día',
            horario: '09:00',
            horarios: ['09:00'],
            via_administracion: 'oral',
            observaciones: 'Tomar en ayunas',
          },
        ],
      },
      doctorToken
    );
    const idPlan = pickId(planPost.data, 'id_plan', 'id');
    log('POST planes-medicacion', planPost.ok, idPlan ? `id=${idPlan}` : (planPost.data?.error || planPost.status));
    if (idPlan) {
      created.ids.plan = idPlan;
      await sleep(120);
      const planPut = await req(
        'PUT',
        `/api/pacientes/${PACIENTE_ID}/planes-medicacion/${idPlan}`,
        { observaciones: 'Plan actualizado QA', medicamentos: [{ id_medicamento: cat.idMedicamento, dosis: '10mg', frecuencia: '2 veces al día', horarios: ['09:00', '21:00'], via_administracion: 'oral' }] },
        doctorToken
      );
      log('PUT planes-medicacion/:id', planPut.ok, planPut.ok ? 'OK' : (planPut.data?.error || planPut.status));
    }
  }

  // —— Red de apoyo ——
  await sleep(120);
  const raPost = await req(
    'POST',
    `/api/pacientes/${PACIENTE_ID}/red-apoyo`,
    {
      nombre_contacto: 'Contacto QA Apoyo',
      numero_celular: '3312345678',
      email: 'apoyo.qa@test.local',
      direccion: 'Calle Apoyo 200',
      localidad: 'Guadalajara',
      parentesco: 'Hermano',
    },
    doctorToken
  );
  const idRa = pickId(raPost.data, 'id_red_apoyo', 'id_contacto', 'id');
  log('POST red-apoyo', raPost.ok, idRa ? `id=${idRa}` : (raPost.data?.error || raPost.status));
  if (idRa) {
    created.ids.redApoyo = idRa;
    await sleep(120);
    const raPut = await req(
      'PUT',
      `/api/pacientes/${PACIENTE_ID}/red-apoyo/${idRa}`,
      { nombre_contacto: 'Contacto QA Actualizado', parentesco: 'Esposo', observaciones: 'PUT red apoyo' },
      doctorToken
    );
    log('PUT red-apoyo/:id', raPut.ok, raPut.ok ? 'OK' : (raPut.data?.error || raPut.status));
  }

  // —— Vacunación ——
  await sleep(120);
  const vacPost = await req(
    'POST',
    `/api/pacientes/${PACIENTE_ID}/esquema-vacunacion`,
    {
      id_vacuna: cat.idVacuna,
      vacuna: 'Influenza estacional',
      fecha_aplicacion: today(),
      lote: 'LOT-QA-2026',
      lugar_aplicacion: 'Brazo izquierdo',
      observaciones: 'Vacuna QA CRUD',
    },
    doctorToken
  );
  const idVac = pickId(vacPost.data, 'id_vacunacion', 'id_esquema', 'id');
  log('POST esquema-vacunacion', vacPost.ok, idVac ? `id=${idVac}` : (vacPost.data?.error || vacPost.status));
  if (idVac) {
    created.ids.vacuna = idVac;
    await sleep(120);
    const vacPut = await req(
      'PUT',
      `/api/pacientes/${PACIENTE_ID}/esquema-vacunacion/${idVac}`,
      { lote: 'LOT-QA-UPD', observaciones: 'PUT vacunación actualizada', lugar_aplicacion: 'Brazo derecho' },
      doctorToken
    );
    log('PUT esquema-vacunacion/:id', vacPut.ok, vacPut.ok ? 'OK' : (vacPut.data?.error || vacPut.status));
  }

  // —— Comorbilidades ——
  if (cat.idComorbilidad) {
    await sleep(120);
    const comPost = await req(
      'POST',
      `/api/pacientes/${PACIENTE_ID}/comorbilidades`,
      {
        id_comorbilidad: cat.idComorbilidad,
        fecha_deteccion: today(),
        observaciones: 'Comorbilidad QA CRUD',
        anos_padecimiento: 3,
        es_diagnostico_basal: true,
        es_agregado_posterior: false,
        año_diagnostico: 2022,
        recibe_tratamiento_no_farmacologico: true,
        recibe_tratamiento_farmacologico: true,
      },
      doctorToken
    );
    log('POST comorbilidades', comPost.ok, comPost.ok ? 'OK' : (comPost.data?.error || comPost.status));
    if (comPost.ok) {
      created.ids.comorbilidad = cat.idComorbilidad;
      await sleep(120);
      const comPut = await req(
        'PUT',
        `/api/pacientes/${PACIENTE_ID}/comorbilidades/${cat.idComorbilidad}`,
        { observaciones: 'Comorbilidad actualizada QA', anos_padecimiento: 4 },
        doctorToken
      );
      log('PUT comorbilidades/:id', comPut.ok, comPut.ok ? 'OK' : (comPut.data?.error || comPut.status));
    }
  }

  // —— Detecciones complicaciones ——
  await sleep(120);
  const detPost = await req(
    'POST',
    `/api/pacientes/${PACIENTE_ID}/detecciones-complicaciones`,
    {
      id_comorbilidad: cat.idComorbilidad,
      id_cita: idCita,
      id_doctor: idDoctor,
      exploracion_pies: true,
      exploracion_fondo_ojo: true,
      realiza_auto_monitoreo: true,
      auto_monitoreo_glucosa: true,
      auto_monitoreo_presion: true,
      microalbuminuria_realizada: true,
      microalbuminuria_resultado: 25,
      fue_referido: false,
      referencia_observaciones: null,
      tipo_complicacion: 'Nefropatía incipiente',
      fecha_deteccion: today(),
      fecha_diagnostico: today(),
      observaciones: 'Detección QA todos los campos',
    },
    doctorToken
  );
  const idDet = pickId(detPost.data, 'id_deteccion', 'id');
  log('POST detecciones-complicaciones', detPost.ok, idDet ? `id=${idDet}` : (detPost.data?.error || detPost.status));
  if (idDet) {
    created.ids.deteccion = idDet;
    await sleep(120);
    const detPut = await req(
      'PUT',
      `/api/pacientes/${PACIENTE_ID}/detecciones-complicaciones/${idDet}`,
      { observaciones: 'Detección actualizada QA', exploracion_pies: true, tipo_complicacion: 'Control nefrológico' },
      doctorToken
    );
    log('PUT detecciones-complicaciones/:id', detPut.ok, detPut.ok ? 'OK' : (detPut.data?.error || detPut.status));
  }

  // —— Sesiones educativas ——
  await sleep(120);
  const sesPost = await req(
    'POST',
    `/api/pacientes/${PACIENTE_ID}/sesiones-educativas`,
    {
      id_cita: idCita,
      fecha_sesion: today(),
      asistio: true,
      tipo_sesion: 'nutricional',
      numero_intervenciones: 2,
      observaciones: 'Sesión educativa QA CRUD',
    },
    doctorToken
  );
  const idSes = pickId(sesPost.data, 'id_sesion', 'id');
  log('POST sesiones-educativas', sesPost.ok, idSes ? `id=${idSes}` : (sesPost.data?.error || sesPost.status));
  if (idSes) {
    created.ids.sesion = idSes;
    await sleep(120);
    const sesPut = await req(
      'PUT',
      `/api/pacientes/${PACIENTE_ID}/sesiones-educativas/${idSes}`,
      { observaciones: 'Sesión actualizada', numero_intervenciones: 3, asistio: true },
      doctorToken
    );
    log('PUT sesiones-educativas/:id', sesPut.ok, sesPut.ok ? 'OK' : (sesPut.data?.error || sesPut.status));
  }

  // —— Salud bucal ——
  await sleep(120);
  const sbPost = await req(
    'POST',
    `/api/pacientes/${PACIENTE_ID}/salud-bucal`,
    {
      id_cita: idCita,
      fecha_registro: today(),
      presenta_enfermedades_odontologicas: true,
      recibio_tratamiento_odontologico: false,
      observaciones: 'Salud bucal QA CRUD',
    },
    doctorToken
  );
  const idSb = pickId(sbPost.data, 'id_salud_bucal', 'id');
  log('POST salud-bucal', sbPost.ok, idSb ? `id=${idSb}` : (sbPost.data?.error || sbPost.status));
  if (idSb) {
    created.ids.saludBucal = idSb;
    await sleep(120);
    const sbPut = await req(
      'PUT',
      `/api/pacientes/${PACIENTE_ID}/salud-bucal/${idSb}`,
      { recibio_tratamiento_odontologico: true, observaciones: 'PUT salud bucal' },
      doctorToken
    );
    log('PUT salud-bucal/:id', sbPut.ok, sbPut.ok ? 'OK' : (sbPut.data?.error || sbPut.status));
  }

  // —— Tuberculosis ——
  await sleep(120);
  const tbPost = await req(
    'POST',
    `/api/pacientes/${PACIENTE_ID}/detecciones-tuberculosis`,
    {
      id_cita: idCita,
      fecha_deteccion: today(),
      aplicacion_encuesta: true,
      baciloscopia_realizada: true,
      baciloscopia_resultado: 'negativo',
      ingreso_tratamiento: false,
      observaciones: 'TB QA CRUD todos los campos',
    },
    doctorToken
  );
  const idTb = pickId(tbPost.data, 'id_deteccion_tuberculosis', 'id');
  log('POST detecciones-tuberculosis', tbPost.ok, idTb ? `id=${idTb}` : (tbPost.data?.error || tbPost.status));
  if (idTb) {
    created.ids.tuberculosis = idTb;
    await sleep(120);
    const tbPut = await req(
      'PUT',
      `/api/pacientes/${PACIENTE_ID}/detecciones-tuberculosis/${idTb}`,
      { observaciones: 'TB actualizada QA', baciloscopia_resultado: 'negativo' },
      doctorToken
    );
    log('PUT detecciones-tuberculosis/:id', tbPut.ok, tbPut.ok ? 'OK' : (tbPut.data?.error || tbPut.status));
  }

  // —— Gráficos / resumen (solo lectura) ——
  await sleep(120);
  const resumen = await req('GET', `/api/pacientes/${PACIENTE_ID}/resumen-medico`, null, doctorToken);
  log('GET resumen-medico (gráficos)', resumen.ok, resumen.ok ? 'OK' : (resumen.data?.error || resumen.status));

  // —— Doctores asignados ——
  await sleep(120);
  const docs = await req('GET', `/api/pacientes/${PACIENTE_ID}/doctores`, null, doctorToken);
  log('GET doctores asignados', docs.ok, docs.ok ? `HTTP ${docs.status}` : (docs.data?.error || docs.status));

  // —— Actualizar ficha paciente ——
  await sleep(120);
  const pacPut = await req(
    'PUT',
    `/api/pacientes/${PACIENTE_ID}`,
    { localidad: 'Zapopan QA', direccion: 'Av. QA 500 actualizada', numero_celular: '3399887766' },
    doctorToken
  );
  log('PUT /api/pacientes/:id (ficha)', pacPut.ok, pacPut.ok ? 'OK' : (pacPut.data?.error || pacPut.status));

  // —— DELETE limpieza (doctor o admin) ——
  console.log('\n--- Eliminación registros QA ---\n');
  if (created.ids.signo) await del(`/api/pacientes/${PACIENTE_ID}/signos-vitales/${created.ids.signo}`, doctorToken, adminToken, 'signos');
  if (created.ids.monitoreo) await del(`/api/pacientes/${PACIENTE_ID}/signos-vitales/${created.ids.monitoreo}`, doctorToken, adminToken, 'monitoreo');
  if (created.ids.diagnostico) await del(`/api/pacientes/${PACIENTE_ID}/diagnosticos/${created.ids.diagnostico}`, doctorToken, adminToken, 'diagnostico');
  if (created.ids.plan) await del(`/api/pacientes/${PACIENTE_ID}/planes-medicacion/${created.ids.plan}`, doctorToken, adminToken, 'plan');
  if (created.ids.redApoyo) await del(`/api/pacientes/${PACIENTE_ID}/red-apoyo/${created.ids.redApoyo}`, doctorToken, adminToken, 'red-apoyo');
  if (created.ids.vacuna) await del(`/api/pacientes/${PACIENTE_ID}/esquema-vacunacion/${created.ids.vacuna}`, doctorToken, adminToken, 'vacuna');
  if (created.ids.comorbilidad) await del(`/api/pacientes/${PACIENTE_ID}/comorbilidades/${created.ids.comorbilidad}`, doctorToken, adminToken, 'comorbilidad');
  if (created.ids.deteccion) await del(`/api/pacientes/${PACIENTE_ID}/detecciones-complicaciones/${created.ids.deteccion}`, doctorToken, adminToken, 'deteccion');
  if (created.ids.sesion) await del(`/api/pacientes/${PACIENTE_ID}/sesiones-educativas/${created.ids.sesion}`, doctorToken, adminToken, 'sesion');
  if (created.ids.saludBucal) await del(`/api/pacientes/${PACIENTE_ID}/salud-bucal/${created.ids.saludBucal}`, doctorToken, adminToken, 'salud-bucal');
  if (created.ids.tuberculosis) await del(`/api/pacientes/${PACIENTE_ID}/detecciones-tuberculosis/${created.ids.tuberculosis}`, doctorToken, adminToken, 'tuberculosis');
  if (created.ids.cita) await del(`/api/citas/${created.ids.cita}`, doctorToken, adminToken, 'cita');

  console.log('\n--- Resumen ---');
  console.log(`  Pasaron: ${passed}`);
  console.log(`  Fallaron: ${failed}`);
  if (failures.length) {
    console.log('\n  Fallos:');
    failures.forEach((f) => console.log(`    - ${f.step}: ${f.detail}`));
  }
  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
