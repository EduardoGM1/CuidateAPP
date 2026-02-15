/**
 * Añade datos de prueba para FORMA: un signo vital para el primer paciente
 * del listado (mes actual), para que meses-disponibles devuelva al menos un periodo.
 * Ejecutar con la API encendida: node scripts/seed-forma-prueba.js
 * Si no hay pacientes, crea uno por API o, si falla, por BD directa (Sequelize).
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

/** Crea un paciente y un signo vital por BD (Sequelize) para tener datos FORMA. */
async function crearPacienteYSignoPorBD() {
  const sequelize = (await import('../config/db.js')).default;
  const { Paciente, SignoVital } = await import('../models/associations.js');
  const paciente = await Paciente.create({
    nombre: 'Paciente',
    apellido_paterno: 'FORMA Prueba',
    apellido_materno: 'Seed',
    fecha_nacimiento: '1990-01-15',
    sexo: 'Mujer',
    estado: 'Ciudad de México',
    activo: true
  });
  const idPaciente = paciente.id_paciente;
  await SignoVital.create({
    id_paciente: idPaciente,
    id_cita: null,
    fecha_medicion: new Date(),
    peso_kg: 70,
    fecha_creacion: new Date()
  });
  await sequelize.close();
  return idPaciente;
}

async function main() {
  console.log('\n  Seed FORMA: añadir signo vital de prueba para primer paciente\n');
  let token;
  try {
    const loginRes = await axios.post(`${API}/auth/login`, {
      email: ADMIN.email,
      password: ADMIN.password
    });
    if (!loginRes.data?.token) throw new Error('Sin token');
    token = loginRes.data.token;
  } catch (e) {
    console.error('  Login fallido:', e.response?.data?.error || e.message);
    process.exit(1);
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  let idPaciente;
  try {
    const pacRes = await axios.get(`${API}/pacientes`, { headers, params: { limit: 1 } });
    const data = pacRes.data?.data ?? pacRes.data?.pacientes ?? pacRes.data;
    const list = Array.isArray(data) ? data : [];
    if (list.length === 0) {
      console.log('  No hay pacientes. Creando uno de prueba vía API...');
      try {
        const createRes = await axios.post(
          `${API}/pacientes`,
          {
            nombre: 'Paciente',
            apellido_paterno: 'FORMA Prueba',
            apellido_materno: 'Seed',
            fecha_nacimiento: '1990-01-15',
            sexo: 'Mujer',
            estado: 'Ciudad de México'
          },
          { headers }
        );
        const created = createRes.data?.data ?? createRes.data?.paciente ?? createRes.data;
        idPaciente = created?.id_paciente ?? created?.id;
        if (!idPaciente) {
          console.error('  No se obtuvo id del paciente creado.');
          process.exit(1);
        }
        console.log(`  Paciente creado por API: id=${idPaciente}`);
        await axios.post(
          `${API}/pacientes/${idPaciente}/signos-vitales`,
          { peso_kg: 70 },
          { headers }
        );
        console.log(`  Signo vital creado para paciente id=${idPaciente} (mes actual).`);
      } catch (apiErr) {
        if (apiErr.response?.status === 400) {
          console.log('  Creación por API falló (validación). Creando por BD directa...');
          idPaciente = await crearPacienteYSignoPorBD();
          console.log(`  Paciente y signo creados por BD: id=${idPaciente}`);
        } else {
          throw apiErr;
        }
      }
    } else {
      idPaciente = list[0]?.id_paciente ?? list[0]?.id;
      try {
        await axios.post(
          `${API}/pacientes/${idPaciente}/signos-vitales`,
          { peso_kg: 70 },
          { headers }
        );
        console.log(`  Signo vital creado para paciente id=${idPaciente} (mes actual).`);
      } catch (e) {
        if (e.response?.status === 400 && /al menos un signo vital/i.test(e.response?.data?.error || '')) {
          console.log('  El paciente ya tiene signos o validación; continuando.');
        } else {
          throw e;
        }
      }
    }
  } catch (e) {
    const errData = e.response?.data;
    console.error('  Error:', e.response?.status ?? '', errData?.error || e.message);
    if (errData?.details) console.error('  Detalles:', JSON.stringify(errData.details, null, 2));
    process.exit(1);
  }

  console.log('  Listo. Ejecuta: node scripts/test-forma-web.js\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
