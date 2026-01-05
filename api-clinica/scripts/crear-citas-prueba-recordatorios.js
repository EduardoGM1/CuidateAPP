import { Cita, Paciente, Doctor } from '../models/associations.js';
import logger from '../utils/logger.js';

(async () => {
  try {
    console.log('\n📅 CREANDO CITAS DE PRUEBA PARA RECORDATORIOS AUTOMÁTICOS\n');

    // 1. Buscar paciente Eduardo
    console.log('1️⃣ Buscando paciente Eduardo...');
    const paciente = await Paciente.findOne({
      where: { id_paciente: 1 },
      attributes: ['id_paciente', 'id_usuario', 'nombre', 'apellido_paterno']
    });

    if (!paciente) {
      console.error('❌ ERROR: No se encontró el paciente Eduardo (ID: 1)');
      process.exit(1);
    }

    console.log('   ✅ Paciente encontrado:', {
      id_paciente: paciente.id_paciente,
      id_usuario: paciente.id_usuario,
      nombre: `${paciente.nombre} ${paciente.apellido_paterno}`
    });

    if (!paciente.id_usuario) {
      console.error('❌ ERROR: El paciente no tiene id_usuario. Las notificaciones no funcionarán.');
      process.exit(1);
    }

    // 2. Buscar un doctor disponible (opcional)
    console.log('\n2️⃣ Buscando doctor disponible...');
    const doctor = await Doctor.findOne({
      attributes: ['id_doctor', 'nombre', 'apellido_paterno'],
      limit: 1
    });

    const doctorId = doctor ? doctor.id_doctor : null;
    const doctorNombre = doctor ? `Dr. ${doctor.nombre} ${doctor.apellido_paterno}` : 'Dr. Prueba';

    if (doctor) {
      console.log('   ✅ Doctor encontrado:', doctorNombre);
    } else {
      console.log('   ⚠️  No se encontró doctor, se creará sin doctor asignado');
    }

    // 3. Eliminar citas de prueba anteriores (opcional)
    console.log('\n3️⃣ Limpiando citas de prueba anteriores...');
    const { Op } = await import('sequelize');
    const citasEliminadas = await Cita.destroy({
      where: {
        id_paciente: paciente.id_paciente,
        motivo: { [Op.like]: '%PRUEBA%' }
      }
    });
    console.log(`   ✅ ${citasEliminadas} cita(s) de prueba eliminada(s)`);

    // 4. Crear citas de prueba en diferentes rangos de tiempo
    console.log('\n4️⃣ Creando citas de prueba...');
    const ahora = new Date();
    const citas = [];

    // Cita 1: En 30 minutos (para probar inmediatamente)
    const cita30min = new Date(ahora.getTime() + (30 * 60 * 1000));
    const cita1 = await Cita.create({
      id_paciente: paciente.id_paciente,
      id_doctor: doctorId,
      fecha_cita: cita30min,
      motivo: 'PRUEBA - Cita en 30 minutos',
      estado: 'pendiente',
      asistencia: null,
      observaciones: 'Cita de prueba para recordatorio automático - 30 minutos'
    });
    citas.push({
      id: cita1.id_cita,
      tiempo: '30 minutos',
      fecha: cita30min.toLocaleString('es-MX'),
      motivo: cita1.motivo
    });
    console.log(`   ✅ Cita 1 creada: ${cita30min.toLocaleString('es-MX')} - ${cita1.motivo}`);

    // Cita 2: En 1 hora (para probar recordatorio 5h - dentro del rango)
    const cita1h = new Date(ahora.getTime() + (1 * 60 * 60 * 1000));
    const cita2 = await Cita.create({
      id_paciente: paciente.id_paciente,
      id_doctor: doctorId,
      fecha_cita: cita1h,
      motivo: 'PRUEBA - Cita en 1 hora',
      estado: 'pendiente',
      asistencia: null,
      observaciones: 'Cita de prueba para recordatorio automático - 1 hora'
    });
    citas.push({
      id: cita2.id_cita,
      tiempo: '1 hora',
      fecha: cita1h.toLocaleString('es-MX'),
      motivo: cita2.motivo
    });
    console.log(`   ✅ Cita 2 creada: ${cita1h.toLocaleString('es-MX')} - ${cita2.motivo}`);

    // Cita 3: En 5 horas (para probar recordatorio 5h)
    const cita5h = new Date(ahora.getTime() + (5 * 60 * 60 * 1000));
    const cita3 = await Cita.create({
      id_paciente: paciente.id_paciente,
      id_doctor: doctorId,
      fecha_cita: cita5h,
      motivo: 'PRUEBA - Cita en 5 horas',
      estado: 'pendiente',
      asistencia: null,
      observaciones: 'Cita de prueba para recordatorio automático - 5 horas'
    });
    citas.push({
      id: cita3.id_cita,
      tiempo: '5 horas',
      fecha: cita5h.toLocaleString('es-MX'),
      motivo: cita3.motivo
    });
    console.log(`   ✅ Cita 3 creada: ${cita5h.toLocaleString('es-MX')} - ${cita3.motivo}`);

    // Cita 4: En 24 horas (para probar recordatorio 24h)
    const cita24h = new Date(ahora.getTime() + (24 * 60 * 60 * 1000));
    const cita4 = await Cita.create({
      id_paciente: paciente.id_paciente,
      id_doctor: doctorId,
      fecha_cita: cita24h,
      motivo: 'PRUEBA - Cita en 24 horas',
      estado: 'pendiente',
      asistencia: null,
      observaciones: 'Cita de prueba para recordatorio automático - 24 horas'
    });
    citas.push({
      id: cita4.id_cita,
      tiempo: '24 horas',
      fecha: cita24h.toLocaleString('es-MX'),
      motivo: cita4.motivo
    });
    console.log(`   ✅ Cita 4 creada: ${cita24h.toLocaleString('es-MX')} - ${cita4.motivo}`);

    // Cita 5: En 25 horas (para probar recordatorio 24h - dentro del rango)
    const cita25h = new Date(ahora.getTime() + (25 * 60 * 60 * 1000));
    const cita5 = await Cita.create({
      id_paciente: paciente.id_paciente,
      id_doctor: doctorId,
      fecha_cita: cita25h,
      motivo: 'PRUEBA - Cita en 25 horas',
      estado: 'pendiente',
      asistencia: null,
      observaciones: 'Cita de prueba para recordatorio automático - 25 horas'
    });
    citas.push({
      id: cita5.id_cita,
      tiempo: '25 horas',
      fecha: cita25h.toLocaleString('es-MX'),
      motivo: cita5.motivo
    });
    console.log(`   ✅ Cita 5 creada: ${cita25h.toLocaleString('es-MX')} - ${cita5.motivo}`);

    // 5. Resumen final
    console.log('\n✅ CITAS DE PRUEBA CREADAS EXITOSAMENTE\n');
    console.log('📋 Resumen:');
    console.log(`   - Paciente: ${paciente.nombre} ${paciente.apellido_paterno} (ID: ${paciente.id_paciente})`);
    console.log(`   - Usuario: ID ${paciente.id_usuario}`);
    console.log(`   - Doctor: ${doctorNombre}`);
    console.log(`   - Total de citas creadas: ${citas.length}\n`);

    console.log('📝 Detalles de las citas:');
    citas.forEach((cita, index) => {
      console.log(`   ${index + 1}. Cita #${cita.id} - ${cita.tiempo}`);
      console.log(`      Fecha: ${cita.fecha}`);
      console.log(`      Motivo: ${cita.motivo}\n`);
    });

    console.log('⏰ RECORDATORIOS AUTOMÁTICOS:');
    console.log('   📅 Recordatorio 24h:');
    console.log('      - Se ejecuta cada hora');
    console.log('      - Detecta citas entre 23.5 y 24.5 horas antes');
    console.log('      - Citas que recibirán este recordatorio: Cita 4 y Cita 5\n');
    
    console.log('   ⏰ Recordatorio 5h:');
    console.log('      - Se ejecuta cada 15 minutos');
    console.log('      - Detecta citas entre 4.5 y 5.5 horas antes');
    console.log('      - Citas que recibirán este recordatorio: Cita 3\n');

    console.log('   ⚠️  NOTA:');
    console.log('      - Las citas en 30 minutos y 1 hora NO recibirán recordatorios automáticos');
    console.log('      - Los recordatorios solo se envían a 24h y 5h antes de la cita');
    console.log('      - Para probar inmediatamente, puedes ejecutar manualmente:');
    console.log('        node scripts/probar-notificacion-cita.js\n');

    console.log('🔔 PRÓXIMAS EJECUCIONES:');
    const proximaEjecucion24h = new Date(ahora);
    proximaEjecucion24h.setMinutes(0, 0, 0);
    if (proximaEjecucion24h.getTime() <= ahora.getTime()) {
      proximaEjecucion24h.setHours(proximaEjecucion24h.getHours() + 1);
    }
    console.log(`   - Recordatorio 24h: ${proximaEjecucion24h.toLocaleString('es-MX')}`);
    
    const proximaEjecucion5h = new Date(ahora);
    const minutosRestantes = 15 - (proximaEjecucion5h.getMinutes() % 15);
    proximaEjecucion5h.setMinutes(proximaEjecucion5h.getMinutes() + minutosRestantes, 0, 0);
    console.log(`   - Recordatorio 5h: ${proximaEjecucion5h.toLocaleString('es-MX')}\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
})();



(async () => {
  try {
    console.log('\n📅 CREANDO CITAS DE PRUEBA PARA RECORDATORIOS AUTOMÁTICOS\n');

    // 1. Buscar paciente Eduardo
    console.log('1️⃣ Buscando paciente Eduardo...');
    const paciente = await Paciente.findOne({
      where: { id_paciente: 1 },
      attributes: ['id_paciente', 'id_usuario', 'nombre', 'apellido_paterno']
    });

    if (!paciente) {
      console.error('❌ ERROR: No se encontró el paciente Eduardo (ID: 1)');
      process.exit(1);
    }

    console.log('   ✅ Paciente encontrado:', {
      id_paciente: paciente.id_paciente,
      id_usuario: paciente.id_usuario,
      nombre: `${paciente.nombre} ${paciente.apellido_paterno}`
    });

    if (!paciente.id_usuario) {
      console.error('❌ ERROR: El paciente no tiene id_usuario. Las notificaciones no funcionarán.');
      process.exit(1);
    }

    // 2. Buscar un doctor disponible (opcional)
    console.log('\n2️⃣ Buscando doctor disponible...');
    const doctor = await Doctor.findOne({
      attributes: ['id_doctor', 'nombre', 'apellido_paterno'],
      limit: 1
    });

    const doctorId = doctor ? doctor.id_doctor : null;
    const doctorNombre = doctor ? `Dr. ${doctor.nombre} ${doctor.apellido_paterno}` : 'Dr. Prueba';

    if (doctor) {
      console.log('   ✅ Doctor encontrado:', doctorNombre);
    } else {
      console.log('   ⚠️  No se encontró doctor, se creará sin doctor asignado');
    }

    // 3. Eliminar citas de prueba anteriores (opcional)
    console.log('\n3️⃣ Limpiando citas de prueba anteriores...');
    const { Op } = await import('sequelize');
    const citasEliminadas = await Cita.destroy({
      where: {
        id_paciente: paciente.id_paciente,
        motivo: { [Op.like]: '%PRUEBA%' }
      }
    });
    console.log(`   ✅ ${citasEliminadas} cita(s) de prueba eliminada(s)`);

    // 4. Crear citas de prueba en diferentes rangos de tiempo
    console.log('\n4️⃣ Creando citas de prueba...');
    const ahora = new Date();
    const citas = [];

    // Cita 1: En 30 minutos (para probar inmediatamente)
    const cita30min = new Date(ahora.getTime() + (30 * 60 * 1000));
    const cita1 = await Cita.create({
      id_paciente: paciente.id_paciente,
      id_doctor: doctorId,
      fecha_cita: cita30min,
      motivo: 'PRUEBA - Cita en 30 minutos',
      estado: 'pendiente',
      asistencia: null,
      observaciones: 'Cita de prueba para recordatorio automático - 30 minutos'
    });
    citas.push({
      id: cita1.id_cita,
      tiempo: '30 minutos',
      fecha: cita30min.toLocaleString('es-MX'),
      motivo: cita1.motivo
    });
    console.log(`   ✅ Cita 1 creada: ${cita30min.toLocaleString('es-MX')} - ${cita1.motivo}`);

    // Cita 2: En 1 hora (para probar recordatorio 5h - dentro del rango)
    const cita1h = new Date(ahora.getTime() + (1 * 60 * 60 * 1000));
    const cita2 = await Cita.create({
      id_paciente: paciente.id_paciente,
      id_doctor: doctorId,
      fecha_cita: cita1h,
      motivo: 'PRUEBA - Cita en 1 hora',
      estado: 'pendiente',
      asistencia: null,
      observaciones: 'Cita de prueba para recordatorio automático - 1 hora'
    });
    citas.push({
      id: cita2.id_cita,
      tiempo: '1 hora',
      fecha: cita1h.toLocaleString('es-MX'),
      motivo: cita2.motivo
    });
    console.log(`   ✅ Cita 2 creada: ${cita1h.toLocaleString('es-MX')} - ${cita2.motivo}`);

    // Cita 3: En 5 horas (para probar recordatorio 5h)
    const cita5h = new Date(ahora.getTime() + (5 * 60 * 60 * 1000));
    const cita3 = await Cita.create({
      id_paciente: paciente.id_paciente,
      id_doctor: doctorId,
      fecha_cita: cita5h,
      motivo: 'PRUEBA - Cita en 5 horas',
      estado: 'pendiente',
      asistencia: null,
      observaciones: 'Cita de prueba para recordatorio automático - 5 horas'
    });
    citas.push({
      id: cita3.id_cita,
      tiempo: '5 horas',
      fecha: cita5h.toLocaleString('es-MX'),
      motivo: cita3.motivo
    });
    console.log(`   ✅ Cita 3 creada: ${cita5h.toLocaleString('es-MX')} - ${cita3.motivo}`);

    // Cita 4: En 24 horas (para probar recordatorio 24h)
    const cita24h = new Date(ahora.getTime() + (24 * 60 * 60 * 1000));
    const cita4 = await Cita.create({
      id_paciente: paciente.id_paciente,
      id_doctor: doctorId,
      fecha_cita: cita24h,
      motivo: 'PRUEBA - Cita en 24 horas',
      estado: 'pendiente',
      asistencia: null,
      observaciones: 'Cita de prueba para recordatorio automático - 24 horas'
    });
    citas.push({
      id: cita4.id_cita,
      tiempo: '24 horas',
      fecha: cita24h.toLocaleString('es-MX'),
      motivo: cita4.motivo
    });
    console.log(`   ✅ Cita 4 creada: ${cita24h.toLocaleString('es-MX')} - ${cita4.motivo}`);

    // Cita 5: En 25 horas (para probar recordatorio 24h - dentro del rango)
    const cita25h = new Date(ahora.getTime() + (25 * 60 * 60 * 1000));
    const cita5 = await Cita.create({
      id_paciente: paciente.id_paciente,
      id_doctor: doctorId,
      fecha_cita: cita25h,
      motivo: 'PRUEBA - Cita en 25 horas',
      estado: 'pendiente',
      asistencia: null,
      observaciones: 'Cita de prueba para recordatorio automático - 25 horas'
    });
    citas.push({
      id: cita5.id_cita,
      tiempo: '25 horas',
      fecha: cita25h.toLocaleString('es-MX'),
      motivo: cita5.motivo
    });
    console.log(`   ✅ Cita 5 creada: ${cita25h.toLocaleString('es-MX')} - ${cita5.motivo}`);

    // 5. Resumen final
    console.log('\n✅ CITAS DE PRUEBA CREADAS EXITOSAMENTE\n');
    console.log('📋 Resumen:');
    console.log(`   - Paciente: ${paciente.nombre} ${paciente.apellido_paterno} (ID: ${paciente.id_paciente})`);
    console.log(`   - Usuario: ID ${paciente.id_usuario}`);
    console.log(`   - Doctor: ${doctorNombre}`);
    console.log(`   - Total de citas creadas: ${citas.length}\n`);

    console.log('📝 Detalles de las citas:');
    citas.forEach((cita, index) => {
      console.log(`   ${index + 1}. Cita #${cita.id} - ${cita.tiempo}`);
      console.log(`      Fecha: ${cita.fecha}`);
      console.log(`      Motivo: ${cita.motivo}\n`);
    });

    console.log('⏰ RECORDATORIOS AUTOMÁTICOS:');
    console.log('   📅 Recordatorio 24h:');
    console.log('      - Se ejecuta cada hora');
    console.log('      - Detecta citas entre 23.5 y 24.5 horas antes');
    console.log('      - Citas que recibirán este recordatorio: Cita 4 y Cita 5\n');
    
    console.log('   ⏰ Recordatorio 5h:');
    console.log('      - Se ejecuta cada 15 minutos');
    console.log('      - Detecta citas entre 4.5 y 5.5 horas antes');
    console.log('      - Citas que recibirán este recordatorio: Cita 3\n');

    console.log('   ⚠️  NOTA:');
    console.log('      - Las citas en 30 minutos y 1 hora NO recibirán recordatorios automáticos');
    console.log('      - Los recordatorios solo se envían a 24h y 5h antes de la cita');
    console.log('      - Para probar inmediatamente, puedes ejecutar manualmente:');
    console.log('        node scripts/probar-notificacion-cita.js\n');

    console.log('🔔 PRÓXIMAS EJECUCIONES:');
    const proximaEjecucion24h = new Date(ahora);
    proximaEjecucion24h.setMinutes(0, 0, 0);
    if (proximaEjecucion24h.getTime() <= ahora.getTime()) {
      proximaEjecucion24h.setHours(proximaEjecucion24h.getHours() + 1);
    }
    console.log(`   - Recordatorio 24h: ${proximaEjecucion24h.toLocaleString('es-MX')}`);
    
    const proximaEjecucion5h = new Date(ahora);
    const minutosRestantes = 15 - (proximaEjecucion5h.getMinutes() % 15);
    proximaEjecucion5h.setMinutes(proximaEjecucion5h.getMinutes() + minutosRestantes, 0, 0);
    console.log(`   - Recordatorio 5h: ${proximaEjecucion5h.toLocaleString('es-MX')}\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
})();









