/**
 * Carga masiva vía API para "QA Paciente" (gráficos evolución 2022–2026).
 * Usar cuando la BD local no conecta; apunta a producción por defecto.
 *
 *   API_BASE_URL=https://cuidateapp.com.mx \
 *   TEST_EMAIL=eduardolalito99@hotmail.com TEST_PASSWORD=Admin123! \
 *   node tests/seed-qa-paciente-evolucion-api.mjs
 */
const API = (process.env.API_BASE_URL || 'https://cuidateapp.com.mx').replace(/\/$/, '');
const EMAIL = process.env.TEST_EMAIL || 'eduardolalito99@hotmail.com';
const PASS = process.env.TEST_PASSWORD || 'Admin123!';
const PACIENTE_ID_ENV = Number(process.env.PACIENTE_ID || '0');
const WRITE_DELAY = Number(process.env.WRITE_DELAY_MS || '400');
const CITAS_MESES = Number(process.env.CITAS_MESES || '42');
const MONITOREOS = Number(process.env.MONITOREOS || '90');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function req(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json', 'X-Client-Type': 'web' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { _raw: text?.slice(0, 200) };
  }
  if (res.status === 429) {
    await sleep(2000);
    return req(method, path, body, token);
  }
  return { ok: res.ok, status: res.status, data };
}

function metricas(progress) {
  const p = Math.min(1, Math.max(0, progress));
  return {
    peso_kg: parseFloat((82 - p * 11).toFixed(2)),
    talla_m: 1.65,
    medida_cintura_cm: parseFloat((98 - p * 10).toFixed(1)),
    presion_sistolica: Math.round(142 - p * 24),
    presion_diastolica: Math.round(88 - p * 14),
    glucosa_mg_dl: Math.round(148 - p * 48),
    colesterol_mg_dl: Math.round(210 - p * 35),
    colesterol_ldl: Math.round(130 - p * 38),
    colesterol_hdl: Math.round(38 + p * 14),
    trigliceridos_mg_dl: Math.round(180 - p * 55),
    hba1c_porcentaje: parseFloat((8.4 - p * 2.3).toFixed(1)),
    edad_paciente_en_medicion: 33,
    observaciones: `Evolución QA ${Math.round(p * 100)}%`,
  };
}

function addMonths(d, n) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

async function main() {
  console.log('\n=== Seed QA Paciente (API) ===\n');
  console.log(`API: ${API}\n`);

  const login = await req('POST', '/api/auth/login', { email: EMAIL, password: PASS });
  if (!login.ok) {
    console.error('Login falló:', login.data?.error || login.status);
    process.exit(1);
  }
  const token = login.data?.token;
  const idDoctor = login.data?.usuario?.id_doctor ?? login.data?.user?.id_doctor;
  console.log('✓ Login OK, doctor id:', idDoctor);

  let idPaciente = PACIENTE_ID_ENV;
  if (!idPaciente) {
    const search = await req('GET', '/api/pacientes?search=QA&limit=30&estado=todos', null, token);
    const rows =
      search.data?.pacientes ||
      search.data?.data?.pacientes ||
      search.data?.data ||
      [];
    const p = rows.find((x) => {
      const n = `${x.nombre || ''} ${x.apellido_paterno || ''}`.toLowerCase();
      return n.includes('qa') && n.includes('paciente');
    });
    if (!p) {
      console.error('No se encontró QA Paciente. Define PACIENTE_ID=...');
      process.exit(1);
    }
    idPaciente = p.id_paciente ?? p.id;
  }
  console.log(`✓ Paciente id: ${idPaciente}\n`);

  await req(
    'PUT',
    `/api/pacientes/${idPaciente}`,
    {
      nombre: 'QA',
      apellido_paterno: 'Paciente',
      apellido_materno: 'Prueba',
      sexo: 'Hombre',
      institucion_salud: 'IMSS',
      estado: 'Jalisco',
      localidad: 'Guadalajara',
      direccion: 'Av. Patria 1500, Zapopan, Jal.',
      numero_celular: '3399887766',
      fecha_nacimiento: '1992-06-14',
      curp: 'QAQM920614HDFRRL09',
      numero_expediente: `EXP-QA-${idPaciente}`,
    },
    token
  );
  console.log('✓ Perfil actualizado');

  const inicio = new Date('2022-02-01T10:00:00');
  const hoy = new Date();
  const rango = hoy.getTime() - inicio.getTime();
  let okCitas = 0;
  let okSignos = 0;

  for (let m = 0; m < CITAS_MESES; m++) {
    const fc = addMonths(inicio, m);
    if (fc > addMonths(hoy, 2)) break;
    const progress = (fc.getTime() - inicio.getTime()) / rango;
    const atendida = fc < hoy && m % 5 !== 4;
    const signos = metricas(progress);

    await sleep(WRITE_DELAY);
    const r = await req(
      'POST',
      '/api/citas/consulta-completa',
      {
        cita: {
          id_paciente: idPaciente,
          id_doctor: idDoctor,
          fecha_cita: fc.toISOString(),
          motivo: `Control GAM evolución mes ${m + 1}`,
          observaciones: 'Carga histórica QA gráficos',
          es_primera_consulta: m === 0,
          estado: atendida ? 'atendida' : 'pendiente',
          asistencia: atendida,
        },
        signos_vitales: atendida ? signos : undefined,
        diagnostico: atendida
          ? { descripcion: `Diagnóstico seguimiento QA — consulta ${m + 1}` }
          : undefined,
      },
      token
    );
    if (r.ok) okCitas++;
    else console.warn(`  cita mes ${m + 1}:`, r.status, r.data?.error || r.data?.message);
  }
  console.log(`✓ Consultas/citas creadas: ~${okCitas}`);

  for (let i = 0; i < MONITOREOS; i++) {
    const fd = new Date(inicio.getTime() + (i * 12 * 86400000));
    if (fd > hoy) break;
    const progress = (fd.getTime() - inicio.getTime()) / rango;
    const body = { ...metricas(progress), registrado_por: i % 3 === 0 ? 'paciente' : 'doctor' };
    await sleep(WRITE_DELAY);
    const r = await req('POST', `/api/pacientes/${idPaciente}/signos-vitales`, body, token);
    if (r.ok) okSignos++;
    if (i % 20 === 0) console.log(`  monitoreo ${i + 1}/${MONITOREOS}...`);
  }
  console.log(`✓ Monitoreo continuo (signos): ${okSignos}`);

  const resumen = await req('GET', `/api/pacientes/${idPaciente}/resumen-medico`, null, token);
  if (resumen.ok) {
    const d = resumen.data?.data ?? resumen.data;
    console.log('\nResumen médico:', JSON.stringify(d, null, 2));
  }

  console.log('\nListo. Recarga el expediente de QA Paciente en la web.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
