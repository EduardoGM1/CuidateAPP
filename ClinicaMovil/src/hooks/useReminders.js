/**
 * Hook: useReminders
 * 
 * Hook centralizado para gestionar recordatorios de medicamentos, citas y signos vitales.
 * Evita duplicación de código y centraliza la lógica de cálculo.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import reminderService from '../services/reminderService';
import Logger from '../services/logger';

/**
 * Hook para recordatorios de medicamentos
 */
export const useMedicationReminders = (medicamentos, enabled = true) => {
  const [proximoMedicamento, setProximoMedicamento] = useState(null);
  const [progreso, setProgreso] = useState({ tomados: 0, total: 0, porcentaje: 0 });

  useEffect(() => {
    if (!enabled || !medicamentos) return;

    try {
      // Calcular próximo medicamento
      const proximo = reminderService.getProximoMedicamento(medicamentos);
      setProximoMedicamento(proximo);

      // Calcular progreso del día
      const progresoDia = reminderService.getProgresoMedicamentosDia(medicamentos);
      setProgreso(progresoDia);
    } catch (error) {
      Logger.error('Error calculando recordatorios de medicamentos:', error);
    }
  }, [medicamentos, enabled]);

  // Actualizar cada minuto para el contador regresivo
  useEffect(() => {
    if (!enabled || !medicamentos) return;

    const interval = setInterval(() => {
      try {
        const proximo = reminderService.getProximoMedicamento(medicamentos);
        setProximoMedicamento(proximo);

        const progresoDia = reminderService.getProgresoMedicamentosDia(medicamentos);
        setProgreso(progresoDia);
      } catch (error) {
        Logger.error('Error actualizando recordatorios:', error);
      }
    }, 60000); // Cada minuto

    return () => clearInterval(interval);
  }, [medicamentos, enabled]);

  return useMemo(() => ({
    proximoMedicamento: proximoMedicamento?.medicamento || null,
    tiempoRestante: proximoMedicamento?.tiempoRestante || null,
    progreso,
  }), [proximoMedicamento, progreso]);
};

/**
 * Hook para recordatorios de citas
 */
export const useAppointmentReminders = (citas, enabled = true) => {
  const [citasProximas, setCitasProximas] = useState({
    citas24h: [],
    citas5h: [],
    proximaCita: null,
    totalProximas: 0,
  });

  useEffect(() => {
    if (!enabled || !citas) return;

    try {
      const proximas = reminderService.getCitasProximas(citas);
      setCitasProximas(proximas);

      Logger.debug('Citas próximas calculadas', {
        total24h: proximas.citas24h.length,
        total5h: proximas.citas5h.length,
        total: proximas.totalProximas,
      });
    } catch (error) {
      Logger.error('Error calculando recordatorios de citas:', error);
    }
  }, [citas, enabled]);

  // Actualizar cada 5 minutos para actualizar contadores
  useEffect(() => {
    if (!enabled || !citas) return;

    const interval = setInterval(() => {
      try {
        const proximas = reminderService.getCitasProximas(citas);
        setCitasProximas(proximas);
      } catch (error) {
        Logger.error('Error actualizando recordatorios de citas:', error);
      }
    }, 5 * 60000); // Cada 5 minutos

    return () => clearInterval(interval);
  }, [citas, enabled]);

  return useMemo(() => citasProximas, [citasProximas]);
};

/**
 * Hook para recordatorios de signos vitales
 */
export const useVitalSignsReminders = (signosVitales, enabled = true) => {
  const [necesitaRecordatorio, setNecesitaRecordatorio] = useState(false);
  const [diasSinRegistrar, setDiasSinRegistrar] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    try {
      const ultimoRegistro = signosVitales?.[0]?.fecha_registro || null;
      
      if (!ultimoRegistro) {
        setNecesitaRecordatorio(true);
        setDiasSinRegistrar(999);
        return;
      }

      const ultimaFecha = new Date(ultimoRegistro);
      const ahora = new Date();
      const diffDias = (ahora.getTime() - ultimaFecha.getTime()) / (1000 * 60 * 60 * 24);

      setDiasSinRegistrar(Math.round(diffDias));
      setNecesitaRecordatorio(reminderService.necesitaRecordatorioSignosVitales(ultimaFecha));
    } catch (error) {
      Logger.error('Error calculando recordatorio de signos vitales:', error);
    }
  }, [signosVitales, enabled]);

  return useMemo(() => ({
    necesitaRecordatorio,
    diasSinRegistrar,
  }), [necesitaRecordatorio, diasSinRegistrar]);
};

/**
 * Hook combinado para todos los recordatorios
 */
export const useReminders = (medicamentos, citas, signosVitales, enabled = true) => {
  const medicamentosReminders = useMedicationReminders(medicamentos, enabled);
  const citasReminders = useAppointmentReminders(citas, enabled);
  const vitalSignsReminders = useVitalSignsReminders(signosVitales, enabled);

  return useMemo(() => ({
    medicamentos: medicamentosReminders,
    citas: citasReminders,
    signosVitales: vitalSignsReminders,
  }), [medicamentosReminders, citasReminders, vitalSignsReminders]);
};

export default useReminders;



