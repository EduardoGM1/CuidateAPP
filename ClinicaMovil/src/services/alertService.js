/**
 * Servicio de Alertas en Frontend
 * 
 * Gestiona alertas visuales, sonoras y hápticas
 * cuando se detectan valores fuera de rango.
 */

import { Alert, Platform } from 'react-native';
import localNotificationService from './localNotificationService';
import ttsService from './ttsService';
import hapticService from './hapticService';
import audioFeedbackService from './audioFeedbackService';
import Logger from './logger';

class AlertService {
  constructor() {
    this.alertasActivas = [];
  }

  /**
   * Mostrar alerta de signos vitales fuera de rango
   * @param {Object} alerta - Datos de la alerta del backend
   */
  async mostrarAlerta(alerta) {
    try {
      const { tipo, severidad, mensaje, valor, rangoNormal } = alerta;

      // Agregar a alertas activas
      this.alertasActivas.push({
        ...alerta,
        timestamp: new Date(),
      });

      // Feedback según severidad
      if (severidad === 'critica') {
        // Alerta crítica: vibración fuerte + sonido + TTS + notificación
        hapticService.heavy();
        await audioFeedbackService.error(mensaje);
        
        localNotificationService.showCriticalAlert(
          'ALERTA CRÍTICA',
          mensaje,
          {
            tipo,
            severidad,
            valor,
            rangoNormal,
          }
        );

        // Mostrar alerta modal
        Alert.alert(
          '🚨 ALERTA CRÍTICA',
          mensaje,
          [
            {
              text: 'Entendido',
              style: 'default',
              onPress: () => {
                Logger.info('Usuario confirmó alerta crítica', { tipo });
              },
            },
          ],
          { cancelable: false }
        );
      } else {
        // Alerta moderada: vibración media + notificación
        hapticService.medium();
        await audioFeedbackService.warning(mensaje);
        
        localNotificationService.showNotification({
          title: '⚠️ Alerta de Salud',
          message: mensaje,
          channelId: Platform.OS === 'android' ? 'clinica-movil-alerts' : undefined,
          data: {
            tipo: 'alert',
            severidad,
            valor,
            rangoNormal,
          },
        });
      }

      Logger.info('Alerta mostrada', { tipo, severidad });
    } catch (error) {
      Logger.error('Error mostrando alerta:', error);
    }
  }

  /**
   * Procesar múltiples alertas
   * @param {Array} alertas - Array de alertas del backend
   */
  async procesarAlertas(alertas) {
    try {
      if (!alertas || alertas.length === 0) return;

      // Ordenar por severidad (críticas primero)
      const alertasOrdenadas = alertas.sort((a, b) => {
        const orden = { critica: 0, moderada: 1 };
        return orden[a.severidad] - orden[b.severidad];
      });

      // Mostrar la alerta más crítica primero
      await this.mostrarAlerta(alertasOrdenadas[0]);

      // Si hay más alertas, mostrarlas después
      if (alertasOrdenadas.length > 1) {
        setTimeout(() => {
          // Mostrar resumen de alertas adicionales
          const mensajeResumen = `${alertasOrdenadas.length - 1} alerta(s) adicional(es) detectada(s). Revisa tus valores en la aplicación.`;
          
          localNotificationService.showNotification({
            title: 'Múltiples Alertas',
            message: mensajeResumen,
            data: {
              tipo: 'multiple_alerts',
              total: alertasOrdenadas.length,
            },
          });
        }, 3000);
      }
    } catch (error) {
      Logger.error('Error procesando alertas:', error);
    }
  }

  /**
   * Limpiar alertas activas
   */
  limpiarAlertas() {
    this.alertasActivas = [];
    Logger.info('Alertas activas limpiadas');
  }

  /**
   * Obtener alertas activas
   */
  obtenerAlertasActivas() {
    return [...this.alertasActivas];
  }

  /**
   * Verificar si hay alertas críticas activas
   */
  tieneAlertasCriticas() {
    return this.alertasActivas.some((alerta) => alerta.severidad === 'critica');
  }
}

// Singleton
const alertService = new AlertService();

export default alertService;

