/**
 * Prueba todos los endpoints de login con los usuarios creados (crear-3-usuarios.js)
 * Ejecutar con la API encendida: node scripts/probar-login-usuarios.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const API = `${BASE_URL}/api`;

const CREDENTIALS = {
  admin: { email: 'admin@clinica.com', password: 'Admin123!' },
  doctor: { email: 'doctor@clinica.com', password: 'Doctor123!' },
  paciente: { id_paciente: 1, pin: '2020', device_id: 'test-device-1' }
};

async function test(name, fn) {
  try {
    const result = await fn();
    console.log(`  ✅ ${name}`);
    return { ok: true, result };
  } catch (err) {
    const msg = err.response?.data?.error || err.response?.data?.message || err.message;
    const status = err.response?.status;
    const details = err.response?.data?.details;
    console.log(`  ❌ ${name}: ${status || ''} ${msg}`);
    if (status === 500 && details) console.log(`     details: ${details}`);
    return { ok: false, status, error: msg, details };
  }
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  PRUEBAS DE LOGIN - Usuarios creados con crear-3-usuarios.js');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`  API: ${BASE_URL}\n`);

  const results = { admin: {}, doctor: {}, paciente: {} };

  // --- 1. POST /api/auth/login (usado por la app para Doctor/Admin)
  console.log('1️⃣  POST /api/auth/login (app Doctor/Admin)\n');
  results.admin.authLogin = await test('Admin', async () => {
    const r = await axios.post(`${API}/auth/login`, {
      email: CREDENTIALS.admin.email,
      password: CREDENTIALS.admin.password
    });
    if (!r.data.token || !r.data.usuario) throw new Error('Falta token o usuario');
    return r.data;
  });
  results.doctor.authLogin = await test('Doctor', async () => {
    const r = await axios.post(`${API}/auth/login`, {
      email: CREDENTIALS.doctor.email,
      password: CREDENTIALS.doctor.password
    });
    if (!r.data.token || !r.data.usuario) throw new Error('Falta token o usuario');
    return r.data;
  });

  // --- 2. POST /api/auth-unified/login-doctor-admin
  console.log('\n2️⃣  POST /api/auth-unified/login-doctor-admin\n');
  results.admin.unifiedDoctorAdmin = await test('Admin', async () => {
    const r = await axios.post(`${API}/auth-unified/login-doctor-admin`, {
      email: CREDENTIALS.admin.email,
      password: CREDENTIALS.admin.password
    });
    if (!r.data.token) throw new Error('Falta token');
    return r.data;
  });
  results.doctor.unifiedDoctorAdmin = await test('Doctor', async () => {
    const r = await axios.post(`${API}/auth-unified/login-doctor-admin`, {
      email: CREDENTIALS.doctor.email,
      password: CREDENTIALS.doctor.password
    });
    if (!r.data.token) throw new Error('Falta token');
    return r.data;
  });

  // --- 3. POST /api/mobile/login (alternativo móvil)
  console.log('\n3️⃣  POST /api/mobile/login\n');
  results.admin.mobileLogin = await test('Admin', async () => {
    const r = await axios.post(`${API}/mobile/login`, {
      email: CREDENTIALS.admin.email,
      password: CREDENTIALS.admin.password
    });
    if (!r.data.token) throw new Error('Falta token');
    return r.data;
  });
  results.doctor.mobileLogin = await test('Doctor', async () => {
    const r = await axios.post(`${API}/mobile/login`, {
      email: CREDENTIALS.doctor.email,
      password: CREDENTIALS.doctor.password
    });
    if (!r.data.token) throw new Error('Falta token');
    return r.data;
  });

  // --- 4. POST /api/auth-unified/login-paciente (PIN)
  console.log('\n4️⃣  POST /api/auth-unified/login-paciente (PIN 2020)\n');
  results.paciente.unifiedPaciente = await test('Paciente (id_paciente + pin)', async () => {
    const r = await axios.post(`${API}/auth-unified/login-paciente`, {
      id_paciente: CREDENTIALS.paciente.id_paciente,
      pin: CREDENTIALS.paciente.pin,
      device_id: CREDENTIALS.paciente.device_id
    });
    if (!r.data.token) throw new Error('Falta token');
    return r.data;
  });
  results.paciente.unifiedPacienteSoloPin = await test('Paciente (solo pin)', async () => {
    const r = await axios.post(`${API}/auth-unified/login-paciente`, {
      pin: CREDENTIALS.paciente.pin,
      device_id: CREDENTIALS.paciente.device_id
    });
    if (!r.data.token) throw new Error('Falta token');
    return r.data;
  });

  // --- Resumen
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  RESUMEN');
  console.log('═══════════════════════════════════════════════════════════\n');
  const authLoginOk = results.admin.authLogin.ok && results.doctor.authLogin.ok;
  const mobileOk = results.admin.mobileLogin.ok && results.doctor.mobileLogin.ok;
  const pacienteOk = results.paciente.unifiedPaciente.ok || results.paciente.unifiedPacienteSoloPin.ok;
  console.log(`  /api/auth/login (app):     ${authLoginOk ? '✅ OK' : '❌ FALLO'}`);
  console.log(`  /api/mobile/login:        ${mobileOk ? '✅ OK' : '❌ FALLO'}`);
  console.log(`  /api/auth-unified/login-paciente: ${pacienteOk ? '✅ OK' : '❌ FALLO'}`);
  console.log('\n  La app usa: POST /api/auth/login (Doctor/Admin) y /api/auth-unified/login-paciente (Paciente).\n');
  if (!authLoginOk || !pacienteOk) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
