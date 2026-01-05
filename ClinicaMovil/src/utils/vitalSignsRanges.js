/**
 * @file vitalSignsRanges.js
 * @description Utilidades para verificar si signos vitales están fuera de rango
 * @author Senior Developer
 * @date 2025-12-04
 */

/**
 * Rangos normales base de signos vitales
 * Estos deben coincidir con los rangos del backend (alertService.js)
 */
const RANGOS_NORMALES = {
  glucosa: { min: 70, max: 126, criticoMin: 50, criticoMax: 200 }, // mg/dL
  presionSistolica: { min: 90, max: 140, criticoMin: 70, criticoMax: 160 }, // mmHg
  presionDiastolica: { min: 60, max: 90, criticoMin: 50, criticoMax: 100 }, // mmHg
  imc: { min: 18.5, max: 24.9, criticoMin: 15, criticoMax: 35 }, // kg/m²
  colesterol: { min: 0, max: 200, criticoMin: 0, criticoMax: 240 }, // mg/dL (rango aproximado)
  trigliceridos: { min: 0, max: 150, criticoMin: 0, criticoMax: 200 }, // mg/dL (rango aproximado)
};

/**
 * Verificar si un valor está fuera del rango normal
 * @param {number} valor - Valor a verificar
 * @param {string} tipo - Tipo de signo vital ('glucosa', 'presionSistolica', 'presionDiastolica', 'imc', 'colesterol', 'trigliceridos')
 * @returns {boolean} - true si está fuera de rango, false si está en rango
 */
export const estaFueraDeRango = (valor, tipo) => {
  if (valor === null || valor === undefined || isNaN(valor)) {
    return false; // No verificar si no hay valor
  }

  const rango = RANGOS_NORMALES[tipo];
  if (!rango) {
    return false; // Tipo no reconocido
  }

  const valorNum = Number(valor);
  
  // Verificar si está fuera del rango normal (min-max)
  return valorNum < rango.min || valorNum > rango.max;
};

/**
 * Verificar si la presión arterial está fuera de rango
 * @param {number} sistolica - Presión sistólica
 * @param {number} diastolica - Presión diastólica
 * @returns {boolean} - true si alguna está fuera de rango
 */
export const presionFueraDeRango = (sistolica, diastolica) => {
  const sistolicaFuera = sistolica !== null && sistolica !== undefined 
    ? estaFueraDeRango(sistolica, 'presionSistolica')
    : false;
  
  const diastolicaFuera = diastolica !== null && diastolica !== undefined
    ? estaFueraDeRango(diastolica, 'presionDiastolica')
    : false;

  return sistolicaFuera || diastolicaFuera;
};

/**
 * Verificar si el IMC está fuera de rango
 * @param {number} imc - Índice de masa corporal
 * @returns {boolean} - true si está fuera de rango
 */
export const imcFueraDeRango = (imc) => {
  if (imc === null || imc === undefined || isNaN(imc)) {
    return false;
  }
  return estaFueraDeRango(imc, 'imc');
};

/**
 * Verificar si la glucosa está fuera de rango
 * @param {number} glucosa - Glucosa en mg/dL
 * @returns {boolean} - true si está fuera de rango
 */
export const glucosaFueraDeRango = (glucosa) => {
  if (glucosa === null || glucosa === undefined || isNaN(glucosa)) {
    return false;
  }
  return estaFueraDeRango(glucosa, 'glucosa');
};

/**
 * Verificar si el colesterol está fuera de rango
 * @param {number} colesterol - Colesterol en mg/dL
 * @returns {boolean} - true si está fuera de rango
 */
export const colesterolFueraDeRango = (colesterol) => {
  if (colesterol === null || colesterol === undefined || isNaN(colesterol)) {
    return false;
  }
  return estaFueraDeRango(colesterol, 'colesterol');
};

/**
 * Verificar si los triglicéridos están fuera de rango
 * @param {number} trigliceridos - Triglicéridos en mg/dL
 * @returns {boolean} - true si está fuera de rango
 */
export const trigliceridosFueraDeRango = (trigliceridos) => {
  if (trigliceridos === null || trigliceridos === undefined || isNaN(trigliceridos)) {
    return false;
  }
  return estaFueraDeRango(trigliceridos, 'trigliceridos');
};

export { RANGOS_NORMALES };

export default {
  estaFueraDeRango,
  presionFueraDeRango,
  imcFueraDeRango,
  glucosaFueraDeRango,
  colesterolFueraDeRango,
  trigliceridosFueraDeRango,
  RANGOS_NORMALES
};

