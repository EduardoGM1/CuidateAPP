import { Cita, Paciente, Doctor, Usuario, Diagnostico, PlanMedicacion, PlanDetalle, SignoVital, PuntoChequeo, EsquemaVacunacion, DoctorPaciente, Comorbilidad, PacienteComorbilidad, SolicitudReprogramacion, NotificacionDoctor } from '../models/associations.js';
import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import { sendSuccess, sendError, sendServerError } from '../utils/responseHelpers.js';
import logger from '../utils/logger.js';
import auditoriaService from '../services/auditoriaService.js';
import realtimeService from '../services/realtimeService.js';
import pushNotificationService from '../services/pushNotificationService.js';
import EncryptionService from '../services/encryptionService.js';
import { decrypt as decryptUtils } from '../utils/encryption.js';

/**
 * Formatear fecha para notificaciones en español
 * @param {Date|string} fecha - Fecha a formatear
 * @returns {string} - Fecha formateada en español
 */
const formatearFechaNotificacion = (fecha) => {
  const fechaObj = fecha instanceof Date ? fecha : new Date(fecha);
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  
  const diaSemana = dias[fechaObj.getDay()];
  const dia = fechaObj.getDate();
  const mes = meses[fechaObj.getMonth()];
  const año = fechaObj.getFullYear();
  const horas = fechaObj.getHours().toString().padStart(2, '0');
  const minutos = fechaObj.getMinutes().toString().padStart(2, '0');
  
  return `${diaSemana} ${dia} de ${mes} de ${año} a las ${horas}:${minutos}`;
};

/**
 * Enviar notificación push al paciente sobre una cita
 * @param {number} pacienteId - ID del paciente
 * @param {string} tipo - Tipo de notificación: 'creada', 'reprogramada', 'actualizada'
 * @param {Object} citaData - Datos de la cita
 */
const enviarNotificacionPushCita = async (pacienteId, tipo, citaData) => {
  try {
    const paciente = await Paciente.findByPk(pacienteId, {
      attributes: ['id_paciente', 'id_usuario', 'nombre', 'apellido_paterno']
    });

    if (!paciente?.id_usuario) {
      logger.warn('⚠️ [PUSH] Paciente no tiene id_usuario, no se puede enviar notificación push', {
        pacienteId,
        tipo
      });
      return;
    }

    const fechaFormateada = formatearFechaNotificacion(citaData.fecha_cita || citaData.fecha_nueva || citaData.fecha_reprogramada);
    
    let titulo, mensaje;
    switch (tipo) {
      case 'creada':
        titulo = '📅 Nueva Cita Programada';
        mensaje = `Tienes una nueva cita médica programada para el ${fechaFormateada}`;
        break;
      case 'reprogramada':
        titulo = '📅 Cita Reprogramada';
        mensaje = `Tu cita médica ha sido reprogramada para el ${fechaFormateada}`;
        break;
      case 'actualizada':
        const estadoMensajes = {
          'atendida': 'Tu cita médica ha sido marcada como atendida',
          'cancelada': 'Tu cita médica ha sido cancelada',
          'reprogramada': `Tu cita médica ha sido reprogramada para el ${fechaFormateada}`,
          'no_asistida': 'Tu cita médica ha sido marcada como no asistida',
          'pendiente': 'El estado de tu cita ha sido actualizado'
        };
        titulo = '📅 Actualización de Cita';
        mensaje = estadoMensajes[citaData.estado] || estadoMensajes['pendiente'];
        break;
      default:
        titulo = '📅 Actualización de Cita';
        mensaje = 'Tu cita médica ha sido actualizada';
    }

    const resultado = await pushNotificationService.sendPushNotification(paciente.id_usuario, {
      title: titulo,
      message: mensaje,
      type: `cita_${tipo}`,
      data: {
        id_cita: citaData.id_cita,
        id_paciente: pacienteId,
        tipo: `cita_${tipo}`,
        fecha_cita: citaData.fecha_cita || citaData.fecha_nueva || citaData.fecha_reprogramada
      }
    });

    if (resultado.success) {
      logger.info(`📱 [PUSH] Notificación push de cita ${tipo} enviada al paciente`, {
        pacienteId,
        id_usuario: paciente.id_usuario,
        tipo,
        dispositivos: resultado.devices || 0
      });
    } else {
      logger.warn(`⚠️ [PUSH] No se pudo enviar notificación push de cita ${tipo}`, {
        pacienteId,
        id_usuario: paciente.id_usuario,
        tipo,
        motivo: resultado.message
      });
    }
  } catch (error) {
    // No crítico - no debe fallar la creación de la cita
    logger.error(`❌ [PUSH] Error enviando notificación push de cita ${tipo} (no crítico):`, {
      error: error.message,
      pacienteId,
      tipo
    });
  }
};

/**
 * Obtener título y mensaje para notificación de doctor (reutilizable)
 * @param {string} tipo - Tipo de notificación
 * @param {Object} data - Datos del evento
 * @returns {Object} - { titulo, mensaje }
 */
const obtenerTituloMensajeNotificacionDoctor = (tipo, data) => {
  let titulo, mensaje;
  switch (tipo) {
    case 'solicitud_reprogramacion':
      const fechaCitaFormateada = data.fecha_cita_original 
        ? formatearFechaNotificacion(data.fecha_cita_original)
        : 'fecha no disponible';
      titulo = '📅 Solicitud de Reprogramación';
      mensaje = `${data.paciente_nombre || 'Un paciente'} solicitó reprogramar su cita del ${fechaCitaFormateada}`;
      break;
    case 'cita_creada':
      const fechaFormateada = data.fecha_cita 
        ? formatearFechaNotificacion(data.fecha_cita)
        : 'fecha no disponible';
      titulo = '📅 Nueva Cita Asignada';
      mensaje = `Tienes una nueva cita programada para el ${fechaFormateada}`;
      break;
    case 'nuevo_mensaje':
      const pacienteNombre = data.paciente_nombre || 'Un paciente';
      const previewMensaje = data.preview_mensaje || 'Nuevo mensaje';
      titulo = '💬 Nuevo Mensaje';
      mensaje = `${pacienteNombre}: ${previewMensaje}`;
      break;
    case 'alerta_signos_vitales':
      const pacienteNombreAlerta = data.paciente_nombre || 'Un paciente';
      const severidadEmoji = data.severidad === 'critica' ? '🚨' : '⚠️';
      titulo = `${severidadEmoji} Alerta Signos Vitales Fuera de Rango`;
      // Usar el mensaje de la alerta si está disponible, sino crear uno genérico
      mensaje = data.mensaje || `${pacienteNombreAlerta} tiene signos vitales fuera del rango normal. ${data.tipo ? `Tipo: ${data.tipo}` : ''} Valor: ${data.valor || 'N/A'}. Rango normal: ${data.rangoNormal || 'N/A'}`;
      break;
    default:
      titulo = '📅 Notificación de Cita';
      mensaje = 'Tienes una nueva notificación relacionada con citas';
  }
  return { titulo, mensaje };
};

/**
 * Crear notificación en base de datos para doctor
 * @param {number} doctorId - ID del doctor
 * @param {string} tipo - Tipo de notificación
 * @param {Object} data - Datos del evento
 * @returns {Promise<Object|null>} - Notificación creada o null si hay error
 */
/**
 * Crear notificación para doctor (en BD y push automático)
 * @param {number} doctorId - ID del doctor
 * @param {string} tipo - Tipo de notificación
 * @param {Object} data - Datos de la notificación
 * @param {Object} options - Opciones adicionales
 * @param {boolean} options.enviarPush - Si enviar push automáticamente (default: true)
 * @returns {Promise<NotificacionDoctor|null>} - Notificación creada o null si falla
 */
export const crearNotificacionDoctor = async (doctorId, tipo, data, options = {}) => {
  try {
    const { titulo, mensaje } = obtenerTituloMensajeNotificacionDoctor(tipo, data);
    
    // 1. Guardar notificación en BD
    const notificacion = await NotificacionDoctor.create({
      id_doctor: doctorId,
      id_paciente: data.id_paciente || null,
      id_cita: data.id_cita || null,
      id_mensaje: data.id_mensaje || null,
      tipo,
      titulo,
      mensaje,
      datos_adicionales: data,
      estado: 'enviada',
      fecha_envio: new Date()
    });

    logger.info(`📝 [NOTIFICACION] Notificación ${tipo} creada en BD para doctor`, {
      id_notificacion: notificacion.id_notificacion,
      doctorId,
      tipo
    });

    // 2. Enviar push automáticamente (si no está deshabilitado)
    const enviarPush = options.enviarPush !== false;
    if (enviarPush) {
      try {
        await enviarNotificacionPushDoctor(doctorId, tipo, data);
      } catch (pushError) {
        // No crítico - la notificación ya está guardada en BD
        logger.warn(`⚠️ [PUSH] No se pudo enviar push automático (no crítico):`, {
          error: pushError.message,
          doctorId,
          tipo,
          id_notificacion: notificacion.id_notificacion
        });
      }
    }

    return notificacion;
  } catch (error) {
    // No crítico - no debe fallar la operación principal
    logger.error(`❌ [NOTIFICACION] Error creando notificación ${tipo} en BD (no crítico):`, {
      error: error.message,
      doctorId,
      tipo
    });
    return null;
  }
};

/**
 * Enviar notificación push al doctor sobre eventos relacionados con citas
 * @param {number} doctorId - ID del doctor
 * @param {string} tipo - Tipo de notificación: 'solicitud_reprogramacion', 'cita_creada', etc.
 * @param {Object} data - Datos del evento (paciente, cita, solicitud, etc.)
 */
const enviarNotificacionPushDoctor = async (doctorId, tipo, data) => {
  try {
    const doctor = await Doctor.findByPk(doctorId, {
      attributes: ['id_doctor', 'id_usuario', 'nombre', 'apellido_paterno']
    });

    if (!doctor?.id_usuario) {
      logger.warn('⚠️ [PUSH] Doctor no tiene id_usuario, no se puede enviar notificación push', {
        doctorId,
        tipo
      });
      return;
    }

    const { titulo, mensaje } = obtenerTituloMensajeNotificacionDoctor(tipo, data);

    const resultado = await pushNotificationService.sendPushNotification(doctor.id_usuario, {
      title: titulo,
      message: mensaje,
      type: tipo,
      data: {
        id_doctor: doctorId,
        tipo,
        ...data
      }
    });

    if (resultado.success) {
      logger.info(`📱 [PUSH] Notificación push ${tipo} enviada al doctor`, {
        doctorId,
        id_usuario: doctor.id_usuario,
        tipo,
        dispositivos: resultado.devices || 0
      });
    } else {
      logger.warn(`⚠️ [PUSH] No se pudo enviar notificación push ${tipo} al doctor`, {
        doctorId,
        id_usuario: doctor.id_usuario,
        tipo,
        motivo: resultado.message
      });
    }
  } catch (error) {
    // No crítico - no debe fallar la operación principal
    logger.error(`❌ [PUSH] Error enviando notificación push ${tipo} al doctor (no crítico):`, {
      error: error.message,
      doctorId,
      tipo
    });
  }
};

/**
 * Obtener todas las citas con filtros avanzados
 * GET /api/citas
 * 
 * Query params:
 * - limit: Número de registros (default: 50)
 * - offset: Registros a omitir (default: 0)
 * - doctor: ID del doctor
 * - paciente: ID del paciente
 * - fecha_desde: Fecha inicial (YYYY-MM-DD)
 * - fecha_hasta: Fecha final (YYYY-MM-DD)
 * - estado: 'todas' | 'pendiente' | 'completada' | 'cancelada'
 * - search: Búsqueda por motivo
 */
export const getCitas = async (req, res) => {
  try {
    const { 
      limit = 50, 
      offset = 0, 
      doctor, 
      paciente,
      fecha_desde,
      fecha_hasta,
      estado = 'todas',
      search = ''
    } = req.query;
    
    logger.info('Obteniendo todas las citas del sistema', { 
      limit, 
      offset, 
      doctor, 
      paciente,
      estado,
      userRole: req.user?.rol
    });
    
    // Construir condiciones WHERE
    let whereCondition = {};
    
    // Si es Doctor, filtrar automáticamente por su id_doctor
    if (req.user.rol === 'Doctor') {
      // Buscar el doctor por id_usuario (patrón reutilizado de otros controladores)
      const doctorAutenticado = await Doctor.findOne({ where: { id_usuario: req.user.id } });
      if (!doctorAutenticado) {
        logger.warn('Doctor no encontrado para usuario', { userId: req.user.id });
        return sendSuccess(res, {
          citas: [],
          total: 0,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: false
        });
      }
      // Filtrar automáticamente por el doctor autenticado
      whereCondition.id_doctor = doctorAutenticado.id_doctor;
      logger.info('Filtro automático aplicado para doctor', { id_doctor: doctorAutenticado.id_doctor });
    } else if (doctor && !isNaN(doctor)) {
      // Solo admin puede filtrar por doctor específico
      whereCondition.id_doctor = parseInt(doctor);
    }
    
    // Filtro por paciente
    if (paciente && !isNaN(paciente)) {
      whereCondition.id_paciente = parseInt(paciente);
    }
    
    // Filtro por rango de fechas
    if (fecha_desde || fecha_hasta) {
      whereCondition.fecha_cita = {};
      if (fecha_desde) whereCondition.fecha_cita[Op.gte] = new Date(fecha_desde);
      if (fecha_hasta) whereCondition.fecha_cita[Op.lte] = new Date(fecha_hasta);
    }
    
    // Filtro por búsqueda en motivo
    if (search && search.trim()) {
      whereCondition.motivo = {
        [Op.like]: `%${search.trim()}%`
      };
    }
    
    // Filtro por estado (si no es 'todas')
    if (estado && estado !== 'todas') {
      whereCondition.estado = estado;
    }
    
    // Obtener total y citas
    let count = 0;
    let citas = [];
    
    try {
      const result = await Cita.findAndCountAll({
        where: whereCondition,
        include: [
          { 
            model: Paciente, 
            attributes: ['id_paciente', 'nombre', 'apellido_paterno', 'apellido_materno'],
            required: false
          },
          { 
            model: Doctor, 
            attributes: ['id_doctor', 'nombre', 'apellido_paterno', 'apellido_materno'],
            required: false
          }
        ],
        order: [['fecha_cita', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset),
        raw: false // Asegurar que retorne instancias de Sequelize para que los hooks funcionen
      });
      
      count = result.count;
      citas = result.rows;
      
      logger.debug('Citas obtenidas de BD', {
        count,
        rowsCount: citas.length,
        firstCitaSample: citas.length > 0 ? {
          id_cita: citas[0].id_cita,
          hasMotivo: !!citas[0].motivo,
          motivoType: typeof citas[0].motivo,
          hasObservaciones: !!citas[0].observaciones,
          observacionesType: typeof citas[0].observaciones
        } : null
      });
    } catch (queryError) {
      logger.error('Error en consulta findAndCountAll de citas', {
        error: queryError.message,
        stack: queryError.stack,
        name: queryError.name,
        originalError: queryError.original?.message || queryError.original,
        sql: queryError.sql || queryError.original?.sql
      });
      throw queryError;
    }
    
    // Formatear datos para la respuesta
    // Los hooks de Sequelize ya desencriptan automáticamente motivo y observaciones
    const citasFormateadas = citas.map(cita => {
      try {
        // Convertir a JSON para asegurar que los hooks se hayan aplicado
        const citaData = cita.toJSON ? cita.toJSON() : cita;
        
        return {
          id_cita: citaData.id_cita,
          id_paciente: citaData.id_paciente,
          id_doctor: citaData.id_doctor,
          fecha_cita: citaData.fecha_cita,
          estado: determinarEstadoCita(citaData),
          asistencia: citaData.asistencia, // Mantener para compatibilidad
          fecha_reprogramada: citaData.fecha_reprogramada,
          motivo_reprogramacion: citaData.motivo_reprogramacion,
          motivo: citaData.motivo || null, // Los hooks ya desencriptaron si estaba encriptado
          es_primera_consulta: citaData.es_primera_consulta,
          observaciones: citaData.observaciones || null, // Los hooks ya desencriptaron si estaba encriptado
          fecha_creacion: citaData.fecha_creacion,
          paciente_nombre: citaData.Paciente ? 
            `${citaData.Paciente.nombre || ''} ${citaData.Paciente.apellido_paterno || ''} ${citaData.Paciente.apellido_materno || ''}`.trim() : 
            'Sin paciente',
          doctor_nombre: citaData.Doctor ? 
            `${citaData.Doctor.nombre || ''} ${citaData.Doctor.apellido_paterno || ''} ${citaData.Doctor.apellido_materno || ''}`.trim() : 
            'Sin doctor'
        };
      } catch (mapError) {
        logger.error('Error mapeando cita individual', {
          error: mapError.message,
          citaId: cita.id_cita,
          stack: mapError.stack
        });
        // Retornar objeto mínimo si falla el mapeo
        return {
          id_cita: cita.id_cita || null,
          id_paciente: cita.id_paciente || null,
          id_doctor: cita.id_doctor || null,
          fecha_cita: cita.fecha_cita || null,
          estado: 'pendiente',
          motivo: null,
          observaciones: null,
          paciente_nombre: 'Error cargando datos',
          doctor_nombre: 'Error cargando datos'
        };
      }
    });
    
    logger.info(`Citas obtenidas: ${citas.length} de ${count} totales`);
    
    return sendSuccess(res, {
      citas: citasFormateadas,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: (parseInt(offset) + parseInt(limit)) < count
    });
  } catch (error) {
    logger.error('Error obteniendo citas', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      originalError: error.original?.message || error.original,
      sql: error.sql || error.original?.sql
    });
    return sendServerError(res, error);
  }
};

// Función helper para determinar el estado de la cita (compatibilidad hacia atrás)
const determinarEstadoCita = (cita) => {
  // Si tiene campo estado, usarlo directamente
  if (cita.estado) {
    return cita.estado;
  }
  
  // Fallback: calcular basado en asistencia (compatibilidad)
  const ahora = new Date();
  const fechaCita = new Date(cita.fecha_cita);
  
  if (fechaCita < ahora) {
    if (cita.asistencia === true) return 'atendida';
    if (cita.asistencia === false) return 'no_asistida';
    return 'pendiente';
  }
  
  return 'pendiente';
};

export const getCita = async (req, res) => {
  try {
    const cita = await Cita.findByPk(req.params.id, {
      include: [
        { model: Paciente, attributes: ['nombre', 'apellido_paterno'] },
        { model: Doctor, attributes: ['nombre', 'apellido_paterno'] },
        { model: SignoVital, as: 'SignosVitales', required: false },
        { model: Diagnostico, as: 'Diagnosticos', required: false }
      ],
      raw: false // Asegurar que retorne instancias de Sequelize para que los hooks funcionen
    });
    if (!cita) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    
    // Desencriptar campos encriptados (fallback si los hooks no funcionaron)
    const citaData = cita.toJSON ? cita.toJSON() : cita;
    
    // Helper para desencriptar campos (soporta formato JSON y formato iv:tag:data)
    const decryptFieldIfNeeded = (value) => {
      if (!value || value === null || value === undefined || value === '') {
        return value;
      }
      if (typeof value !== 'string') {
        return value;
      }
      
      // Intentar formato JSON primero (EncryptionService - formato {"encrypted":"...","iv":"...","authTag":"..."})
      try {
        const jsonData = JSON.parse(value);
        if (jsonData.encrypted && jsonData.iv && jsonData.authTag) {
          const decrypted = EncryptionService.decrypt(value);
          return decrypted !== null ? decrypted : value;
        }
      } catch (jsonError) {
        // No es JSON válido, continuar con formato iv:tag:data
      }
      
      // Verificar formato iv:tag:data (3 partes separadas por :)
      const parts = value.split(':');
      if (parts.length === 3 && parts[0].length > 0 && parts[1].length > 0 && parts[2].length > 0) {
        try {
          // Usar decrypt de utils/encryption.js para formato iv:tag:data
          const decrypted = decryptUtils(value);
          // Si se desencriptó correctamente (retorna diferente al original), usar el valor desencriptado
          if (decrypted !== null && decrypted !== value) {
            return decrypted;
          }
        } catch (decryptError) {
          // Si falla la desencriptación, retornar valor original
          logger.debug(`Error desencriptando campo en formato iv:tag:data: ${decryptError.message}`);
        }
      }
      
      // No parece estar encriptado, retornar valor original
      return value;
    };
    
    // Desencriptar campos de la cita
    const citaFormateada = {
      ...citaData,
      motivo: decryptFieldIfNeeded(citaData.motivo),
      observaciones: decryptFieldIfNeeded(citaData.observaciones)
    };
    
        // Desencriptar campos de SignosVitales si existen
        if (citaFormateada.SignosVitales && Array.isArray(citaFormateada.SignosVitales)) {
          const camposEncriptadosSignosVitales = [
            'presion_sistolica',
            'presion_diastolica',
            'glucosa_mg_dl',
            'colesterol_mg_dl',
            'colesterol_ldl',
            'colesterol_hdl',
            'trigliceridos_mg_dl',
            'hba1c_porcentaje'
          ];
          
          const camposTextoEncriptados = [
            'observaciones'
          ];
      
      citaFormateada.SignosVitales = citaFormateada.SignosVitales.map(signo => {
        const signoDesencriptado = { ...signo };
        
        // Desencriptar cada campo encriptado
        camposEncriptadosSignosVitales.forEach(field => {
          const valorOriginal = signoDesencriptado[field];
          
          // Si el valor es null o undefined, mantenerlo así
          if (valorOriginal === null || valorOriginal === undefined) {
            return; // Continuar con el siguiente campo
          }
          
          // Si ya es un número válido, los hooks ya lo desencriptaron correctamente
          if (typeof valorOriginal === 'number') {
            if (!isNaN(valorOriginal) && isFinite(valorOriginal)) {
              // Ya está desencriptado y es un número válido, mantenerlo
              signoDesencriptado[field] = valorOriginal;
            } else {
              // Es NaN o Infinity, establecer a null
              signoDesencriptado[field] = null;
            }
            return; // Continuar con el siguiente campo
          }
          
          // Si es string, procesarlo
          if (typeof valorOriginal === 'string') {
            const valorTrimmed = valorOriginal.trim();
            
            // Si está vacío, establecer a null
            if (valorTrimmed === '') {
              signoDesencriptado[field] = null;
              return; // Continuar con el siguiente campo
            }
            
            // Verificar si es un número válido como string (ya desencriptado por hooks)
            const numValue = parseFloat(valorTrimmed);
            if (!isNaN(numValue) && isFinite(numValue) && valorTrimmed === String(numValue)) {
              // Es un número válido como string, los hooks ya lo desencriptaron
              signoDesencriptado[field] = field !== 'observaciones' ? numValue : valorTrimmed;
              return; // Continuar con el siguiente campo
            }
            
            // No es un número válido, puede estar encriptado, intentar desencriptar
            const decrypted = decryptFieldIfNeeded(valorTrimmed);
            
            // Si se desencriptó (el valor cambió y no es null)
            if (decrypted !== valorTrimmed && decrypted !== null && decrypted !== undefined) {
              if (field !== 'observaciones') {
                // Intentar convertir a número
                const numValueDecrypted = parseFloat(decrypted);
                if (!isNaN(numValueDecrypted) && isFinite(numValueDecrypted)) {
                  signoDesencriptado[field] = numValueDecrypted;
                } else {
                  // No se pudo convertir a número, mantener null para evitar NaN
                  logger.warn(`No se pudo convertir a número el campo ${field} desencriptado: ${decrypted}`);
                  signoDesencriptado[field] = null;
                }
              } else {
                signoDesencriptado[field] = decrypted;
              }
            } else {
              // No se desencriptó, puede que no esté encriptado o ya esté desencriptado
              // Si parece estar encriptado (formato iv:tag:data o JSON), establecer a null
              const parts = valorTrimmed.split(':');
              const isEncryptedFormat = (parts.length === 3 && parts[0].length > 0 && parts[1].length > 0 && parts[2].length > 0) ||
                                       (valorTrimmed.startsWith('{') && valorTrimmed.includes('encrypted'));
              
              if (isEncryptedFormat) {
                // Parece estar encriptado pero no se pudo desencriptar, establecer a null
                logger.warn(`No se pudo desencriptar el campo ${field}, parece estar encriptado: ${valorTrimmed.substring(0, 50)}`);
                signoDesencriptado[field] = null;
              } else {
                // No parece estar encriptado, mantener el valor original
                signoDesencriptado[field] = valorTrimmed;
              }
            }
          } else {
            // Otro tipo de dato (boolean, etc.), mantener como está
            signoDesencriptado[field] = valorOriginal;
          }
        });
        
        // Desencriptar campos de texto (observaciones)
        camposTextoEncriptados.forEach(field => {
          const valorOriginal = signoDesencriptado[field];
          
          if (valorOriginal !== null && valorOriginal !== undefined && valorOriginal !== '') {
            if (typeof valorOriginal === 'string') {
              const valorTrimmed = valorOriginal.trim();
              
              // Verificar si parece estar encriptado
              const parts = valorTrimmed.split(':');
              const isEncryptedFormat = (parts.length === 3 && parts[0].length > 0 && parts[1].length > 0 && parts[2].length > 0) ||
                                       (valorTrimmed.startsWith('{') && valorTrimmed.includes('encrypted'));
              
              if (isEncryptedFormat) {
                // Intentar desencriptar
                const decrypted = decryptFieldIfNeeded(valorTrimmed);
                if (decrypted !== valorTrimmed && decrypted !== null && decrypted !== undefined) {
                  signoDesencriptado[field] = decrypted;
                } else {
                  // No se pudo desencriptar, establecer a null para evitar mostrar JSON encriptado
                  logger.warn(`No se pudo desencriptar el campo ${field} de SignosVitales: ${valorTrimmed.substring(0, 50)}`);
                  signoDesencriptado[field] = null;
                }
              } else {
                // No parece estar encriptado, mantener el valor
                signoDesencriptado[field] = valorTrimmed;
              }
            } else {
              // Si no es string, convertir a string
              signoDesencriptado[field] = String(valorOriginal);
            }
          } else {
            signoDesencriptado[field] = null;
          }
        });
        
        return signoDesencriptado;
      });
    }
    
    // Desencriptar campos de Diagnosticos si existen
    if (citaFormateada.Diagnosticos && Array.isArray(citaFormateada.Diagnosticos)) {
      citaFormateada.Diagnosticos = citaFormateada.Diagnosticos.map(diagnostico => ({
        ...diagnostico,
        descripcion: decryptFieldIfNeeded(diagnostico.descripcion)
      }));
    }
    
    res.json(citaFormateada);
  } catch (error) {
    logger.error('Error en getCita:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getCitasByPaciente = async (req, res) => {
  try {
    const citas = await Cita.findAll({
      where: { id_paciente: req.params.pacienteId },
      include: [{ model: Doctor, attributes: ['nombre', 'apellido_paterno'] }],
      order: [['fecha_cita', 'DESC']]
    });
    res.json(citas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCitasByDoctor = async (req, res) => {
  try {
    const citas = await Cita.findAll({
      where: { id_doctor: req.params.doctorId },
      include: [{ model: Paciente, attributes: ['nombre', 'apellido_paterno'] }],
      order: [['fecha_cita', 'DESC']]
    });
    res.json(citas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createCita = async (req, res) => {
  try {
    // Log detallado de lo que recibimos
    logger.info('createCita: Datos recibidos', {
      body: req.body,
      tipos: {
        id_paciente: typeof req.body?.id_paciente,
        id_doctor: typeof req.body?.id_doctor,
        fecha_cita: typeof req.body?.fecha_cita,
        motivo: typeof req.body?.motivo,
        es_primera_consulta: typeof req.body?.es_primera_consulta
      }
    });

    const {
      id_paciente,
      id_doctor,
      fecha_cita,
      motivo,
      observaciones,
      es_primera_consulta = false,
      estado = 'pendiente', // Valor por defecto
      asistencia = null
    } = req.body;

    // Validar campos requeridos
    if (!id_paciente || !fecha_cita) {
      logger.warn('createCita: Campos requeridos faltantes', {
        tieneIdPaciente: !!id_paciente,
        tieneFechaCita: !!fecha_cita
      });
      return res.status(400).json({
        success: false,
        error: 'Los campos id_paciente y fecha_cita son requeridos'
      });
    }

    // Convertir y validar tipos de datos
    const pacienteId = parseInt(id_paciente, 10);
    if (isNaN(pacienteId) || pacienteId <= 0) {
      return res.status(400).json({
        success: false,
        error: 'id_paciente debe ser un número válido'
      });
    }

    // Convertir id_doctor a número si se proporciona
    let doctorId = null;
    if (id_doctor !== null && id_doctor !== undefined && id_doctor !== '') {
      doctorId = parseInt(id_doctor, 10);
      if (isNaN(doctorId) || doctorId <= 0) {
        return res.status(400).json({
          success: false,
          error: 'id_doctor debe ser un número válido'
        });
      }
    }

    // Validar formato de fecha
    const fechaCitaObj = new Date(fecha_cita);
    if (isNaN(fechaCitaObj.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'fecha_cita debe ser una fecha válida'
      });
    }

    // Validar que el estado sea válido
    const estadosValidos = ['pendiente', 'atendida', 'no_asistida', 'reprogramada', 'cancelada'];
    if (estado && !estadosValidos.includes(estado)) {
      return res.status(400).json({
        success: false,
        error: `El estado debe ser uno de: ${estadosValidos.join(', ')}`
      });
    }

    logger.info('Creando cita', {
      id_paciente: pacienteId,
      id_doctor: doctorId,
      fecha_cita: fechaCitaObj.toISOString(),
      estado,
      motivo: motivo ? 'presente' : 'ausente',
      observaciones: observaciones ? 'presente' : 'ausente',
      es_primera_consulta
    });

    // Preparar datos para crear la cita
    const datosCita = {
      id_paciente: pacienteId,
      id_doctor: doctorId,
      fecha_cita: fechaCitaObj,
      motivo: motivo || null,
      observaciones: observaciones || null,
      es_primera_consulta: Boolean(es_primera_consulta),
      estado: estado || 'pendiente',
      asistencia: asistencia !== null ? Boolean(asistencia) : null,
      fecha_creacion: new Date()
    };

    logger.info('createCita: Datos para crear', {
      datosCita: {
        ...datosCita,
        motivo: datosCita.motivo ? 'presente' : 'ausente',
        observaciones: datosCita.observaciones ? 'presente' : 'ausente'
      },
      tipos: {
        id_paciente: typeof datosCita.id_paciente,
        id_doctor: typeof datosCita.id_doctor,
        fecha_cita: typeof datosCita.fecha_cita,
        estado: typeof datosCita.estado,
        es_primera_consulta: typeof datosCita.es_primera_consulta
      }
    });

    // Crear la cita
    const nuevaCita = await Cita.create(datosCita);

    logger.info('Cita creada exitosamente', { id_cita: nuevaCita.id_cita });

    // Obtener datos completos de la cita con relaciones para WebSocket
    const citaCompleta = await Cita.findByPk(nuevaCita.id_cita, {
      include: [
        { model: Paciente, attributes: ['id_paciente', 'nombre', 'apellido_paterno', 'apellido_materno'] },
        { model: Doctor, attributes: ['id_doctor', 'nombre', 'apellido_paterno', 'apellido_materno'] }
      ]
    });

    // Emitir evento WebSocket: cita_creada
    const citaData = {
      id_cita: citaCompleta.id_cita,
      id_paciente: citaCompleta.id_paciente,
      id_doctor: citaCompleta.id_doctor,
      fecha_cita: citaCompleta.fecha_cita,
      estado: citaCompleta.estado,
      motivo: citaCompleta.motivo,
      paciente_nombre: citaCompleta.Paciente ? `${citaCompleta.Paciente.nombre} ${citaCompleta.Paciente.apellido_paterno}` : null,
      doctor_nombre: citaCompleta.Doctor ? `${citaCompleta.Doctor.nombre} ${citaCompleta.Doctor.apellido_paterno}` : null
    };

    // Notificar al paciente
    if (citaCompleta.id_paciente) {
      try {
        const paciente = await Paciente.findByPk(citaCompleta.id_paciente, {
          attributes: ['id_paciente', 'id_usuario']
        });
        
        logger.info('📤 [WS-BACKEND] Enviando evento cita_creada al paciente', {
          id_paciente: citaCompleta.id_paciente,
          id_usuario: paciente?.id_usuario,
          tieneIdUsuario: !!paciente?.id_usuario,
          citaData: {
            id_cita: citaData.id_cita,
            id_paciente: citaData.id_paciente,
            fecha_cita: citaData.fecha_cita
          }
        });
        
        if (paciente?.id_usuario) {
          const enviado = realtimeService.sendToUser(paciente.id_usuario, 'cita_creada', citaData);
          logger.info('📤 [WS-BACKEND] Evento enviado por id_usuario', {
            id_usuario: paciente.id_usuario,
            enviado,
            id_cita: citaData.id_cita,
            id_paciente: citaData.id_paciente
          });
        } else {
          logger.warn('⚠️ [WS-BACKEND] Paciente no tiene id_usuario, solo se enviará por sala', {
            id_paciente: citaCompleta.id_paciente
          });
        }
        
        // Siempre enviar también a la sala del paciente por id_paciente (fallback)
        const enviadoPaciente = realtimeService.sendToPaciente(citaCompleta.id_paciente, 'cita_creada', citaData);
        logger.info('📤 [WS-BACKEND] Evento enviado por id_paciente (sala)', {
          id_paciente: citaCompleta.id_paciente,
          enviado: enviadoPaciente,
          id_cita: citaData.id_cita,
          sala: `paciente_${citaCompleta.id_paciente}`
        });

        // Enviar notificación push al paciente
        await enviarNotificacionPushCita(citaCompleta.id_paciente, 'creada', citaData);
      } catch (wsError) {
        logger.error('❌ [WS-BACKEND] Error enviando WebSocket al paciente:', {
          error: wsError.message,
          stack: wsError.stack,
          id_paciente: citaCompleta.id_paciente
        });
      }
    } else {
      logger.warn('⚠️ [WS-BACKEND] Cita no tiene id_paciente, no se puede enviar evento WebSocket', {
        id_cita: citaCompleta.id_cita
      });
    }

    // Notificar al doctor
    if (citaCompleta.id_doctor) {
      const doctor = await Doctor.findByPk(citaCompleta.id_doctor, {
        attributes: ['id_doctor', 'id_usuario']
      });
      if (doctor?.id_usuario) {
        realtimeService.sendToUser(doctor.id_usuario, 'cita_creada', citaData);
      }
    }

    // Notificar a administradores
    realtimeService.sendToRole('Admin', 'cita_creada', citaData);

    // Devolver la cita directamente para compatibilidad con el frontend
    return res.status(201).json(nuevaCita);

  } catch (error) {
    // Log detallado del error
    logger.error('Error creando cita', {
      error: error.message,
      errorName: error.name,
      stack: error.stack,
      body: req.body,
      originalError: error.original?.message || error.original,
      sql: error.sql || error.original?.sql
    });

    // Manejar errores específicos de Sequelize
    if (error.name === 'SequelizeValidationError') {
      logger.error('Error de validación Sequelize', {
        errors: error.errors.map(e => ({ path: e.path, message: e.message, value: e.value }))
      });
      return res.status(400).json({
        success: false,
        error: 'Error de validación de datos',
        details: error.errors.map(e => ({
          field: e.path,
          message: e.message
        }))
      });
    }

    if (error.name === 'SequelizeForeignKeyConstraintError') {
      logger.error('Error de clave foránea', {
        table: error.table,
        constraint: error.index
      });
      return res.status(400).json({
        success: false,
        error: 'Referencia inválida: el paciente o doctor no existe'
      });
    }

    if (error.name === 'SequelizeDatabaseError' || error.original?.code) {
      logger.error('Error de base de datos', {
        code: error.original?.code,
        errno: error.original?.errno,
        sqlState: error.original?.sqlState,
        sqlMessage: error.original?.sqlMessage,
        sql: error.sql || error.original?.sql
      });
      return res.status(500).json({
        success: false,
        error: 'Error en la base de datos',
        message: process.env.NODE_ENV === 'development' ? (error.original?.sqlMessage || error.message) : 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && {
          details: {
            code: error.original?.code,
            sqlState: error.original?.sqlState
          }
        })
      });
    }

    // Error genérico
    logger.error('Error genérico creando cita', {
      errorType: typeof error,
      errorKeys: Object.keys(error)
    });
    return res.status(500).json({
      success: false,
      error: 'Error al crear la cita',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Error interno del servidor',
      ...(process.env.NODE_ENV === 'development' && {
        errorName: error.name,
        stack: error.stack
      })
    });
  }
};

export const createPrimeraConsulta = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      id_paciente,
      id_doctor,
      fecha_cita,
      motivo,
      observaciones,
      diagnostico,
      plan_medicacion,
      signos_vitales,
      vacunas,
      comorbilidades,
      anos_padecimiento, // ✅ Años de padecimiento por enfermedad
      diagnostico_basal, // ✅ Campos de diagnóstico basal (①)
      tratamiento_explicito, // ✅ Campos de tratamiento explícito (② y ③)
      asistencia = false,
      motivo_no_asistencia = null
    } = req.body;

    logger.info('Creando primera consulta', {
      id_paciente,
      id_doctor,
      fecha_cita
    });

    // Validar campos requeridos
    if (!id_paciente || !id_doctor || !fecha_cita) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Los campos id_paciente, id_doctor y fecha_cita son requeridos'
      });
    }

    // 1. Crear la cita
    const nuevaCita = await Cita.create({
      id_paciente,
      id_doctor,
      fecha_cita,
      motivo,
      observaciones,
      es_primera_consulta: true,
      asistencia,
      motivo_no_asistencia
    }, { transaction });

    logger.info('Cita creada', { id_cita: nuevaCita.id_cita });

    // 2. Crear diagnóstico si se proporciona
    if (diagnostico && diagnostico.descripcion) {
      await Diagnostico.create({
        id_paciente,
        id_cita: nuevaCita.id_cita,
        descripcion: diagnostico.descripcion,
        fecha_registro: new Date()
      }, { transaction });
      logger.info('Diagnóstico creado para primera consulta');
    }

    // 3. Crear plan de medicación si se proporciona
    // NOTA: En primera consulta, el plan puede venir solo con observaciones (texto)
    // sin necesidad de medicamentos específicos del catálogo
    if (plan_medicacion && (plan_medicacion.observaciones || (plan_medicacion.medicamentos && plan_medicacion.medicamentos.length > 0))) {
      try {
        const nuevoPlan = await PlanMedicacion.create({
          id_paciente,
          id_doctor: id_doctor,
          id_cita: nuevaCita.id_cita,
          observaciones: plan_medicacion.observaciones || '',
          fecha_inicio: plan_medicacion.fecha_inicio || fecha_cita,
          fecha_fin: plan_medicacion.fecha_fin || null,
          activo: true,
          fecha_creacion: new Date()
        }, { transaction });

        // Crear detalles del plan SOLO si se proporcionan medicamentos con ID
        // Si solo hay observaciones (texto), no se crean detalles
        if (plan_medicacion.medicamentos && Array.isArray(plan_medicacion.medicamentos) && plan_medicacion.medicamentos.length > 0) {
          for (const med of plan_medicacion.medicamentos) {
            // Validar que sea un objeto y tenga id_medicamento (requerido)
            if (med && typeof med === 'object' && med.id_medicamento) {
              await PlanDetalle.create({
                id_plan: nuevoPlan.id_plan,
                id_medicamento: med.id_medicamento,
                dosis: med.dosis || '',
                frecuencia: med.frecuencia || '',
                horario: med.horario || null,
                via_administracion: med.via_administracion || null,
                observaciones: med.observaciones || null
              }, { transaction });
            } else {
              logger.warn('Medicamento omitido: formato inválido o sin id_medicamento', { 
                med,
                tipo: typeof med,
                esObjeto: typeof med === 'object'
              });
            }
          }
        }
        logger.info('Plan de medicación creado para primera consulta', {
          tieneDetalles: plan_medicacion.medicamentos?.length > 0,
          soloObservaciones: !!plan_medicacion.observaciones && !plan_medicacion.medicamentos
        });
      } catch (error) {
        logger.error('Error creando plan de medicación', {
          error: error.message,
          stack: error.stack,
          plan_medicacion
        });
        throw error; // Re-lanzar para que se maneje en el catch principal
      }
    }

    // 4. Crear signos vitales si se proporcionan
    if (signos_vitales) {
      try {
        // Validar que haya al menos un campo de signos vitales
        const tieneSignos = signos_vitales.peso_kg || signos_vitales.talla_m || 
                           signos_vitales.presion_sistolica || signos_vitales.glucosa_mg_dl ||
                           signos_vitales.colesterol_mg_dl || signos_vitales.trigliceridos_mg_dl ||
                           signos_vitales.hba1c_porcentaje || signos_vitales.colesterol_ldl || 
                           signos_vitales.colesterol_hdl;
        
        if (tieneSignos) {
          // Calcular IMC si se proporcionan peso y talla
          let imc = null;
          if (signos_vitales.peso_kg && signos_vitales.talla_m && parseFloat(signos_vitales.talla_m) > 0) {
            const peso = parseFloat(signos_vitales.peso_kg);
            const talla = parseFloat(signos_vitales.talla_m);
            imc = parseFloat((peso / (talla * talla)).toFixed(2));
          }

          // ✅ Convertir valores numéricos a string para encriptación (campos encriptados son TEXT)
          await SignoVital.create({
            id_paciente,
            id_cita: nuevaCita.id_cita,
            peso_kg: signos_vitales.peso_kg ? parseFloat(signos_vitales.peso_kg) : null,
            talla_m: signos_vitales.talla_m ? parseFloat(signos_vitales.talla_m) : null,
            imc: imc,
            medida_cintura_cm: signos_vitales.medida_cintura_cm ? parseFloat(signos_vitales.medida_cintura_cm) : null,
            presion_sistolica: signos_vitales.presion_sistolica ? String(signos_vitales.presion_sistolica) : null, // Encriptado
            presion_diastolica: signos_vitales.presion_diastolica ? String(signos_vitales.presion_diastolica) : null, // Encriptado
            glucosa_mg_dl: signos_vitales.glucosa_mg_dl ? String(signos_vitales.glucosa_mg_dl) : null, // Encriptado
            colesterol_mg_dl: signos_vitales.colesterol_mg_dl ? String(signos_vitales.colesterol_mg_dl) : null, // Encriptado
            // ✅ Nuevos campos según FORMA_2022_OFICIAL
            colesterol_ldl: signos_vitales.colesterol_ldl ? String(signos_vitales.colesterol_ldl) : null, // Encriptado
            colesterol_hdl: signos_vitales.colesterol_hdl ? String(signos_vitales.colesterol_hdl) : null, // Encriptado
            trigliceridos_mg_dl: signos_vitales.trigliceridos_mg_dl ? String(signos_vitales.trigliceridos_mg_dl) : null, // Encriptado
            hba1c_porcentaje: signos_vitales.hba1c_porcentaje ? String(signos_vitales.hba1c_porcentaje) : null, // Encriptado - Campo obligatorio para criterios de acreditación
            edad_paciente_en_medicion: signos_vitales.edad_paciente_en_medicion ? parseInt(signos_vitales.edad_paciente_en_medicion, 10) : null, // No encriptado (INTEGER)
            registrado_por: signos_vitales.registrado_por || 'doctor', // Campo requerido
            observaciones: signos_vitales.observaciones || null, // Encriptado
            fecha_medicion: fecha_cita,
            fecha_creacion: new Date()
          }, { transaction });
          
          logger.info('Signos vitales creados para primera consulta');
        } else {
          logger.info('Signos vitales omitidos: no hay datos suficientes');
        }
      } catch (error) {
        logger.error('Error creando signos vitales', {
          error: error.message,
          signos_vitales
        });
        throw error; // Re-lanzar para que se maneje en el catch principal
      }
    }

    // 5. Crear registros de vacunación si se proporcionan
    if (vacunas && Array.isArray(vacunas) && vacunas.length > 0) {
      try {
        for (const vacuna of vacunas) {
          if (vacuna && vacuna.vacuna && vacuna.fecha_aplicacion) {
            await EsquemaVacunacion.create({
              id_paciente,
              vacuna: String(vacuna.vacuna).trim(),
              fecha_aplicacion: vacuna.fecha_aplicacion,
              lote_vacuna: vacuna.lote_vacuna ? String(vacuna.lote_vacuna).trim() : null
            }, { transaction });
          } else {
            logger.warn('Vacuna omitida: datos incompletos', { vacuna });
          }
        }
        logger.info('Registros de vacunación creados para primera consulta');
      } catch (error) {
        logger.error('Error creando registros de vacunación', {
          error: error.message,
          vacunas
        });
        throw error; // Re-lanzar para que se maneje en el catch principal
      }
    }

    // 6. Asociar comorbilidades si se proporcionan
    // ✅ Incluir campos de diagnóstico basal y tratamiento según FORMA_2022_OFICIAL
    if (comorbilidades && Array.isArray(comorbilidades) && comorbilidades.length > 0) {
      try {
        // Obtener datos de diagnóstico basal y tratamiento explícito del request
        const diagnosticoBasal = diagnostico_basal || {};
        const tratamientoExplicito = tratamiento_explicito || {};
        const anosPadecimiento = anos_padecimiento || {}; // { enfermedad: años }

        for (const nombreComorbilidad of comorbilidades) {
          if (!nombreComorbilidad || typeof nombreComorbilidad !== 'string') {
            logger.warn('Comorbilidad omitida: nombre inválido', { nombreComorbilidad });
            continue;
          }

          const nombreLimpio = String(nombreComorbilidad).trim();
          if (!nombreLimpio) {
            logger.warn('Comorbilidad omitida: nombre vacío', { nombreComorbilidad });
            continue;
          }

          // Buscar o crear la comorbilidad
          const [comorbilidad] = await Comorbilidad.findOrCreate({
            where: { nombre_comorbilidad: nombreLimpio },
            defaults: { nombre_comorbilidad: nombreLimpio },
            transaction
          });

          // Preparar datos para la relación con campos adicionales
          const relacionDefaults = {
            id_paciente,
            id_comorbilidad: comorbilidad.id_comorbilidad,
            fecha_deteccion: new Date(),
            // ✅ Campos de diagnóstico basal (①)
            es_diagnostico_basal: diagnosticoBasal.es_basal === true || diagnosticoBasal.es_basal === 'true',
            es_agregado_posterior: diagnosticoBasal.es_agregado_posterior === true || diagnosticoBasal.es_agregado_posterior === 'true',
            año_diagnostico: diagnosticoBasal.año_diagnostico ? parseInt(diagnosticoBasal.año_diagnostico, 10) : null,
            // ✅ Campos de tratamiento explícito (② y ③)
            recibe_tratamiento_no_farmacologico: tratamientoExplicito.recibe_tratamiento_no_farmacologico === true || tratamientoExplicito.recibe_tratamiento_no_farmacologico === 'true',
            recibe_tratamiento_farmacologico: tratamientoExplicito.recibe_tratamiento_farmacologico === true || tratamientoExplicito.recibe_tratamiento_farmacologico === 'true',
            // Años de padecimiento si está disponible
            anos_padecimiento: anosPadecimiento[nombreLimpio] ? parseInt(anosPadecimiento[nombreLimpio], 10) : null
          };

          // Validar año_diagnostico si se proporciona
          if (relacionDefaults.año_diagnostico !== null) {
            const añoActual = new Date().getFullYear();
            if (relacionDefaults.año_diagnostico < 1900 || relacionDefaults.año_diagnostico > añoActual) {
              logger.warn('Año de diagnóstico inválido, omitiendo', {
                año: relacionDefaults.año_diagnostico,
                comorbilidad: nombreLimpio
              });
              relacionDefaults.año_diagnostico = null;
            }
          }

          // Asociar al paciente (solo si no existe ya)
          const [relacion, created] = await PacienteComorbilidad.findOrCreate({
            where: {
              id_paciente,
              id_comorbilidad: comorbilidad.id_comorbilidad
            },
            defaults: relacionDefaults,
            transaction
          });

          // Si la relación ya existía, actualizar los campos nuevos
          if (!created) {
            relacion.es_diagnostico_basal = relacionDefaults.es_diagnostico_basal;
            relacion.es_agregado_posterior = relacionDefaults.es_agregado_posterior;
            if (relacionDefaults.año_diagnostico !== null) {
              relacion.año_diagnostico = relacionDefaults.año_diagnostico;
            }
            relacion.recibe_tratamiento_no_farmacologico = relacionDefaults.recibe_tratamiento_no_farmacologico;
            relacion.recibe_tratamiento_farmacologico = relacionDefaults.recibe_tratamiento_farmacologico;
            if (relacionDefaults.anos_padecimiento !== null) {
              relacion.anos_padecimiento = relacionDefaults.anos_padecimiento;
            }
            await relacion.save({ transaction });
          }
        }
        logger.info('Comorbilidades asociadas al paciente con datos de diagnóstico basal y tratamiento');
      } catch (error) {
        logger.error('Error asociando comorbilidades', {
          error: error.message,
          comorbilidades,
          stack: error.stack
        });
        throw error; // Re-lanzar para que se maneje en el catch principal
      }
    }

    // 7. Crear asignación Doctor-Paciente (CRÍTICO para que el paciente aparezca como asignado)
    try {
      // Verificar que no existe ya la asignación
      const existingAssignment = await DoctorPaciente.findOne({
        where: {
          id_doctor: id_doctor,
          id_paciente: id_paciente
        },
        transaction
      });

      if (!existingAssignment) {
        // Crear la asignación doctor-paciente
        await DoctorPaciente.create({
          id_doctor: id_doctor,
          id_paciente: id_paciente,
          fecha_asignacion: new Date(),
          observaciones: 'Asignado en primera consulta'
        }, { transaction });

        logger.info('Asignación Doctor-Paciente creada en primera consulta', {
          doctorId: id_doctor,
          pacienteId: id_paciente
        });
      } else {
        logger.info('Asignación Doctor-Paciente ya existe, no se duplica', {
          doctorId: id_doctor,
          pacienteId: id_paciente
        });
      }
    } catch (error) {
      // Si hay error al crear la asignación, registrar pero no fallar toda la transacción
      // (la cita ya está creada y eso es más importante)
      logger.error('Error al crear asignación Doctor-Paciente en primera consulta', {
        error: error.message,
        doctorId: id_doctor,
        pacienteId: id_paciente
      });
    }

    await transaction.commit();

    logger.info('Primera consulta creada exitosamente', {
      id_cita: nuevaCita.id_cita,
      id_paciente,
      id_doctor
    });

    return res.status(201).json({
      success: true,
      message: 'Primera consulta creada exitosamente',
      id_cita: nuevaCita.id_cita
    });

  } catch (error) {
    await transaction.rollback();
    
    // Logging detallado del error
    logger.error('Error creando primera consulta:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      validationErrors: error.errors || null
    });

    // Determinar el código de estado y mensaje apropiados
    let statusCode = 500;
    let errorMessage = 'Error al crear la primera consulta';
    let errorDetails = error.message;

    // Si es un error de validación de Sequelize
    if (error.name === 'SequelizeValidationError') {
      statusCode = 400;
      errorMessage = 'Error de validación en los datos';
      errorDetails = error.errors?.map(e => e.message).join(', ') || error.message;
    } else if (error.name === 'SequelizeForeignKeyConstraintError') {
      statusCode = 400;
      errorMessage = 'Error de referencia: verifique que todos los IDs existan';
      errorDetails = error.message;
    } else if (error.name === 'SequelizeDatabaseError') {
      statusCode = 400;
      errorMessage = 'Error en los datos proporcionados';
      errorDetails = error.message;
    }

    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: errorDetails,
      // Solo en desarrollo
      ...(process.env.NODE_ENV === 'development' && { 
        stack: error.stack,
        rawError: error.message 
      })
    });
  }
};

/**
 * Crear consulta completa (cita nueva + datos médicos) o completar cita existente
 * POST /api/citas/consulta-completa
 * 
 * Permite dos modos:
 * 1. Crear nueva cita y completarla: NO incluir id_cita
 * 2. Completar cita existente: INCLUIR id_cita existente
 * 
 * Body:
 * - cita: { id_doctor, fecha_cita, motivo, observaciones, es_primera_consulta?, id_cita? }
 * - signos_vitales?: { peso_kg, talla_m, presion_sistolica, presion_diastolica, etc. }
 * - diagnostico?: { descripcion }
 * - plan_medicacion?: { observaciones, fecha_inicio, medicamentos: [...] }
 */
export const createConsultaCompleta = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      cita: citaData,
      signos_vitales,
      diagnostico,
      plan_medicacion
    } = req.body;

    // Validar que se proporcione datos de cita
    if (!citaData) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Debe proporcionar datos de la cita'
      });
    }

    const {
      id_paciente,
      id_doctor,
      fecha_cita,
      motivo,
      observaciones,
      es_primera_consulta = false,
      id_cita: id_cita_existente = null, // Si se proporciona, completa cita existente
      asistencia = false
    } = citaData;

    // Obtener id_paciente de params o body
    const pacienteId = id_paciente || req.params.pacienteId;

    // Validar campos requeridos según el modo
    if (id_cita_existente) {
      // Modo: Completar cita existente
      if (!pacienteId) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Debe proporcionar id_paciente'
        });
      }

      const citaExistente = await Cita.findOne({
        where: { 
          id_cita: id_cita_existente,
          id_paciente: pacienteId
        }
      }, { transaction });

      if (!citaExistente) {
        await transaction.rollback();
        return res.status(404).json({
          success: false,
          error: 'Cita no encontrada o no pertenece a este paciente'
        });
      }

      logger.info('Completando cita existente', { 
        id_cita: id_cita_existente,
        id_paciente: pacienteId 
      });

      // La cita ya existe, solo agregamos los datos médicos
    } else {
      // Modo: Crear nueva cita
      if (!pacienteId || !id_doctor || !fecha_cita) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Los campos id_paciente, id_doctor y fecha_cita son requeridos para crear nueva cita'
        });
      }

      logger.info('Creando consulta completa', {
        id_paciente: pacienteId,
        id_doctor,
        fecha_cita
      });
    }

    let citaId;

    if (id_cita_existente) {
      // Usar la cita existente
      citaId = id_cita_existente;
      
      // Opcionalmente actualizar datos de la cita si se proporcionan
      if (asistencia !== undefined || observaciones !== undefined) {
        await Cita.update(
          {
            asistencia: asistencia !== undefined ? asistencia : undefined,
            observaciones: observaciones !== undefined ? observaciones : undefined
          },
          { 
            where: { id_cita: citaId },
            transaction 
          }
        );
      }
    } else {
      // Crear nueva cita
      const nuevaCita = await Cita.create({
        id_paciente: pacienteId,
        id_doctor,
        fecha_cita,
        motivo,
        observaciones,
        es_primera_consulta,
        asistencia,
        fecha_creacion: new Date()
      }, { transaction });

      citaId = nuevaCita.id_cita;
      logger.info('Cita creada', { id_cita: citaId });
    }

    // 1. Crear signos vitales si se proporcionan
    if (signos_vitales) {
      // Validar que haya al menos un campo
      const tieneSignos = signos_vitales.peso_kg || signos_vitales.talla_m || 
                         signos_vitales.presion_sistolica || signos_vitales.glucosa_mg_dl;
      
      if (tieneSignos) {
        // Calcular IMC si se proporcionan peso y talla
        let imc = null;
        if (signos_vitales.peso_kg && signos_vitales.talla_m && signos_vitales.talla_m > 0) {
          imc = parseFloat((signos_vitales.peso_kg / (signos_vitales.talla_m * signos_vitales.talla_m)).toFixed(2));
        }

        await SignoVital.create({
          id_paciente: pacienteId,
          id_cita: citaId,
          peso_kg: signos_vitales.peso_kg || null,
          talla_m: signos_vitales.talla_m || null,
          imc: imc,
          medida_cintura_cm: signos_vitales.medida_cintura_cm || null,
          presion_sistolica: signos_vitales.presion_sistolica || null,
          presion_diastolica: signos_vitales.presion_diastolica || null,
          glucosa_mg_dl: signos_vitales.glucosa_mg_dl || null,
          colesterol_mg_dl: signos_vitales.colesterol_mg_dl || null,
          trigliceridos_mg_dl: signos_vitales.trigliceridos_mg_dl || null,
          registrado_por: 'doctor',
          observaciones: signos_vitales.observaciones || null,
          fecha_medicion: fecha_cita || new Date(),
          fecha_creacion: new Date()
        }, { transaction });
        
        logger.info('Signos vitales creados para consulta');
      }
    }

    // 2. Crear diagnóstico si se proporciona
    if (diagnostico && diagnostico.descripcion) {
      await Diagnostico.create({
        id_paciente: pacienteId,
        id_cita: citaId,
        descripcion: diagnostico.descripcion,
        fecha_registro: new Date()
      }, { transaction });
      logger.info('Diagnóstico creado para consulta');
    }

    // 3. Crear plan de medicación si se proporciona
    if (plan_medicacion) {
      const nuevoPlan = await PlanMedicacion.create({
        id_paciente: pacienteId,
        id_doctor: id_doctor || null,
        id_cita: citaId,
        observaciones: plan_medicacion.observaciones || '',
        fecha_inicio: plan_medicacion.fecha_inicio || fecha_cita || new Date(),
        fecha_fin: plan_medicacion.fecha_fin || null,
        activo: true,
        fecha_creacion: new Date()
      }, { transaction });

      // Crear detalles del plan si se proporcionan medicamentos
      if (plan_medicacion.medicamentos && Array.isArray(plan_medicacion.medicamentos)) {
        for (const med of plan_medicacion.medicamentos) {
          if (med.id_medicamento) {
            await PlanDetalle.create({
              id_plan: nuevoPlan.id_plan,
              id_medicamento: med.id_medicamento,
              dosis: med.dosis || '',
              frecuencia: med.frecuencia || '',
              horario: med.horario || null,
              via_administracion: med.via_administracion || null,
              observaciones: med.observaciones || null
            }, { transaction });
          }
        }
      }
      logger.info('Plan de medicación creado para consulta');
    }

    // 4. Crear asignación Doctor-Paciente si no existe (solo para consultas nuevas)
    if (!id_cita_existente && id_doctor && pacienteId) {
      try {
        const existingAssignment = await DoctorPaciente.findOne({
          where: {
            id_doctor: id_doctor,
            id_paciente: pacienteId
          },
          transaction
        });

        if (!existingAssignment) {
          await DoctorPaciente.create({
            id_doctor: id_doctor,
            id_paciente: pacienteId,
            fecha_asignacion: new Date(),
            observaciones: 'Asignado en consulta completa'
          }, { transaction });

          logger.info('Asignación Doctor-Paciente creada en consulta completa', {
            doctorId: id_doctor,
            pacienteId: pacienteId
          });
        }
      } catch (error) {
        logger.error('Error al crear asignación Doctor-Paciente en consulta completa', {
          error: error.message,
          doctorId: id_doctor,
          pacienteId: pacienteId
        });
      }
    }

    await transaction.commit();

    logger.info('Consulta completa creada exitosamente', {
      id_cita: citaId,
      id_paciente: pacienteId,
      id_doctor: id_doctor,
      modo: id_cita_existente ? 'completar_existente' : 'crear_nueva'
    });

    return res.status(201).json({
      success: true,
      message: id_cita_existente 
        ? 'Consulta completada exitosamente' 
        : 'Consulta completa creada exitosamente',
      id_cita: citaId,
      modo: id_cita_existente ? 'completar_existente' : 'crear_nueva'
    });

  } catch (error) {
    await transaction.rollback();
    logger.error('Error creando consulta completa:', {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).json({
      success: false,
      error: 'Error al crear la consulta completa',
      details: error.message
    });
  }
};

export const updateCita = async (req, res) => {
  try {
    const cita = await Cita.findByPk(req.params.id);
    if (!cita) {
      return sendError(res, 'Cita no encontrada', 404);
    }

    const [updated] = await Cita.update(req.body, {
      where: { id_cita: req.params.id }
    });
    
    if (!updated) {
      return sendError(res, 'No se pudo actualizar la cita', 400);
    }
    
    const citaActualizada = await Cita.findByPk(req.params.id, {
      include: [
        { model: Paciente, attributes: ['nombre', 'apellido_paterno', 'apellido_materno'] },
        { model: Doctor, attributes: ['nombre', 'apellido_paterno', 'apellido_materno'] }
      ]
    });
    
    logger.info('Cita actualizada', { id_cita: req.params.id, cambios: req.body });
    return sendSuccess(res, citaActualizada);
  } catch (error) {
    logger.error('Error actualizando cita', error);
    return sendServerError(res, 'Error al actualizar la cita');
  }
};

/**
 * Cambiar estado de una cita
 * PUT /api/citas/:id/estado
 */
export const updateEstadoCita = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, observaciones } = req.body;

    const estadosValidos = ['pendiente', 'atendida', 'no_asistida', 'reprogramada', 'cancelada'];
    if (!estado || !estadosValidos.includes(estado)) {
      return sendError(res, `Estado inválido. Debe ser uno de: ${estadosValidos.join(', ')}`, 400);
    }

    const cita = await Cita.findByPk(id);
    if (!cita) {
      return sendError(res, 'Cita no encontrada', 404);
    }

    // Guardar estado anterior para auditoría
    const estadoAnterior = cita.estado || (cita.asistencia === true ? 'atendida' : cita.asistencia === false ? 'no_asistida' : 'pendiente');

    // Actualizar estado y observaciones si se proporcionan
    const updateData = { estado };
    if (observaciones !== undefined) {
      updateData.observaciones = observaciones;
    }

    // Si se marca como atendida, actualizar asistencia para compatibilidad
    if (estado === 'atendida') {
      updateData.asistencia = true;
    } else if (estado === 'no_asistida') {
      updateData.asistencia = false;
    }

    await Cita.update(updateData, { where: { id_cita: id } });

    // Registrar en auditoría
    if (estadoAnterior !== estado) {
      await auditoriaService.registrarCambioEstadoCita(
        parseInt(id),
        estadoAnterior,
        estado,
        req.user?.id_usuario || null
      );
    }

    const citaActualizada = await Cita.findByPk(id, {
      include: [
        { model: Paciente, attributes: ['id_paciente', 'nombre', 'apellido_paterno', 'apellido_materno'] },
        { model: Doctor, attributes: ['id_doctor', 'nombre', 'apellido_paterno', 'apellido_materno'] }
      ]
    });

    // Emitir evento WebSocket: cita_actualizada
    const citaData = {
      id_cita: citaActualizada.id_cita,
      id_paciente: citaActualizada.id_paciente,
      id_doctor: citaActualizada.id_doctor,
      fecha_cita: citaActualizada.fecha_cita,
      estado_anterior: estadoAnterior,
      estado_nuevo: estado,
      estado: estado,
      motivo: citaActualizada.motivo,
      paciente_nombre: citaActualizada.Paciente ? `${citaActualizada.Paciente.nombre} ${citaActualizada.Paciente.apellido_paterno}` : null,
      doctor_nombre: citaActualizada.Doctor ? `${citaActualizada.Doctor.nombre} ${citaActualizada.Doctor.apellido_paterno}` : null
    };

    // Notificar al paciente
    if (citaActualizada.id_paciente) {
      try {
        const paciente = await Paciente.findByPk(citaActualizada.id_paciente, {
          attributes: ['id_paciente', 'id_usuario']
        });
        
        if (paciente?.id_usuario) {
          const enviado = realtimeService.sendToUser(paciente.id_usuario, 'cita_actualizada', citaData);
          logger.info('📤 [WS-BACKEND] Evento cita_actualizada enviado por id_usuario', {
            id_usuario: paciente.id_usuario,
            enviado,
            id_cita: citaData.id_cita
          });
        }
        
        // Siempre enviar también a la sala del paciente por id_paciente (fallback)
        const enviadoPaciente = realtimeService.sendToPaciente(citaActualizada.id_paciente, 'cita_actualizada', citaData);
        logger.info('📤 [WS-BACKEND] Evento cita_actualizada enviado por id_paciente (sala)', {
          id_paciente: citaActualizada.id_paciente,
          enviado: enviadoPaciente,
          id_cita: citaData.id_cita
        });

        // Enviar notificación push al paciente
        await enviarNotificacionPushCita(citaActualizada.id_paciente, 'actualizada', citaData);
      } catch (wsError) {
        logger.error('❌ [WS-BACKEND] Error enviando WebSocket al paciente (no crítico):', wsError);
      }
    }

    // Notificar al doctor
    if (citaActualizada.id_doctor) {
      const doctor = await Doctor.findByPk(citaActualizada.id_doctor, {
        attributes: ['id_doctor', 'id_usuario']
      });
      if (doctor?.id_usuario) {
        realtimeService.sendToUser(doctor.id_usuario, 'cita_actualizada', citaData);
      }
    }

    // Notificar a administradores
    realtimeService.sendToRole('Admin', 'cita_actualizada', citaData);

    logger.info('Estado de cita actualizado', { id_cita: id, estado, userRole: req.user.rol });
    return sendSuccess(res, {
      message: 'Estado de cita actualizado exitosamente',
      cita: citaActualizada
    });
  } catch (error) {
    logger.error('Error actualizando estado de cita', error);
    return sendServerError(res, 'Error al actualizar el estado de la cita');
  }
};

/**
 * Reprogramar cita directamente (doctor/admin)
 * PUT /api/citas/:id/reprogramar
 */
export const reprogramarCita = async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_reprogramada, motivo_reprogramacion } = req.body;

    if (!fecha_reprogramada) {
      return sendError(res, 'La fecha reprogramada es requerida', 400);
    }

    const cita = await Cita.findByPk(id);
    if (!cita) {
      return sendError(res, 'Cita no encontrada', 404);
    }

    // Validar que la cita no esté cancelada o ya atendida
    if (cita.estado === 'cancelada') {
      return sendError(res, 'No se puede reprogramar una cita cancelada', 400);
    }
    if (cita.estado === 'atendida') {
      return sendError(res, 'No se puede reprogramar una cita ya atendida', 400);
    }

    // Guardar fecha anterior para auditoría
    const fechaAnterior = cita.fecha_cita;
    const fechaNueva = new Date(fecha_reprogramada);

    // Validar que la fecha reprogramada no sea en el pasado
    const ahora = new Date();
    if (fechaNueva < ahora) {
      return sendError(res, 'La fecha reprogramada no puede ser en el pasado', 400);
    }

    const updateData = {
      estado: 'reprogramada',
      fecha_reprogramada: fechaNueva,
      motivo_reprogramacion: motivo_reprogramacion || null,
      solicitado_por: req.user.rol === 'Admin' ? 'admin' : 'doctor',
      fecha_solicitud_reprogramacion: new Date()
    };

    await Cita.update(updateData, { where: { id_cita: id } });

    // Registrar en auditoría
    await auditoriaService.registrarReprogramacionCita(
      parseInt(id),
      fechaAnterior,
      fechaNueva,
      req.user?.id_usuario || null
    );

    const citaActualizada = await Cita.findByPk(id, {
      include: [
        { model: Paciente, attributes: ['id_paciente', 'nombre', 'apellido_paterno', 'apellido_materno'] },
        { model: Doctor, attributes: ['id_doctor', 'nombre', 'apellido_paterno', 'apellido_materno'] }
      ]
    });

    // Emitir evento WebSocket: cita_reprogramada
    const citaData = {
      id_cita: citaActualizada.id_cita,
      id_paciente: citaActualizada.id_paciente,
      id_doctor: citaActualizada.id_doctor,
      fecha_anterior: fechaAnterior,
      fecha_nueva: fechaNueva,
      fecha_cita: citaActualizada.fecha_cita,
      fecha_reprogramada: citaActualizada.fecha_reprogramada,
      estado: 'reprogramada',
      motivo_reprogramacion: motivo_reprogramacion,
      paciente_nombre: citaActualizada.Paciente ? `${citaActualizada.Paciente.nombre} ${citaActualizada.Paciente.apellido_paterno}` : null,
      doctor_nombre: citaActualizada.Doctor ? `${citaActualizada.Doctor.nombre} ${citaActualizada.Doctor.apellido_paterno}` : null
    };

    // Notificar al paciente
    if (citaActualizada.id_paciente) {
      try {
        const paciente = await Paciente.findByPk(citaActualizada.id_paciente, {
          attributes: ['id_paciente', 'id_usuario']
        });
        
        if (paciente?.id_usuario) {
          const enviado = realtimeService.sendToUser(paciente.id_usuario, 'cita_reprogramada', citaData);
          logger.info('📤 [WS-BACKEND] Evento cita_reprogramada enviado por id_usuario', {
            id_usuario: paciente.id_usuario,
            enviado,
            id_cita: citaData.id_cita
          });
        }
        
        // Siempre enviar también a la sala del paciente por id_paciente (fallback)
        const enviadoPaciente = realtimeService.sendToPaciente(citaActualizada.id_paciente, 'cita_reprogramada', citaData);
        logger.info('📤 [WS-BACKEND] Evento cita_reprogramada enviado por id_paciente (sala)', {
          id_paciente: citaActualizada.id_paciente,
          enviado: enviadoPaciente,
          id_cita: citaData.id_cita
        });

        // Enviar notificación push al paciente
        await enviarNotificacionPushCita(citaActualizada.id_paciente, 'reprogramada', citaData);
      } catch (wsError) {
        logger.error('❌ [WS-BACKEND] Error enviando WebSocket al paciente (no crítico):', wsError);
      }
    }

    // Notificar al doctor
    if (citaActualizada.id_doctor) {
      try {
        const doctor = await Doctor.findByPk(citaActualizada.id_doctor, {
          attributes: ['id_doctor', 'id_usuario']
        });
        if (doctor?.id_usuario) {
          const enviado = realtimeService.sendToUser(doctor.id_usuario, 'cita_reprogramada', citaData);
          logger.info('📤 [WS-BACKEND] Evento cita_reprogramada enviado a doctor', {
            id_usuario: doctor.id_usuario,
            enviado
          });
        }
      } catch (wsError) {
        logger.error('❌ [WS-BACKEND] Error enviando WebSocket al doctor (no crítico):', wsError);
      }
    }

    // Notificar a administradores
    realtimeService.sendToRole('Admin', 'cita_reprogramada', citaData);
    logger.info('📤 [WS-BACKEND] Evento cita_reprogramada enviado a Admin');

    logger.info('Cita reprogramada', { id_cita: id, fecha_reprogramada, userRole: req.user.rol });
    return sendSuccess(res, {
      message: 'Cita reprogramada exitosamente',
      cita: citaActualizada
    });
  } catch (error) {
    logger.error('Error reprogramando cita', error);
    return sendServerError(res, 'Error al reprogramar la cita');
  }
};

/**
 * Solicitar reprogramación (paciente)
 * POST /api/citas/:id/solicitar-reprogramacion
 */
export const solicitarReprogramacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo, fecha_solicitada } = req.body;

    if (!motivo || !motivo.trim()) {
      return sendError(res, 'El motivo es requerido', 400);
    }

    const cita = await Cita.findByPk(id, {
      include: [{ model: Paciente, attributes: ['id_paciente'] }]
    });

    if (!cita) {
      return sendError(res, 'Cita no encontrada', 404);
    }

    // Verificar que el paciente tiene acceso a esta cita
    const pacienteId = req.user.rol === 'Paciente' 
      ? req.user.id_paciente || req.user.id 
      : cita.id_paciente;

    if (cita.id_paciente !== pacienteId && req.user.rol === 'Paciente') {
      return sendError(res, 'No tienes permiso para solicitar reprogramación de esta cita', 403);
    }

    // Validar que la cita no esté cancelada o ya atendida
    if (cita.estado === 'cancelada') {
      return sendError(res, 'No se puede solicitar reprogramación de una cita cancelada', 400);
    }
    if (cita.estado === 'atendida') {
      return sendError(res, 'No se puede solicitar reprogramación de una cita ya atendida', 400);
    }

    // Validar que la cita no esté en el pasado
    const ahora = new Date();
    const fechaCita = new Date(cita.fecha_cita);
    if (fechaCita < ahora) {
      return sendError(res, 'No se puede solicitar reprogramación de una cita que ya pasó', 400);
    }

    // Validar tiempo mínimo antes de la cita (1 hora)
    const horasRestantes = (fechaCita - ahora) / (1000 * 60 * 60);
    if (horasRestantes < 1) {
      return sendError(res, 'Solo se pueden solicitar reprogramaciones con al menos 1 hora de anticipación', 400);
    }

    // Los pacientes NO pueden elegir fecha, solo enviar solicitud
    // El doctor/admin decidirá la nueva fecha al aprobar la solicitud
    // Ignorar fecha_solicitada si se envía (por compatibilidad con código legacy)

    // Verificar si ya existe una solicitud pendiente
    const solicitudExistente = await SolicitudReprogramacion.findOne({
      where: {
        id_cita: id,
        estado: 'pendiente'
      }
    });

    if (solicitudExistente) {
      return sendError(res, 'Ya existe una solicitud de reprogramación pendiente para esta cita', 409);
    }

    // Crear solicitud
    // Los pacientes NO pueden elegir fecha, siempre será null
    // El doctor/admin decidirá la nueva fecha al aprobar
    const solicitud = await SolicitudReprogramacion.create({
      id_cita: id,
      id_paciente: cita.id_paciente,
      motivo: motivo.trim(),
      fecha_solicitada: null, // Los pacientes no pueden elegir fecha
      estado: 'pendiente',
      fecha_creacion: new Date()
    });

    // Actualizar cita con información de solicitud
    await Cita.update({
      solicitado_por: 'paciente',
      fecha_solicitud_reprogramacion: new Date()
    }, { where: { id_cita: id } });

    const solicitudCompleta = await SolicitudReprogramacion.findByPk(solicitud.id_solicitud, {
      include: [
        { model: Cita, as: 'Cita', attributes: ['id_cita', 'fecha_cita', 'motivo', 'id_doctor'] },
        { model: Paciente, attributes: ['id_paciente', 'nombre', 'apellido_paterno', 'apellido_materno', 'id_usuario'] }
      ]
    });

    // Emitir evento WebSocket: solicitud_reprogramacion
    // Nota: fecha_solicitada siempre es null porque los pacientes no pueden elegir fecha
    const solicitudData = {
      id_solicitud: solicitud.id_solicitud,
      id_cita: id,
      id_paciente: cita.id_paciente,
      motivo: motivo.trim(),
      fecha_solicitada: null, // Los pacientes no pueden elegir fecha, el doctor decidirá al aprobar
      estado: 'pendiente',
      paciente_nombre: solicitudCompleta.Paciente ? `${solicitudCompleta.Paciente.nombre} ${solicitudCompleta.Paciente.apellido_paterno}` : null,
      fecha_cita_original: solicitudCompleta.Cita?.fecha_cita
    };

    // Notificar al doctor asignado
    if (solicitudCompleta.Cita?.id_doctor) {
      try {
        const doctor = await Doctor.findByPk(solicitudCompleta.Cita.id_doctor, {
          attributes: ['id_doctor', 'id_usuario']
        });
        if (doctor?.id_usuario) {
          // Crear notificación en base de datos y enviar push automáticamente
          await crearNotificacionDoctor(
            solicitudCompleta.Cita.id_doctor,
            'solicitud_reprogramacion',
            {
              ...solicitudData,
              id_solicitud: solicitud.id_solicitud
            }
            // Push se envía automáticamente por crearNotificacionDoctor
          );

          // Enviar WebSocket para notificación en tiempo real (si la app está abierta)
          const enviado = realtimeService.sendToUser(doctor.id_usuario, 'solicitud_reprogramacion', solicitudData);
          logger.info('📤 [WS-BACKEND] Evento solicitud_reprogramacion enviado a doctor', {
            id_usuario: doctor.id_usuario,
            enviado,
            id_solicitud: solicitudData.id_solicitud
          });
        }
      } catch (notifError) {
        logger.error('❌ [NOTIFICACION] Error enviando notificación al doctor (no crítico):', notifError);
      }
    }

    // Notificar a administradores
    realtimeService.sendToRole('Admin', 'solicitud_reprogramacion', solicitudData);
    logger.info('📤 [WS-BACKEND] Evento solicitud_reprogramacion enviado a Admin', {
      id_solicitud: solicitudData.id_solicitud
    });

    logger.info('Solicitud de reprogramación creada', { 
      id_solicitud: solicitud.id_solicitud, 
      id_cita: id,
      id_paciente: cita.id_paciente 
    });

    return sendSuccess(res, {
      message: 'Solicitud de reprogramación creada exitosamente',
      solicitud: solicitudCompleta
    }, 201);
  } catch (error) {
    logger.error('Error creando solicitud de reprogramación', error);
    return sendServerError(res, 'Error al crear la solicitud de reprogramación');
  }
};

/**
 * Obtener solicitudes de reprogramación de un paciente
 * GET /api/pacientes/:id/solicitudes-reprogramacion
 */
export const getSolicitudesReprogramacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.query;

    const whereCondition = { id_paciente: parseInt(id) };
    if (estado && ['pendiente', 'aprobada', 'rechazada', 'cancelada'].includes(estado)) {
      whereCondition.estado = estado;
    }

    const solicitudes = await SolicitudReprogramacion.findAll({
      where: whereCondition,
      include: [
        { 
          model: Cita, 
          as: 'Cita', 
          attributes: ['id_cita', 'fecha_cita', 'motivo', 'estado'],
          include: [
            { model: Doctor, attributes: ['nombre', 'apellido_paterno', 'apellido_materno'] }
          ]
        }
      ],
      order: [['fecha_creacion', 'DESC']]
    });

    return sendSuccess(res, { solicitudes });
  } catch (error) {
    logger.error('Error obteniendo solicitudes de reprogramación', error);
    return sendServerError(res, 'Error al obtener las solicitudes de reprogramación');
  }
};

/**
 * Obtener todas las solicitudes de reprogramación (admin/doctor)
 * GET /api/citas/solicitudes-reprogramacion
 */
export const getAllSolicitudesReprogramacion = async (req, res) => {
  try {
    const { estado, paciente, doctor } = req.query;

    const whereCondition = {};
    
    // Filtro por estado
    if (estado && ['pendiente', 'aprobada', 'rechazada', 'cancelada'].includes(estado)) {
      whereCondition.estado = estado;
    }

    // Filtro por paciente
    if (paciente && !isNaN(paciente)) {
      whereCondition.id_paciente = parseInt(paciente);
    }

    // Si es doctor, solo mostrar solicitudes de sus pacientes
    if (req.user.rol === 'Doctor') {
      // Buscar el doctor por id_usuario (patrón reutilizado de otros controladores)
      const doctorAutenticado = await Doctor.findOne({ where: { id_usuario: req.user.id } });
      if (!doctorAutenticado) {
        logger.warn('Doctor no encontrado para usuario', { userId: req.user.id });
        return sendSuccess(res, { solicitudes: [], total: 0 });
      }
      
      // Obtener IDs de pacientes asignados al doctor
      const pacientesAsignados = await DoctorPaciente.findAll({
        where: { id_doctor: doctorAutenticado.id_doctor },
        attributes: ['id_paciente']
      });
      const idsPacientes = pacientesAsignados.map(p => p.id_paciente);
      
      if (idsPacientes.length === 0) {
        return sendSuccess(res, { solicitudes: [], total: 0 });
      }
      
      whereCondition.id_paciente = { [Op.in]: idsPacientes };
    }

    const solicitudes = await SolicitudReprogramacion.findAll({
      where: whereCondition,
      include: [
        { 
          model: Cita, 
          as: 'Cita', 
          attributes: ['id_cita', 'fecha_cita', 'fecha_reprogramada', 'motivo', 'estado', 'id_doctor'],
          include: [
            { 
              model: Doctor, 
              attributes: ['id_doctor', 'nombre', 'apellido_paterno', 'apellido_materno'] 
            }
          ]
        },
        {
          model: Paciente,
          attributes: ['id_paciente', 'nombre', 'apellido_paterno', 'apellido_materno']
        }
      ],
      order: [['fecha_creacion', 'DESC']]
    });

    // Filtro adicional por doctor (si se especifica)
    let solicitudesFiltradas = solicitudes;
    if (doctor && !isNaN(doctor)) {
      solicitudesFiltradas = solicitudes.filter(s => 
        s.Cita?.id_doctor === parseInt(doctor)
      );
    }

    // Helper para desencriptar campos
    const decryptFieldIfNeeded = (value) => {
      if (!value || value === null || value === undefined || value === '') {
        return value;
      }
      if (typeof value !== 'string') {
        return value;
      }
      try {
        const jsonData = JSON.parse(value);
        if (jsonData.encrypted && jsonData.iv && jsonData.authTag) {
          const decrypted = EncryptionService.decrypt(value);
          return decrypted !== null ? decrypted : value;
        }
      } catch (e) {
        // No es JSON encriptado o error al parsear
      }
      return value;
    };
    
    // Formatear datos para el frontend
    const solicitudesFormateadas = solicitudesFiltradas.map(solicitud => {
      const paciente = solicitud.Paciente;
      const cita = solicitud.Cita;
      
      // Desencriptar motivo_cita si está encriptado
      let motivoCita = cita?.motivo || null;
      if (motivoCita) {
        motivoCita = decryptFieldIfNeeded(motivoCita);
      }
      
      return {
        id_solicitud: solicitud.id_solicitud,
        id_cita: solicitud.id_cita,
        id_paciente: solicitud.id_paciente,
        estado: solicitud.estado,
        fecha_solicitada: solicitud.fecha_solicitada,
        motivo: solicitud.motivo || '',
        respuesta_doctor: solicitud.respuesta_doctor || null,
        fecha_creacion: solicitud.fecha_creacion,
        fecha_respuesta: solicitud.fecha_respuesta || null,
        // Datos del paciente formateados
        paciente_nombre: paciente 
          ? `${paciente.nombre || ''} ${paciente.apellido_paterno || ''} ${paciente.apellido_materno || ''}`.trim()
          : 'Paciente desconocido',
        // Datos de la cita formateados
        fecha_cita_original: cita?.fecha_cita || null,
        fecha_cita_reprogramada: cita?.fecha_reprogramada || null,
        motivo_cita: motivoCita, // Desencriptado si estaba encriptado
        estado_cita: cita?.estado || null,
        id_doctor_cita: cita?.id_doctor || null,
        doctor_nombre: cita?.Doctor 
          ? `${cita.Doctor.nombre || ''} ${cita.Doctor.apellido_paterno || ''} ${cita.Doctor.apellido_materno || ''}`.trim()
          : null
      };
    });

    return sendSuccess(res, { 
      solicitudes: solicitudesFormateadas,
      total: solicitudesFormateadas.length
    });
  } catch (error) {
    logger.error('Error obteniendo todas las solicitudes de reprogramación', error);
    return sendServerError(res, 'Error al obtener las solicitudes de reprogramación');
  }
};

/**
 * Aprobar o rechazar solicitud de reprogramación (doctor/admin)
 * PUT /api/citas/:id/solicitud-reprogramacion/:solicitudId
 */
export const responderSolicitudReprogramacion = async (req, res) => {
  try {
    const { id, solicitudId } = req.params;
    const { accion, respuesta_doctor, fecha_reprogramada } = req.body;

    if (!accion || !['aprobar', 'rechazar'].includes(accion)) {
      return sendError(res, 'Acción inválida. Debe ser "aprobar" o "rechazar"', 400);
    }

    const solicitud = await SolicitudReprogramacion.findOne({
      where: {
        id_solicitud: solicitudId,
        id_cita: id,
        estado: 'pendiente'
      },
      include: [{ model: Cita, as: 'Cita' }]
    });

    if (!solicitud) {
      return sendError(res, 'Solicitud no encontrada o ya procesada', 404);
    }

    const nuevoEstado = accion === 'aprobar' ? 'aprobada' : 'rechazada';
    const fechaRespuesta = new Date();

    // Actualizar solicitud
    await SolicitudReprogramacion.update({
      estado: nuevoEstado,
      respuesta_doctor: respuesta_doctor || null,
      fecha_respuesta: fechaRespuesta
    }, { where: { id_solicitud: solicitudId } });

    // Si se aprueba, actualizar la cita
    if (accion === 'aprobar') {
      // El doctor DEBE especificar la nueva fecha al aprobar
      // Los pacientes no pueden elegir fecha, por lo que fecha_solicitada siempre es null
      if (!fecha_reprogramada) {
        return sendError(res, 'La fecha reprogramada es requerida al aprobar la solicitud', 400);
      }

      const fechaFinal = new Date(fecha_reprogramada);
      
      // Validar que la fecha reprogramada no sea en el pasado
      const ahora = new Date();
      if (fechaFinal < ahora) {
        return sendError(res, 'La fecha reprogramada no puede ser en el pasado', 400);
      }
      
      await Cita.update({
        estado: 'reprogramada',
        fecha_cita: fechaFinal, // Actualizar la fecha de la cita directamente
        fecha_reprogramada: fechaFinal,
        motivo_reprogramacion: solicitud.motivo,
        solicitado_por: 'paciente',
        fecha_solicitud_reprogramacion: solicitud.fecha_creacion
      }, { where: { id_cita: id } });
    }

    const solicitudActualizada = await SolicitudReprogramacion.findByPk(solicitudId, {
      include: [
        { 
          model: Cita, 
          as: 'Cita', 
          attributes: ['id_cita', 'fecha_cita', 'fecha_reprogramada', 'estado'],
          include: [
            { model: Paciente, attributes: ['nombre', 'apellido_paterno'] },
            { model: Doctor, attributes: ['nombre', 'apellido_paterno'] }
          ]
        }
      ]
    });

    // Notificar al paciente sobre la decisión
    if (solicitudActualizada.Cita?.Paciente) {
      try {
        const paciente = await Paciente.findByPk(solicitudActualizada.Cita.Paciente.id_paciente || solicitud.id_paciente, {
          attributes: ['id_paciente', 'id_usuario', 'nombre', 'apellido_paterno']
        });

        if (paciente?.id_usuario) {
          // La fecha reprogramada siempre estará disponible si se aprobó (es requerida)
          const fechaNueva = accion === 'aprobar' && solicitudActualizada.Cita?.fecha_cita
            ? new Date(solicitudActualizada.Cita.fecha_cita).toLocaleDateString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : null;
          
          const mensajeNotificacion = accion === 'aprobar' 
            ? `Tu solicitud de reprogramación fue aprobada. Nueva fecha: ${fechaNueva || 'pendiente de confirmar'}`
            : `Tu solicitud de reprogramación fue rechazada.${respuesta_doctor ? ` Motivo: ${respuesta_doctor}` : ''}`;

          const tipoNotificacion = accion === 'aprobar' ? 'reprogramada' : 'actualizada';
          
          await enviarNotificacionPushCita(paciente.id_paciente, tipoNotificacion, {
            id_cita: id,
            fecha_cita: solicitudActualizada.Cita?.fecha_cita || solicitudActualizada.Cita?.fecha_reprogramada,
            estado: accion === 'aprobar' ? 'reprogramada' : 'pendiente',
            mensaje: mensajeNotificacion
          });

          // Enviar WebSocket al paciente
          const wsData = {
            id_solicitud: solicitudId,
            id_cita: id,
            estado: nuevoEstado,
            accion,
            mensaje: mensajeNotificacion,
            fecha_reprogramada: solicitudActualizada.Cita.fecha_reprogramada
          };
          
          realtimeService.sendToUser(paciente.id_usuario, 'solicitud_reprogramacion_procesada', wsData);
          realtimeService.sendToPaciente(paciente.id_paciente, 'solicitud_reprogramacion_procesada', wsData);
          
          logger.info('📤 [WS-BACKEND] Notificación de solicitud procesada enviada al paciente', {
            id_usuario: paciente.id_usuario,
            id_paciente: paciente.id_paciente,
            accion
          });
        }
      } catch (notifError) {
        logger.error('❌ [PUSH] Error enviando notificación al paciente (no crítico):', notifError);
      }
    }

    logger.info('Solicitud de reprogramación procesada', { 
      id_solicitud: solicitudId, 
      id_cita: id, 
      accion,
      userRole: req.user.rol 
    });

    return sendSuccess(res, {
      message: `Solicitud ${accion === 'aprobar' ? 'aprobada' : 'rechazada'} exitosamente`,
      solicitud: solicitudActualizada
    });
  } catch (error) {
    logger.error('Error procesando solicitud de reprogramación', error);
    return sendServerError(res, 'Error al procesar la solicitud de reprogramación');
  }
};

/**
 * Cancelar solicitud de reprogramación pendiente (paciente)
 * DELETE /api/citas/:id/solicitud-reprogramacion/:solicitudId
 */
export const cancelarSolicitudReprogramacion = async (req, res) => {
  try {
    const { id, solicitudId } = req.params;

    const solicitud = await SolicitudReprogramacion.findOne({
      where: {
        id_solicitud: solicitudId,
        id_cita: id,
        estado: 'pendiente'
      }
    });

    if (!solicitud) {
      return sendError(res, 'Solicitud no encontrada o ya procesada', 404);
    }

    // Verificar permisos (paciente solo puede cancelar sus propias solicitudes)
    if (req.user.rol === 'Paciente' && solicitud.id_paciente !== (req.user.id_paciente || req.user.id)) {
      return sendError(res, 'No tienes permiso para cancelar esta solicitud', 403);
    }

    await SolicitudReprogramacion.update(
      { estado: 'cancelada' },
      { where: { id_solicitud: solicitudId } }
    );

    logger.info('Solicitud de reprogramación cancelada', { 
      id_solicitud: solicitudId, 
      id_cita: id,
      userRole: req.user.rol 
    });

    return sendSuccess(res, { message: 'Solicitud cancelada exitosamente' });
  } catch (error) {
    logger.error('Error cancelando solicitud de reprogramación', error);
    return sendServerError(res, 'Error al cancelar la solicitud de reprogramación');
  }
};

export const deleteCita = async (req, res) => {
  try {
    const deleted = await Cita.destroy({
      where: { id_cita: req.params.id }
    });
    if (!deleted) {
      return res.status(404).json({ error: 'Cita no encontrada' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};/**
 * Completar cita usando wizard paso a paso
 * Permite guardado progresivo de cada paso
 * POST /api/citas/:id/completar-wizard
 */
export const completarCitaWizard = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const {
      paso, // 'asistencia', 'signos_vitales', 'observaciones', 'diagnostico', 'plan_medicacion', 'finalizar'
      asistencia,
      motivo_no_asistencia,
      signos_vitales,
      observaciones,
      diagnostico,
      plan_medicacion,
      marcar_como_atendida = false
    } = req.body;

    // Validar que la cita existe
    const cita = await Cita.findByPk(id, {
      include: [
        { model: Paciente, attributes: ['id_paciente', 'nombre', 'apellido_paterno'] },
        { model: Doctor, attributes: ['id_doctor', 'nombre', 'apellido_paterno'] }
      ],
      transaction
    });

    if (!cita) {
      await transaction.rollback();
      return sendError(res, 'Cita no encontrada', 404);
    }

    // Validar que la cita no esté cancelada (a menos que sea solo actualización de observaciones)
    if (cita.estado === 'cancelada' && paso !== 'observaciones') {
      await transaction.rollback();
      return sendError(res, 'No se puede completar una cita cancelada', 400);
    }

    logger.info('Completando cita con wizard', {
      id_cita: id,
      paso,
      estado_actual: cita.estado
    });

    // PASO 1: Asistencia
    if (paso === 'asistencia' || paso === 'finalizar') {
      if (asistencia !== undefined) {
        cita.asistencia = asistencia;
        cita.motivo_no_asistencia = motivo_no_asistencia || null;
        
        // Si no asistió, actualizar estado
        if (!asistencia) {
          cita.estado = 'no_asistida';
        }
      }
    }

    // PASO 2: Signos Vitales
    if ((paso === 'signos_vitales' || paso === 'finalizar') && signos_vitales) {
      const tieneSignos = signos_vitales.peso_kg || signos_vitales.talla_m || 
                          signos_vitales.presion_sistolica || signos_vitales.glucosa_mg_dl ||
                          signos_vitales.colesterol_mg_dl || signos_vitales.trigliceridos_mg_dl;
      
      if (tieneSignos) {
        // Verificar si ya existe un registro de signos vitales para esta cita
        const signosExistentes = await SignoVital.findOne({
          where: { id_cita: id },
          transaction
        });

        // Calcular IMC si se proporcionan peso y talla
        let imc = null;
        if (signos_vitales.peso_kg && signos_vitales.talla_m && parseFloat(signos_vitales.talla_m) > 0) {
          const peso = parseFloat(signos_vitales.peso_kg);
          const talla = parseFloat(signos_vitales.talla_m);
          imc = parseFloat((peso / (talla * talla)).toFixed(2));
        }

        const datosSignos = {
          id_paciente: cita.id_paciente,
          id_cita: parseInt(id),
          peso_kg: signos_vitales.peso_kg ? parseFloat(signos_vitales.peso_kg) : null,
          talla_m: signos_vitales.talla_m ? parseFloat(signos_vitales.talla_m) : null,
          imc: imc,
          medida_cintura_cm: signos_vitales.medida_cintura_cm ? parseFloat(signos_vitales.medida_cintura_cm) : null,
          presion_sistolica: signos_vitales.presion_sistolica ? parseInt(signos_vitales.presion_sistolica) : null,
          presion_diastolica: signos_vitales.presion_diastolica ? parseInt(signos_vitales.presion_diastolica) : null,
          glucosa_mg_dl: signos_vitales.glucosa_mg_dl ? parseFloat(signos_vitales.glucosa_mg_dl) : null,
          colesterol_mg_dl: signos_vitales.colesterol_mg_dl ? parseFloat(signos_vitales.colesterol_mg_dl) : null,
          trigliceridos_mg_dl: signos_vitales.trigliceridos_mg_dl ? parseFloat(signos_vitales.trigliceridos_mg_dl) : null,
          registrado_por: signos_vitales.registrado_por || 'doctor',
          observaciones: signos_vitales.observaciones || null,
          fecha_medicion: cita.fecha_cita,
          fecha_creacion: new Date()
        };

        if (signosExistentes) {
          await signosExistentes.update(datosSignos, { transaction });
          logger.info('Signos vitales actualizados para la cita');
        } else {
          await SignoVital.create(datosSignos, { transaction });
          logger.info('Signos vitales creados para la cita');
        }
      }
    }

    // PASO 3: Observaciones (campo principal de la cita)
    if ((paso === 'observaciones' || paso === 'finalizar') && observaciones !== undefined) {
      cita.observaciones = observaciones.trim() || null;
    }

    // PASO 4: Diagnóstico (opcional)
    if ((paso === 'diagnostico' || paso === 'finalizar') && diagnostico && diagnostico.descripcion) {
      const diagnosticoExiste = await Diagnostico.findOne({
        where: { id_cita: id },
        transaction
      });

      const datosDiagnostico = {
        id_paciente: cita.id_paciente,
        id_cita: parseInt(id),
        descripcion: diagnostico.descripcion.trim(),
        fecha_registro: new Date()
      };

      if (diagnosticoExiste) {
        await diagnosticoExiste.update(datosDiagnostico, { transaction });
        logger.info('Diagnóstico actualizado para la cita');
      } else {
        await Diagnostico.create(datosDiagnostico, { transaction });
        logger.info('Diagnóstico creado para la cita');
      }
    }

    // PASO 5: Plan de Medicación (opcional)
    if ((paso === 'plan_medicacion' || paso === 'finalizar') && plan_medicacion) {
      const tienePlan = plan_medicacion.observaciones || 
                        (plan_medicacion.medicamentos && plan_medicacion.medicamentos.length > 0);
      
      if (tienePlan) {
        // Buscar plan existente para esta cita
        const planExistente = await PlanMedicacion.findOne({
          where: { id_cita: id },
          transaction
        });

        const datosPlan = {
          id_paciente: cita.id_paciente,
          id_doctor: cita.id_doctor,
          id_cita: parseInt(id),
          observaciones: plan_medicacion.observaciones || '',
          fecha_inicio: plan_medicacion.fecha_inicio || cita.fecha_cita,
          fecha_fin: plan_medicacion.fecha_fin || null,
          activo: true,
          fecha_creacion: new Date()
        };

        let plan;
        if (planExistente) {
          await planExistente.update(datosPlan, { transaction });
          plan = planExistente;
          logger.info('Plan de medicación actualizado para la cita');
        } else {
          plan = await PlanMedicacion.create(datosPlan, { transaction });
          logger.info('Plan de medicación creado para la cita');
        }

        // Actualizar medicamentos del plan
        if (plan_medicacion.medicamentos && Array.isArray(plan_medicacion.medicamentos)) {
          // Eliminar detalles existentes
          await PlanDetalle.destroy({
            where: { id_plan: plan.id_plan },
            transaction
          });

          // Crear nuevos detalles
          for (const med of plan_medicacion.medicamentos) {
            if (med && typeof med === 'object' && med.id_medicamento) {
              await PlanDetalle.create({
                id_plan: plan.id_plan,
                id_medicamento: med.id_medicamento,
                dosis: med.dosis || '',
                frecuencia: med.frecuencia || '',
                horario: med.horario || null,
                via_administracion: med.via_administracion || null,
                observaciones: med.observaciones || null
              }, { transaction });
            }
          }
        }
      }
    }

    // Si es el paso final, actualizar estado de la cita
    if (paso === 'finalizar') {
      if (marcar_como_atendida && cita.asistencia) {
        cita.estado = 'atendida';
      } else if (cita.estado === 'pendiente' && cita.asistencia) {
        // Si asistió pero no se marca como atendida, mantener pendiente
        // (el doctor puede querer revisar después)
      }
    }

    // Guardar cambios en la cita
    await cita.save({ transaction });

    await transaction.commit();

    logger.info('Cita completada con wizard exitosamente', {
      id_cita: id,
      paso,
      estado_final: cita.estado
    });

    return sendSuccess(res, {
      message: paso === 'finalizar' ? 'Cita completada exitosamente' : `Paso "${paso}" guardado correctamente`,
      id_cita: parseInt(id),
      estado: cita.estado,
      paso_completado: paso
    }, 200);

  } catch (error) {
    await transaction.rollback();
    
    logger.error('Error completando cita con wizard', {
      error: error.message,
      stack: error.stack,
      id_cita: req.params.id,
      paso: req.body.paso
    });

    return sendServerError(res, 'Error al completar la cita', error);
  }
};