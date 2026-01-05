import { Paciente, PlanMedicacion, PlanDetalle, Medicamento } from '../models/associations.js';
import logger from '../utils/logger.js';

(async () => {
  try {
    console.log('\n🔧 RECONFIGURANDO MEDICAMENTOS PARA EDUARDO (PIN 2020)\n');

    // 1. Buscar paciente Eduardo
    console.log('1️⃣ Buscando paciente Eduardo (PIN 2020)...');
    const paciente = await Paciente.findOne({
      where: { id_paciente: 1 }, // Eduardo tiene id_paciente 1
      attributes: ['id_paciente', 'id_usuario', 'nombre', 'apellido_paterno']
    });

    if (!paciente) {
      console.error('❌ ERROR: No se encontró el paciente Eduardo');
      process.exit(1);
    }

    console.log('   ✅ Paciente encontrado:', {
      id_paciente: paciente.id_paciente,
      id_usuario: paciente.id_usuario,
      nombre: `${paciente.nombre} ${paciente.apellido_paterno}`
    });

    // 2. Buscar y eliminar planes de medicación existentes
    console.log('\n2️⃣ Eliminando planes de medicación existentes...');
    const planesExistentes = await PlanMedicacion.findAll({
      where: { id_paciente: paciente.id_paciente },
      include: [
        {
          model: PlanDetalle,
          as: 'PlanDetalles'
        }
      ]
    });

    let detallesEliminados = 0;
    for (const plan of planesExistentes) {
      if (plan.PlanDetalles && plan.PlanDetalles.length > 0) {
        await PlanDetalle.destroy({
          where: { id_plan: plan.id_plan }
        });
        detallesEliminados += plan.PlanDetalles.length;
      }
    }

    const planesEliminados = await PlanMedicacion.destroy({
      where: { id_paciente: paciente.id_paciente }
    });

    console.log(`   ✅ Eliminados ${planesEliminados} plan(es) de medicación`);
    console.log(`   ✅ Eliminados ${detallesEliminados} detalle(s) de medicación`);

    // 3. Obtener 10 medicamentos disponibles
    console.log('\n3️⃣ Obteniendo 10 medicamentos disponibles...');
    const medicamentos = await Medicamento.findAll({
      limit: 10,
      order: [['id_medicamento', 'ASC']],
      attributes: ['id_medicamento', 'nombre_medicamento']
    });

    if (medicamentos.length < 10) {
      console.warn(`   ⚠️  Solo se encontraron ${medicamentos.length} medicamentos (se necesitan 10)`);
    }

    console.log(`   ✅ Se usarán ${medicamentos.length} medicamentos`);

    // 4. Crear nuevo plan de medicación
    console.log('\n4️⃣ Creando nuevo plan de medicación...');
    const nuevoPlan = await PlanMedicacion.create({
      id_paciente: paciente.id_paciente,
      fecha_inicio: new Date(),
      fecha_fin: null,
      activo: true,
      observaciones: 'Plan de prueba - Notificaciones cada minuto desde 5:23 AM'
    });

    console.log('   ✅ Plan creado:', {
      id_plan: nuevoPlan.id_plan,
      fecha_inicio: nuevoPlan.fecha_inicio
    });

    // 5. Crear 10 detalles de medicación (uno por minuto desde 5:23)
    console.log('\n5️⃣ Creando 10 detalles de medicación (5:23 AM - 5:32 AM)...');
    
    const detalles = [];
    for (let i = 0; i < 10 && i < medicamentos.length; i++) {
      const hora = 5;
      const minuto = 23 + i; // 5:23, 5:24, 5:25, ..., 5:32
      const medicamento = medicamentos[i];

      const horarioStr = `${hora}:${minuto.toString().padStart(2, '0')}`;
      const detalle = await PlanDetalle.create({
        id_plan: nuevoPlan.id_plan,
        id_medicamento: medicamento.id_medicamento,
        horario: horarioStr,
        dosis: '1 tableta',
        frecuencia: 'Diaria',
        via_administracion: 'Oral',
        observaciones: `Notificación programada para las ${horarioStr} AM`
      });

      detalles.push({
        id_detalle: detalle.id_detalle,
        medicamento: medicamento.nombre_medicamento,
        horario: horarioStr
      });

      console.log(`   ✅ Medicamento ${i + 1}: ${medicamento.nombre_medicamento} a las ${horarioStr} AM`);
    }

    // 6. Resumen final
    console.log('\n✅ CONFIGURACIÓN COMPLETADA\n');
    console.log('📋 Resumen:');
    console.log(`   - Paciente: ${paciente.nombre} ${paciente.apellido_paterno} (ID: ${paciente.id_paciente})`);
    console.log(`   - Plan de medicación: ID ${nuevoPlan.id_plan}`);
    console.log(`   - Medicamentos configurados: ${detalles.length}`);
    console.log(`   - Horario de inicio: 5:23 AM`);
    console.log(`   - Horario de fin: 5:${(23 + detalles.length - 1).toString().padStart(2, '0')} AM`);
    console.log('\n📝 Detalles de medicación:');
    detalles.forEach((detalle, index) => {
      console.log(`   ${index + 1}. ${detalle.medicamento} - ${detalle.horario}`);
    });

    console.log('\n⏰ Las notificaciones se enviarán automáticamente cada minuto desde las 5:23 AM\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
})();



(async () => {
  try {
    console.log('\n🔧 RECONFIGURANDO MEDICAMENTOS PARA EDUARDO (PIN 2020)\n');

    // 1. Buscar paciente Eduardo
    console.log('1️⃣ Buscando paciente Eduardo (PIN 2020)...');
    const paciente = await Paciente.findOne({
      where: { id_paciente: 1 }, // Eduardo tiene id_paciente 1
      attributes: ['id_paciente', 'id_usuario', 'nombre', 'apellido_paterno']
    });

    if (!paciente) {
      console.error('❌ ERROR: No se encontró el paciente Eduardo');
      process.exit(1);
    }

    console.log('   ✅ Paciente encontrado:', {
      id_paciente: paciente.id_paciente,
      id_usuario: paciente.id_usuario,
      nombre: `${paciente.nombre} ${paciente.apellido_paterno}`
    });

    // 2. Buscar y eliminar planes de medicación existentes
    console.log('\n2️⃣ Eliminando planes de medicación existentes...');
    const planesExistentes = await PlanMedicacion.findAll({
      where: { id_paciente: paciente.id_paciente },
      include: [
        {
          model: PlanDetalle,
          as: 'PlanDetalles'
        }
      ]
    });

    let detallesEliminados = 0;
    for (const plan of planesExistentes) {
      if (plan.PlanDetalles && plan.PlanDetalles.length > 0) {
        await PlanDetalle.destroy({
          where: { id_plan: plan.id_plan }
        });
        detallesEliminados += plan.PlanDetalles.length;
      }
    }

    const planesEliminados = await PlanMedicacion.destroy({
      where: { id_paciente: paciente.id_paciente }
    });

    console.log(`   ✅ Eliminados ${planesEliminados} plan(es) de medicación`);
    console.log(`   ✅ Eliminados ${detallesEliminados} detalle(s) de medicación`);

    // 3. Obtener 10 medicamentos disponibles
    console.log('\n3️⃣ Obteniendo 10 medicamentos disponibles...');
    const medicamentos = await Medicamento.findAll({
      limit: 10,
      order: [['id_medicamento', 'ASC']],
      attributes: ['id_medicamento', 'nombre_medicamento']
    });

    if (medicamentos.length < 10) {
      console.warn(`   ⚠️  Solo se encontraron ${medicamentos.length} medicamentos (se necesitan 10)`);
    }

    console.log(`   ✅ Se usarán ${medicamentos.length} medicamentos`);

    // 4. Crear nuevo plan de medicación
    console.log('\n4️⃣ Creando nuevo plan de medicación...');
    const nuevoPlan = await PlanMedicacion.create({
      id_paciente: paciente.id_paciente,
      fecha_inicio: new Date(),
      fecha_fin: null,
      activo: true,
      observaciones: 'Plan de prueba - Notificaciones cada minuto desde 5:23 AM'
    });

    console.log('   ✅ Plan creado:', {
      id_plan: nuevoPlan.id_plan,
      fecha_inicio: nuevoPlan.fecha_inicio
    });

    // 5. Crear 10 detalles de medicación (uno por minuto desde 5:23)
    console.log('\n5️⃣ Creando 10 detalles de medicación (5:23 AM - 5:32 AM)...');
    
    const detalles = [];
    for (let i = 0; i < 10 && i < medicamentos.length; i++) {
      const hora = 5;
      const minuto = 23 + i; // 5:23, 5:24, 5:25, ..., 5:32
      const medicamento = medicamentos[i];

      const horarioStr = `${hora}:${minuto.toString().padStart(2, '0')}`;
      const detalle = await PlanDetalle.create({
        id_plan: nuevoPlan.id_plan,
        id_medicamento: medicamento.id_medicamento,
        horario: horarioStr,
        dosis: '1 tableta',
        frecuencia: 'Diaria',
        via_administracion: 'Oral',
        observaciones: `Notificación programada para las ${horarioStr} AM`
      });

      detalles.push({
        id_detalle: detalle.id_detalle,
        medicamento: medicamento.nombre_medicamento,
        horario: horarioStr
      });

      console.log(`   ✅ Medicamento ${i + 1}: ${medicamento.nombre_medicamento} a las ${horarioStr} AM`);
    }

    // 6. Resumen final
    console.log('\n✅ CONFIGURACIÓN COMPLETADA\n');
    console.log('📋 Resumen:');
    console.log(`   - Paciente: ${paciente.nombre} ${paciente.apellido_paterno} (ID: ${paciente.id_paciente})`);
    console.log(`   - Plan de medicación: ID ${nuevoPlan.id_plan}`);
    console.log(`   - Medicamentos configurados: ${detalles.length}`);
    console.log(`   - Horario de inicio: 5:23 AM`);
    console.log(`   - Horario de fin: 5:${(23 + detalles.length - 1).toString().padStart(2, '0')} AM`);
    console.log('\n📝 Detalles de medicación:');
    detalles.forEach((detalle, index) => {
      console.log(`   ${index + 1}. ${detalle.medicamento} - ${detalle.horario}`);
    });

    console.log('\n⏰ Las notificaciones se enviarán automáticamente cada minuto desde las 5:23 AM\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
})();









