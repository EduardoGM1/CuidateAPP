import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import {
  Usuario,
  Paciente,
  Doctor,
  SignoVital,
  AuthCredential,
} from '../models/associations.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';

/**
 * Script para crear un paciente de prueba con 6 meses de registros de signos vitales
 * para probar la funcionalidad de evolución
 * 
 * El paciente tendrá:
 * - Datos personales completos
 * - PIN: 9999
 * - 12-15 registros de signos vitales distribuidos en 6 meses
 * - Evolución realista (algunos valores mejorando, otros estables)
 */

(async () => {
  const transaction = await sequelize.transaction();
  
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    // ============================================
    // PASO 1: CREAR PACIENTE DE PRUEBA
    // ============================================
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('👤 CREANDO PACIENTE DE PRUEBA');
    logger.info('═══════════════════════════════════════════════════════════\n');

    // Verificar si ya existe un paciente con este nombre
    const pacienteExistente = await Paciente.findOne({
      where: {
        nombre: 'Juan',
        apellido_paterno: 'Prueba',
        apellido_materno: 'Evolución'
      },
      transaction
    });

    let paciente;
    if (pacienteExistente) {
      logger.info('⚠️  Paciente de prueba ya existe, eliminando datos anteriores...');
      // Eliminar signos vitales existentes
      await SignoVital.destroy({
        where: { id_paciente: pacienteExistente.id_paciente },
        transaction
      });
      // Eliminar credenciales existentes
      await AuthCredential.destroy({
        where: { 
          user_id: pacienteExistente.id_paciente,
          user_type: 'Paciente'
        },
        transaction
      });
      // Eliminar paciente
      await Paciente.destroy({
        where: { id_paciente: pacienteExistente.id_paciente },
        transaction
      });
      logger.info('✅ Datos anteriores eliminados');
    }

    // Crear nuevo paciente
    const fechaNacimiento = new Date(1980, 5, 15); // 15 de junio de 1980 (45 años)
    paciente = await Paciente.create({
      nombre: 'Juan',
      apellido_paterno: 'Prueba',
      apellido_materno: 'Evolución',
      fecha_nacimiento: fechaNacimiento.toISOString().split('T')[0],
      sexo: 'Hombre',
      institucion_salud: 'IMSS',
      estado: 'Estado de México',
      localidad: 'Ciudad de México',
      direccion: 'Calle de Prueba 123',
      numero_celular: '5551234567',
      activo: true,
      fecha_registro: new Date()
    }, { transaction });

    logger.info(`✅ Paciente creado: ${paciente.nombre} ${paciente.apellido_paterno}`, {
      id_paciente: paciente.id_paciente
    });

    // Crear credenciales con PIN 9999
    const pin = '9999';
    const salt = await bcrypt.genSalt(10);
    const hashedPin = await bcrypt.hash(pin, salt);

    await AuthCredential.create({
      user_id: paciente.id_paciente,
      user_type: 'Paciente',
      auth_method: 'pin',
      credential_value: hashedPin,
      pin_salt: salt,
      created_at: new Date(),
      activo: true
    }, { transaction });

    logger.info(`✅ Credenciales creadas: PIN = ${pin}`);

    // ============================================
    // PASO 2: GENERAR SIGNOS VITALES (6 MESES)
    // ============================================
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('📊 GENERANDO SIGNOS VITALES (6 MESES DE EVOLUCIÓN)');
    logger.info('═══════════════════════════════════════════════════════════\n');

    const hoy = new Date();
    const talla = 1.75; // 175 cm
    const signosVitalesData = [];

    // Generar aproximadamente 12 registros distribuidos en 6 meses
    // Uno cada 2 semanas aproximadamente
    const semanas = 26; // 6 meses = 26 semanas
    const registros = 13; // 13 registros (cada 2 semanas)

    for (let i = 0; i < registros; i++) {
      const semanasAtras = semanas - (i * 2); // Cada 2 semanas
      const fecha = new Date(hoy.getTime() - (semanasAtras * 7 * 24 * 60 * 60 * 1000));
      
      // Progresión realista de valores
      // Peso: Empezar en 85kg, bajar gradualmente a 78kg
      const pesoInicial = 85.0;
      const pesoFinal = 78.0;
      const progresionPeso = i / (registros - 1);
      const peso = pesoInicial - (progresionPeso * (pesoInicial - pesoFinal)) + (Math.random() * 0.5 - 0.25);

      // IMC: Calcular desde peso y talla
      const imc = parseFloat((peso / (talla * talla)).toFixed(2));

      // Cintura: Empezar en 105cm, bajar a 95cm
      const cinturaInicial = 105.0;
      const cinturaFinal = 95.0;
      const cintura = cinturaInicial - (progresionPeso * (cinturaInicial - cinturaFinal)) + (Math.random() * 1 - 0.5);

      // Presión: Empezar en 145/95, mejorar a 125/80
      const presionSistolicaInicial = 145;
      const presionSistolicaFinal = 125;
      const presionSistolica = Math.round(presionSistolicaInicial - (progresionPeso * (presionSistolicaInicial - presionSistolicaFinal)) + (Math.random() * 3 - 1.5));

      const presionDiastolicaInicial = 95;
      const presionDiastolicaFinal = 80;
      const presionDiastolica = Math.round(presionDiastolicaInicial - (progresionPeso * (presionDiastolicaInicial - presionDiastolicaFinal)) + (Math.random() * 2 - 1));

      // Glucosa: Empezar en 115, mejorar a 95
      const glucosaInicial = 115;
      const glucosaFinal = 95;
      const glucosa = Math.round(glucosaInicial - (progresionPeso * (glucosaInicial - glucosaFinal)) + (Math.random() * 4 - 2));

      // Colesterol: Empezar en 230, mejorar a 190
      const colesterolInicial = 230;
      const colesterolFinal = 190;
      const colesterol = Math.round(colesterolInicial - (progresionPeso * (colesterolInicial - colesterolFinal)) + (Math.random() * 5 - 2.5));

      // Triglicéridos: Empezar en 195, mejorar a 150
      const trigliceridosInicial = 195;
      const trigliceridosFinal = 150;
      const trigliceridos = Math.round(trigliceridosInicial - (progresionPeso * (trigliceridosInicial - trigliceridosFinal)) + (Math.random() * 5 - 2.5));

      // Colesterol HDL: Empezar en 38, mejorar a 45
      const hdlInicial = 38;
      const hdlFinal = 45;
      const hdl = Math.round(hdlInicial + (progresionPeso * (hdlFinal - hdlInicial)) + (Math.random() * 2 - 1));

      // Alternar entre registrado por paciente y doctor
      const registradoPor = i % 3 === 0 ? 'paciente' : 'doctor';

      signosVitalesData.push({
        fecha_medicion: fecha,
        peso_kg: parseFloat(peso.toFixed(2)),
        talla_m: talla,
        imc: imc,
        medida_cintura_cm: parseFloat(cintura.toFixed(1)),
        presion_sistolica: presionSistolica.toString(),
        presion_diastolica: presionDiastolica.toString(),
        glucosa_mg_dl: glucosa.toString(),
        colesterol_mg_dl: colesterol.toString(),
        colesterol_hdl: hdl.toString(),
        trigliceridos_mg_dl: trigliceridos.toString(),
        registrado_por: registradoPor,
        observaciones: i === 0 
          ? 'Primera medición - Valores iniciales elevados'
          : i === registros - 1
          ? 'Control final - Evolución muy positiva'
          : `Control ${i + 1} - Progreso continuo`
      });
    }

    // Ordenar por fecha (más antiguo primero)
    signosVitalesData.sort((a, b) => a.fecha_medicion - b.fecha_medicion);

    // Crear signos vitales
    const signosCreados = [];
    for (const signoData of signosVitalesData) {
      const signo = await SignoVital.create({
        id_paciente: paciente.id_paciente,
        ...signoData
      }, { transaction });
      signosCreados.push(signo);
      
      const fechaStr = signoData.fecha_medicion.toLocaleDateString('es-MX');
      logger.info(`✅ Signo vital ${signosCreados.length}/${registros}: ${fechaStr} - Peso: ${signoData.peso_kg}kg, Presión: ${signoData.presion_sistolica}/${signoData.presion_diastolica}, Glucosa: ${signoData.glucosa_mg_dl}`);
    }

    logger.info(`\n✅ ${signosCreados.length} signos vitales creados con evolución de 6 meses`);

    // ============================================
    // PASO 3: RESUMEN Y ESTADÍSTICAS
    // ============================================
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('📋 RESUMEN DE DATOS CREADOS');
    logger.info('═══════════════════════════════════════════════════════════\n');

    const primerSigno = signosVitalesData[0];
    const ultimoSigno = signosVitalesData[signosVitalesData.length - 1];

    logger.info('👤 PACIENTE:');
    logger.info(`   Nombre: ${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno}`);
    logger.info(`   ID: ${paciente.id_paciente}`);
    logger.info(`   PIN: 9999`);
    logger.info(`   Edad: ${Math.floor((hoy - fechaNacimiento) / (365.25 * 24 * 60 * 60 * 1000))} años`);
    logger.info(`   Sexo: ${paciente.sexo}`);

    logger.info('\n📊 EVOLUCIÓN DE SIGNOS VITALES:');
    logger.info(`   Período: ${primerSigno.fecha_medicion.toLocaleDateString('es-MX')} a ${ultimoSigno.fecha_medicion.toLocaleDateString('es-MX')}`);
    logger.info(`   Total de registros: ${signosCreados.length}`);
    logger.info(`   Frecuencia: Aproximadamente cada 2 semanas`);

    logger.info('\n📈 CAMBIOS PRINCIPALES:');
    logger.info(`   Peso: ${primerSigno.peso_kg}kg → ${ultimoSigno.peso_kg}kg (${(ultimoSigno.peso_kg - primerSigno.peso_kg).toFixed(1)}kg)`);
    logger.info(`   IMC: ${primerSigno.imc} → ${ultimoSigno.imc} (${(ultimoSigno.imc - primerSigno.imc).toFixed(2)})`);
    logger.info(`   Presión: ${primerSigno.presion_sistolica}/${primerSigno.presion_diastolica} → ${ultimoSigno.presion_sistolica}/${ultimoSigno.presion_diastolica}`);
    logger.info(`   Glucosa: ${primerSigno.glucosa_mg_dl} → ${ultimoSigno.glucosa_mg_dl} mg/dL`);
    logger.info(`   Colesterol: ${primerSigno.colesterol_mg_dl} → ${ultimoSigno.colesterol_mg_dl} mg/dL`);
    logger.info(`   HDL: ${primerSigno.colesterol_hdl} → ${ultimoSigno.colesterol_hdl} mg/dL`);
    logger.info(`   Triglicéridos: ${primerSigno.trigliceridos_mg_dl} → ${ultimoSigno.trigliceridos_mg_dl} mg/dL`);

    // ============================================
    // COMMIT TRANSACCIÓN
    // ============================================
    await transaction.commit();
    
    logger.info('\n═══════════════════════════════════════════════════════════');
    logger.info('✅ PACIENTE DE PRUEBA CREADO EXITOSAMENTE');
    logger.info('═══════════════════════════════════════════════════════════\n');
    logger.info('🎯 PRÓXIMOS PASOS:');
    logger.info('   1. Iniciar sesión con PIN: 9999');
    logger.info('   2. Ir a "Gráficos de Evolución"');
    logger.info('   3. Verificar que se muestran las mejoras implementadas');
    logger.info('   4. Ejecutar la Prueba 1 (verificación de datos GET)');
    logger.info('\n✅ Script finalizado correctamente');
    
    // Retornar información del paciente creado
    return {
      pacienteId: paciente.id_paciente,
      nombre: `${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno}`,
      pin: '9999',
      totalSignosVitales: signosCreados.length,
      fechaInicio: primerSigno.fecha_medicion,
      fechaFin: ultimoSigno.fecha_medicion
    };
    
  } catch (error) {
    await transaction.rollback();
    logger.error('❌ Error en el script:', error);
    logger.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();
