/**
 * Añade datos de prueba para FORMA usando solo la BD (sin API).
 * Crea un paciente y un signo vital del mes actual para que meses-disponibles devuelva un periodo.
 * Uso: node scripts/seed-forma-solo-bd.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { Op } from 'sequelize';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  console.log('\n  Seed FORMA (solo BD): paciente + signo vital de prueba\n');
  const sequelize = (await import('../config/db.js')).default;
  const { Paciente, SignoVital } = await import('../models/associations.js');

  const count = await Paciente.count();
  if (count > 0) {
    const primero = await Paciente.findOne({ order: [['id_paciente', 'ASC']] });
    const idPaciente = primero.id_paciente;
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59);
    const existing = await SignoVital.count({
      where: {
        id_paciente: idPaciente,
        fecha_medicion: { [Op.between]: [inicioMes, finMes] }
      }
    });
    if (existing > 0) {
      console.log(`  El primer paciente (id=${idPaciente}) ya tiene signos en el mes actual.`);
      await sequelize.close();
      console.log('  Listo. Ejecuta: node scripts/test-forma-web.js\n');
      return;
    }
    await SignoVital.create({
      id_paciente: idPaciente,
      id_cita: null,
      fecha_medicion: new Date(),
      peso_kg: 70,
      fecha_creacion: new Date()
    });
    console.log(`  Signo vital añadido al paciente id=${idPaciente}.`);
  } else {
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
    console.log(`  Paciente y signo creados: id_paciente=${idPaciente}`);
  }
  await sequelize.close();
  console.log('  Listo. Ejecuta: node scripts/test-forma-web.js\n');
}

main().catch(async (e) => {
  console.error(e);
  try {
    const sequelize = (await import('../config/db.js')).default;
    await sequelize.close();
  } catch (_) {}
  process.exit(1);
});
