/**
 * Script para probar la evolución de signos vitales del paciente de prueba
 * 
 * Este script:
 * 1. Obtiene los signos vitales del paciente de prueba
 * 2. Ejecuta las funciones de análisis evolutivo
 * 3. Muestra los resultados
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../config/db.js';
import { SignoVital, Paciente } from '../models/associations.js';
import logger from '../utils/logger.js';

// Importar funciones de análisis (versión simplificada para Node.js)
const calcularTendencia = (datos, campo) => {
  if (!datos || datos.length < 3) {
    return {
      tendencia: 'insuficiente',
      mensaje: 'Se necesitan al menos 3 registros',
      pendiente: null,
      cambioPromedio: null
    };
  }

  const valoresValidos = datos
    .filter(signo => {
      const valor = signo[campo];
      return valor !== null && valor !== undefined && !isNaN(parseFloat(valor));
    })
    .map((signo) => ({
      valor: parseFloat(signo[campo]),
      fecha: new Date(signo.fecha_medicion || signo.fecha_registro || signo.fecha_creacion)
    }))
    .sort((a, b) => a.fecha - b.fecha);

  if (valoresValidos.length < 3) {
    return {
      tendencia: 'insuficiente',
      mensaje: 'Datos insuficientes',
      pendiente: null,
      cambioPromedio: null
    };
  }

  const n = valoresValidos.length;
  const indices = valoresValidos.map((_, i) => i);
  const valores = valoresValidos.map(v => v.valor);
  
  const sumX = indices.reduce((sum, x) => sum + x, 0);
  const sumY = valores.reduce((sum, y) => sum + y, 0);
  const sumXY = indices.reduce((sum, x, i) => sum + x * valores[i], 0);
  const sumX2 = indices.reduce((sum, x) => sum + x * x, 0);

  const pendiente = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  const primerValor = valoresValidos[0].valor;
  const ultimoValor = valoresValidos[valoresValidos.length - 1].valor;
  const cambioTotal = ultimoValor - primerValor;
  const diasTranscurridos = (valoresValidos[valoresValidos.length - 1].fecha - valoresValidos[0].fecha) / (1000 * 60 * 60 * 24);
  const cambioPromedio = diasTranscurridos > 0 ? cambioTotal / diasTranscurridos : 0;

  let tendencia = 'estable';
  let mensaje = 'Estable';
  let color = '#FF9800';
  let icono = '➡️';

  if (Math.abs(pendiente) < 0.5) {
    tendencia = 'estable';
    mensaje = 'Estable';
    color = '#FF9800';
    icono = '➡️';
  } else if (pendiente > 0) {
    tendencia = 'empeorando';
    mensaje = 'Aumentando';
    color = '#F44336';
    icono = '📈';
  } else {
    tendencia = 'mejorando';
    mensaje = 'Mejorando';
    color = '#4CAF50';
    icono = '📉';
  }

  return {
    tendencia,
    mensaje,
    pendiente: pendiente.toFixed(4),
    cambioPromedio: cambioPromedio.toFixed(2),
    cambioTotal: cambioTotal.toFixed(2),
    primerValor: primerValor.toFixed(2),
    ultimoValor: ultimoValor.toFixed(2),
    color,
    icono,
    puntosAnalizados: valoresValidos.length,
    diasTranscurridos: Math.round(diasTranscurridos)
  };
};

const calcularEstadisticas = (datos, campo) => {
  if (!datos || datos.length === 0) return null;

  const valores = datos
    .map(s => {
      const valor = s[campo];
      return valor !== null && valor !== undefined ? parseFloat(valor) : null;
    })
    .filter(v => v !== null && !isNaN(v));
  
  if (valores.length === 0) return null;
  
  const suma = valores.reduce((a, b) => a + b, 0);
  const promedio = suma / valores.length;
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  
  const varianza = valores.reduce((sum, v) => sum + Math.pow(v - promedio, 2), 0) / valores.length;
  const desviacion = Math.sqrt(varianza);
  
  const coeficienteVariacion = promedio !== 0 ? (desviacion / promedio) * 100 : 0;
  
  let estabilidad = 'estable';
  let colorEstabilidad = '#4CAF50';
  let mensajeEstabilidad = 'Estable';
  
  if (coeficienteVariacion > 20) {
    estabilidad = 'variable';
    colorEstabilidad = '#F44336';
    mensajeEstabilidad = 'Variable';
  } else if (coeficienteVariacion > 10) {
    estabilidad = 'moderada';
    colorEstabilidad = '#FF9800';
    mensajeEstabilidad = 'Moderadamente variable';
  }
  
  return {
    promedio: promedio.toFixed(2),
    minimo: minimo.toFixed(2),
    maximo: maximo.toFixed(2),
    desviacion: desviacion.toFixed(2),
    coeficienteVariacion: coeficienteVariacion.toFixed(1),
    estabilidad,
    colorEstabilidad,
    mensajeEstabilidad,
    totalRegistros: valores.length
  };
};

const compararPeriodos = (datos, campo, diasPeriodo = 30) => {
  if (!datos || datos.length === 0) return null;

  const ahora = new Date();
  const fechaLimiteActual = new Date(ahora.getTime() - diasPeriodo * 24 * 60 * 60 * 1000);
  const fechaLimiteAnterior = new Date(ahora.getTime() - (diasPeriodo * 2) * 24 * 60 * 60 * 1000);
  
  const periodoActual = datos.filter(signo => {
    const fecha = new Date(signo.fecha_medicion || signo.fecha_registro || signo.fecha_creacion);
    return fecha >= fechaLimiteActual;
  }).map(s => {
    const valor = s[campo];
    return valor !== null && valor !== undefined ? parseFloat(valor) : null;
  }).filter(v => v !== null && !isNaN(v));
  
  const periodoAnterior = datos.filter(signo => {
    const fecha = new Date(signo.fecha_medicion || signo.fecha_registro || signo.fecha_creacion);
    return fecha >= fechaLimiteAnterior && fecha < fechaLimiteActual;
  }).map(s => {
    const valor = s[campo];
    return valor !== null && valor !== undefined ? parseFloat(valor) : null;
  }).filter(v => v !== null && !isNaN(v));
  
  if (periodoActual.length === 0 || periodoAnterior.length === 0) {
    return null;
  }
  
  const promedioActual = periodoActual.reduce((sum, v) => sum + v, 0) / periodoActual.length;
  const promedioAnterior = periodoAnterior.reduce((sum, v) => sum + v, 0) / periodoAnterior.length;
  
  const diferencia = promedioActual - promedioAnterior;
  const porcentaje = promedioAnterior !== 0 ? ((diferencia / promedioAnterior) * 100) : 0;
  
  let estado = 'igual';
  let mensaje = '';
  let color = '#666';
  
  if (Math.abs(diferencia) < 2) {
    estado = 'igual';
    mensaje = 'Estable';
    color = '#FF9800';
  } else if (diferencia < 0) {
    estado = 'mejoro';
    mensaje = 'Mejoró';
    color = '#4CAF50';
  } else {
    estado = 'empeoro';
    mensaje = 'Aumentó';
    color = '#F44336';
  }
  
  return {
    periodoActual: {
      promedio: promedioActual.toFixed(2),
      registros: periodoActual.length
    },
    periodoAnterior: {
      promedio: promedioAnterior.toFixed(2),
      registros: periodoAnterior.length
    },
    diferencia: diferencia.toFixed(2),
    porcentaje: Math.abs(porcentaje).toFixed(1),
    estado,
    mensaje,
    color
  };
};

(async () => {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conexión a la base de datos establecida\n');

    // Buscar paciente de prueba
    const paciente = await Paciente.findOne({
      where: {
        nombre: 'Juan',
        apellido_paterno: 'Prueba',
        apellido_materno: 'Evolución'
      }
    });

    if (!paciente) {
      logger.error('❌ No se encontró el paciente de prueba');
      logger.info('💡 Ejecuta primero: node scripts/crear-paciente-prueba-evolucion-6-meses.js');
      process.exit(1);
    }

    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('📊 PRUEBA DE EVOLUCIÓN DE SIGNOS VITALES');
    logger.info('═══════════════════════════════════════════════════════════\n');
    logger.info(`👤 Paciente: ${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno}`);
    logger.info(`   ID: ${paciente.id_paciente}\n`);

    // Obtener signos vitales
    const signosVitales = await SignoVital.findAll({
      where: { id_paciente: paciente.id_paciente },
      order: [['fecha_medicion', 'DESC']]
    });

    logger.info(`📋 Total de signos vitales: ${signosVitales.length}\n`);

    if (signosVitales.length === 0) {
      logger.error('❌ No se encontraron signos vitales');
      process.exit(1);
    }

    // Probar análisis para cada tipo de signo vital
    const tipos = [
      { nombre: 'Presión Sistólica', campo: 'presion_sistolica', unidad: 'mmHg' },
      { nombre: 'Glucosa', campo: 'glucosa_mg_dl', unidad: 'mg/dL' },
      { nombre: 'Peso', campo: 'peso_kg', unidad: 'kg' },
      { nombre: 'IMC', campo: 'imc', unidad: '' },
    ];

    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('📈 ANÁLISIS DE EVOLUCIÓN');
    logger.info('═══════════════════════════════════════════════════════════\n');

    tipos.forEach(tipo => {
      const tieneDatos = signosVitales.some(s => {
        const valor = s[tipo.campo];
        return valor !== null && valor !== undefined;
      });

      if (!tieneDatos) {
        logger.info(`⚠️  ${tipo.nombre}: No hay datos disponibles\n`);
        return;
      }

      logger.info(`📊 ${tipo.nombre} (${tipo.unidad}):`);
      logger.info('─'.repeat(60));

      // Tendencia
      if (signosVitales.length >= 3) {
        const tendencia = calcularTendencia(signosVitales, tipo.campo);
        if (tendencia.tendencia !== 'insuficiente') {
          logger.info(`   ${tendencia.icono} Tendencia: ${tendencia.mensaje}`);
          logger.info(`   Cambio total: ${tendencia.cambioTotal} ${tipo.unidad}`);
          logger.info(`   Cambio promedio: ${tendencia.cambioPromedio} ${tipo.unidad}/día`);
          logger.info(`   Período: ${tendencia.diasTranscurridos} días`);
          logger.info(`   Primer valor: ${tendencia.primerValor} ${tipo.unidad}`);
          logger.info(`   Último valor: ${tendencia.ultimoValor} ${tipo.unidad}`);
        } else {
          logger.info(`   ⚠️  Tendencia: ${tendencia.mensaje}`);
        }
      }

      // Estadísticas
      const estadisticas = calcularEstadisticas(signosVitales, tipo.campo);
      if (estadisticas) {
        logger.info(`   📊 Estadísticas:`);
        logger.info(`      Promedio: ${estadisticas.promedio} ${tipo.unidad}`);
        logger.info(`      Mínimo: ${estadisticas.minimo} ${tipo.unidad}`);
        logger.info(`      Máximo: ${estadisticas.maximo} ${tipo.unidad}`);
        logger.info(`      Desviación estándar: ${estadisticas.desviacion} ${tipo.unidad}`);
        logger.info(`      Coeficiente de variación: ${estadisticas.coeficienteVariacion}%`);
        logger.info(`      Estabilidad: ${estadisticas.mensajeEstabilidad}`);
      }

      // Comparación de períodos
      const comparacion = compararPeriodos(signosVitales, tipo.campo);
      if (comparacion) {
        logger.info(`   📅 Comparación de Períodos:`);
        logger.info(`      Último mes: ${comparacion.periodoActual.promedio} ${tipo.unidad} (${comparacion.periodoActual.registros} registros)`);
        logger.info(`      Mes anterior: ${comparacion.periodoAnterior.promedio} ${tipo.unidad} (${comparacion.periodoAnterior.registros} registros)`);
        logger.info(`      Cambio: ${comparacion.diferencia} ${tipo.unidad} (${comparacion.porcentaje}%) - ${comparacion.mensaje}`);
      } else {
        logger.info(`   ⚠️  Comparación: No hay datos suficientes para comparar períodos`);
      }

      logger.info('');
    });

    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('✅ PRUEBA DE EVOLUCIÓN COMPLETADA');
    logger.info('═══════════════════════════════════════════════════════════\n');
    logger.info('🎯 PRÓXIMOS PASOS:');
    logger.info('   1. Iniciar sesión en la app con PIN: 9999');
    logger.info('   2. Ir a "Gráficos de Evolución"');
    logger.info('   3. Verificar que se muestran todas las mejoras:');
    logger.info('      - Línea de tendencia');
    logger.info('      - Zona de rango normal');
    logger.info('      - Estadísticas');
    logger.info('      - Comparación de períodos');
    logger.info('   4. Ejecutar Prueba 1 desde la app (botón 🧪)');
    logger.info('\n✅ Script finalizado correctamente');

  } catch (error) {
    logger.error('❌ Error en el script:', error);
    logger.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();
