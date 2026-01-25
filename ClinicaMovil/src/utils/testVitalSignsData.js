/**
 * Script de prueba para verificar que los datos GET de signos vitales se reciben correctamente
 * 
 * Este script verifica:
 * 1. Que el endpoint responde correctamente
 * 2. Que la estructura de datos es correcta
 * 3. Que los campos necesarios están presentes
 * 4. Que los datos se pueden procesar por las funciones de análisis
 */

import gestionService from '../api/gestionService';
import Logger from '../services/logger';
import {
  calcularTendencia,
  calcularEstadisticas,
  compararPeriodos,
  getCampoSignoVital,
} from './vitalSignsAnalysis';

/**
 * Verifica la estructura de un signo vital
 */
const verificarEstructuraSignoVital = (signo, index) => {
  const errores = [];
  const advertencias = [];

  // Campos requeridos para análisis
  const camposRequeridos = ['id_signo', 'id_paciente'];
  const camposOpcionales = [
    'presion_sistolica',
    'presion_diastolica',
    'glucosa_mg_dl',
    'peso_kg',
    'imc',
    'fecha_medicion',
    'fecha_registro',
    'fecha_creacion',
  ];

  // Verificar campos requeridos
  camposRequeridos.forEach(campo => {
    if (!(campo in signo)) {
      errores.push(`Campo requerido faltante: ${campo}`);
    }
  });

  // Verificar que al menos un campo de signo vital esté presente
  const tieneSignoVital = camposOpcionales.some(campo => {
    if (campo.includes('fecha')) return false;
    return signo[campo] !== null && signo[campo] !== undefined;
  });

  if (!tieneSignoVital) {
    advertencias.push('No hay ningún signo vital presente en este registro');
  }

  // Verificar que hay al menos una fecha
  const tieneFecha = signo.fecha_medicion || signo.fecha_registro || signo.fecha_creacion;
  if (!tieneFecha) {
    advertencias.push('No hay fecha de medición/registro/creación');
  }

  // Verificar tipos de datos
  if (signo.presion_sistolica !== null && signo.presion_sistolica !== undefined) {
    const valor = parseFloat(signo.presion_sistolica);
    if (isNaN(valor)) {
      errores.push(`presion_sistolica no es un número válido: ${signo.presion_sistolica}`);
    }
  }

  if (signo.glucosa_mg_dl !== null && signo.glucosa_mg_dl !== undefined) {
    const valor = parseFloat(signo.glucosa_mg_dl);
    if (isNaN(valor)) {
      errores.push(`glucosa_mg_dl no es un número válido: ${signo.glucosa_mg_dl}`);
    }
  }

  if (signo.peso_kg !== null && signo.peso_kg !== undefined) {
    const valor = parseFloat(signo.peso_kg);
    if (isNaN(valor)) {
      errores.push(`peso_kg no es un número válido: ${signo.peso_kg}`);
    }
  }

  if (signo.imc !== null && signo.imc !== undefined) {
    const valor = parseFloat(signo.imc);
    if (isNaN(valor)) {
      errores.push(`imc no es un número válido: ${signo.imc}`);
    }
  }

  return {
    index,
    valido: errores.length === 0,
    errores,
    advertencias,
    tieneSignoVital,
    tieneFecha,
  };
};

/**
 * Prueba el endpoint de signos vitales
 */
export const probarEndpointSignosVitales = async (pacienteId, options = {}) => {
  const { limit = 100, offset = 0, sort = 'DESC' } = options;

  console.log('=== PRUEBA 1: VERIFICACIÓN DE DATOS GET ===\n');
  console.log(`Paciente ID: ${pacienteId}`);
  console.log(`Parámetros: limit=${limit}, offset=${offset}, sort=${sort}\n`);

  try {
    // 1. Hacer petición GET
    console.log('1. Realizando petición GET...');
    const response = await gestionService.getPacienteSignosVitales(pacienteId, {
      limit,
      offset,
      sort,
    });

    console.log('✅ Petición exitosa\n');

    // 2. Verificar estructura de respuesta
    console.log('2. Verificando estructura de respuesta...');
    
    if (!response) {
      throw new Error('La respuesta está vacía o es null');
    }

    // La respuesta puede venir en diferentes formatos
    let signosVitales = [];
    let total = 0;

    if (Array.isArray(response)) {
      // Formato: array directo
      signosVitales = response;
      total = response.length;
      console.log('   Formato: Array directo');
    } else if (response.data) {
      // Formato: { data: [...], total: ... }
      signosVitales = Array.isArray(response.data) ? response.data : [];
      total = response.total || signosVitales.length;
      console.log('   Formato: Objeto con data y total');
    } else {
      throw new Error('Formato de respuesta no reconocido');
    }

    console.log(`   Total de registros: ${total}`);
    console.log(`   Registros recibidos: ${signosVitales.length}\n`);

    if (signosVitales.length === 0) {
      console.log('⚠️ ADVERTENCIA: No se recibieron signos vitales');
      console.log('   Esto puede ser normal si el paciente no tiene registros\n');
      return {
        exito: true,
        tieneDatos: false,
        mensaje: 'Petición exitosa pero sin datos',
      };
    }

    // 3. Verificar estructura de cada signo vital
    console.log('3. Verificando estructura de cada signo vital...');
    const verificaciones = signosVitales.map((signo, index) => 
      verificarEstructuraSignoVital(signo, index)
    );

    const validos = verificaciones.filter(v => v.valido).length;
    const invalidos = verificaciones.filter(v => !v.valido).length;
    const conSignosVitales = verificaciones.filter(v => v.tieneSignoVital).length;
    const conFecha = verificaciones.filter(v => v.tieneFecha).length;

    console.log(`   Registros válidos: ${validos}/${signosVitales.length}`);
    console.log(`   Registros inválidos: ${invalidos}/${signosVitales.length}`);
    console.log(`   Con signos vitales: ${conSignosVitales}/${signosVitales.length}`);
    console.log(`   Con fecha: ${conFecha}/${signosVitales.length}\n`);

    // Mostrar errores si los hay
    const todosErrores = verificaciones
      .filter(v => v.errores.length > 0)
      .flatMap(v => v.errores.map(e => `Registro ${v.index}: ${e}`));

    if (todosErrores.length > 0) {
      console.log('❌ ERRORES ENCONTRADOS:');
      todosErrores.forEach(error => console.log(`   - ${error}`));
      console.log('');
    }

    // Mostrar advertencias
    const todasAdvertencias = verificaciones
      .filter(v => v.advertencias.length > 0)
      .flatMap(v => v.advertencias.map(a => `Registro ${v.index}: ${a}`));

    if (todasAdvertencias.length > 0) {
      console.log('⚠️ ADVERTENCIAS:');
      todasAdvertencias.forEach(advertencia => console.log(`   - ${advertencia}`));
      console.log('');
    }

    // 4. Verificar campos disponibles
    console.log('4. Verificando campos disponibles...');
    const camposDisponibles = new Set();
    signosVitales.forEach(signo => {
      Object.keys(signo).forEach(campo => camposDisponibles.add(campo));
    });

    const camposSignosVitales = [
      'presion_sistolica',
      'presion_diastolica',
      'glucosa_mg_dl',
      'peso_kg',
      'imc',
    ];

    console.log('   Campos encontrados en los datos:');
    camposSignosVitales.forEach(campo => {
      const presente = signosVitales.some(s => 
        s[campo] !== null && s[campo] !== undefined
      );
      const icono = presente ? '✅' : '❌';
      console.log(`   ${icono} ${campo}: ${presente ? 'Presente' : 'No presente'}`);
    });
    console.log('');

    // 5. Probar funciones de análisis con datos reales
    console.log('5. Probando funciones de análisis...');
    
    const tiposGrafica = ['presion', 'glucosa', 'peso', 'imc'];
    tiposGrafica.forEach(tipo => {
      const campo = getCampoSignoVital(tipo);
      if (!campo) return;

      const tieneDatos = signosVitales.some(s => 
        s[campo] !== null && s[campo] !== undefined
      );

      if (!tieneDatos) {
        console.log(`   ⚠️ ${tipo}: No hay datos disponibles`);
        return;
      }

      // Probar calcularTendencia
      if (signosVitales.length >= 3) {
        try {
          const tendencia = calcularTendencia(signosVitales, campo);
          if (tendencia.tendencia !== 'insuficiente') {
            console.log(`   ✅ ${tipo} - Tendencia: ${tendencia.mensaje} (${tendencia.icono})`);
          } else {
            console.log(`   ⚠️ ${tipo} - Tendencia: ${tendencia.mensaje}`);
          }
        } catch (error) {
          console.log(`   ❌ ${tipo} - Error calculando tendencia: ${error.message}`);
        }
      }

      // Probar calcularEstadisticas
      try {
        const estadisticas = calcularEstadisticas(signosVitales, campo);
        if (estadisticas) {
          console.log(`   ✅ ${tipo} - Estadísticas: Promedio=${estadisticas.promedio}, Min=${estadisticas.minimo}, Max=${estadisticas.maximo}`);
        }
      } catch (error) {
        console.log(`   ❌ ${tipo} - Error calculando estadísticas: ${error.message}`);
      }

      // Probar compararPeriodos
      try {
        const comparacion = compararPeriodos(signosVitales, campo);
        if (comparacion) {
          console.log(`   ✅ ${tipo} - Comparación: ${comparacion.mensaje} (${comparacion.diferencia})`);
        } else {
          console.log(`   ⚠️ ${tipo} - Comparación: No hay datos suficientes para comparar períodos`);
        }
      } catch (error) {
        console.log(`   ❌ ${tipo} - Error comparando períodos: ${error.message}`);
      }
    });
    console.log('');

    // 6. Resumen final
    console.log('=== RESUMEN ===');
    console.log(`✅ Petición GET: Exitosa`);
    console.log(`✅ Total de registros: ${total}`);
    console.log(`✅ Registros válidos: ${validos}/${signosVitales.length}`);
    console.log(`✅ Con signos vitales: ${conSignosVitales}/${signosVitales.length}`);
    console.log(`✅ Con fecha: ${conFecha}/${signosVitales.length}`);
    
    if (invalidos > 0) {
      console.log(`❌ Registros inválidos: ${invalidos}`);
    }
    
    if (todosErrores.length > 0) {
      console.log(`❌ Errores encontrados: ${todosErrores.length}`);
    }

    const exito = invalidos === 0 && todosErrores.length === 0;

    return {
      exito,
      tieneDatos: signosVitales.length > 0,
      total,
      validos,
      invalidos,
      conSignosVitales,
      conFecha,
      errores: todosErrores,
      advertencias: todasAdvertencias,
      signosVitales: signosVitales.slice(0, 3), // Primeros 3 para inspección
    };

  } catch (error) {
    console.error('❌ ERROR EN LA PRUEBA:');
    console.error(`   Mensaje: ${error.message}`);
    console.error(`   Stack: ${error.stack}`);
    
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }

    return {
      exito: false,
      tieneDatos: false,
      error: error.message,
      detalles: error.response?.data || error.stack,
    };
  }
};

/**
 * Función auxiliar para ejecutar la prueba desde la consola
 */
export const ejecutarPruebaSignosVitales = async (pacienteId) => {
  if (!pacienteId) {
    console.error('❌ Error: Se requiere un pacienteId');
    console.log('Uso: ejecutarPruebaSignosVitales(pacienteId)');
    return;
  }

  const resultado = await probarEndpointSignosVitales(pacienteId);
  
  if (resultado.exito) {
    console.log('\n✅ PRUEBA COMPLETADA EXITOSAMENTE');
  } else {
    console.log('\n❌ PRUEBA FALLIDA');
  }

  return resultado;
};

export default {
  probarEndpointSignosVitales,
  ejecutarPruebaSignosVitales,
  verificarEstructuraSignoVital,
};
