/**
 * Hook: useHealthStatus
 * 
 * Calcula el estado de salud basado en signos vitales recientes.
 * Retorna un indicador tipo semáforo (verde/amarillo/rojo).
 */

import { useMemo } from 'react';
import Logger from '../services/logger';

/**
 * Rangos normales de signos vitales (pueden ajustarse según necesidades médicas)
 */
const RANGOS_NORMALES = {
  presion_sistolica: { min: 90, max: 140 },
  presion_diastolica: { min: 60, max: 90 },
  frecuencia_cardiaca: { min: 60, max: 100 },
  temperatura: { min: 36.1, max: 37.2 }, // Celsius
  saturacion_oxigeno: { min: 95, max: 100 },
  peso: { min: 40, max: 200 }, // kg
  talla: { min: 120, max: 220 }, // cm
};

/**
 * Determinar severidad de un valor fuera de rango
 */
const getSeverity = (valor, min, max) => {
  if (valor >= min && valor <= max) {
    return 'normal';
  }

  // Calcular qué tan fuera de rango está
  const distanciaMin = Math.abs(valor - min);
  const distanciaMax = Math.abs(valor - max);
  const rango = max - min;
  const porcentajeFuera = Math.max(distanciaMin, distanciaMax) / rango;

  // Si está más del 20% fuera del rango, es crítico
  if (porcentajeFuera > 0.2) {
    return 'critical';
  }

  // Si está entre 10% y 20%, es advertencia
  if (porcentajeFuera > 0.1) {
    return 'warning';
  }

  // Menos del 10%, es normal (margen de error)
  return 'normal';
};

/**
 * Hook para calcular estado de salud
 */
export const useHealthStatus = (signosVitales, enabled = true) => {
  return useMemo(() => {
    if (!enabled || !signosVitales || signosVitales.length === 0) {
      return {
        status: 'normal',
        label: 'Sin datos',
        detalles: [],
        tieneAlertas: false,
      };
    }

    // Obtener los signos vitales más recientes (último registro)
    const ultimoRegistro = signosVitales[0];
    if (!ultimoRegistro) {
      return {
        status: 'normal',
        label: 'Sin datos',
        detalles: [],
        tieneAlertas: false,
      };
    }

    const alertas = [];
    let maxSeverity = 'normal';

    // Verificar cada signo vital
    Object.keys(RANGOS_NORMALES).forEach((key) => {
      const valor = ultimoRegistro[key];
      if (valor === null || valor === undefined) return;

      const rango = RANGOS_NORMALES[key];
      const severity = getSeverity(valor, rango.min, rango.max);

      if (severity !== 'normal') {
        alertas.push({
          tipo: key,
          valor,
          rango,
          severity,
        });

        // Actualizar severidad máxima
        if (severity === 'critical') {
          maxSeverity = 'critical';
        } else if (severity === 'warning' && maxSeverity !== 'critical') {
          maxSeverity = 'warning';
        }
      }
    });

    // Determinar estado final
    let status = 'normal';
    let label = 'Saludable';

    if (maxSeverity === 'critical') {
      status = 'critical';
      label = 'Atención Urgente';
    } else if (maxSeverity === 'warning') {
      status = 'warning';
      label = 'Atención Requerida';
    }

    Logger.debug('Estado de salud calculado', {
      status,
      alertas: alertas.length,
      maxSeverity,
    });

    return {
      status,
      label,
      detalles: alertas,
      tieneAlertas: alertas.length > 0,
      ultimoRegistro,
    };
  }, [signosVitales, enabled]);
};

export default useHealthStatus;



