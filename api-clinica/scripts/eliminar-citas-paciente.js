/**
 * Script para eliminar citas del paciente Eduardo Gonzalez Gonzalez
 * excepto la primera consulta
 * 
 * Ejecutar: node scripts/eliminar-citas-paciente.js
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function eliminarCitas() {
  let connection;
  
  try {
    console.log('🔍 Buscando paciente Eduardo Gonzalez Gonzalez...\n');

    // Crear conexión
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'clinica_db',
      multipleStatements: true
    });

    console.log('✅ Conectado a la base de datos\n');

    // 1. Buscar al paciente
    const [pacientes] = await connection.query(`
      SELECT 
        id_paciente,
        nombre,
        apellido_paterno,
        apellido_materno,
        CONCAT(nombre, ' ', apellido_paterno, ' ', apellido_materno) AS nombre_completo
      FROM pacientes
      WHERE nombre LIKE '%Eduardo%' 
        AND apellido_paterno LIKE '%Gonzalez%'
        AND apellido_materno LIKE '%Gonzalez%'
    `);

    if (pacientes.length === 0) {
      console.log('❌ No se encontró el paciente Eduardo Gonzalez Gonzalez');
      return;
    }

    const paciente = pacientes[0];
    console.log(`✅ Paciente encontrado: ${paciente.nombre_completo} (ID: ${paciente.id_paciente})\n`);

    // 2. Ver todas las citas antes de eliminar
    const [citasAntes] = await connection.query(`
      SELECT 
        c.id_cita,
        c.fecha_cita,
        c.motivo,
        c.es_primera_consulta,
        c.estado,
        c.asistencia
      FROM citas c
      WHERE c.id_paciente = ?
      ORDER BY c.fecha_cita ASC, c.id_cita ASC
    `, [paciente.id_paciente]);

    console.log(`📋 Citas encontradas: ${citasAntes.length}\n`);
    citasAntes.forEach((cita, index) => {
      console.log(`   ${index + 1}. Cita #${cita.id_cita} - ${cita.fecha_cita} - Primera consulta: ${cita.es_primera_consulta ? 'Sí' : 'No'}`);
    });

    if (citasAntes.length === 0) {
      console.log('\n⚠️  El paciente no tiene citas');
      return;
    }

    // 3. Identificar la primera consulta (la más antigua)
    const primeraConsulta = citasAntes.find(c => c.es_primera_consulta === 1 || c.es_primera_consulta === true);
    const primeraCita = primeraConsulta || citasAntes[0]; // Si no hay marcada como primera, usar la más antigua

    console.log(`\n🔒 Primera consulta a mantener: Cita #${primeraCita.id_cita} (${primeraCita.fecha_cita})\n`);

    // 4. Eliminar las demás citas
    const [resultado] = await connection.query(`
      DELETE FROM citas
      WHERE id_paciente = ?
        AND id_cita != ?
    `, [paciente.id_paciente, primeraCita.id_cita]);

    console.log(`✅ Citas eliminadas: ${resultado.affectedRows}\n`);

    // 5. Verificar las citas restantes
    const [citasDespues] = await connection.query(`
      SELECT 
        c.id_cita,
        c.fecha_cita,
        c.motivo,
        c.es_primera_consulta,
        c.estado,
        c.asistencia
      FROM citas c
      WHERE c.id_paciente = ?
      ORDER BY c.fecha_cita ASC, c.id_cita ASC
    `, [paciente.id_paciente]);

    console.log(`📋 Citas restantes: ${citasDespues.length}\n`);
    citasDespues.forEach((cita, index) => {
      console.log(`   ${index + 1}. Cita #${cita.id_cita} - ${cita.fecha_cita} - Primera consulta: ${cita.es_primera_consulta ? 'Sí' : 'No'}`);
    });

    console.log('\n✅ Proceso completado exitosamente');

  } catch (error) {
    console.error('❌ Error ejecutando script:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

eliminarCitas();

