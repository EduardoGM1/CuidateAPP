/**
 * Servicio de Alertas de Auditoría
 * 
 * Gestiona alertas y notificaciones basadas en umbrales y acciones críticas
 */

import { SistemaAuditoria } from '../models/associations.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';
import { UMBRALES_ALERTAS, esAccionCritica, obtenerSeveridad } from '../config/alertasAuditoria.js';
import pushNotificationService from './pushNotificationService.js';

class AlertasAuditoriaService {
  /**
   * Verificar si una acción requiere alerta
   * @param {Object} accion - Objeto de acción de auditoría
   * @returns {Promise<boolean>}
   */
  async verificarAlerta(accion) {
    try {
      // Validar que accion y tipo_accion estén definidos
      if (!accion || !accion.tipo_accion) {
        logger.warn('verificarAlerta: accion o tipo_accion no definidos', { 
          hasAccion: !!accion,
          hasTipoAccion: !!(accion && accion.tipo_accion)
        });
        return false;
      }

      // Verificar si es acción crítica
      if (esAccionCritica(accion.tipo_accion)) {
        await this.enviarAlerta(accion, obtenerSeveridad(accion.tipo_accion));
        return true;
      }

      // Verificar umbrales
      if (accion.tipo_accion) {
        const umbralExcedido = await this.verificarUmbrales(accion.tipo_accion);
        if (umbralExcedido) {
          await this.enviarAlerta(accion, 'warning');
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Error verificando alerta', { 
        error: error.message,
        stack: error.stack,
        accion: accion ? { tipo_accion: accion.tipo_accion, id: accion.id } : 'undefined'
      });
      return false;
    }
  }

  /**
   * Verificar si se excedieron umbrales para un tipo de acción
   * @param {string} tipoAccion - Tipo de acción
   * @param {number} tiempoMinutos - Tiempo en minutos (opcional, usa config por defecto)
   * @param {number} cantidadMaxima - Cantidad máxima (opcional, usa config por defecto)
   * @returns {Promise<boolean>}
   */
  async verificarUmbrales(tipoAccion, tiempoMinutos = null, cantidadMaxima = null) {
    try {
      let umbral;

      // Determinar umbral según tipo de acción
      if (tipoAccion === 'login_fallido') {
        umbral = UMBRALES_ALERTAS.LOGIN_FALLIDOS;
      } else if (tipoAccion && tipoAccion.includes('error')) {
        umbral = UMBRALES_ALERTAS.ERRORES_CRITICOS;
      } else {
        umbral = UMBRALES_ALERTAS.CAMBIOS_MASIVOS;
      }

      const minutos = tiempoMinutos || umbral.tiempoMinutos;
      const cantidad = cantidadMaxima || umbral.cantidad;
      const fechaLimite = new Date(Date.now() - minutos * 60 * 1000);

      // Validar que tipoAccion esté definido
      if (!tipoAccion || typeof tipoAccion !== 'string') {
        logger.warn('verificarUmbrales: tipoAccion no válido', { tipoAccion });
        return false;
      }

      // Contar acciones del mismo tipo en el período
      const count = await SistemaAuditoria.count({
        where: {
          tipo_accion: tipoAccion, // Usar el parámetro tipoAccion
          fecha_creacion: { [Op.gte]: fechaLimite }
        }
      });

      return count >= cantidad;
    } catch (error) {
      logger.error('Error verificando umbrales', { 
        error: error.message,
        tipoAccion: tipoAccion || 'undefined',
        stack: error.stack
      });
      return false;
    }
  }

  /**
   * Enviar alerta a administradores
   * @param {Object} accion - Acción de auditoría
   * @param {string} severidad - Nivel de severidad
   */
  async enviarAlerta(accion, severidad = 'warning') {
    try {
      // Obtener todos los administradores activos
      const { Usuario } = await import('../models/associations.js');
      const administradores = await Usuario.findAll({
        where: {
          rol: 'Admin',
          activo: true
        },
        attributes: ['id_usuario', 'email']
      });

      if (administradores.length === 0) {
        logger.warn('No hay administradores para enviar alerta');
        return;
      }

      // Preparar notificación
      const titulo = this.obtenerTituloAlerta(accion.tipo_accion, severidad);
      const mensaje = accion.descripcion || `Acción: ${accion.tipo_accion}`;

      // Enviar notificación push a cada administrador
      for (const admin of administradores) {
        try {
          await pushNotificationService.sendPushNotification(admin.id_usuario, {
            type: 'alerta_auditoria',
            title: titulo,
            body: mensaje,
            data: {
              tipoAccion: accion.tipo_accion,
              severidad,
              idAuditoria: accion.id_auditoria,
              fecha: new Date().toISOString()
            }
          });
        } catch (error) {
          logger.error(`Error enviando alerta a admin ${admin.id_usuario}`, {
            error: error.message
          });
        }
      }

      logger.info('Alerta de auditoría enviada', {
        tipoAccion: accion.tipo_accion,
        severidad,
        administradoresNotificados: administradores.length
      });
    } catch (error) {
      logger.error('Error enviando alerta', { error: error.message });
    }
  }

  /**
   * Obtener título de alerta según tipo y severidad
   * @param {string} tipoAccion - Tipo de acción
   * @param {string} severidad - Severidad
   * @returns {string}
   */
  obtenerTituloAlerta(tipoAccion, severidad) {
    const titulos = {
      'error_critico': '🚨 Error Crítico del Sistema',
      'acceso_sospechoso': '⚠️ Acceso Sospechoso Detectado',
      'login_fallido': '🔒 Múltiples Intentos de Login Fallidos',
      'error_sistema': '⚠️ Error del Sistema',
      'configuracion_cambiada': '⚙️ Configuración Modificada',
      'doctor_creado': '👤 Nuevo Doctor Creado',
      'doctor_modificado': '👤 Doctor Modificado'
    };

    return titulos[tipoAccion] || `Alerta de ${severidad.toUpperCase()}`;
  }
}

export default new AlertasAuditoriaService();

