/**
 * Script de Prueba: Colesterol LDL y HDL
 * Fecha: 2025-12-28
 * Descripción: Prueba automatizada de la funcionalidad de colesterol LDL y HDL
 */

import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

// ⚠️ CONFIGURACIÓN: Reemplazar con valores reales
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || 'TU_TOKEN_AQUI';
const PACIENTE_CON_DIAGNOSTICO = parseInt(process.env.TEST_PACIENTE_CON_DIAGNOSTICO) || 1;
const PACIENTE_SIN_DIAGNOSTICO = parseInt(process.env.TEST_PACIENTE_SIN_DIAGNOSTICO) || 2;

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${AUTH_TOKEN}`
};

let resultados = {
  exitosas: 0,
  fallidas: 0,
  pruebas: []
};

function registrarResultado(nombre, exito, mensaje, datos = null) {
  resultados.pruebas.push({
    nombre,
    exito,
    mensaje,
    datos,
    timestamp: new Date().toISOString()
  });
  
  if (exito) {
    resultados.exitosas++;
    console.log(`✅ ${nombre}: ${mensaje}`);
  } else {
    resultados.fallidas++;
    console.log(`❌ ${nombre}: ${mensaje}`);
  }
}

async function testCrearSignoVitalConLDLHDL() {
  console.log('\n🧪 PRUEBA 1: Crear Signo Vital CON LDL/HDL (Paciente CON diagnóstico)');
  
  try {
    const response = await axios.post(
      `${API_URL}/signos-vitales`,
      {
        id_paciente: PACIENTE_CON_DIAGNOSTICO,
        colesterol_mg_dl: 200,
        colesterol_ldl: 130,
        colesterol_hdl: 50,
        glucosa_mg_dl: 95,
        peso_kg: 70,
        talla_m: 1.70,
        presion_sistolica: 120,
        presion_diastolica: 80,
        registrado_por: 'doctor'
      },
      { headers }
    );
    
    if (response.status === 201 && response.data.colesterol_ldl === 130 && response.data.colesterol_hdl === 50) {
      registrarResultado(
        'Crear Signo Vital CON LDL/HDL',
        true,
        `Éxito - Status: ${response.status}`,
        { id_signo: response.data.id_signo, colesterol_ldl: response.data.colesterol_ldl, colesterol_hdl: response.data.colesterol_hdl }
      );
      return response.data.id_signo;
    } else {
      registrarResultado(
        'Crear Signo Vital CON LDL/HDL',
        false,
        `Datos incorrectos en respuesta`,
        response.data
      );
      return null;
    }
  } catch (error) {
    registrarResultado(
      'Crear Signo Vital CON LDL/HDL',
      false,
      `Error: ${error.response?.status || error.message} - ${error.response?.data?.error || error.message}`,
      error.response?.data
    );
    return null;
  }
}

async function testCrearSignoVitalSinLDLHDL() {
  console.log('\n🧪 PRUEBA 2: Crear Signo Vital SIN LDL/HDL (Paciente SIN diagnóstico)');
  
  try {
    const response = await axios.post(
      `${API_URL}/signos-vitales`,
      {
        id_paciente: PACIENTE_SIN_DIAGNOSTICO,
        colesterol_mg_dl: 200,
        glucosa_mg_dl: 95,
        peso_kg: 70,
        talla_m: 1.70,
        presion_sistolica: 120,
        presion_diastolica: 80,
        registrado_por: 'doctor'
      },
      { headers }
    );
    
    if (response.status === 201) {
      registrarResultado(
        'Crear Signo Vital SIN LDL/HDL',
        true,
        `Éxito - Status: ${response.status}`,
        { id_signo: response.data.id_signo }
      );
      return response.data.id_signo;
    } else {
      registrarResultado(
        'Crear Signo Vital SIN LDL/HDL',
        false,
        `Status inesperado: ${response.status}`,
        response.data
      );
      return null;
    }
  } catch (error) {
    registrarResultado(
      'Crear Signo Vital SIN LDL/HDL',
      false,
      `Error: ${error.response?.status || error.message}`,
      error.response?.data
    );
    return null;
  }
}

async function testCrearSignoVitalConLDLHDLSinDiagnostico() {
  console.log('\n🧪 PRUEBA 3: Crear Signo Vital CON LDL/HDL (Paciente SIN diagnóstico) - DEBE FALLAR');
  
  try {
    const response = await axios.post(
      `${API_URL}/signos-vitales`,
      {
        id_paciente: PACIENTE_SIN_DIAGNOSTICO,
        colesterol_mg_dl: 200,
        colesterol_ldl: 130,
        colesterol_hdl: 50,
        glucosa_mg_dl: 95,
        peso_kg: 70,
        talla_m: 1.70,
        presion_sistolica: 120,
        presion_diastolica: 80,
        registrado_por: 'doctor'
      },
      { headers }
    );
    
    // Si llega aquí, debería haber fallado
    registrarResultado(
      'Crear Signo Vital CON LDL/HDL (Sin diagnóstico)',
      false,
      `ERROR: Debería haber fallado pero no falló - Status: ${response.status}`,
      response.data
    );
  } catch (error) {
    if (error.response?.status === 400) {
      const errorMessage = error.response.data?.error || error.response.data?.message || 'Error desconocido';
      if (errorMessage.includes('diagnóstico') || errorMessage.includes('Hipercolesterolemia') || errorMessage.includes('Dislipidemia')) {
        registrarResultado(
          'Crear Signo Vital CON LDL/HDL (Sin diagnóstico)',
          true,
          `Rechazado correctamente - ${errorMessage}`,
          { status: error.response.status, error: errorMessage }
        );
      } else {
        registrarResultado(
          'Crear Signo Vital CON LDL/HDL (Sin diagnóstico)',
          false,
          `Rechazado pero mensaje incorrecto: ${errorMessage}`,
          error.response.data
        );
      }
    } else {
      registrarResultado(
        'Crear Signo Vital CON LDL/HDL (Sin diagnóstico)',
        false,
        `Error inesperado: ${error.response?.status || error.message}`,
        error.response?.data
      );
    }
  }
}

async function testValidacionRangosLDL() {
  console.log('\n🧪 PRUEBA 4: Validación de Rangos - LDL fuera de rango');
  
  try {
    const response = await axios.post(
      `${API_URL}/signos-vitales`,
      {
        id_paciente: PACIENTE_CON_DIAGNOSTICO,
        colesterol_mg_dl: 200,
        colesterol_ldl: 600, // Fuera de rango (máximo 500)
        colesterol_hdl: 50,
        registrado_por: 'doctor'
      },
      { headers }
    );
    
    registrarResultado(
      'Validación Rangos LDL',
      false,
      `ERROR: Debería haber rechazado LDL = 600`,
      response.data
    );
  } catch (error) {
    if (error.response?.status === 400) {
      const errorMessage = error.response.data?.error || error.response.data?.message || '';
      if (errorMessage.includes('LDL') && (errorMessage.includes('500') || errorMessage.includes('rango'))) {
        registrarResultado(
          'Validación Rangos LDL',
          true,
          `Rechazado correctamente - ${errorMessage}`,
          { status: error.response.status }
        );
      } else {
        registrarResultado(
          'Validación Rangos LDL',
          false,
          `Rechazado pero mensaje incorrecto: ${errorMessage}`,
          error.response.data
        );
      }
    } else {
      registrarResultado(
        'Validación Rangos LDL',
        false,
        `Error inesperado: ${error.response?.status || error.message}`,
        error.response?.data
      );
    }
  }
}

async function testValidacionRangosHDL() {
  console.log('\n🧪 PRUEBA 5: Validación de Rangos - HDL fuera de rango');
  
  try {
    const response = await axios.post(
      `${API_URL}/signos-vitales`,
      {
        id_paciente: PACIENTE_CON_DIAGNOSTICO,
        colesterol_mg_dl: 200,
        colesterol_ldl: 130,
        colesterol_hdl: 250, // Fuera de rango (máximo 200)
        registrado_por: 'doctor'
      },
      { headers }
    );
    
    registrarResultado(
      'Validación Rangos HDL',
      false,
      `ERROR: Debería haber rechazado HDL = 250`,
      response.data
    );
  } catch (error) {
    if (error.response?.status === 400) {
      const errorMessage = error.response.data?.error || error.response.data?.message || '';
      if (errorMessage.includes('HDL') && (errorMessage.includes('200') || errorMessage.includes('rango'))) {
        registrarResultado(
          'Validación Rangos HDL',
          true,
          `Rechazado correctamente - ${errorMessage}`,
          { status: error.response.status }
        );
      } else {
        registrarResultado(
          'Validación Rangos HDL',
          false,
          `Rechazado pero mensaje incorrecto: ${errorMessage}`,
          error.response.data
        );
      }
    } else {
      registrarResultado(
        'Validación Rangos HDL',
        false,
        `Error inesperado: ${error.response?.status || error.message}`,
        error.response?.data
      );
    }
  }
}

async function testObtenerSignoVital(idSigno) {
  console.log('\n🧪 PRUEBA 6: Obtener Signo Vital');
  
  if (!idSigno) {
    registrarResultado(
      'Obtener Signo Vital',
      false,
      'Saltada: No hay ID de signo vital',
      null
    );
    return;
  }
  
  try {
    const response = await axios.get(
      `${API_URL}/signos-vitales/${idSigno}`,
      { headers }
    );
    
    if (response.status === 200 && response.data) {
      const tieneLDL = response.data.hasOwnProperty('colesterol_ldl');
      const tieneHDL = response.data.hasOwnProperty('colesterol_hdl');
      
      if (tieneLDL && tieneHDL) {
        registrarResultado(
          'Obtener Signo Vital',
          true,
          `Éxito - Campos presentes`,
          {
            colesterol_mg_dl: response.data.colesterol_mg_dl,
            colesterol_ldl: response.data.colesterol_ldl,
            colesterol_hdl: response.data.colesterol_hdl
          }
        );
      } else {
        registrarResultado(
          'Obtener Signo Vital',
          false,
          `Campos faltantes - LDL: ${tieneLDL}, HDL: ${tieneHDL}`,
          response.data
        );
      }
    } else {
      registrarResultado(
        'Obtener Signo Vital',
        false,
        `Status inesperado: ${response.status}`,
        response.data
      );
    }
  } catch (error) {
    registrarResultado(
      'Obtener Signo Vital',
      false,
      `Error: ${error.response?.status || error.message}`,
      error.response?.data
    );
  }
}

async function testObtenerSignosPorPaciente() {
  console.log('\n🧪 PRUEBA 7: Obtener Signos Vitales por Paciente');
  
  try {
    const response = await axios.get(
      `${API_URL}/signos-vitales/paciente/${PACIENTE_CON_DIAGNOSTICO}`,
      { headers }
    );
    
    if (response.status === 200 && Array.isArray(response.data)) {
      const tieneCampos = response.data.every(sv => 
        sv.hasOwnProperty('colesterol_ldl') && sv.hasOwnProperty('colesterol_hdl')
      );
      
      if (tieneCampos) {
        registrarResultado(
          'Obtener Signos por Paciente',
          true,
          `Éxito - ${response.data.length} registro(s) con campos LDL/HDL`,
          { cantidad: response.data.length }
        );
      } else {
        registrarResultado(
          'Obtener Signos por Paciente',
          false,
          `Algunos registros no tienen campos LDL/HDL`,
          { cantidad: response.data.length }
        );
      }
    } else {
      registrarResultado(
        'Obtener Signos por Paciente',
        false,
        `Respuesta inesperada`,
        response.data
      );
    }
  } catch (error) {
    registrarResultado(
      'Obtener Signos por Paciente',
      false,
      `Error: ${error.response?.status || error.message}`,
      error.response?.data
    );
  }
}

function mostrarResumen() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE PRUEBAS');
  console.log('='.repeat(60));
  console.log(`✅ Pruebas exitosas: ${resultados.exitosas}`);
  console.log(`❌ Pruebas fallidas: ${resultados.fallidas}`);
  console.log(`📋 Total de pruebas: ${resultados.pruebas.length}`);
  console.log(`📈 Tasa de éxito: ${((resultados.exitosas / resultados.pruebas.length) * 100).toFixed(1)}%`);
  
  console.log('\n📝 DETALLE DE PRUEBAS:');
  resultados.pruebas.forEach((prueba, index) => {
    const icono = prueba.exito ? '✅' : '❌';
    console.log(`\n${index + 1}. ${icono} ${prueba.nombre}`);
    console.log(`   ${prueba.mensaje}`);
    if (prueba.datos) {
      console.log(`   Datos: ${JSON.stringify(prueba.datos, null, 2)}`);
    }
  });
  
  console.log('\n' + '='.repeat(60));
  
  if (resultados.fallidas === 0) {
    console.log('🎉 ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE!');
  } else {
    console.log('⚠️  ALGUNAS PRUEBAS FALLARON - Revisar detalles arriba');
  }
  console.log('='.repeat(60) + '\n');
}

// Ejecutar todas las pruebas
async function ejecutarPruebas() {
  console.log('🚀 INICIANDO PRUEBAS DE COLESTEROL LDL Y HDL');
  console.log('='.repeat(60));
  console.log(`API URL: ${API_URL}`);
  console.log(`Paciente CON diagnóstico: ${PACIENTE_CON_DIAGNOSTICO}`);
  console.log(`Paciente SIN diagnóstico: ${PACIENTE_SIN_DIAGNOSTICO}`);
  console.log('='.repeat(60));
  
  if (AUTH_TOKEN === 'TU_TOKEN_AQUI') {
    console.log('\n⚠️  ADVERTENCIA: Debes configurar AUTH_TOKEN en el archivo .env o en el script');
    console.log('   Ejemplo: TEST_AUTH_TOKEN=tu_token_aqui');
    console.log('   O modifica la constante AUTH_TOKEN en este archivo\n');
  }
  
  const idSigno1 = await testCrearSignoVitalConLDLHDL();
  const idSigno2 = await testCrearSignoVitalSinLDLHDL();
  await testCrearSignoVitalConLDLHDLSinDiagnostico();
  await testValidacionRangosLDL();
  await testValidacionRangosHDL();
  await testObtenerSignoVital(idSigno1);
  await testObtenerSignosPorPaciente();
  
  mostrarResumen();
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  ejecutarPruebas().catch((error) => {
    console.error('\n❌ ERROR FATAL:', error);
    process.exit(1);
  });
}

export { ejecutarPruebas, testCrearSignoVitalConLDLHDL, testCrearSignoVitalSinLDLHDL };

