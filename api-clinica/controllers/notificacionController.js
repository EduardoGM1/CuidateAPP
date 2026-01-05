/**
 * Controller para Notificaciones de Doctores
 * Endpoints para consultar y gestionar notificaciones de doctores
 */

import { Op } from 'sequelize';
import { NotificacionDoctor, Doctor, Paciente, Cita, MensajeChat } from '../models/associations.js';
import { sendSuccess, sendError, sendServerError } from '../utils/responseHelpers.js';
import logger from '../utils/logger.js';

/**
 * Obtener notificaciones de un doctor
 * GET /api/doctores/:id/notificaciones
 */
export const getNotificacionesDoctor = async (req, res) => {
  try {
    const { id } = req.params;
    const doctorId = parseInt(id);

    // Verificar que el usuario es el doctor o es admin
    const esAdmin = req.user.rol === 'Admin' || req.user.rol === 'admin';
    
    // Si es doctor, verificar que el doctorId corresponde al usuario autenticado
    let esDoctor = false;
    if (req.user.rol === 'Doctor' || req.user.rol === 'doctor') {
      const doctorAutenticado = await Doctor.findOne({ 
        where: { id_usuario: req.user.id },
        attributes: ['id_doctor']
      });
      if (doctorAutenticado && doctorAutenticado.id_doctor === doctorId) {
        esDoctor = true;
      }
    }

    if (!esAdmin && !esDoctor) {
      return sendError(res, 'No autorizado', 403);
    }

    const {
      page,
      limit = 50,
      offset = 0,
      tipo,
      estado,
      fecha_desde,
      fecha_hasta,
      search,
      incluir_todos = false // Nuevo parámetro para incluir todos los tipos (por defecto false)
    } = req.query;

    // Calcular offset: si viene 'page', calcularlo; si viene 'offset', usarlo directamente
    let calculatedOffset = 0;
    if (page) {
      calculatedOffset = (parseInt(page) - 1) * parseInt(limit);
    } else if (offset) {
      calculatedOffset = parseInt(offset);
    }

    // Construir filtros
    const where = { id_doctor: doctorId };
    
    // Por defecto, solo mostrar notificaciones críticas:
    // - alerta_signos_vitales: Signos vitales fuera del rango
    // - solicitud_reprogramacion: Solicitudes de reprogramación de citas
    // Si se especifica 'incluir_todos=true', mostrar todos los tipos
    // Si se especifica 'tipo', usar ese tipo específico
    if (tipo) {
      where.tipo = tipo;
    } else if (incluir_todos !== 'true' && incluir_todos !== true) {
      // Filtrar por defecto solo los tipos críticos
      where.tipo = {
        [Op.in]: ['alerta_signos_vitales', 'solicitud_reprogramacion']
      };
    }
    
    if (estado) where.estado = estado;
    
    if (fecha_desde || fecha_hasta) {
      where.fecha_envio = {};
      if (fecha_desde) where.fecha_envio[Op.gte] = new Date(fecha_desde);
      if (fecha_hasta) where.fecha_envio[Op.lte] = new Date(fecha_hasta);
    }

    // Búsqueda por título o mensaje
    if (search) {
      where[Op.or] = [
        { titulo: { [Op.like]: `%${search}%` } },
        { mensaje: { [Op.like]: `%${search}%` } }
      ];
    }

    // Obtener notificaciones con paginación
    const { count, rows } = await NotificacionDoctor.findAndCountAll({
      where,
      include: [
        {
          model: Paciente,
          attributes: ['id_paciente', 'nombre', 'apellido_paterno', 'apellido_materno'],
          required: false
        },
        {
          model: Cita,
          attributes: ['id_cita', 'fecha_cita', 'estado'],
          required: false
        }
      ],
      order: [['fecha_envio', 'DESC']],
      limit: parseInt(limit),
      offset: calculatedOffset
    });

    // Para notificaciones de tipo 'nuevo_mensaje', calcular contador dinámico de mensajes no leídos
    const notificacionesConContador = await Promise.all(rows.map(async (notif) => {
      if (notif.tipo === 'nuevo_mensaje' && notif.id_paciente && notif.id_doctor) {
        // Contar mensajes no leídos del paciente hacia el doctor
        const contadorMensajes = await MensajeChat.count({
          where: {
            id_paciente: notif.id_paciente,
            id_doctor: notif.id_doctor,
            remitente: 'Paciente',
            leido: false
          }
        });

        // Actualizar mensaje según contador
        let mensajeActualizado = notif.mensaje;
        const datosAdicionales = notif.datos_adicionales || {};
        const pacienteNombre = datosAdicionales.paciente_nombre || 
          (notif.Paciente ? `${notif.Paciente.nombre} ${notif.Paciente.apellido_paterno}`.trim() : 'Un paciente');

        if (contadorMensajes === 0) {
          // Si no hay mensajes no leídos, mantener mensaje pero indicar que está resuelto
          mensajeActualizado = `${pacienteNombre}: Todos los mensajes han sido leídos`;
        } else if (contadorMensajes === 1) {
          // Un solo mensaje: mostrar preview
          const preview = datosAdicionales.preview_mensaje || 'Nuevo mensaje';
          mensajeActualizado = `${pacienteNombre}: ${preview}`;
        } else {
          // Múltiples mensajes: mostrar contador
          mensajeActualizado = `Tienes +${contadorMensajes} mensajes nuevos de ${pacienteNombre}`;
        }

        // Agregar contador al objeto de notificación
        return {
          ...notif.toJSON(),
          mensaje: mensajeActualizado,
          contador_mensajes: contadorMensajes
        };
      }
      return notif.toJSON();
    }));

    const no_leidas = await NotificacionDoctor.count({
      where: { id_doctor: doctorId, estado: 'enviada' }
    });

    return sendSuccess(res, {
      success: true,
      notificaciones: notificacionesConContador,
      total: count,
      hasMore: calculatedOffset + rows.length < count,
      no_leidas,
      paginacion: page ? {
        total: count,
        pagina_actual: parseInt(page),
        total_paginas: Math.ceil(count / parseInt(limit)),
        limite: parseInt(limit)
      } : undefined
    });
  } catch (error) {
    logger.error('Error obteniendo notificaciones de doctor', error);
    return sendServerError(res, 'Error al obtener las notificaciones');
  }
};

/**
 * Marcar notificación como leída
 * PUT /api/doctores/:id/notificaciones/:notificacionId/leida
 */
export const marcarNotificacionLeida = async (req, res) => {
  try {
    const { id, notificacionId } = req.params;
    const doctorId = parseInt(id);
    const notifId = parseInt(notificacionId);

    // Verificar autorización
    const esAdmin = req.user.rol === 'Admin' || req.user.rol === 'admin';
    
    let esDoctor = false;
    if (req.user.rol === 'Doctor' || req.user.rol === 'doctor') {
      const doctorAutenticado = await Doctor.findOne({ 
        where: { id_usuario: req.user.id },
        attributes: ['id_doctor']
      });
      if (doctorAutenticado && doctorAutenticado.id_doctor === doctorId) {
        esDoctor = true;
      }
    }

    if (!esAdmin && !esDoctor) {
      return sendError(res, 'No autorizado', 403);
    }

    const notificacion = await NotificacionDoctor.findOne({
      where: {
        id_notificacion: notifId,
        id_doctor: doctorId
      }
    });

    if (!notificacion) {
      return sendError(res, 'Notificación no encontrada', 404);
    }

    await notificacion.update({
      estado: 'leida',
      fecha_lectura: new Date()
    });

    logger.info('Notificación marcada como leída', {
      id_notificacion: notifId,
      id_doctor: doctorId
    });

    return sendSuccess(res, {
      message: 'Notificación marcada como leída',
      notificacion
    });
  } catch (error) {
    logger.error('Error marcando notificación como leída', error);
    return sendServerError(res, 'Error al marcar la notificación como leída');
  }
};

/**
 * Marcar notificación de mensaje como leída por pacienteId
 * PUT /api/doctores/:id/notificaciones/mensaje/:pacienteId/leida
 */
export const marcarNotificacionMensajeLeida = async (req, res) => {
  try {
    const { id, pacienteId } = req.params;
    const doctorId = parseInt(id);
    const idPaciente = parseInt(pacienteId);

    // Verificar autorización
    const esAdmin = req.user.rol === 'Admin' || req.user.rol === 'admin';
    
    let esDoctor = false;
    if (req.user.rol === 'Doctor' || req.user.rol === 'doctor') {
      const doctorAutenticado = await Doctor.findOne({ 
        where: { id_usuario: req.user.id },
        attributes: ['id_doctor']
      });
      if (doctorAutenticado && doctorAutenticado.id_doctor === doctorId) {
        esDoctor = true;
      }
    }

    if (!esAdmin && !esDoctor) {
      return sendError(res, 'No autorizado', 403);
    }

    // Buscar notificación de tipo 'nuevo_mensaje' del paciente
    const notificacion = await NotificacionDoctor.findOne({
      where: {
        id_doctor: doctorId,
        id_paciente: idPaciente,
        tipo: 'nuevo_mensaje',
        estado: 'enviada'
      }
    });

    if (!notificacion) {
      // No hay notificación pendiente, está bien (puede que ya fue leída o no existe)
      return sendSuccess(res, {
        message: 'No hay notificación pendiente para este paciente',
        notificacion: null
      });
    }

    await notificacion.update({
      estado: 'leida',
      fecha_lectura: new Date()
    });

    logger.info('Notificación de mensaje marcada como leída', {
      id_notificacion: notificacion.id_notificacion,
      id_doctor: doctorId,
      id_paciente: idPaciente
    });

    return sendSuccess(res, {
      message: 'Notificación marcada como leída',
      notificacion
    });
  } catch (error) {
    logger.error('Error marcando notificación de mensaje como leída', error);
    return sendServerError(res, 'Error al marcar la notificación como leída');
  }
};

/**
 * Archivar notificación
 * PUT /api/doctores/:id/notificaciones/:notificacionId/archivar
 */
export const archivarNotificacion = async (req, res) => {
  try {
    const { id, notificacionId } = req.params;
    const doctorId = parseInt(id);
    const notifId = parseInt(notificacionId);

    // Verificar autorización
    const esAdmin = req.user.rol === 'Admin' || req.user.rol === 'admin';
    
    let esDoctor = false;
    if (req.user.rol === 'Doctor' || req.user.rol === 'doctor') {
      const doctorAutenticado = await Doctor.findOne({ 
        where: { id_usuario: req.user.id },
        attributes: ['id_doctor']
      });
      if (doctorAutenticado && doctorAutenticado.id_doctor === doctorId) {
        esDoctor = true;
      }
    }

    if (!esAdmin && !esDoctor) {
      return sendError(res, 'No autorizado', 403);
    }

    const notificacion = await NotificacionDoctor.findOne({
      where: {
        id_notificacion: notifId,
        id_doctor: doctorId
      }
    });

    if (!notificacion) {
      return sendError(res, 'Notificación no encontrada', 404);
    }

    await notificacion.update({
      estado: 'archivada'
    });

    logger.info('Notificación archivada', {
      id_notificacion: notifId,
      id_doctor: doctorId
    });

    return sendSuccess(res, {
      message: 'Notificación archivada',
      notificacion
    });
  } catch (error) {
    logger.error('Error archivando notificación', error);
    return sendServerError(res, 'Error al archivar la notificación');
  }
};

/**
 * Obtener contador de notificaciones no leídas
 * GET /api/doctores/:id/notificaciones/contador
 */
export const getContadorNotificaciones = async (req, res) => {
  try {
    const { id } = req.params;
    const doctorId = parseInt(id);

    // Verificar autorización
    const esAdmin = req.user.rol === 'Admin' || req.user.rol === 'admin';
    
    let esDoctor = false;
    if (req.user.rol === 'Doctor' || req.user.rol === 'doctor') {
      const doctorAutenticado = await Doctor.findOne({ 
        where: { id_usuario: req.user.id },
        attributes: ['id_doctor']
      });
      if (doctorAutenticado && doctorAutenticado.id_doctor === doctorId) {
        esDoctor = true;
      }
    }

    if (!esAdmin && !esDoctor) {
      return sendError(res, 'No autorizado', 403);
    }

    const no_leidas = await NotificacionDoctor.count({
      where: {
        id_doctor: doctorId,
        estado: 'enviada'
      }
    });

    return sendSuccess(res, {
      no_leidas,
      total: await NotificacionDoctor.count({
        where: { id_doctor: doctorId }
      })
    });
  } catch (error) {
    logger.error('Error obteniendo contador de notificaciones', error);
    return sendServerError(res, 'Error al obtener el contador de notificaciones');
  }
};

