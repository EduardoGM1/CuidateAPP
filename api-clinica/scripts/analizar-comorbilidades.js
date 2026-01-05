/**
 * Script para analizar y comparar comorbilidades de la imagen con la base de datos
 * 
 * Comorbilidades de la imagen:
 * 1. Diabetes
 * 2. Hipertensión
 * 3. Obesidad
 * 4. Dislipidemia
 * 5. Enfermedad Renal Crónica
 * 6. EPOC (Enfermedad Pulmonar Obstructiva Crónica)
 * 7. Enfermedad Cardiovascular
 * 8. Tuberculosis
 * 9. Asma
 * 10. Tabaquismo
 * 
 * Ejecutar: node scripts/analizar-comorbilidades.js
 */

import dotenv from 'dotenv';
dotenv.config();
import sequelize from '../config/db.js';
import { Comorbilidad, PacienteComorbilidad } from '../models/associations.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';

// Comorbilidades válidas según la imagen
const COMORBILIDADES_VALIDAS = [
  'Diabetes',
  'Hipertensión',
  'Obesidad',
  'Dislipidemia',
  'Enfermedad Renal Crónica',
  'EPOC',
  'Enfermedad Pulmonar Obstructiva Crónica', // Variante completa de EPOC
  'Enfermedad Cardiovascular',
  'Tuberculosis',
  'Asma',
  'Tabaquismo'
];

// Normalizar nombres para comparación (sin acentos, minúsculas, sin espacios extra)
const normalizarNombre = (nombre) => {
  return nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .trim()
    .replace(/\s+/g, ' '); // Normalizar espacios
};

// Función para verificar si una comorbilidad es válida (comparación flexible)
const esComorbilidadValida = (nombre) => {
  const nombreNormalizado = normalizarNombre(nombre);
  
  for (const valida of COMORBILIDADES_VALIDAS) {
    const validaNormalizada = normalizarNombre(valida);
    
    // Comparación exacta
    if (nombreNormalizado === validaNormalizada) return true;
    
    // Comparación por inclusión (si el nombre contiene la palabra clave o viceversa)
    if (nombreNormalizado.includes(validaNormalizada) || validaNormalizada.includes(nombreNormalizado)) {
      return true;
    }
    
    // Casos especiales
    // Diabetes: "diabetes" puede estar en "diabetes mellitus tipo 2"
    if (validaNormalizada === 'diabetes' && nombreNormalizado.includes('diabetes')) return true;
    
    // Hipertensión: "hipertension" puede estar en "hipertension arterial"
    if (validaNormalizada === 'hipertension' && nombreNormalizado.includes('hipertension')) return true;
    
    // EPOC: múltiples variantes
    if (validaNormalizada.includes('epoc') && nombreNormalizado.includes('epoc')) return true;
    if (validaNormalizada.includes('epoc') && nombreNormalizado.includes('pulmonar') && nombreNormalizado.includes('obstructiva')) return true;
    if (nombreNormalizado.includes('epoc') && validaNormalizada.includes('pulmonar') && validaNormalizada.includes('obstructiva')) return true;
    
    // Enfermedad Cardiovascular: puede estar como "insuficiencia cardiaca" o similar
    if (validaNormalizada.includes('cardiovascular') && (nombreNormalizado.includes('cardiaca') || nombreNormalizado.includes('cardiaco'))) return true;
    
    // Comparación por palabras clave principales
    const palabrasClave = {
      'diabetes': ['diabetes'],
      'hipertension': ['hipertension'],
      'obesidad': ['obesidad'],
      'dislipidemia': ['dislipidemia'],
      'renal cronica': ['renal', 'cronica'],
      'epoc': ['epoc', 'pulmonar', 'obstructiva'],
      'cardiovascular': ['cardiovascular', 'cardiaca', 'cardiaco'],
      'tuberculosis': ['tuberculosis'],
      'asma': ['asma'],
      'tabaquismo': ['tabaquismo']
    };
    
    for (const [clave, palabras] of Object.entries(palabrasClave)) {
      if (validaNormalizada.includes(clave)) {
        const todasPresentes = palabras.every(palabra => nombreNormalizado.includes(palabra));
        if (todasPresentes) return true;
      }
    }
  }
  
  return false;
};

async function analizarComorbilidades() {
  try {
    await sequelize.authenticate();
    logger.info('✅ Conectado a la base de datos');

    // Obtener todas las comorbilidades de la base de datos
    const comorbilidadesDB = await Comorbilidad.findAll({
      order: [['nombre_comorbilidad', 'ASC']]
    });

    logger.info(`\n📋 Comorbilidades encontradas en la base de datos: ${comorbilidadesDB.length}\n`);

    if (comorbilidadesDB.length === 0) {
      logger.info('ℹ️ No hay comorbilidades en la base de datos');
      return;
    }

    // Mostrar todas las comorbilidades
    logger.info('📊 LISTA DE COMORBILIDADES EN LA BASE DE DATOS:');
    comorbilidadesDB.forEach((com, index) => {
      logger.info(`   ${index + 1}. ID: ${com.id_comorbilidad} - Nombre: "${com.nombre_comorbilidad}"`);
    });

    // Identificar comorbilidades inválidas (que no están en la lista de la imagen)
    const comorbilidadesInvalidas = [];
    const comorbilidadesValidas = [];

    comorbilidadesDB.forEach(com => {
      if (esComorbilidadValida(com.nombre_comorbilidad)) {
        comorbilidadesValidas.push(com);
      } else {
        comorbilidadesInvalidas.push(com);
      }
    });

    logger.info(`\n✅ COMORBILIDADES VÁLIDAS (${comorbilidadesValidas.length}):`);
    comorbilidadesValidas.forEach((com, index) => {
      logger.info(`   ${index + 1}. "${com.nombre_comorbilidad}" (ID: ${com.id_comorbilidad})`);
    });

    if (comorbilidadesInvalidas.length > 0) {
      logger.info(`\n❌ COMORBILIDADES INVÁLIDAS (${comorbilidadesInvalidas.length}) - SERÁN ELIMINADAS:`);
      comorbilidadesInvalidas.forEach((com, index) => {
        logger.info(`   ${index + 1}. "${com.nombre_comorbilidad}" (ID: ${com.id_comorbilidad})`);
      });

      // Verificar si hay pacientes asociados a estas comorbilidades
      logger.info(`\n🔍 Verificando pacientes asociados a comorbilidades inválidas...`);
      
      const idsInvalidas = comorbilidadesInvalidas.map(c => c.id_comorbilidad);
      const pacientesAsociados = await PacienteComorbilidad.findAll({
        where: {
          id_comorbilidad: {
            [Op.in]: idsInvalidas
          }
        }
      });

      if (pacientesAsociados.length > 0) {
        logger.warn(`⚠️  ADVERTENCIA: Se encontraron ${pacientesAsociados.length} relaciones de pacientes con comorbilidades inválidas:`);
        pacientesAsociados.forEach(rel => {
          logger.warn(`   - Paciente ID: ${rel.id_paciente}, Comorbilidad ID: ${rel.id_comorbilidad}`);
        });
        
        logger.info(`\n🗑️  Eliminando relaciones de pacientes con comorbilidades inválidas...`);
        await PacienteComorbilidad.destroy({
          where: {
            id_comorbilidad: {
              [Op.in]: idsInvalidas
            }
          }
        });
        logger.info(`✅ ${pacientesAsociados.length} relaciones eliminadas`);
      }

      // Eliminar comorbilidades inválidas
      logger.info(`\n🗑️  Eliminando comorbilidades inválidas de la base de datos...`);
      const eliminadas = await Comorbilidad.destroy({
        where: {
          id_comorbilidad: {
            [Op.in]: idsInvalidas
          }
        }
      });
      
      logger.info(`✅ ${eliminadas} comorbilidades eliminadas exitosamente`);
    } else {
      logger.info(`\n✅ Todas las comorbilidades en la base de datos son válidas. No se requiere eliminación.`);
    }

    // Mostrar comorbilidades válidas esperadas que no están en la BD
    logger.info(`\n📋 COMORBILIDADES VÁLIDAS DE LA IMAGEN QUE NO ESTÁN EN LA BASE DE DATOS:`);
    const nombresEnBD = comorbilidadesValidas.map(c => normalizarNombre(c.nombre_comorbilidad));
    const faltantes = COMORBILIDADES_VALIDAS.filter(valida => {
      const validaNormalizada = normalizarNombre(valida);
      return !nombresEnBD.some(nombreBD => {
        if (nombreBD === validaNormalizada) return true;
        // Caso especial para EPOC
        if (validaNormalizada.includes('epoc') && nombreBD.includes('epoc')) return true;
        if (validaNormalizada.includes('epoc') && nombreBD.includes('pulmonar') && nombreBD.includes('obstructiva')) return true;
        return false;
      });
    });

    if (faltantes.length > 0) {
      faltantes.forEach((com, index) => {
        logger.info(`   ${index + 1}. "${com}"`);
      });
      logger.info(`\n💡 Nota: Estas comorbilidades pueden ser agregadas manualmente si es necesario.`);
    } else {
      logger.info(`   ✅ Todas las comorbilidades válidas están presentes en la base de datos.`);
    }

    logger.info(`\n✅ Proceso completado exitosamente`);

  } catch (error) {
    logger.error('❌ Error analizando comorbilidades:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    logger.info('🔌 Conexión cerrada');
  }
}

analizarComorbilidades();

