/**
 * Validación de endpoints de Instituciones de Salud.
 * Ejecutar con la API encendida: node scripts/test-endpoints-instituciones-salud.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const BASE = process.env.API_URL || 'http://localhost:3000';
const API = `${BASE}/api`;
const ADMIN = { email: 'admin@clinica.com', password: 'Admin123!' };

let testsRun = 0;
let testsPassed = 0;

function ok(name, condition, detail = '') {
  testsRun++;
  if (condition) {
    testsPassed++;
    console.log(`  ✅ ${name}${detail ? ` (${detail})` : ''}`);
    return true;
  }
  console.log(`  ❌ ${name}${detail ? ` - ${detail}` : ''}`);
  return false;
}

function fail(name, message) {
  testsRun++;
  console.log(`  ❌ ${name} - ${message}`);
  return false;
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  VALIDACIÓN ENDPOINTS: /api/instituciones-salud');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`  API: ${BASE}\n`);

  let token;
  try {
    const loginRes = await axios.post(`${API}/auth/login`, {
      email: ADMIN.email,
      password: ADMIN.password
    });
    if (!loginRes.data?.token) throw new Error('Sin token');
    token = loginRes.data.token;
    ok('Login Admin', true);
  } catch (e) {
    fail('Login Admin', e.response?.data?.error || e.message);
    console.log('\n  Asegúrate de que la API esté corriendo y exista admin@clinica.com / Admin123!');
    process.exit(1);
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  // Comprobar que la ruta existe (evitar 404 por API sin reiniciar)
  try {
    const check = await axios.get(`${API}/instituciones-salud`, { validateStatus: () => true });
    if (check.status === 404) {
      console.log('\n  ❌ La ruta /api/instituciones-salud no está registrada.');
      console.log('  Reinicia la API (npm run dev) para cargar las rutas de instituciones de salud.\n');
      process.exit(1);
    }
  } catch (e) {
    if (e.response?.status === 404) {
      console.log('\n  ❌ La ruta /api/instituciones-salud no está registrada.');
      console.log('  Reinicia la API (npm run dev) para cargar las rutas de instituciones de salud.\n');
      process.exit(1);
    }
  }

  // ─── GET listado (público, sin auth) ───
  console.log('\n--- GET /api/instituciones-salud (sin auth) ---');
  try {
    const resPublic = await axios.get(`${API}/instituciones-salud`);
    ok('Status 200', resPublic.status === 200);
    ok('success true', resPublic.data?.success === true);
    ok('data.instituciones_salud es array', Array.isArray(resPublic.data?.data?.instituciones_salud));
    ok('data.total numérico', typeof resPublic.data?.data?.total === 'number');
    const list = resPublic.data?.data?.instituciones_salud ?? [];
    ok('total coincide con longitud', resPublic.data?.data?.total === list.length);
    if (list.length > 0) {
      const first = list[0];
      ok('item tiene id_institucion_salud', first.id_institucion_salud != null);
      ok('item tiene nombre', typeof first.nombre === 'string');
      ok('item tiene activo', typeof first.activo === 'boolean' || first.activo === 0 || first.activo === 1);
    }
  } catch (e) {
    fail('GET instituciones-salud (público)', e.response?.status || e.message);
  }

  // ─── GET listado con activo=false (todas) ───
  console.log('\n--- GET /api/instituciones-salud?activo=false ---');
  try {
    const resAll = await axios.get(`${API}/instituciones-salud`, { params: { activo: 'false' } });
    ok('Status 200', resAll.status === 200);
    ok('Respuesta con instituciones_salud', Array.isArray(resAll.data?.data?.instituciones_salud));
  } catch (e) {
    fail('GET ?activo=false', e.response?.status || e.message);
  }

  // ─── GET por ID inválido ───
  console.log('\n--- GET /api/instituciones-salud/:id (id inválido) ---');
  try {
    const res0 = await axios.get(`${API}/instituciones-salud/0`, { validateStatus: () => true });
    ok('ID 0 → 400', res0.status === 400);
  } catch (e) {
    ok('ID 0 → 400', e.response?.status === 400);
  }
  try {
    const res404 = await axios.get(`${API}/instituciones-salud/999999`, { validateStatus: () => true });
    ok('ID inexistente → 404', res404.status === 404);
  } catch (e) {
    ok('ID inexistente → 404', e.response?.status === 404);
  }

  // ─── GET por ID válido ───
  let createdId = null;
  let listForId = [];
  try {
    const listRes = await axios.get(`${API}/instituciones-salud`);
    listForId = listRes.data?.data?.instituciones_salud ?? [];
  } catch (_) {}
  const firstId = listForId.length > 0 ? listForId[0].id_institucion_salud : 1;
  console.log('\n--- GET /api/instituciones-salud/:id ---');
  try {
    const resOne = await axios.get(`${API}/instituciones-salud/${firstId}`);
    ok('Status 200', resOne.status === 200);
    ok('data.institucion_salud existe', resOne.data?.data?.institucion_salud != null);
    const inst = resOne.data?.data?.institucion_salud;
    ok('institucion_salud.id_institucion_salud', inst?.id_institucion_salud != null);
    ok('institucion_salud.nombre string', typeof inst?.nombre === 'string');
  } catch (e) {
    fail('GET por ID', e.response?.status || e.message);
  }

  // ─── POST (crear) - solo Admin ───
  console.log('\n--- POST /api/instituciones-salud (Admin) ---');
  const nombreTest = `Test Val E2E ${Date.now()}`;
  try {
    const resCreate = await axios.post(
      `${API}/instituciones-salud`,
      { nombre: nombreTest, activo: true },
      { headers }
    );
    ok('Status 201', resCreate.status === 201);
    ok('success true', resCreate.data?.success === true);
    const created = resCreate.data?.data?.institucion_salud ?? resCreate.data?.institucion_salud;
    ok('Respuesta incluye institucion_salud', created != null);
    ok('nombre coincide', created?.nombre === nombreTest);
    ok('activo true', created?.activo === true || created?.activo === 1);
    createdId = created?.id_institucion_salud ?? created?.id;
    ok('ID devuelto', createdId != null);
  } catch (e) {
    fail('POST crear', e.response?.data?.error || e.response?.status || e.message);
    if (e.response?.data?.error) console.log('    ', e.response.data.error);
  }

  // ─── POST sin auth → 401 ───
  console.log('\n--- POST sin token (401) ---');
  try {
    await axios.post(`${API}/instituciones-salud`, { nombre: 'X', activo: true });
    fail('POST sin auth debe dar 401', 'se esperaba 401');
  } catch (e) {
    ok('POST sin auth → 401', e.response?.status === 401);
  }

  // ─── PUT actualizar ───
  if (createdId) {
    console.log('\n--- PUT /api/instituciones-salud/:id ---');
    try {
      const resUpdate = await axios.put(
        `${API}/instituciones-salud/${createdId}`,
        { nombre: `${nombreTest} Actualizado`, activo: false },
        { headers }
      );
      ok('Status 200', resUpdate.status === 200);
      const updated = resUpdate.data?.data?.institucion_salud ?? resUpdate.data?.institucion_salud;
      ok('nombre actualizado', updated?.nombre === `${nombreTest} Actualizado`);
      ok('activo false', updated?.activo === false || updated?.activo === 0);
    } catch (e) {
      fail('PUT actualizar', e.response?.data?.error || e.message);
    }

    // GET después de actualizar
    try {
      const resGet = await axios.get(`${API}/instituciones-salud/${createdId}`);
      const inst = resGet.data?.data?.institucion_salud;
      ok('GET tras update: nombre correcto', inst?.nombre === `${nombreTest} Actualizado`);
      ok('GET tras update: activo false', inst?.activo === false || inst?.activo === 0);
    } catch (_) {}

    // ─── DELETE ───
    console.log('\n--- DELETE /api/instituciones-salud/:id ---');
    try {
      const resDel = await axios.delete(`${API}/instituciones-salud/${createdId}`, { headers });
      ok('Status 200', resDel.status === 200);
    } catch (e) {
      fail('DELETE', e.response?.data?.error || e.message);
    }

    try {
      await axios.get(`${API}/instituciones-salud/${createdId}`);
      fail('GET tras DELETE debe dar 404', 'se esperaba 404');
    } catch (e) {
      ok('GET tras DELETE → 404', e.response?.status === 404);
    }
  }

  // ─── Validación paciente: institucion_salud inválida → 400 ───
  console.log('\n--- Validación paciente con institucion_salud inválida ---');
  try {
    await axios.post(
      `${API}/pacientes`,
      {
        nombre: 'Val',
        apellido_paterno: 'Test',
        fecha_nacimiento: '1990-01-01',
        estado: 'Ciudad de México',
        institucion_salud: 'InstitucionInexistenteXYZ123'
      },
      { headers }
    );
    fail('Crear paciente con institución inválida debe dar 400', 'se esperaba 400');
  } catch (e) {
    ok('Paciente con institución inválida → 400', e.response?.status === 400);
    ok('Mensaje menciona catálogo', (e.response?.data?.error || '').toLowerCase().includes('catálogo') || (e.response?.data?.error || '').includes('institucion'));
  }

  // ─── Resumen ───
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  Resultado: ${testsPassed}/${testsRun} pruebas pasaron`);
  console.log('═══════════════════════════════════════════════════════════\n');
  process.exit(testsPassed === testsRun ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
