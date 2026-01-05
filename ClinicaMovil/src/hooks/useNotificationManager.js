/**
 * Hook: useNotificationManager
 * 
 * Gestiona notificaciones programadas para recordatorios.
 * Centraliza la lógica de programación y cancelación de notificaciones.
 */

import { useEffect, useRef, useCallback } from 'react';
import localNotificationService from '../services/localNotificationService';
import reminderService from '../services/reminderService';
import Logger from '../services/logger';

// Modo de prueba: en desarrollo, reduce tiempos para pruebas rápidas
const IS_DEV = __DEV__;
const TEST_MODE = IS_DEV && true; // Cambiar a false para desactivar modo de prueba

// Multiplicadores de tiempo para modo de prueba
const TIME_MULTIPLIERS = {
  // En modo prueba: 30 segundos = 30 minutos reales
  medication: TEST_MODE ? 60 : 1, // 1 minuto = 1 hora real
  appointment24h: TEST_MODE ? 60 : 1, // 1 minuto = 1 hora real
  appointment5h: TEST_MODE ? 12 : 1, // 1 minuto = 5 minutos reales
};

/**
 * Hook para gestionar notificaciones de medicamentos
 */
export const useMedicationNotifications = (medicamentos, enabled = true) => {
  const notificationIdsRef = useRef([]);

  // Programar notificaciones para medicamentos
  const scheduleMedicationNotifications = useCallback((meds) => {
    if (!meds || meds.length === 0) return;

    // Cancelar notificaciones anteriores
    notificationIdsRef.current.forEach((id) => {
      try {
        localNotificationService.cancelNotification(id);
      } catch (error) {
        Logger.warn('Error cancelando notificación:', error);
      }
    });
    notificationIdsRef.current = [];

    const ahora = new Date();
    const hoy = new Date(ahora);
    hoy.setHours(0, 0, 0, 0);

    meds.forEach((med) => {
      if (!med.horario) return;

      const horario = med.horario || '08:00';
      const [horaStr, minutoStr] = horario.split(':');
      const hora = parseInt(horaStr) || 8;
      const minuto = parseInt(minutoStr) || 0;

      // Crear fecha del horario
      const fechaHorario = new Date(hoy);
      fechaHorario.setHours(hora, minuto, 0, 0);

      // Si ya pasó hoy, programar para mañana
      if (fechaHorario.getTime() < ahora.getTime()) {
        fechaHorario.setDate(fechaHorario.getDate() + 1);
      }

      // Programar notificación 30 minutos antes (en modo prueba: 30 segundos)
      const minutosAntes = TEST_MODE ? 0.5 : 30; // 0.5 minutos = 30 segundos en modo prueba
      const fechaNotificacion = new Date(fechaHorario);
      fechaNotificacion.setMinutes(fechaNotificacion.getMinutes() - minutosAntes);

      // Solo programar si es en el futuro y dentro de las próximas 48 horas (o 48 minutos en modo prueba)
      const tiempoMaximo = TEST_MODE ? 48 * 60 * 1000 : 48 * 60 * 60 * 1000;
      const tiempoRestante = fechaNotificacion.getTime() - ahora.getTime();
      if (tiempoRestante > 0 && tiempoRestante < tiempoMaximo) {
        try {
          localNotificationService.scheduleNotification(
            {
              title: 'Recordatorio de medicamento',
              message: `TOMA EL MEDICAMENTO: ${med.nombre || 'Medicamento'}`,
              channelId: 'clinica-movil-reminders',
              data: {
                type: 'medication',
                medicamentoId: med.id,
                horario: med.horario,
              },
            },
            fechaNotificacion
          );

          Logger.debug('Notificación de medicamento programada', {
            medicamento: med.nombre,
            fecha: fechaNotificacion,
          });
        } catch (error) {
          Logger.error('Error programando notificación de medicamento:', error);
        }
      }

      // También programar notificación en el horario exacto (solo si es en el futuro razonable)
      const tiempoRestanteHorario = fechaHorario.getTime() - ahora.getTime();
      if (tiempoRestanteHorario > 0 && tiempoRestanteHorario < tiempoMaximo) {
        try {
          localNotificationService.scheduleNotification(
            {
              title: 'Recordatorio de medicamento',
              message: `TOMA EL MEDICAMENTO: ${med.nombre || 'Medicamento'}`,
              channelId: 'clinica-movil-reminders',
              data: {
                type: 'medication',
                medicamentoId: med.id,
                horario: med.horario,
                urgent: true,
              },
            },
            fechaHorario
          );
        } catch (error) {
          Logger.error('Error programando notificación urgente:', error);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!enabled || !medicamentos) {
      // Cancelar todas las notificaciones si está deshabilitado
      notificationIdsRef.current.forEach((id) => {
        try {
          localNotificationService.cancelNotification(id);
        } catch (error) {
          Logger.warn('Error cancelando notificación:', error);
        }
      });
      notificationIdsRef.current = [];
      return;
    }

    scheduleMedicationNotifications(medicamentos);

    // Cleanup al desmontar
    return () => {
      notificationIdsRef.current.forEach((id) => {
        try {
          localNotificationService.cancelNotification(id);
        } catch (error) {
          Logger.warn('Error cancelando notificación en cleanup:', error);
        }
      });
      notificationIdsRef.current = [];
    };
  }, [medicamentos, enabled, scheduleMedicationNotifications]);
};

/**
 * Hook para gestionar notificaciones de citas
 */
export const useAppointmentNotifications = (citas, enabled = true) => {
  const notificationIdsRef = useRef([]);

  // Programar notificaciones para citas
  const scheduleAppointmentNotifications = useCallback((appointments) => {
    if (!appointments || appointments.length === 0) return;

    // Cancelar notificaciones anteriores
    notificationIdsRef.current.forEach((id) => {
      try {
        localNotificationService.cancelNotification(id);
      } catch (error) {
        Logger.warn('Error cancelando notificación:', error);
      }
    });
    notificationIdsRef.current = [];

    const ahora = new Date();

    appointments.forEach((cita) => {
      if (!cita.fecha_cita) return;

      const fechaCita = new Date(cita.fecha_cita);
      const tiempoRestante = (fechaCita.getTime() - ahora.getTime()) / (1000 * 60); // minutos

      // Solo programar para citas futuras
      if (tiempoRestante <= 0) return;

      // Notificación 24 horas antes (en modo prueba: 1 minuto antes)
      const horas24Antes = TEST_MODE ? 1 : 24; // 1 minuto en modo prueba
      const rango24h = TEST_MODE ? [0.8, 1.2] : [23 * 60, 24 * 60]; // Rango en minutos
      
      if (tiempoRestante <= rango24h[1] && tiempoRestante > rango24h[0]) {
        const fecha24h = new Date(fechaCita);
        fecha24h.setMinutes(fecha24h.getMinutes() - horas24Antes);

        // Solo programar si es en el futuro y dentro de 7 días (o 7 minutos en modo prueba)
        const tiempoMaximo = TEST_MODE ? 7 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
        const tiempo24h = fecha24h.getTime() - ahora.getTime();
        if (tiempo24h > 0 && tiempo24h < tiempoMaximo) {
          try {
            localNotificationService.scheduleNotification(
              {
                title: '📅 Recordatorio de Cita',
                message: `Tienes una cita mañana: ${cita.motivo || 'Consulta médica'}`,
                channelId: 'clinica-movil-reminders',
                data: {
                  type: 'appointment',
                  citaId: cita.id_cita || cita.id,
                  fechaCita: cita.fecha_cita,
                },
              },
              fecha24h
            );
          } catch (error) {
            Logger.error('Error programando notificación 24h:', error);
          }
        }
      }

      // Notificación 5 horas antes (en modo prueba: 30 segundos antes)
      const horas5Antes = TEST_MODE ? 0.5 : 5; // 0.5 minutos = 30 segundos en modo prueba
      const rango5h = TEST_MODE ? [0.4, 0.6] : [4.9 * 60, 5 * 60]; // Rango en minutos
      
      if (tiempoRestante <= rango5h[1] && tiempoRestante > rango5h[0]) {
        const fecha5h = new Date(fechaCita);
        fecha5h.setMinutes(fecha5h.getMinutes() - horas5Antes);

        // Solo programar si es en el futuro y dentro de 7 días (o 7 minutos en modo prueba)
        const tiempoMaximo = TEST_MODE ? 7 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
        const tiempo5h = fecha5h.getTime() - ahora.getTime();
        if (tiempo5h > 0 && tiempo5h < tiempoMaximo) {
          try {
            localNotificationService.scheduleNotification(
              {
                title: '⏰ Cita Próxima',
                message: `Tu cita es en 5 horas: ${cita.motivo || 'Consulta médica'}`,
                channelId: 'clinica-movil-reminders',
                data: {
                  type: 'appointment',
                  citaId: cita.id_cita || cita.id,
                  fechaCita: cita.fecha_cita,
                  urgent: true,
                },
              },
              fecha5h
            );
          } catch (error) {
            Logger.error('Error programando notificación 5h:', error);
          }
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!enabled || !citas) {
      // Cancelar todas las notificaciones si está deshabilitado
      notificationIdsRef.current.forEach((id) => {
        try {
          localNotificationService.cancelNotification(id);
        } catch (error) {
          Logger.warn('Error cancelando notificación:', error);
        }
      });
      notificationIdsRef.current = [];
      return;
    }

    scheduleAppointmentNotifications(citas);

    // Cleanup al desmontar
    return () => {
      notificationIdsRef.current.forEach((id) => {
        try {
          localNotificationService.cancelNotification(id);
        } catch (error) {
          Logger.warn('Error cancelando notificación en cleanup:', error);
        }
      });
      notificationIdsRef.current = [];
    };
  }, [citas, enabled, scheduleAppointmentNotifications]);
};

/**
 * Hook combinado para gestionar todas las notificaciones
 */
export const useNotificationManager = (medicamentos, citas, enabled = true) => {
  useMedicationNotifications(medicamentos, enabled);
  useAppointmentNotifications(citas, enabled);
};

export default useNotificationManager;

