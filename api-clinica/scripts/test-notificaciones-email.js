/**
 * Script de prueba y diagnóstico de notificaciones por email.
 *
 * Uso:
 *   node scripts/test-notificaciones-email.js [email]
 *   node scripts/test-notificaciones-email.js --diagnostico [email]
 *   node scripts/test-notificaciones-email.js -d [email]
 *
 * Por defecto envía todas las notificaciones de prueba a eduardolalito99@hotmail.com
 * (o al email indicado). Con --diagnostico (-d) comprueba en BD: Usuario con ese email,
 * Doctor con ese id_usuario y cuántos pacientes tiene asignados (para diagnosticar
 * por qué el doctor no recibe el email de "nuevo mensaje").
 */

import dotenv from 'dotenv';
dotenv.config();

const args = process.argv.slice(2);
const isDiagnostico = args.includes('--diagnostico') || args.includes('-d');
const email = args.filter(a => !a.startsWith('-'))[0] || 'eduardolalito99@hotmail.com';

async function runDiagnostico() {
  console.log('\n🔍 Modo diagnóstico para email:', email);
  console.log('============================================\n');

  const { sequelize } = await import('../config/db.js');
  const { Usuario, Doctor, DoctorPaciente } = await import('../models/associations.js');

  try {
    await sequelize.authenticate();

    const usuario = await Usuario.findOne({ where: { email }, attributes: ['id_usuario', 'email', 'rol'] });
    if (!usuario) {
      console.log('❌ No existe ningún Usuario con email:', email);
      return;
    }
    console.log('✅ Usuario encontrado:', { id_usuario: usuario.id_usuario, email: usuario.email, rol: usuario.rol });

    const doctor = await Doctor.findOne({ where: { id_usuario: usuario.id_usuario }, attributes: ['id_doctor', 'nombre', 'apellido_paterno'] });
    if (!doctor) {
      console.log('⚠️ No existe Doctor vinculado a este usuario (id_usuario:', usuario.id_usuario, ')');
      return;
    }
    console.log('✅ Doctor encontrado:', { id_doctor: doctor.id_doctor, nombre: doctor.nombre, apellido_paterno: doctor.apellido_paterno });

    const count = await DoctorPaciente.count({ where: { id_doctor: doctor.id_doctor } });
    console.log('📋 Pacientes asignados a este doctor:', count);
    console.log('\n============================================\n');
  } finally {
    await sequelize.close();
  }
}

async function runPruebas() {
  console.log('\n📧 Enviando notificaciones de prueba a:', email);
  console.log('============================================\n');

  const emailService = (await import('../services/emailService.js')).default;

  const tipos = [
    { nombre: 'Bienvenida', fn: () => emailService.sendWelcomeEmail(email, email.split('@')[0], 'Doctor') },
    { nombre: 'Nuevo mensaje', fn: () => emailService.sendNewMessageNotification(email, { remitenteNombre: 'Paciente de prueba', previewTexto: 'Hola, tengo una duda...', enlaceApp: process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/chat` : '' }) },
    { nombre: 'Nuevo paciente', fn: () => emailService.sendPatientRegisteredNotification(email, { pacienteNombre: 'Juan Pérez García', id_paciente: 1 }) },
    { nombre: 'Cita agendada', fn: () => emailService.sendCitaConfirmationEmail(email, { fecha: 'lunes 10 de marzo de 2026', hora: '10:00', doctorNombre: 'Dr. Ricardo Mendoza', motivo: 'Control', reprogramada: false }) },
    { nombre: 'Cita reprogramada', fn: () => emailService.sendCitaConfirmationEmail(email, { fecha: 'martes 11 de marzo de 2026', hora: '11:30', doctorNombre: 'Dr. Ricardo Mendoza', motivo: 'Control', reprogramada: true }) },
    { nombre: 'Recordatorio cita', fn: () => emailService.sendCitaReminderEmail(email, { fecha: 'miércoles 12 de marzo de 2026', hora: '09:00', doctorNombre: 'Dr. Ricardo Mendoza', motivo: 'Revisión', lugar: 'Consultorio 1' }) },
    { nombre: 'Alerta signos vitales', fn: () => emailService.sendSignosVitalesAlertEmail(email, { pacienteNombre: 'Roberto Hernández', tipo: 'Presión arterial', severidad: 'moderada', mensaje: 'Presión arterial elevada. Valor: 145/95 mmHg.' }) }
  ];

  for (const t of tipos) {
    try {
      const result = await t.fn();
      console.log(result?.success !== false ? `✅ ${t.nombre}` : `⚠️ ${t.nombre}: ${result?.message || 'fallo'}`);
    } catch (err) {
      console.log(`❌ ${t.nombre}:`, err.message);
    }
  }

  console.log('\n============================================\n');
}

(async () => {
  if (isDiagnostico) {
    await runDiagnostico();
  } else {
    await runPruebas();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
