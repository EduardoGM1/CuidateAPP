import { Doctor, Usuario, Modulo, Paciente, DoctorPaciente } from '../models/associations.js';
import { sendSuccess, sendError, sendNotFound, sendUnauthorized, sendServerError } from '../utils/responseHelpers.js';
import DashboardService from '../services/dashboardService.js';
import logger from '../utils/logger.js';
import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import realtimeService from '../services/realtimeService.js';
import { buildPaginationOptions } from '../utils/queryHelpers.js';
import { PAGINATION } from '../config/constants.js';

// Crear instancia del servicio
const dashboardService = new DashboardService();

function parseModuloFilter(modulo) {
  if (modulo == null || modulo === '') return null;
  const id = parseInt(modulo, 10);
  if (Number.isNaN(id) || id <= 0) return null;
  return id;
}

export const getDoctores = async (req, res) => {
  try {
    const { modulo: moduloQuery } = req.query;
    const idModuloFilter = parseModuloFilter(moduloQuery);

    // Usar utility functions para construir opciones de paginación
    const { order, where: estadoWhere, limit, offset } = buildPaginationOptions(
      req.query, 
      {
        defaultField: 'fecha_registro',
        maxLimit: PAGINATION.MAX_LIMIT,
        defaultLimit: PAGINATION.DOCTORES_LIMIT
      }
    );
    
    // Combinar condiciones
    const whereCondition = { ...estadoWhere };
    if (idModuloFilter != null) {
      whereCondition.id_modulo = idModuloFilter;
    }
    
    // Log específico para debug del filtro "todos" - Solo en desarrollo
    if (process.env.NODE_ENV === 'development' && req.query.estado === 'todos') {
      logger.debug('🔍 Backend filtro todos', {
        estado: req.query.estado,
        sort: req.query.sort,
        query: req.query,
        order
      });
    }
    
    // Si es Doctor, solo puede ver su propio perfil
    if (req.user.rol === 'Doctor') {
      const doctor = await Doctor.findOne({ where: { id_usuario: req.user.id } });
      if (!doctor) {
        return sendUnauthorized(res, 'Doctor no encontrado');
      }
      whereCondition.id_doctor = doctor.id_doctor;
    }
    
    // Ejecutar consultas en paralelo para mejor performance
    const [doctores, conteosPacientes] = await Promise.all([
      // Consulta principal de doctores
      Doctor.findAll({
        where: whereCondition,
        attributes: { exclude: ['created_at', 'updated_at'] },
        include: [
          { model: Usuario, attributes: ['email', 'rol'] },
          { model: Modulo, attributes: ['nombre_modulo'] }
        ],
        order: order,
        limit,
        offset
      }),
      // Consulta separada para conteo de pacientes
      DoctorPaciente.findAll({
        attributes: [
          'id_doctor',
          [sequelize.fn('COUNT', sequelize.col('id_paciente')), 'total_pacientes']
        ],
        group: ['id_doctor'],
        raw: true
      })
    ]);

    // Crear mapa de conteos para acceso rápido
    const conteosMap = conteosPacientes.reduce((map, conteo) => {
      map[conteo.id_doctor] = parseInt(conteo.total_pacientes) || 0;
      return map;
    }, {});

    // Mapear datos para incluir campos necesarios en el frontend
    const doctoresMapeados = doctores.map(doctor => ({
      ...doctor.toJSON(),
      email: doctor.Usuario?.email || null,
      modulo_nombre: doctor.Modulo?.nombre_modulo || null,
      // Usar el conteo real calculado por la consulta separada
      pacientes_asignados: conteosMap[doctor.id_doctor] || 0
    }));
    
    // Log específico para debug del filtro "todos" - Solo en desarrollo
    if (process.env.NODE_ENV === 'development' && req.query.estado === 'todos') {
      const activos = doctoresMapeados.filter(d => d.activo === true).length;
      const inactivos = doctoresMapeados.filter(d => d.activo === false).length;
      
      logger.debug('🔍 Backend resultado filtro todos', {
        total: doctores.length,
        mapeados: doctoresMapeados.length,
        activos,
        inactivos,
        whereCondition,
        order,
        primeros5: doctoresMapeados.slice(0, 5).map(d => ({
          nombre: `${d.nombre} ${d.apellido_paterno}`,
          activo: d.activo,
          fecha: d.fecha_registro
        }))
      });
    }
    
    sendSuccess(res, doctoresMapeados);
  } catch (error) {
    sendServerError(res, error);
  }
};

export const getDoctorById = async (req, res) => {
  try {
    let whereCondition = { id_doctor: req.params.id, activo: true };
    
    // Si es Doctor, solo puede ver su propio perfil
    if (req.user.rol === 'Doctor') {
      const doctorAuth = await Doctor.findOne({ where: { id_usuario: req.user.id } });
      if (!doctorAuth || doctorAuth.id_doctor != req.params.id) {
        return sendUnauthorized(res, 'No autorizado para ver este doctor');
      }
    }
    
    // Ejecutar consultas en paralelo para mejor performance
    const [doctor, conteoPacientes] = await Promise.all([
      // Consulta principal del doctor
      Doctor.findOne({ 
        where: whereCondition,
        attributes: { exclude: ['created_at', 'updated_at'] },
        include: [
          { model: Usuario, attributes: ['email', 'rol'] },
          { model: Modulo, attributes: ['nombre_modulo'] }
        ]
      }),
      // Consulta separada para conteo de pacientes
      DoctorPaciente.count({
        where: { id_doctor: req.params.id }
      })
    ]);
    
    if (!doctor) {
      return sendNotFound(res, 'Doctor');
    }

    // Mapear datos para incluir campos necesarios en el frontend
    const doctorMapeado = {
      ...doctor.toJSON(),
      email: doctor.Usuario?.email || null,
      modulo_nombre: doctor.Modulo?.nombre_modulo || null,
      // Usar el conteo real calculado por la consulta separada
      pacientes_asignados: conteoPacientes || 0
    };
    
    sendSuccess(res, doctorMapeado);
  } catch (error) {
    sendServerError(res, error);
  }
};

export const createDoctor = async (req, res) => {
  try {
    // Log detallado de lo que recibimos
    logger.info('DoctorController: Datos recibidos', {
      body: req.body,
      tipos: {
        id_usuario: typeof req.body?.id_usuario,
        id_modulo: typeof req.body?.id_modulo,
        anos_servicio: typeof req.body?.anos_servicio,
        activo: typeof req.body?.activo
      }
    });

    // Validar campos requeridos
    if (!req.body.nombre || !req.body.apellido_paterno) {
      return res.status(400).json({
        success: false,
        error: 'Los campos nombre y apellido_paterno son requeridos'
      });
    }

    // Convertir y validar tipos de datos
    const doctorData = {
      id_usuario: req.body.id_usuario ? parseInt(req.body.id_usuario, 10) : null,
      nombre: String(req.body.nombre).trim(),
      apellido_paterno: String(req.body.apellido_paterno).trim(),
      apellido_materno: req.body.apellido_materno ? String(req.body.apellido_materno).trim() : null,
      telefono: req.body.telefono ? String(req.body.telefono).trim() : null,
      institucion_hospitalaria: req.body.institucion_hospitalaria ? String(req.body.institucion_hospitalaria).trim() : null,
      grado_estudio: req.body.grado_estudio ? String(req.body.grado_estudio).trim() : null,
      anos_servicio: req.body.anos_servicio ? parseInt(req.body.anos_servicio, 10) : null,
      id_modulo: req.body.id_modulo ? parseInt(req.body.id_modulo, 10) : null,
      activo: req.body.activo !== undefined ? Boolean(req.body.activo) : true,
      fecha_registro: new Date()
    };

    // Validar que id_usuario sea válido si se proporciona
    if (doctorData.id_usuario !== null && (isNaN(doctorData.id_usuario) || doctorData.id_usuario <= 0)) {
      return res.status(400).json({
        success: false,
        error: 'id_usuario debe ser un número válido'
      });
    }

    // Validar que id_modulo sea válido si se proporciona
    if (doctorData.id_modulo !== null && (isNaN(doctorData.id_modulo) || doctorData.id_modulo <= 0)) {
      return res.status(400).json({
        success: false,
        error: 'id_modulo debe ser un número válido'
      });
    }

    // Validar que anos_servicio sea válido si se proporciona
    if (doctorData.anos_servicio !== null && (isNaN(doctorData.anos_servicio) || doctorData.anos_servicio < 0)) {
      return res.status(400).json({
        success: false,
        error: 'anos_servicio debe ser un número válido mayor o igual a 0'
      });
    }

    logger.info('DoctorController: Creando nuevo doctor', { 
      id_usuario: doctorData.id_usuario,
      nombre: doctorData.nombre,
      id_modulo: doctorData.id_modulo 
    });
    
    const doctor = await Doctor.create(doctorData);
    
    logger.info('DoctorController: Doctor creado exitosamente', { 
      id_doctor: doctor.id_doctor,
      id_usuario: doctor.id_usuario 
    });

    // Enviar evento WebSocket para actualización en tiempo real
    const doctorDataResponse = {
      id_doctor: doctor.id_doctor,
      id_usuario: doctor.id_usuario,
      nombre: doctor.nombre,
      apellido_paterno: doctor.apellido_paterno,
      apellido_materno: doctor.apellido_materno,
      id_modulo: doctor.id_modulo,
      activo: doctor.activo,
      fecha_registro: doctor.fecha_registro
    };

    // Notificar a administradores sobre nuevo doctor
    realtimeService.sendToRole('Admin', 'doctor_created', doctorDataResponse);
    
    // Notificar a otros doctores
    realtimeService.sendToRole('Doctor', 'doctor_created', doctorDataResponse);
    
    sendSuccess(res, doctor, 201);
  } catch (error) {
    // Log detallado del error
    logger.error('DoctorController: Error creando doctor', { 
      error: error.message,
      errorName: error.name,
      stack: error.stack,
      body: req.body,
      originalError: error.original?.message || error.original,
      sql: error.sql || error.original?.sql
    });

    // Manejar errores específicos de Sequelize
    if (error.name === 'SequelizeValidationError') {
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
      return res.status(400).json({
        success: false,
        error: 'Referencia inválida: el usuario o módulo no existe'
      });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        error: 'Ya existe un doctor con este id_usuario'
      });
    }

    if (error.name === 'SequelizeDatabaseError' || error.original?.code) {
      return res.status(500).json({
        success: false,
        error: 'Error en la base de datos',
        message: process.env.NODE_ENV === 'development' ? (error.original?.sqlMessage || error.message) : 'Error interno del servidor'
      });
    }

    sendError(res, error.message);
  }
};

export const updateDoctor = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    logger.info('DoctorController: Actualizando doctor', { 
      id_doctor: req.params.id,
      datos: req.body 
    });

    // Obtener el doctor para acceder al id_usuario
    const doctor = await Doctor.findByPk(req.params.id, {
      attributes: ['id_doctor', 'id_usuario']
    });
    
    if (!doctor) {
      await transaction.rollback();
      return sendNotFound(res, 'Doctor');
    }

    // Separar datos del doctor y del usuario
    const { email, ...doctorData } = req.body;
    
    logger.info('DoctorController: Datos separados', { 
      email, 
      doctorData,
      doctorId: req.params.id,
      doctorDataKeys: Object.keys(doctorData)
    });

    // PRIMERO: Actualizar email del usuario si se proporciona
    if (email) {
      logger.info('DoctorController: Actualizando email del usuario', { 
        id_usuario: doctor.id_usuario,
        nuevo_email: email 
      });
      
      try {
        // Verificar si el email ya existe en otro usuario
        const existingUser = await Usuario.findOne({
          where: { 
            email: email,
            id_usuario: { [Op.ne]: doctor.id_usuario }
          },
          transaction
        });
        
        if (existingUser) {
          await transaction.rollback();
          return sendError(res, 'El email ya está en uso por otro usuario');
        }
        
        // Si el email es el mismo que ya tiene, no hacer nada
        const currentUser = await Usuario.findByPk(doctor.id_usuario, { transaction });
        if (currentUser && currentUser.email === email) {
          logger.info('DoctorController: Email no cambió, omitiendo actualización', { 
            id_usuario: doctor.id_usuario,
            email: email 
          });
        } else {
          const [updatedUser] = await Usuario.update(
            { email: email },
            { 
              where: { id_usuario: doctor.id_usuario },
              transaction
            }
          );
          
          if (!updatedUser) {
            await transaction.rollback();
            return sendError(res, 'Error al actualizar email del usuario');
          }
          
          logger.info('DoctorController: Email actualizado exitosamente', { 
            id_usuario: doctor.id_usuario,
            nuevo_email: email 
          });
        }
        
      } catch (error) {
        await transaction.rollback();
        logger.error('DoctorController: Error actualizando email', error);
        
        if (error.name === 'SequelizeUniqueConstraintError') {
          return sendError(res, 'El email ya está en uso por otro usuario');
        }
        
        return sendError(res, 'Error al actualizar email del usuario');
      }
    }

    // SEGUNDO: Actualizar datos del doctor solo si hay datos para actualizar
    let updatedDoctor = 1; // Si no hay datos del doctor, consideramos exitoso
    if (Object.keys(doctorData).length > 0) {
      logger.info('DoctorController: Actualizando datos del doctor', { 
        doctorData,
        doctorId: req.params.id
      });
      
      [updatedDoctor] = await Doctor.update(doctorData, {
        where: { id_doctor: req.params.id },
        transaction
      });
      
      logger.info('DoctorController: Resultado de actualización del doctor', { 
        updatedDoctor,
        doctorId: req.params.id,
        doctorDataKeys: Object.keys(doctorData)
      });
    }
    
    if (!updatedDoctor) {
      logger.error('DoctorController: No se pudo actualizar el doctor', { 
        updatedDoctor,
        doctorId: req.params.id,
        doctorData
      });
      await transaction.rollback();
      return sendNotFound(res, 'Doctor');
    }

    // Confirmar transacción
    await transaction.commit();

    // Obtener el doctor actualizado con sus relaciones
    const doctorActualizado = await Doctor.findByPk(req.params.id, {
      include: [
        { model: Usuario, attributes: ['email', 'rol'] },
        { model: Modulo, attributes: ['nombre_modulo'] }
      ]
    });

    logger.info('DoctorController: Doctor actualizado exitosamente', { 
      id_doctor: req.params.id,
      email_actualizado: email ? true : false
    });

    sendSuccess(res, doctorActualizado);
  } catch (error) {
    await transaction.rollback();
    logger.error('DoctorController: Error actualizando doctor', error);
    sendError(res, error.message);
  }
};

export const deleteDoctor = async (req, res) => {
  try {
    const doctorId = req.params.id;
    
    logger.info('deleteDoctor: Iniciando soft delete', { 
      doctorId: doctorId,
      doctorIdType: typeof doctorId,
      url: req.url,
      method: req.method
    });
    
    // Buscar el doctor para obtener el id_usuario
    const doctor = await Doctor.findOne({
      where: { id_doctor: doctorId },
      include: [{ model: Usuario, attributes: ['id_usuario', 'email'] }]
    });
    
    if (!doctor) {
      logger.warn('deleteDoctor: Doctor no encontrado', { doctorId });
      return sendNotFound(res, 'Doctor');
    }
    
    // Desactivar doctor (sin transacción por ahora)
    try {
      // Desactivar doctor
      const doctorUpdated = await Doctor.update(
        { activo: false },
        { 
          where: { id_doctor: doctorId }
        }
      );
      
      logger.info('deleteDoctor: Doctor actualizado', { 
        doctorId,
        updated: doctorUpdated
      });
      
      // Desactivar usuario si existe
      if (doctor.id_usuario) {
        const userUpdated = await Usuario.update(
          { activo: false },
          { 
            where: { id_usuario: doctor.id_usuario }
          }
        );
        
        logger.info('deleteDoctor: Usuario actualizado', { 
          usuarioId: doctor.id_usuario,
          updated: userUpdated
        });
      }
      
      logger.info('deleteDoctor: Doctor desactivado exitosamente', { 
        doctorId,
        usuarioId: doctor.id_usuario,
        email: doctor.Usuario?.email
      });
      
      res.status(200).json({
        success: true,
        message: 'Doctor desactivado exitosamente',
        data: {
          id_doctor: doctorId,
          activo: false
        }
      });
      
    } catch (updateError) {
      logger.error('deleteDoctor: Error actualizando doctor/usuario', { 
        doctorId,
        error: updateError.message
      });
      throw updateError;
    }
    
  } catch (error) {
    logger.error('deleteDoctor: Error desactivando doctor', { 
      doctorId: req.params.id, 
      error: error.message,
      stack: error.stack
    });
    sendServerError(res, error);
  }
};

// Reactivar doctor (soft delete reverso)
export const reactivateDoctor = async (req, res) => {
  try {
    const doctorId = req.params.id;
    
    logger.info('reactivateDoctor: Iniciando reactivación', { 
      doctorId: doctorId,
      url: req.url,
      method: req.method
    });
    
    // Buscar el doctor para obtener el id_usuario
    const doctor = await Doctor.findOne({
      where: { id_doctor: doctorId },
      include: [{ model: Usuario, attributes: ['id_usuario', 'email'] }]
    });
    
    if (!doctor) {
      logger.warn('reactivateDoctor: Doctor no encontrado', { doctorId });
      return sendNotFound(res, 'Doctor');
    }
    
    // Usar transacción para reactivar doctor y usuario
    const transaction = await sequelize.transaction();
    
    try {
      // Reactivar doctor
      await Doctor.update(
        { activo: true },
        { 
          where: { id_doctor: doctorId },
          transaction 
        }
      );
      
      // Reactivar usuario si existe
      if (doctor.id_usuario) {
        await Usuario.update(
          { activo: true },
          { 
            where: { id_usuario: doctor.id_usuario },
            transaction 
          }
        );
      }
      
      await transaction.commit();
      
      logger.info('reactivateDoctor: Doctor reactivado exitosamente', { 
        doctorId,
        usuarioId: doctor.id_usuario,
        email: doctor.Usuario?.email
      });
      
      res.status(200).json({
        success: true,
        message: 'Doctor reactivado exitosamente',
        data: {
          id_doctor: doctorId,
          activo: true
        }
      });
      
    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }
    
  } catch (error) {
    logger.error('reactivateDoctor: Error reactivando doctor', { 
      doctorId: req.params.id, 
      error: error.message,
      stack: error.stack
    });
    sendServerError(res, error);
  }
};

// Eliminación permanente (hard delete)
export const hardDeleteDoctor = async (req, res) => {
  try {
    const doctorId = req.params.id;
    
    logger.info('hardDeleteDoctor: Iniciando eliminación permanente', { 
      doctorId: doctorId,
      url: req.url,
      method: req.method
    });
    
    // Buscar el doctor para obtener el id_usuario
    const doctor = await Doctor.findOne({
      where: { id_doctor: doctorId },
      include: [{ model: Usuario, attributes: ['id_usuario', 'email'] }]
    });
    
    if (!doctor) {
      logger.warn('hardDeleteDoctor: Doctor no encontrado', { doctorId });
      return sendNotFound(res, 'Doctor');
    }
    
    // Usar transacción para eliminar doctor y usuario
    const transaction = await sequelize.transaction();
    
    try {
      // Eliminar doctor
      await Doctor.destroy({
        where: { id_doctor: doctorId },
        transaction
      });
      
      // Eliminar usuario si existe
      if (doctor.id_usuario) {
        await Usuario.destroy({
          where: { id: doctor.id_usuario },
          transaction
        });
      }
      
      await transaction.commit();
      
      logger.info('hardDeleteDoctor: Doctor eliminado permanentemente', { 
        doctorId,
        usuarioId: doctor.id_usuario,
        email: doctor.Usuario?.email
      });
      
      res.status(200).json({
        success: true,
        message: 'Doctor eliminado permanentemente',
        data: {
          id_doctor: doctorId,
          deleted: true
        }
      });
      
    } catch (transactionError) {
      await transaction.rollback();
      throw transactionError;
    }
    
  } catch (error) {
    logger.error('hardDeleteDoctor: Error eliminando doctor permanentemente', { 
      doctorId: req.params.id, 
      error: error.message,
      stack: error.stack
    });
    sendServerError(res, error);
  }
};

export const getDoctorDashboard = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar ID
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de doctor inválido'
      });
    }

    // El parámetro 'id' del URL corresponde a 'id_doctor' en la base de datos
    const doctorId = parseInt(id);
    
    logger.info('getDoctorDashboard: Buscando dashboard', { 
      urlId: id, 
      doctorId: doctorId 
    });
    
    // Obtener datos del dashboard usando DashboardService
    const dashboardData = await dashboardService.getDoctorDashboard(doctorId);

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    logger.error('Error en getDoctorDashboard:', error);
    
    if (error.message === 'Doctor no encontrado') {
      return res.status(404).json({
        success: false,
        error: 'Doctor no encontrado'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

// =====================================================
// ENDPOINTS DE ASIGNACIÓN DE PACIENTES
// =====================================================

// Asignar paciente a doctor
export const assignPatientToDoctor = async (req, res) => {
  try {
    const { id } = req.params; // id_doctor
    const { id_paciente, observaciones = '' } = req.body;

    // Validar parámetros
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de doctor inválido'
      });
    }

    if (!id_paciente || isNaN(id_paciente)) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    const doctorId = parseInt(id);
    const pacienteId = parseInt(id_paciente);

    // Verificar que el doctor existe y está activo
    const doctor = await Doctor.findOne({
      where: { id_doctor: doctorId, activo: true }
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor no encontrado o inactivo'
      });
    }

    // Verificar que el paciente existe y está activo
    const paciente = await Paciente.findOne({
      where: { id_paciente: pacienteId, activo: true }
    });

    if (!paciente) {
      return res.status(404).json({
        success: false,
        error: 'Paciente no encontrado o inactivo'
      });
    }

    // Verificar que no existe ya la asignación
    const existingAssignment = await DoctorPaciente.findOne({
      where: {
        id_doctor: doctorId,
        id_paciente: pacienteId
      }
    });

    if (existingAssignment) {
      return res.status(409).json({
        success: false,
        error: 'El paciente ya está asignado a este doctor'
      });
    }

    // Crear la asignación
    const assignment = await DoctorPaciente.create({
      id_doctor: doctorId,
      id_paciente: pacienteId,
      fecha_asignacion: new Date(),
      observaciones: observaciones || null
    });

    // Enviar evento WebSocket para actualización en tiempo real
    const assignmentData = {
      id_doctor: doctorId,
      id_paciente: pacienteId,
      doctor_nombre: `${doctor.nombre} ${doctor.apellido_paterno}`,
      paciente_nombre: `${paciente.nombre} ${paciente.apellido_paterno}`,
      fecha_asignacion: assignment.fecha_asignacion,
      observaciones: assignment.observaciones
    };

    realtimeService.sendToRole('Admin', 'patient_assigned', assignmentData);
    realtimeService.sendToRole('Doctor', 'patient_assigned', assignmentData);

    logger.info('Paciente asignado exitosamente', {
      doctorId,
      pacienteId,
      doctor: doctor.nombre,
      paciente: paciente.nombre
    });

    res.status(201).json({
      success: true,
      message: 'Paciente asignado exitosamente',
      data: {
        id_doctor: doctorId,
        id_paciente: pacienteId,
        fecha_asignacion: assignment.fecha_asignacion,
        observaciones: assignment.observaciones
      }
    });

  } catch (error) {
    logger.error('Error asignando paciente a doctor:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

// Desasignar paciente de doctor
export const unassignPatientFromDoctor = async (req, res) => {
  try {
    const { id, pacienteId } = req.params; // id_doctor, id_paciente

    // Validar parámetros
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de doctor inválido'
      });
    }

    if (!pacienteId || isNaN(pacienteId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    const doctorId = parseInt(id);
    const pacienteIdInt = parseInt(pacienteId);

    // Verificar que existe la asignación
    const assignment = await DoctorPaciente.findOne({
      where: {
        id_doctor: doctorId,
        id_paciente: pacienteIdInt
      }
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Asignación no encontrada'
      });
    }

    // Obtener información del doctor y paciente para el evento WebSocket
    const doctor = await Doctor.findByPk(doctorId, {
      attributes: ['nombre', 'apellido_paterno']
    });
    
    const paciente = await Paciente.findByPk(pacienteIdInt, {
      attributes: ['nombre', 'apellido_paterno']
    });

    // Eliminar la asignación
    await DoctorPaciente.destroy({
      where: {
        id_doctor: doctorId,
        id_paciente: pacienteIdInt
      }
    });

    // Enviar evento WebSocket para actualización en tiempo real
    const unassignmentData = {
      id_doctor: doctorId,
      id_paciente: pacienteIdInt,
      doctor_nombre: doctor ? `${doctor.nombre} ${doctor.apellido_paterno}` : 'Doctor desconocido',
      paciente_nombre: paciente ? `${paciente.nombre} ${paciente.apellido_paterno}` : 'Paciente desconocido'
    };

    realtimeService.sendToRole('Admin', 'patient_unassigned', unassignmentData);
    realtimeService.sendToRole('Doctor', 'patient_unassigned', unassignmentData);

    logger.info('Paciente desasignado exitosamente', {
      doctorId,
      pacienteId: pacienteIdInt,
      doctor: doctor ? doctor.nombre : 'Desconocido',
      paciente: paciente ? paciente.nombre : 'Desconocido'
    });

    res.json({
      success: true,
      message: 'Paciente desasignado exitosamente'
    });

  } catch (error) {
    logger.error('Error desasignando paciente de doctor:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

// Obtener pacientes disponibles para asignar
export const getAvailablePatients = async (req, res) => {
  try {
    const { id } = req.params; // id_doctor

    // Validar parámetros
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de doctor inválido'
      });
    }

    const doctorId = parseInt(id);

    // Verificar que el doctor existe y está activo
    const doctor = await Doctor.findOne({
      where: { id_doctor: doctorId, activo: true }
    });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor no encontrado o inactivo'
      });
    }

    // Obtener IDs de pacientes ya asignados a este doctor
    const assignedPatients = await DoctorPaciente.findAll({
      where: { id_doctor: doctorId },
      attributes: ['id_paciente']
    });

    const assignedIds = assignedPatients.map(ap => ap.id_paciente);

    // Obtener pacientes no asignados y activos
    const availablePatients = await Paciente.findAll({
      where: {
        id_paciente: { [Op.notIn]: assignedIds },
        activo: true
      },
      attributes: [
        'id_paciente',
        'nombre',
        'apellido_paterno',
        'apellido_materno',
        'fecha_nacimiento',
        'numero_celular',
        'sexo'
      ],
      order: [['nombre', 'ASC']]
    });

    // Calcular edad para cada paciente
    const patientsWithAge = availablePatients.map(patient => {
      const edad = new Date().getFullYear() - new Date(patient.fecha_nacimiento).getFullYear();
      return {
        ...patient.toJSON(),
        edad
      };
    });

    logger.info('Pacientes disponibles obtenidos', {
      doctorId,
      totalAvailable: patientsWithAge.length,
      assignedCount: assignedIds.length
    });

    res.json({
      success: true,
      data: patientsWithAge,
      total: patientsWithAge.length
    });

  } catch (error) {
    logger.error('Error obteniendo pacientes disponibles:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};