/**
 * Servicio de Auditoría del Sistema
 * 
 * Helper para registrar cambios generales del sistema y acciones administrativas
 * en la tabla sistema_auditoria (para administradores)
 */

import { SistemaAuditoria } from '../models/associations.js';
import logger from '../utils/logger.js';
import alertasAuditoriaService from './alertasAuditoriaService.js';
import { obtenerSeveridad } from '../config/alertasAuditoria.js';

class AuditoriaService {
  /**
   * Registrar acción en auditoría
   * @param {Object} params - Parámetros de la auditoría
   * @param {string} params.tipo_accion - Tipo de acción (ver ENUM en modelo)
   * @param {string} params.entidad_afectada - Entidad afectada
   * @param {number|null} params.id_entidad - ID de la entidad afectada
   * @param {string} params.descripcion - Descripción legible de la acción
   * @param {Object|null} params.datos_anteriores - Estado anterior (opcional)
   * @param {Object|null} params.datos_nuevos - Estado nuevo (opcional)
   * @param {number|null} params.id_usuario - ID del usuario que realizó la acción (null si es automático)
   */
  async registrarAccion({
    tipo_accion,
    entidad_afectada,
    id_entidad = null,
    descripcion,
    datos_anteriores = null,
    datos_nuevos = null,
    id_usuario = null,
    ip_address = null,
    user_agent = null,
    severidad = 'info',
    stack_trace = null
  }) {
    try {
      const auditoria = await SistemaAuditoria.create({
        id_usuario,
        tipo_accion,
        entidad_afectada,
        id_entidad,
        descripcion,
        datos_anteriores,
        datos_nuevos,
        ip_address,
        user_agent,
        severidad,
        stack_trace
      });

      logger.info('Acción registrada en auditoría', {
        id_auditoria: auditoria.id_auditoria,
        tipo_accion,
        entidad_afectada,
        id_entidad
      });

      // Verificar si requiere alerta (asíncrono, no bloquea)
      alertasAuditoriaService.verificarAlerta({
        ...auditoria.dataValues,
        tipo_accion,
        severidad: severidad || obtenerSeveridad(tipo_accion)
      }).catch(err => {
        logger.error('Error verificando alerta', { error: err.message });
      });

      return auditoria;
    } catch (error) {
      logger.error('Error registrando acción en auditoría', {
        error: error.message,
        tipo_accion,
        entidad_afectada
      });
      // No lanzar error para no interrumpir el flujo principal
      return null;
    }
  }

  /**
   * Registrar cambio automático de estado de citas
   * @param {number} totalCitas - Total de citas actualizadas
   * @param {Array} citasActualizadas - Array de IDs de citas actualizadas
   */
  async registrarActualizacionCitasAutomatica(totalCitas, citasActualizadas = []) {
    return await this.registrarAccion({
      tipo_accion: 'sistema_automatico',
      entidad_afectada: 'cita',
      id_entidad: null,
      descripcion: `${totalCitas} citas marcadas automáticamente como 'no_asistida' por fecha pasada`,
      datos_anteriores: null,
      datos_nuevos: {
        total_citas: totalCitas,
        citas_actualizadas: citasActualizadas.map(c => ({
          id_cita: c.id_cita,
          fecha_cita: c.fecha_cita,
          estado_anterior: c.estado_anterior,
          estado_nuevo: 'no_asistida'
        }))
      },
      id_usuario: null // Acción automática del sistema
    });
  }

  /**
   * Registrar cambio de estado de cita manual
   * @param {number} id_cita - ID de la cita
   * @param {string} estado_anterior - Estado anterior
   * @param {string} estado_nuevo - Estado nuevo
   * @param {number|null} id_usuario - ID del usuario que realizó el cambio
   */
  async registrarCambioEstadoCita(id_cita, estado_anterior, estado_nuevo, id_usuario = null) {
    return await this.registrarAccion({
      tipo_accion: 'cita_estado_actualizado',
      entidad_afectada: 'cita',
      id_entidad: id_cita,
      descripcion: `Cita #${id_cita} cambió de estado '${estado_anterior}' a '${estado_nuevo}'`,
      datos_anteriores: { estado: estado_anterior },
      datos_nuevos: { estado: estado_nuevo },
      id_usuario
    });
  }

  /**
   * Registrar reprogramación de cita
   * @param {number} id_cita - ID de la cita
   * @param {Date} fecha_anterior - Fecha anterior
   * @param {Date} fecha_nueva - Fecha nueva
   * @param {number|null} id_usuario - ID del usuario que realizó el cambio
   */
  async registrarReprogramacionCita(id_cita, fecha_anterior, fecha_nueva, id_usuario = null) {
    return await this.registrarAccion({
      tipo_accion: 'cita_reprogramada',
      entidad_afectada: 'cita',
      id_entidad: id_cita,
      descripcion: `Cita #${id_cita} reprogramada de ${fecha_anterior.toISOString()} a ${fecha_nueva.toISOString()}`,
      datos_anteriores: { fecha_cita: fecha_anterior.toISOString() },
      datos_nuevos: { fecha_cita: fecha_nueva.toISOString() },
      id_usuario
    });
  }

  /**
   * Registrar login exitoso
   * @param {number} id_usuario - ID del usuario
   * @param {string} ip_address - Dirección IP
   * @param {string} user_agent - User Agent
   */
  async registrarLoginExitoso(id_usuario, ip_address = null, user_agent = null) {
    return await this.registrarAccion({
      tipo_accion: 'login_exitoso',
      entidad_afectada: 'acceso',
      id_entidad: id_usuario,
      descripcion: `Login exitoso del usuario #${id_usuario}`,
      datos_nuevos: { id_usuario, ip_address, user_agent },
      id_usuario,
      ip_address,
      user_agent,
      severidad: 'info'
    });
  }

  /**
   * Registrar login fallido
   * @param {string} email - Email intentado
   * @param {string} ip_address - Dirección IP
   * @param {string} user_agent - User Agent
   * @param {string} razon - Razón del fallo
   */
  async registrarLoginFallido(email, ip_address = null, user_agent = null, razon = 'Credenciales inválidas') {
    return await this.registrarAccion({
      tipo_accion: 'login_fallido',
      entidad_afectada: 'acceso',
      id_entidad: null,
      descripcion: `Intento de login fallido para ${email}: ${razon}`,
      datos_nuevos: { email, razon, ip_address, user_agent },
      id_usuario: null,
      ip_address,
      user_agent,
      severidad: 'warning'
    });
  }

  /**
   * Registrar acceso sospechoso
   * @param {number|null} id_usuario - ID del usuario (si aplica)
   * @param {string} ip_address - Dirección IP
   * @param {string} user_agent - User Agent
   * @param {string} motivo - Motivo de la sospecha
   */
  async registrarAccesoSospechoso(id_usuario = null, ip_address = null, user_agent = null, motivo) {
    return await this.registrarAccion({
      tipo_accion: 'acceso_sospechoso',
      entidad_afectada: 'acceso',
      id_entidad: id_usuario,
      descripcion: `Acceso sospechoso detectado: ${motivo}`,
      datos_nuevos: { id_usuario, motivo, ip_address, user_agent },
      id_usuario,
      ip_address,
      user_agent,
      severidad: 'error'
    });
  }

  /**
   * Registrar error del sistema
   * @param {Error} error - Objeto de error
   * @param {Object} contexto - Contexto adicional del error
   * @param {string} severidad - Nivel de severidad ('error' o 'critical')
   */
  async registrarErrorSistema(error, contexto = {}, severidad = 'error') {
    const stackTrace = error.stack || error.toString();
    const errorInfo = {
      message: error.message,
      name: error.name,
      code: error.code,
      ...contexto
    };

    return await this.registrarAccion({
      tipo_accion: severidad === 'critical' ? 'error_critico' : 'error_sistema',
      entidad_afectada: 'error',
      id_entidad: null,
      descripcion: `Error del sistema: ${error.message}`,
      datos_nuevos: errorInfo,
      id_usuario: contexto.id_usuario || null,
      ip_address: contexto.ip_address || null,
      user_agent: contexto.user_agent || null,
      severidad,
      stack_trace: stackTrace
    });
  }

  /**
   * Detectar accesos sospechosos basado en patrones
   * @param {string} ip_address - Dirección IP
   * @param {string} user_agent - User Agent
   * @param {number} minutos - Ventana de tiempo en minutos
   * @returns {Promise<Object>} Información sobre accesos sospechosos detectados
   */
  async detectarAccesosSospechosos(ip_address, user_agent, minutos = 10) {
    const { Op } = await import('sequelize');
    const fechaLimite = new Date(Date.now() - minutos * 60 * 1000);

    // Contar logins fallidos recientes desde esta IP
    const loginsFallidos = await SistemaAuditoria.count({
      where: {
        tipo_accion: 'login_fallido',
        ip_address,
        fecha_creacion: { [Op.gte]: fechaLimite }
      }
    });

    // Contar accesos desde diferentes user agents en corto tiempo
    const userAgentsDiferentes = await SistemaAuditoria.findAll({
      attributes: [
        [SistemaAuditoria.sequelize.fn('DISTINCT', SistemaAuditoria.sequelize.col('user_agent')), 'user_agent']
      ],
      where: {
        ip_address,
        fecha_creacion: { [Op.gte]: fechaLimite },
        user_agent: { [Op.ne]: null }
      },
      raw: true
    });

    const sospechas = [];

    if (loginsFallidos >= 5) {
      sospechas.push({
        tipo: 'multiple_fallos',
        descripcion: `${loginsFallidos} intentos de login fallidos en los últimos ${minutos} minutos`,
        severidad: 'error'
      });
    }

    if (userAgentsDiferentes.length > 3) {
      sospechas.push({
        tipo: 'user_agents_multiples',
        descripcion: `Accesos desde ${userAgentsDiferentes.length} diferentes user agents en corto tiempo`,
        severidad: 'warning'
      });
    }

    return {
      esSospechoso: sospechas.length > 0,
      sospechas,
      loginsFallidos,
      userAgentsDiferentes: userAgentsDiferentes.length
    };
  }
}

export default new AuditoriaService();

