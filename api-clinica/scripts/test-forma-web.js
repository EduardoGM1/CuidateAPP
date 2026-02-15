/**
 * Pruebas de FORMA (solo web): meses-disponibles y forma por paciente.
 * Ejecutar con la API encendida: node scripts/test-forma-web.js
 * Opcional: node scripts/seed-forma-prueba.js para añadir datos de prueba.
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

function log(msg, isError = false) {
  console.log(isError ? `  ❌ ${msg}` : `  ${msg}`);
}

async function main() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  PRUEBAS FORMA (Registro Mensual GAM) - Solo app web');
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
    log('Login Admin OK');
  } catch (e) {
    log(`Login fallido: ${e.response?.data?.error || e.message}`, true);
    console.log('\n  Asegúrate de que la API esté corriendo y exista admin@clinica.com / Admin123!');
    process.exit(1);
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Client-Type': 'web'
  };

  // 1) Listar pacientes y tomar el primero
  let idPaciente;
  try {
    const pacRes = await axios.get(`${API}/pacientes`, { headers, params: { limit: 1 } });
    const data = pacRes.data?.data ?? pacRes.data?.pacientes ?? pacRes.data;
    const list = Array.isArray(data) ? data : [];
    if (list.length === 0) {
      log('No hay pacientes. Ejecuta: node scripts/seed-forma-prueba.js', true);
      process.exit(1);
    }
    idPaciente = list[0]?.id_paciente ?? list[0]?.id;
    if (!idPaciente) {
      log('No se pudo obtener id_paciente del listado', true);
      process.exit(1);
    }
    log(`Paciente de prueba: id_paciente = ${idPaciente}`);
  } catch (e) {
    log(`Error listando pacientes: ${e.response?.data?.error || e.message}`, true);
    process.exit(1);
  }

  // 2) GET meses-disponibles
  console.log('\n2️⃣  GET /api/reportes/forma/:idPaciente/meses-disponibles');
  let periodos = [];
  try {
    const mesesRes = await axios.get(
      `${API}/reportes/forma/${idPaciente}/meses-disponibles`,
      { headers }
    );
    periodos = mesesRes.data?.periodos ?? [];
    log(`Periodos disponibles: ${periodos.length}`);
    if (periodos.length > 0) {
      periodos.slice(0, 5).forEach((p) => log(`    - ${p.label} (mes=${p.mes}, anio=${p.anio})`));
      if (periodos.length > 5) log(`    ... y ${periodos.length - 5} más`);
    } else {
      log('  (ninguno; el paciente no tiene registros con fecha). Ejecuta: node scripts/seed-forma-prueba.js');
    }
  } catch (e) {
    log(`Error meses-disponibles: ${e.response?.status} ${e.response?.data?.error || e.message}`, true);
    process.exit(1);
  }

  // 3) GET forma con el primer periodo (o mes/anio actual si no hay periodos)
  console.log('\n3️⃣  GET /api/reportes/forma/:idPaciente?mes=&anio=');
  const ahora = new Date();
  const mes = periodos.length > 0 ? periodos[0].mes : ahora.getMonth() + 1;
  const anio = periodos.length > 0 ? periodos[0].anio : ahora.getFullYear();
  try {
    const formaRes = await axios.get(
      `${API}/reportes/forma/${idPaciente}`,
      { headers, params: { mes, anio }, timeout: 15000 }
    );
    const cabecera = formaRes.data?.cabecera;
    const filas = formaRes.data?.filas ?? [];
    if (!cabecera || !Array.isArray(filas)) {
      log('Respuesta sin cabecera o filas', true);
      process.exit(1);
    }
    log(`Cabecera: mes=${cabecera.mes}, anio=${cabecera.anio}, mesNombre=${cabecera.mesNombre}`);
    log(`Filas: ${filas.length} (debe ser 0 o 1 para un solo paciente)`);
    if (filas.length > 0) {
      const f = filas[0];
      log(`  Primera fila: n=${f.n}, nombre=${f.nombre}, edad=${f.edad}, sexo=${f.sexo}`);
    }
    log('Forma OK');
  } catch (e) {
    log(`Error forma: ${e.response?.status} ${e.response?.data?.error || e.message}`, true);
    process.exit(1);
  }

  console.log('\n  ✅ Todas las pruebas FORMA (web) pasaron.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
