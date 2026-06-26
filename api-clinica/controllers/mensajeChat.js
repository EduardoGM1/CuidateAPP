import MensajeChat from '../models/MensajeChat.js';
import { Paciente, Doctor, Usuario, NotificacionDoctor, DoctorPaciente } from '../models/associations.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';
import logger from '../utils/logger.js';
import pushNotificationService from '../services/pushNotificationService.js';
import emailService from '../services/emailService.js';
import realtimeService from '../services/realtimeService.js';
import { crearNotificacionDoctor } from './cita.js';
import multer from 'multer';
import { serializeWithSignedUploads, signUploadPublicUrl, persistUploadPath } from '../utils/uploadSignedUrl.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar multer para subir archivos de audio
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'audio');
    
    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      logger.info('Directorio de uploads creado', { uploadDir });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.m4a';
    cb(null, `audio_${uniqueSuffix}${ext}`);
  }
});

// Filtrar solo archivos de audio
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['audio/m4a', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/aac'];
  
  if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(m4a|mp3|wav|aac)$/i)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de audio (m4a, mp3, wav, aac)'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB máximo
  }
});

/**
 * Obtener conversación entre paciente y doctor
 * GET /api/mensajes-chat/paciente/:idPaciente/doctor/:idDoctor
 */
export const getConversacion = async (req, res) => {
  try {
    const { idPaciente, idDoctor } = req.params;
    const userRole = req.user?.rol;
    const userId = req.user?.id;
    
    logger.info('Obteniendo conversación', {
      idPaciente,
      idDoctor,
      userRole,
      userId
    });
    
    // Si es doctor, obtener el id_doctor del usuario autenticado
    let doctorId = idDoctor ? parseInt(idDoctor) : null;
    let doctorAutenticado = null;
    
    if (userRole === 'Doctor' || userRole === 'Admin') {
      // Buscar el doctor asociado al usuario autenticado
      doctorAutenticado = await Doctor.findOne({ where: { id_usuario: userId } });
      if (doctorAutenticado) {
        // Si se proporciona idDoctor pero no coincide con el autenticado, usar el autenticado
        if (doctorId && doctorAutenticado.id_doctor !== doctorId) {
          logger.warn('id_doctor proporcionado diferente al autenticado, usando el autenticado', {
            idDoctorProporcionado: doctorId,
            idDoctorAutenticado: doctorAutenticado.id_doctor,
            userId
          });
          doctorId = doctorAutenticado.id_doctor;
        } else if (!doctorId) {
          // Si no se proporciona idDoctor, usar el del usuario autenticado
          doctorId = doctorAutenticado.id_doctor;
        }
      }
    }
    
    const whereCondition = {
      id_paciente: parseInt(idPaciente),
    };
    
    // Si hay doctorId, filtrar por él, si no, obtener todos los mensajes del paciente
    if (doctorId) {
      whereCondition.id_doctor = doctorId;
    } else {
      whereCondition.id_doctor = { [Op.ne]: null };
    }
    
    logger.info('Filtrando mensajes', { whereCondition });
    
    const mensajes = await MensajeChat.findAll({
      where: whereCondition,
      order: [['fecha_envio', 'ASC']],
    });
    
    logger.info('Mensajes encontrados', { count: mensajes.length, doctorId, idPaciente });
    
    res.json({ success: true, data: serializeWithSignedUploads(mensajes) });
  } catch (error) {
    logger.error('Error obteniendo conversación:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Obtener mensajes de un paciente
 * GET /api/mensajes-chat/paciente/:idPaciente
 */
export const getMensajesPaciente = async (req, res) => {
  try {
    const { idPaciente } = req.params;
    const userRole = req.user?.rol;
    const userId = req.user?.id;
    const userPacienteId = req.user?.id_paciente;

    // Paciente: comparar con id_paciente del token (req.user.id ya es id_paciente en auth)
    const esPacientePropio =
      (userRole === 'Paciente' || userRole === 'paciente') &&
      (userId === parseInt(idPaciente, 10) || userPacienteId === parseInt(idPaciente, 10));

    if (userRole !== 'Admin' && userRole !== 'admin' && userRole !== 'Doctor' && userRole !== 'doctor' && !esPacientePropio) {
      return res.status(403).json({ success: false, error: 'No autorizado' });
    }

    const limiteRaw = parseInt(req.query.limit, 10);
    const limit = Number.isFinite(limiteRaw) ? Math.min(Math.max(limiteRaw, 1), 500) : 400;

    const mensajes = await MensajeChat.findAll({
      where: { id_paciente: parseInt(idPaciente, 10) },
      order: [['fecha_envio', 'DESC']],
      limit,
    });

    res.json({ success: true, data: serializeWithSignedUploads(mensajes) });
  } catch (error) {
    logger.error('Error obteniendo mensajes de paciente:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Obtener mensajes no leídos de un paciente
 * GET /api/mensajes-chat/paciente/:idPaciente/no-leidos
 */
export const getMensajesNoLeidos = async (req, res) => {
  try {
    const { idPaciente } = req.params;
    const userRole = req.user?.rol;
    const userId = req.user?.id;
    
    // Pacientes pueden ver sus mensajes no leídos del doctor
    // Doctores pueden ver mensajes no leídos del paciente (para contador)
    if (userRole === 'Paciente' || userRole === 'paciente') {
      const mensajes = await MensajeChat.findAll({
        where: {
          id_paciente: parseInt(idPaciente),
          leido: false,
          remitente: { [Op.ne]: 'Paciente' }, // Solo mensajes del doctor
        },
        order: [['fecha_envio', 'DESC']],
      });
      return res.json({ success: true, data: serializeWithSignedUploads(mensajes), count: mensajes.length });
    } else if (userRole === 'Doctor' || userRole === 'Admin') {
      // Para doctores, contar mensajes no leídos del paciente hacia el doctor
      const mensajes = await MensajeChat.findAll({
        where: {
          id_paciente: parseInt(idPaciente),
          leido: false,
          remitente: 'Paciente', // Solo mensajes del paciente
        },
        order: [['fecha_envio', 'DESC']],
      });
      return res.json({ success: true, data: serializeWithSignedUploads(mensajes), count: mensajes.length });
    }
    
    return res.status(403).json({ success: false, error: 'No autorizado' });
  } catch (error) {
    logger.error('Error obteniendo mensajes no leídos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Crear nuevo mensaje
 * POST /api/mensajes-chat
 */
export const createMensaje = async (req, res) => {
  try {
    const { id_paciente, id_doctor, remitente, mensaje_texto, mensaje_audio_url, mensaje_audio_duracion, mensaje_audio_transcripcion } = req.body;
    const userRole = req.user?.rol;
    const userId = req.user?.id;
    
    logger.info('Creando mensaje de chat', {
      id_paciente,
      id_doctor,
      remitente,
      tiene_mensaje_texto: !!mensaje_texto,
      tiene_mensaje_audio_url: !!mensaje_audio_url,
      userRole,
      userId
    });
    
    // Validar campos requeridos
    if (!id_paciente || !remitente) {
      logger.warn('Campos requeridos faltantes', { id_paciente, remitente });
      return res.status(400).json({ success: false, error: 'id_paciente y remitente son requeridos' });
    }
    
    // Validar autorización
    if (remitente === 'Paciente' && (userRole !== 'Paciente' && userRole !== 'paciente')) {
      return res.status(403).json({ success: false, error: 'No autorizado para enviar como paciente' });
    }
    
    if (remitente === 'Doctor' && (userRole !== 'Doctor' && userRole !== 'Admin')) {
      return res.status(403).json({ success: false, error: 'No autorizado para enviar como doctor' });
    }
    
    // Si es doctor, obtener el id_doctor del usuario autenticado si no se proporciona
    let doctorId = id_doctor ? parseInt(id_doctor) : null;
    if (remitente === 'Doctor' && !doctorId) {
      // Buscar el doctor asociado al usuario autenticado
      logger.info('Buscando doctor asociado al usuario', { userId });
      const doctor = await Doctor.findOne({ where: { id_usuario: userId } });
      if (doctor) {
        doctorId = doctor.id_doctor;
        logger.info('Doctor encontrado', { doctorId, userId });
      } else {
        logger.warn('No se encontró doctor asociado al usuario', { userId });
        return res.status(400).json({ success: false, error: 'No se encontró el doctor asociado al usuario' });
      }
    }
    
    // Si es paciente y no se proporciona id_doctor, obtenerlo de la relación doctor_paciente
    if (remitente === 'Paciente' && !doctorId) {
      logger.info('Buscando doctor asignado al paciente', { id_paciente });
      const asignacion = await DoctorPaciente.findOne({
        where: { id_paciente: parseInt(id_paciente) },
        order: [['fecha_asignacion', 'DESC']] // Obtener la asignación más reciente
      });
      if (asignacion) {
        doctorId = asignacion.id_doctor;
        logger.info('Doctor asignado encontrado para el paciente', { doctorId, id_paciente });
      } else {
        logger.warn('No se encontró doctor asignado al paciente', { id_paciente });
        return res.status(400).json({ 
          success: false, 
          error: 'No se encontró un doctor asignado. Contacta a la administración para que te asignen un doctor.' 
        });
      }
    }

    // Paciente solo puede escribir a médicos con asignación activa en doctor_paciente
    if (remitente === 'Paciente' && doctorId) {
      const asignacionValida = await DoctorPaciente.findOne({
        where: { id_paciente: parseInt(id_paciente), id_doctor: doctorId },
      });
      if (!asignacionValida) {
        return res.status(403).json({
          success: false,
          error: 'No puedes enviar mensajes a este médico: no está asignado a tu cuenta.',
        });
      }
    }
    
    // Si se proporciona id_doctor, validar que el usuario autenticado tenga acceso
    if (remitente === 'Doctor' && doctorId && userRole === 'Doctor') {
      // Verificar que el id_doctor proporcionado corresponde al usuario autenticado
      const doctorAutenticado = await Doctor.findOne({ where: { id_usuario: userId } });
      if (doctorAutenticado) {
        // Si el id_doctor proporcionado es diferente, usar el del usuario autenticado
        if (doctorAutenticado.id_doctor !== doctorId) {
          logger.warn('id_doctor proporcionado diferente al autenticado, usando el del usuario autenticado', {
            doctorIdProporcionado: doctorId,
            doctorIdAutenticado: doctorAutenticado.id_doctor,
            userId
          });
          doctorId = doctorAutenticado.id_doctor;
        }
      } else {
        logger.warn('No se encontró doctor autenticado, pero se proporcionó id_doctor', { userId, doctorId });
      }
    }
    
    // Validar que si es mensaje de doctor, debe tener id_doctor
    if (remitente === 'Doctor' && !doctorId) {
      logger.warn('Mensaje de doctor sin id_doctor', { remitente, doctorId });
      return res.status(400).json({ success: false, error: 'id_doctor es requerido para mensajes de doctor' });
    }
    
    // Validar que debe tener mensaje_texto o mensaje_audio_url
    if (!mensaje_texto && !mensaje_audio_url) {
      logger.warn('Mensaje sin contenido', { tiene_texto: !!mensaje_texto, tiene_audio: !!mensaje_audio_url });
      return res.status(400).json({ success: false, error: 'Debe proporcionar mensaje_texto o mensaje_audio_url' });
    }
    
    // Validar que mensaje_texto no esté vacío si se proporciona
    if (mensaje_texto && typeof mensaje_texto === 'string' && mensaje_texto.trim().length === 0) {
      logger.warn('Mensaje con texto vacío', { mensaje_texto });
      return res.status(400).json({ success: false, error: 'mensaje_texto no puede estar vacío' });
    }
    
    logger.info('Creando mensaje en base de datos', {
      id_paciente: parseInt(id_paciente),
      id_doctor: doctorId,
      remitente,
      mensaje_texto_length: mensaje_texto ? mensaje_texto.length : 0
    });
    
    const audioPathPersistido = mensaje_audio_url ? persistUploadPath(mensaje_audio_url) : null;
    if (mensaje_audio_url && !audioPathPersistido) {
      logger.warn('mensaje_audio_url no válida', { mensaje_audio_url });
      return res.status(400).json({ success: false, error: 'mensaje_audio_url no válida' });
    }

    const mensaje = await MensajeChat.create({
      id_paciente: parseInt(id_paciente),
      id_doctor: doctorId,
      remitente,
      mensaje_texto: mensaje_texto ? mensaje_texto.trim() : null,
      mensaje_audio_url: audioPathPersistido,
      mensaje_audio_duracion: mensaje_audio_duracion || null,
      mensaje_audio_transcripcion: mensaje_audio_transcripcion || null,
      leido: false,
      fecha_envio: new Date(),
    });
    
    logger.info('Mensaje creado exitosamente', { mensajeId: mensaje.id_mensaje });

    // Emitir evento en tiempo real al destinatario (web y app móvil)
    const payload = {
      id_paciente: mensaje.id_paciente,
      id_doctor: mensaje.id_doctor,
      mensaje: serializeWithSignedUploads(mensaje),
    };
    if (remitente === 'Paciente' && doctorId) {
      try {
        const doctor = await Doctor.findByPk(doctorId, {
          include: [{ model: Usuario, attributes: ['id_usuario'] }],
        });
        if (doctor?.Usuario?.id_usuario) {
          realtimeService.sendToUser(doctor.Usuario.id_usuario, 'nuevo_mensaje', payload);
        }
      } catch (err) {
        logger.error('Error enviando evento tiempo real nuevo_mensaje (no crítico):', err?.message);
      }
    }
    if (remitente === 'Doctor') {
      try {
        const paciente = await Paciente.findByPk(parseInt(id_paciente), { attributes: ['id_usuario'] });
        if (paciente?.id_usuario) {
          realtimeService.sendToUser(paciente.id_usuario, 'nuevo_mensaje', payload);
        } else {
          realtimeService.sendToPaciente(parseInt(id_paciente), 'nuevo_mensaje', payload);
        }
      } catch (err) {
        logger.error('Error enviando evento tiempo real nuevo_mensaje a paciente (no crítico):', err?.message);
      }
    }

    // Enviar notificación push al destinatario (en background, no bloquea la respuesta)
    setImmediate(async () => {
      try {
        let destinatarioIdUsuario = null;
        let nombreRemitente = '';
        
        if (remitente === 'Paciente') {
          // Notificar al doctor
          if (doctorId) {
            const doctor = await Doctor.findByPk(doctorId, {
              include: [{ model: Usuario, attributes: ['id_usuario'] }]
            });
            if (doctor && doctor.Usuario) {
              destinatarioIdUsuario = doctor.Usuario.id_usuario;
            }
            
            // Obtener nombre del paciente para la notificación
            const paciente = await Paciente.findByPk(parseInt(id_paciente));
            if (paciente) {
              nombreRemitente = `${paciente.nombre} ${paciente.apellido_paterno}`.trim();
            }

            // Crear o actualizar notificación en base de datos para el doctor
            try {
              const mensajeTexto = mensaje_texto || mensaje_audio_transcripcion || 'Mensaje de voz';
              const previewMensaje = mensajeTexto.length > 50 
                ? mensajeTexto.substring(0, 50) + '...' 
                : mensajeTexto;

              // Buscar notificación existente del mismo paciente (no leída)
              const notificacionExistente = await NotificacionDoctor.findOne({
                where: {
                  id_doctor: doctorId,
                  id_paciente: parseInt(id_paciente),
                  tipo: 'nuevo_mensaje',
                  estado: 'enviada'
                }
              });

              if (notificacionExistente) {
                // Actualizar notificación existente
                await notificacionExistente.update({
                  id_mensaje: mensaje.id_mensaje,
                  fecha_envio: new Date(),
                  datos_adicionales: {
                    id_paciente: parseInt(id_paciente),
                    id_doctor: doctorId,
                    id_mensaje: mensaje.id_mensaje,
                    paciente_nombre: nombreRemitente || 'Paciente',
                    preview_mensaje: previewMensaje
                  }
                });

                logger.info('Notificación de nuevo mensaje actualizada en BD para doctor', {
                  doctorId,
                  pacienteId: parseInt(id_paciente),
                  mensajeId: mensaje.id_mensaje,
                  notificacionId: notificacionExistente.id_notificacion
                });
              } else {
                // Crear nueva notificación (push se envía manualmente después con formato personalizado)
                await crearNotificacionDoctor(
                  doctorId,
                  'nuevo_mensaje',
                  {
                    id_paciente: parseInt(id_paciente),
                    id_doctor: doctorId,
                    id_mensaje: mensaje.id_mensaje,
                    paciente_nombre: nombreRemitente || 'Paciente',
                    preview_mensaje: previewMensaje
                  },
                  { enviarPush: false } // Deshabilitar push automático, se envía manualmente con formato personalizado
                );

                logger.info('Notificación de nuevo mensaje creada en BD para doctor', {
                  doctorId,
                  pacienteId: parseInt(id_paciente),
                  mensajeId: mensaje.id_mensaje
                });
              }
            } catch (notifError) {
              // No crítico - no debe fallar la creación del mensaje
              logger.error('Error creando/actualizando notificación en BD para nuevo mensaje (no crítico)', {
                error: notifError.message,
                doctorId,
                pacienteId: parseInt(id_paciente),
                mensajeId: mensaje.id_mensaje
              });
            }
          }
        } else if (remitente === 'Doctor') {
          // Notificar al paciente
          const paciente = await Paciente.findByPk(parseInt(id_paciente), {
            include: [{ model: Usuario, attributes: ['id_usuario'] }]
          });
          if (paciente && paciente.Usuario) {
            destinatarioIdUsuario = paciente.Usuario.id_usuario;
          }
          
          // Obtener nombre del doctor para la notificación
          if (doctorId) {
            const doctor = await Doctor.findByPk(doctorId);
            if (doctor) {
              nombreRemitente = `Dr. ${doctor.nombre} ${doctor.apellido_paterno}`.trim();
            }
          }
        }
        
        // Enviar notificación push si hay destinatario
        if (destinatarioIdUsuario) {
          const mensajeTexto = mensaje_texto || mensaje_audio_transcripcion || 'Mensaje de voz';
          const previewMensaje = mensajeTexto.length > 50 
            ? mensajeTexto.substring(0, 50) + '...' 
            : mensajeTexto;
          
          const notification = {
            type: 'nuevo_mensaje',
            title: remitente === 'Paciente' 
              ? `💬 Nuevo mensaje de ${nombreRemitente || 'paciente'}`
              : `💬 Nuevo mensaje de ${nombreRemitente || 'doctor'}`,
            message: previewMensaje,
            data: {
              mensaje_id: mensaje.id_mensaje,
              id_paciente: mensaje.id_paciente,
              id_doctor: mensaje.id_doctor,
              remitente: mensaje.remitente,
              tipo: mensaje.mensaje_texto ? 'texto' : 'audio',
              fecha_envio: mensaje.fecha_envio
            },
            sound: 'default',
            priority: 'high'
          };
          
          await pushNotificationService.sendPushNotification(destinatarioIdUsuario, notification);
          logger.info('Notificación push enviada para nuevo mensaje', {
            destinatarioIdUsuario,
            mensajeId: mensaje.id_mensaje,
            remitente
          });
        }

        // Email al destinatario (si tiene email en Usuario)
        try {
          const destinatario = await Usuario.findByPk(destinatarioIdUsuario, { attributes: ['email'] });
          const emailTo = destinatario?.email;
          const previewTexto = (mensaje_texto || mensaje_audio_transcripcion || '').toString().trim().substring(0, 100);
          const enlaceApp = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL.replace(/\/$/, '')}/chat` : '';
          logger.info('📧 [EMAIL] Nuevo mensaje: intentando envío', {
            destinatarioIdUsuario: destinatarioIdUsuario ?? null,
            emailTo: emailTo ? `${emailTo.substring(0, 3)}***@${(emailTo.split('@')[1] || '')}` : null,
            remitente,
            id_doctor: doctorId ?? null,
            id_paciente: id_paciente ?? null
          });
          if (emailTo && emailTo.includes('@')) {
            await emailService.sendNewMessageNotification(emailTo, {
              remitenteNombre: nombreRemitente || (remitente === 'Paciente' ? 'Un paciente' : 'El doctor'),
              previewTexto: previewTexto || 'Nuevo mensaje',
              enlaceApp
            });
          }
        } catch (emailErr) {
          logger.error('Error enviando email de nuevo mensaje (no crítico)', { error: emailErr.message });
        }
      } catch (pushError) {
        // No fallar la creación del mensaje si falla la notificación
        logger.error('Error enviando notificación push para nuevo mensaje', {
          error: pushError.message,
          mensajeId: mensaje.id_mensaje
        });
      }
    });
    
    res.status(201).json({ success: true, data: serializeWithSignedUploads(mensaje) });
  } catch (error) {
    logger.error('Error creando mensaje:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      original: error.original?.message,
      sql: error.original?.sql,
      body: req.body
    });
    res.status(400).json({ 
      success: false, 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

/**
 * Marcar mensaje como leído
 * PUT /api/mensajes-chat/:id/leido
 */
export const marcarComoLeido = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.rol;
    const userId = req.user?.id;
    
    const mensaje = await MensajeChat.findByPk(id);
    if (!mensaje) {
      return res.status(404).json({ success: false, error: 'Mensaje no encontrado' });
    }
    
    // Verificar autorización
    if (userRole !== 'Admin' && userRole !== 'Doctor' && userId !== mensaje.id_paciente) {
      return res.status(403).json({ success: false, error: 'No autorizado' });
    }
    
    await mensaje.update({ leido: true });
    
    // Recargar mensaje actualizado
    await mensaje.reload();
    
    // Emitir evento WebSocket si está disponible
    if (req.app.get('io')) {
      logger.info('📤 [WS-BACKEND] Emitiendo evento mensaje_actualizado (marcado como leído)', {
        id_paciente: mensaje.id_paciente,
        id_doctor: mensaje.id_doctor,
        mensajeId: mensaje.id_mensaje,
        leido: true
      });
      req.app.get('io').emit('mensaje_actualizado', {
        id_paciente: mensaje.id_paciente,
        id_doctor: mensaje.id_doctor,
        mensaje: serializeWithSignedUploads(mensaje),
      });
    }
    
    res.json({ success: true, message: 'Mensaje marcado como leído', data: serializeWithSignedUploads(mensaje) });
  } catch (error) {
    logger.error('Error marcando mensaje como leído:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * Marcar todos los mensajes de una conversación como leídos
 * PUT /api/mensajes-chat/paciente/:idPaciente/doctor/:idDoctor/leer-todos
 */
export const marcarTodosComoLeidos = async (req, res) => {
  try {
    const { idPaciente, idDoctor } = req.params;
    const userRole = req.user?.rol;
    const userId = req.user?.id;
    
    // Pacientes pueden marcar mensajes del doctor como leídos
    // Doctores pueden marcar mensajes del paciente como leídos
    let whereCondition = {
      id_paciente: parseInt(idPaciente),
      id_doctor: idDoctor ? parseInt(idDoctor) : { [Op.ne]: null },
      leido: false,
    };
    
    if (userRole === 'Paciente' || userRole === 'paciente') {
      // Paciente marca mensajes del doctor como leídos
      whereCondition.remitente = { [Op.ne]: 'Paciente' };
    } else if (userRole === 'Doctor' || userRole === 'Admin') {
      // Doctor marca mensajes del paciente como leídos
      whereCondition.remitente = 'Paciente';
    } else {
      return res.status(403).json({ success: false, error: 'No autorizado' });
    }
    
    const [updated] = await MensajeChat.update(
      { leido: true },
      { where: whereCondition }
    );
    
    // Si se actualizaron mensajes, emitir evento para recargar la conversación
    if (updated > 0 && req.app.get('io')) {
      logger.info('📤 [WS-BACKEND] Emitiendo evento para recargar mensajes (todos marcados como leídos)', {
        id_paciente: parseInt(idPaciente),
        id_doctor: idDoctor ? parseInt(idDoctor) : null,
        mensajesActualizados: updated
      });
      
      // Emitir evento para que ambos usuarios recarguen los mensajes
      req.app.get('io').emit('mensajes_marcados_leidos', {
        id_paciente: parseInt(idPaciente),
        id_doctor: idDoctor ? parseInt(idDoctor) : null,
        cantidad: updated
      });
    }
    
    res.json({ success: true, message: `${updated} mensajes marcados como leídos` });
  } catch (error) {
    logger.error('Error marcando mensajes como leídos:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * Lista de médicos asignados al paciente (doctor_paciente) con vista previa de chat.
 * GET /api/mensajes-chat/paciente/:idPaciente/conversaciones-asignadas
 *
 * Incluye doctores sin mensajes aún; no leídos = mensajes del doctor no leídos por el paciente.
 */
export const getConversacionesPacienteAsignadas = async (req, res) => {
  try {
    const { idPaciente } = req.params;
    const idP = parseInt(idPaciente, 10);

    if (Number.isNaN(idP)) {
      return res.status(400).json({ success: false, error: 'idPaciente inválido' });
    }

    const asignaciones = await DoctorPaciente.findAll({
      where: { id_paciente: idP },
      attributes: ['id_doctor', 'fecha_asignacion'],
    });

    if (asignaciones.length === 0) {
      return res.json({
        success: true,
        data: {
          conversaciones: [],
          total: 0,
        },
      });
    }

    const idDoctores = asignaciones.map((a) => Number(a.id_doctor)).filter((n) => Number.isFinite(n));
    const doctores = await Doctor.findAll({
      where: { id_doctor: { [Op.in]: idDoctores } },
      attributes: ['id_doctor', 'nombre', 'apellido_paterno', 'apellido_materno', 'activo'],
    });
    // Claves numéricas: Sequelize/JSON a veces mezclan string y number y .get falla sin resolución
    const doctorPorId = new Map(doctores.map((d) => [Number(d.id_doctor), d]));

    const conversacionesConDetalles = await Promise.all(
      asignaciones.map(async (row) => {
        const doctorId = Number(row.id_doctor);
        const doctor = Number.isFinite(doctorId) ? doctorPorId.get(doctorId) : null;

        const ultimoMensaje = await MensajeChat.findOne({
          where: { id_paciente: idP, id_doctor: doctorId },
          order: [['fecha_envio', 'DESC']],
          attributes: [
            'id_mensaje',
            'mensaje_texto',
            'mensaje_audio_transcripcion',
            'remitente',
            'fecha_envio',
            'leido',
          ],
        });

        const mensajesNoLeidos = await MensajeChat.count({
          where: {
            id_paciente: idP,
            id_doctor: doctorId,
            remitente: 'Doctor',
            leido: false,
          },
        });

        let previewMensaje = '';
        if (ultimoMensaje) {
          if (ultimoMensaje.mensaje_texto) {
            previewMensaje = ultimoMensaje.mensaje_texto;
          } else if (ultimoMensaje.mensaje_audio_transcripcion) {
            previewMensaje = ultimoMensaje.mensaje_audio_transcripcion;
          } else {
            previewMensaje = 'Mensaje de voz';
          }
          if (previewMensaje.length > 50) {
            previewMensaje = `${previewMensaje.substring(0, 50)}...`;
          }
        }

        const nombreCompleto = doctor
          ? `${doctor.nombre} ${doctor.apellido_paterno} ${doctor.apellido_materno || ''}`.trim()
          : 'Médico';

        return {
          id_doctor: doctorId,
          doctor: {
            id_doctor: doctorId,
            nombre: doctor?.nombre || '',
            apellido_paterno: doctor?.apellido_paterno || '',
            apellido_materno: doctor?.apellido_materno || '',
            nombre_completo: nombreCompleto,
            activo: doctor?.activo !== false,
          },
          ultimo_mensaje: ultimoMensaje
            ? {
                id_mensaje: ultimoMensaje.id_mensaje,
                preview: previewMensaje,
                remitente: ultimoMensaje.remitente,
                fecha_envio: ultimoMensaje.fecha_envio,
                leido: ultimoMensaje.leido,
              }
            : null,
          mensajes_no_leidos: mensajesNoLeidos,
          ultima_fecha: ultimoMensaje?.fecha_envio || row.fecha_asignacion || null,
        };
      })
    );

    conversacionesConDetalles.sort((a, b) => {
      const fechaA = a.ultima_fecha ? new Date(a.ultima_fecha).getTime() : 0;
      const fechaB = b.ultima_fecha ? new Date(b.ultima_fecha).getTime() : 0;
      return fechaB - fechaA;
    });

    logger.info('Conversaciones asignadas del paciente', { idP, total: conversacionesConDetalles.length });

    res.json({
      success: true,
      data: {
        conversaciones: conversacionesConDetalles,
        total: conversacionesConDetalles.length,
      },
    });
  } catch (error) {
    logger.error('Error obteniendo conversaciones asignadas del paciente:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Obtener lista de conversaciones de un doctor
 * GET /api/mensajes-chat/doctor/:idDoctor/conversaciones
 * 
 * Retorna lista de pacientes con los que el doctor tiene conversaciones
 * Incluye: último mensaje, contador de no leídos, datos del paciente
 */
export const getConversacionesDoctor = async (req, res) => {
  try {
    const { idDoctor } = req.params;
    const userRole = req.user?.rol;
    const userId = req.user?.id;
    
    logger.info('Obteniendo conversaciones del doctor', {
      idDoctor,
      userRole,
      userId
    });
    
    // Verificar autorización: solo doctores pueden ver sus conversaciones
    let doctorId = idDoctor ? parseInt(idDoctor) : null;
    let doctorAutenticado = null;
    
    if (userRole === 'Doctor' || userRole === 'Admin') {
      doctorAutenticado = await Doctor.findOne({ where: { id_usuario: userId } });
      if (doctorAutenticado) {
        // Si se proporciona idDoctor pero no coincide, usar el autenticado
        if (doctorId && doctorAutenticado.id_doctor !== doctorId) {
          logger.warn('id_doctor proporcionado diferente al autenticado, usando el autenticado', {
            idDoctorProporcionado: doctorId,
            idDoctorAutenticado: doctorAutenticado.id_doctor,
            userId
          });
          doctorId = doctorAutenticado.id_doctor;
        } else if (!doctorId) {
          doctorId = doctorAutenticado.id_doctor;
        }
      } else if (!doctorId) {
        return res.status(403).json({ success: false, error: 'No autorizado: doctor no encontrado' });
      }
    } else {
      return res.status(403).json({ success: false, error: 'No autorizado' });
    }
    
    // Obtener pacientes únicos con los que el doctor tiene conversaciones
    // Usamos una query SQL más eficiente para obtener IDs únicos de pacientes
    const pacientesUnicos = await MensajeChat.findAll({
      where: {
        id_doctor: doctorId
      },
      attributes: [
        [sequelize.fn('DISTINCT', sequelize.col('id_paciente')), 'id_paciente']
      ],
      raw: true
    });
    
    const idsPacientes = pacientesUnicos.map(p => p.id_paciente);
    
    if (idsPacientes.length === 0) {
      logger.info('No se encontraron conversaciones para el doctor', { doctorId });
      return res.json({
        success: true,
        data: {
          conversaciones: [],
          total: 0
        }
      });
    }
    
    // Para cada paciente, obtener el último mensaje y contar no leídos
    const conversacionesConDetalles = await Promise.all(
      idsPacientes.map(async (pacienteId) => {
        // Obtener el último mensaje de esta conversación
        const ultimoMensaje = await MensajeChat.findOne({
          where: {
            id_paciente: pacienteId,
            id_doctor: doctorId
          },
          order: [['fecha_envio', 'DESC']],
          attributes: ['id_mensaje', 'mensaje_texto', 'mensaje_audio_transcripcion', 'remitente', 'fecha_envio', 'leido']
        });
        
        // Contar mensajes no leídos del paciente hacia el doctor
        const mensajesNoLeidos = await MensajeChat.count({
          where: {
            id_paciente: pacienteId,
            id_doctor: doctorId,
            remitente: 'Paciente',
            leido: false
          }
        });
        
        // Obtener datos del paciente
        const paciente = await Paciente.findByPk(pacienteId, {
          attributes: ['id_paciente', 'nombre', 'apellido_paterno', 'apellido_materno']
        });
        
        // Preparar preview del último mensaje
        let previewMensaje = '';
        if (ultimoMensaje) {
          if (ultimoMensaje.mensaje_texto) {
            previewMensaje = ultimoMensaje.mensaje_texto;
          } else if (ultimoMensaje.mensaje_audio_transcripcion) {
            previewMensaje = ultimoMensaje.mensaje_audio_transcripcion;
          } else {
            previewMensaje = 'Mensaje de voz';
          }
          // Truncar a 50 caracteres
          if (previewMensaje.length > 50) {
            previewMensaje = previewMensaje.substring(0, 50) + '...';
          }
        }
        
        return {
          id_paciente: pacienteId,
          paciente: {
            id_paciente: paciente?.id_paciente || pacienteId,
            nombre: paciente?.nombre || '',
            apellido_paterno: paciente?.apellido_paterno || '',
            apellido_materno: paciente?.apellido_materno || '',
            nombre_completo: paciente 
              ? `${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno || ''}`.trim()
              : 'Paciente desconocido'
          },
          ultimo_mensaje: ultimoMensaje ? {
            id_mensaje: ultimoMensaje.id_mensaje,
            preview: previewMensaje,
            remitente: ultimoMensaje.remitente,
            fecha_envio: ultimoMensaje.fecha_envio,
            leido: ultimoMensaje.leido
          } : null,
          mensajes_no_leidos: mensajesNoLeidos,
          ultima_fecha: ultimoMensaje?.fecha_envio || null
        };
      })
    );
    
    // Ordenar por fecha del último mensaje (más reciente primero)
    conversacionesConDetalles.sort((a, b) => {
      const fechaA = a.ultima_fecha ? new Date(a.ultima_fecha).getTime() : 0;
      const fechaB = b.ultima_fecha ? new Date(b.ultima_fecha).getTime() : 0;
      return fechaB - fechaA;
    });
    
    logger.info('Conversaciones obtenidas', {
      doctorId,
      total: conversacionesConDetalles.length
    });
    
    res.json({
      success: true,
      data: {
        conversaciones: conversacionesConDetalles,
        total: conversacionesConDetalles.length
      }
    });
  } catch (error) {
    logger.error('Error obteniendo conversaciones del doctor:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Actualizar mensaje
 * PUT /api/mensajes-chat/:id
 */
export const updateMensaje = async (req, res) => {
  try {
    const { id } = req.params;
    const { mensaje_texto, mensaje_audio_url, mensaje_audio_duracion, mensaje_audio_transcripcion } = req.body;
    const userRole = req.user?.rol;
    const userId = req.user?.id;
    
    logger.info('Actualizando mensaje', { id, userId, userRole });
    
    const mensaje = await MensajeChat.findByPk(id);
    if (!mensaje) {
      return res.status(404).json({ success: false, error: 'Mensaje no encontrado' });
    }
    
    // Verificar autorización: solo el remitente puede editar su mensaje
    let autorizado = false;
    
    if (userRole === 'Admin') {
      autorizado = true;
    } else if (mensaje.remitente === 'Paciente') {
      // Si es mensaje de paciente, verificar que el usuario sea el paciente
      // Para pacientes, req.user.id es id_paciente (ver middlewares/auth.js línea 38)
      // Comparar directamente id_paciente del mensaje con userId del usuario autenticado
      if (mensaje.id_paciente === userId) {
        autorizado = true;
      }
    } else if (mensaje.remitente === 'Doctor') {
      // Si es mensaje de doctor, verificar que el usuario sea el doctor
      const doctor = await Doctor.findByPk(mensaje.id_doctor);
      if (doctor && doctor.id_usuario === userId) {
        autorizado = true;
      }
    }
    
    if (!autorizado) {
      logger.warn('Intento de editar mensaje no autorizado', { id, userId, remitente: mensaje.remitente });
      return res.status(403).json({ success: false, error: 'No autorizado para editar este mensaje' });
    }
    
    // Validar que se proporcione al menos un campo para actualizar
    if (!mensaje_texto && !mensaje_audio_url) {
      return res.status(400).json({ success: false, error: 'Debe proporcionar mensaje_texto o mensaje_audio_url' });
    }
    
    // Validar que mensaje_texto no esté vacío si se proporciona
    if (mensaje_texto && typeof mensaje_texto === 'string' && mensaje_texto.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'mensaje_texto no puede estar vacío' });
    }
    
    // Actualizar solo los campos proporcionados
    const updateData = {};
    if (mensaje_texto !== undefined) {
      updateData.mensaje_texto = mensaje_texto.trim();
    }
    if (mensaje_audio_url !== undefined) {
      updateData.mensaje_audio_url = mensaje_audio_url ? persistUploadPath(mensaje_audio_url) : null;
    }
    if (mensaje_audio_duracion !== undefined) {
      updateData.mensaje_audio_duracion = mensaje_audio_duracion;
    }
    if (mensaje_audio_transcripcion !== undefined) {
      updateData.mensaje_audio_transcripcion = mensaje_audio_transcripcion;
    }
    
    // Marcar que el mensaje fue editado (podríamos agregar un campo editado: true)
    await mensaje.update(updateData);
    
    logger.info('Mensaje actualizado exitosamente', { id });
    
    // Emitir evento WebSocket si está disponible
    if (req.app.get('io')) {
      req.app.get('io').emit('mensaje_actualizado', {
        id_paciente: mensaje.id_paciente,
        id_doctor: mensaje.id_doctor,
        mensaje: serializeWithSignedUploads(mensaje),
      });
    }
    
    res.json({ success: true, data: serializeWithSignedUploads(mensaje) });
  } catch (error) {
    logger.error('Error actualizando mensaje:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * Eliminar mensaje
 * DELETE /api/mensajes-chat/:id
 */
export const deleteMensaje = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.rol;
    const userId = req.user?.id;
    
    logger.info('Eliminando mensaje', { id, userId, userRole });
    
    const mensaje = await MensajeChat.findByPk(id);
    if (!mensaje) {
      return res.status(404).json({ success: false, error: 'Mensaje no encontrado' });
    }
    
    logger.debug('Datos del mensaje', {
      id_mensaje: mensaje.id_mensaje,
      remitente: mensaje.remitente,
      id_paciente: mensaje.id_paciente,
      id_doctor: mensaje.id_doctor
    });
    
    // Verificar autorización: solo el remitente o admin puede eliminar
    let autorizado = false;
    
    if (userRole === 'Admin') {
      autorizado = true;
      logger.debug('Autorizado: Admin');
    } else if (mensaje.remitente === 'Paciente') {
      // Si es mensaje de paciente, verificar que el usuario sea el paciente
      // Primero verificar que el usuario autenticado sea un paciente
      if (userRole === 'Paciente' || userRole === 'paciente') {
        // Para pacientes, req.user.id es id_paciente (ver middlewares/auth.js línea 38)
        // Comparar directamente id_paciente del mensaje con userId del usuario autenticado
        logger.debug('Verificando paciente', {
          mensajeIdPaciente: mensaje.id_paciente,
          userIdAutenticado: userId,
          coinciden: mensaje.id_paciente === userId
        });
        
        if (mensaje.id_paciente === userId) {
          autorizado = true;
          logger.debug('Autorizado: Paciente es el remitente');
        } else {
          logger.warn('Paciente no coincide', {
            mensajeIdPaciente: mensaje.id_paciente,
            userId,
            coinciden: mensaje.id_paciente === userId
          });
        }
      } else {
        logger.warn('Usuario no es paciente', { userRole });
      }
    } else if (mensaje.remitente === 'Doctor') {
      // Si es mensaje de doctor, verificar que el usuario sea el doctor
      if (userRole === 'Doctor' || userRole === 'Admin') {
        const doctor = await Doctor.findByPk(mensaje.id_doctor);
        logger.debug('Verificando doctor', {
          doctorId: mensaje.id_doctor,
          doctorEncontrado: !!doctor,
          doctorIdUsuario: doctor?.id_usuario,
          userId
        });
        
        if (doctor && doctor.id_usuario === userId) {
          autorizado = true;
          logger.debug('Autorizado: Doctor es el remitente');
        } else {
          logger.warn('Doctor no coincide', {
            doctorIdUsuario: doctor?.id_usuario,
            userId,
            coinciden: doctor?.id_usuario === userId
          });
        }
      } else {
        logger.warn('Usuario no es doctor', { userRole });
      }
    }
    
    if (!autorizado) {
      logger.warn('Intento de eliminar mensaje no autorizado', {
        id,
        userId,
        userRole,
        remitente: mensaje.remitente,
        mensajeIdPaciente: mensaje.id_paciente,
        mensajeIdDoctor: mensaje.id_doctor
      });
      return res.status(403).json({ success: false, error: 'No autorizado para eliminar este mensaje' });
    }
    
    const idPaciente = mensaje.id_paciente;
    const idDoctor = mensaje.id_doctor;
    
    await mensaje.destroy();
    
    logger.info('Mensaje eliminado exitosamente', { id });
    
    // Emitir evento WebSocket si está disponible
    if (req.app.get('io')) {
      req.app.get('io').emit('mensaje_eliminado', {
        id_paciente: idPaciente,
        id_doctor: idDoctor,
        id_mensaje: id,
      });
    }
    
    res.json({ success: true, message: 'Mensaje eliminado' });
  } catch (error) {
    logger.error('Error eliminando mensaje:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Subir archivo de audio
 * POST /api/mensajes-chat/upload-audio
 */
export const uploadAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No se proporcionó ningún archivo de audio' 
      });
    }

    const file = req.file;
    logger.info('Archivo de audio subido', {
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype
    });

    // Generar URL relativa del archivo
    const audioUrl = `/uploads/audio/${file.filename}`;

    res.json({
      success: true,
      data: {
        url: signUploadPublicUrl(audioUrl),
        filename: file.filename,
        size: file.size,
        mimetype: file.mimetype
      }
    });
  } catch (error) {
    logger.error('Error subiendo archivo de audio:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Error al subir el archivo de audio' 
    });
  }
};

// Exportar middleware de multer para usar en la ruta
export const uploadAudioMiddleware = upload.single('audio');