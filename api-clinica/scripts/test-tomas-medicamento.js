/**
 * Script de prueba para registro y consulta de tomas de medicamentos.
 *
 * Uso:
 *   node scripts/test-tomas-medicamento.js
 *   node scripts/test-tomas-medicamento.js [idPaciente]
 *
 * Requiere API en marcha (API_URL en .env o por defecto http://localhost:3000).
 * Usa login Admin para obtener un paciente, sus medicamentos y probar POST/GET de tomas.
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const API_URL = process.env.API_URL || 'http://localhost:3000';

function hoyISO() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

async function request(method, url, data = null, token = null) {
  const config = {
    method,
    url: `${API_URL}${url}`,
    headers: { 'Content-Type': 'application/json' },
    validateStatus: () => true,
  };
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  if (data) config.data = data;
  const res = await axios(config);
  return { status: res.status, data: res.data };
}

async function main() {
  console.log('\n📋 Prueba: registro y consulta de tomas de medicamentos');
  console.log('========================================================\n');
  console.log('API_URL:', API_URL);

  // 1. Login Admin
  const login = await request('POST', '/api/auth/login', {
    email: 'admin@clinica.com',
    password: 'Admin123!',
  });
  if (login.status !== 200 || !login.data.token) {
    console.log('❌ Login Admin falló:', login.data?.error || login.status);
    process.exit(1);
  }
  const token = login.data.token;
  console.log('✅ Admin autenticado\n');

  // 2. Obtener id de paciente (argumento o primer paciente de la lista)
  let idPaciente = parseInt(process.argv[2], 10);
  if (!idPaciente || isNaN(idPaciente)) {
    const list = await request('GET', '/api/pacientes', null, token);
    const pacientes = list.data?.pacientes || list.data?.data || [];
    if (pacientes.length === 0) {
      console.log('❌ No hay pacientes en el sistema. Crea al menos uno.');
      process.exit(1);
    }
    idPaciente = pacientes[0].id_paciente;
    console.log('Paciente usado (primero de la lista):', idPaciente);
  } else {
    console.log('Paciente usado (argumento):', idPaciente);
  }

  // 3. Obtener medicamentos del paciente para tener id_plan
  const meds = await request('GET', `/api/pacientes/${idPaciente}/medicamentos?limit=5`, null, token);
  if (meds.status !== 200) {
    console.log('❌ Error obteniendo medicamentos:', meds.data?.error || meds.status);
    process.exit(1);
  }
  const lista = meds.data?.data ?? meds.data ?? [];
  if (lista.length === 0) {
    console.log('⚠️ Este paciente no tiene planes de medicación. Asigna medicamentos y vuelve a ejecutar.');
    process.exit(0);
  }
  const primerMed = lista[0];
  const id_plan_medicacion = primerMed.id_plan_medicacion ?? primerMed.id_plan;
  const id_plan_detalle = primerMed.id_detalle ?? primerMed.id_plan_detalle ?? null;
  console.log('✅ Medicamentos del paciente:', lista.length);
  console.log('   Primer plan (usado para la toma): id_plan =', id_plan_medicacion, id_plan_detalle != null ? ', id_detalle = ' + id_plan_detalle : '');

  // 4. Registrar una toma
  const horaToma = new Date().toTimeString().slice(0, 5);
  const postToma = await request('POST', '/api/medicamentos-toma', {
    id_plan_medicacion: id_plan_medicacion,
    id_plan_detalle: id_plan_detalle,
    hora_toma: horaToma,
    observaciones: 'Prueba desde script test-tomas-medicamento.js',
  }, token);

  if (postToma.status !== 200 && postToma.status !== 201) {
    console.log('❌ Error registrando toma:', postToma.data?.error || postToma.status, postToma.data);
    process.exit(1);
  }
  console.log('✅ Toma registrada (hora_toma:', horaToma + ')');

  // 5. Obtener tomas del paciente (hoy)
  const hoy = hoyISO();
  const getTomas = await request('GET', `/api/medicamentos-toma/paciente/${idPaciente}?fechaInicio=${hoy}&fechaFin=${hoy}`, null, token);
  if (getTomas.status !== 200) {
    console.log('❌ Error obteniendo tomas:', getTomas.data?.error || getTomas.status);
    process.exit(1);
  }
  const tomas = getTomas.data?.data ?? [];
  console.log('✅ Tomas de hoy (' + hoy + '):', tomas.length);
  if (tomas.length > 0) {
    tomas.forEach((t, i) => {
      console.log('   ', i + 1, '| id_plan_medicacion:', t.id_plan_medicacion, '| fecha_toma:', t.fecha_toma, '| hora_toma:', t.hora_toma || '-');
    });
  }

  console.log('\n========================================================');
  console.log('✅ Prueba completada: registro y consulta de tomas OK.\n');
}

main().catch((err) => {
  console.error('Error:', err.message);
  if (err.code === 'ECONNREFUSED') {
    console.error('Asegúrate de que la API esté corriendo en', API_URL);
  }
  process.exit(1);
});
