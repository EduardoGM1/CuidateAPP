import { Paciente, Doctor, DoctorPaciente, Usuario, Comorbilidad, PacienteComorbilidad } from '../models/associations.js';
import bcrypt from 'bcrypt';
import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import realtimeService from '../services/realtimeService.js';
import emailService from '../services/emailService.js';
import logger from '../utils/logger.js';
import { buildPaginationOptions } from '../utils/queryHelpers.js';
import { PAGINATION } from '../config/constants.js';
import { normalizePaciente } from '../utils/pacienteMapper.js';
import { sendSuccess, sendServerError } from '../utils/responseHelpers.js';
import { logDataAccess } from '../services/dataAccessLogService.js';

/**
 * Parsea el parámetro de filtro comorbilidad: acepta id (numérico) o 'todas'/vacío.
 * @param {string|null|undefined} comorbilidad - Query param: id numérico o 'todas'
 * @returns {number|null} - id_comorbilidad o null si no hay filtro
 */
function parseComorbilidadFilter(comorbilidad) {
  if (comorbilidad == null || comorbilidad === '' || String(comorbilidad).toLowerCase() === 'todas') {
    return null;
  }
  const id = parseInt(comorbilidad, 10);
  if (Number.isNaN(id) || id <= 0) return null;
  return id;
}

/** Parsea filtro módulo: null/vacío = todos; número = id_modulo */
function parseModuloFilter(modulo) {
  if (modulo == null || modulo === '') return null;
  const id = parseInt(modulo, 10);
  if (Number.isNaN(id) || id <= 0) return null;
  return id;
}

/** Normaliza query.estado a 'activos' | 'inactivos' | 'todos' para evitar fallos con valores inesperados */
function normalizeEstadoParam(value) {
  if (value == null || value === '') return 'activos';
  const v = String(value).toLowerCase().trim();
  if (v === 'todos' || v === 'inactivos') return v;
  return 'activos';
}

/**
 * Normaliza número de expediente (opcional): mayúsculas y sin espacios sobrantes.
 * Permite letras, números, guion, diagonal y punto.
 */
function normalizeNumeroExpediente(value) {
  if (value == null) return null;
  const normalized = String(value).trim().toUpperCase();
  if (!normalized) return null;
  if (normalized.length > 50) {
    throw new Error('El número de expediente no puede exceder 50 caracteres');
  }
  if (!/^[A-Z0-9\-\/\.]+$/.test(normalized)) {
    throw new Error('El número de expediente solo permite letras, números, guion (-), diagonal (/) y punto (.)');
  }
  return normalized;
}

import { buildNameSearchWhere } from '../utils/patientSearch.js';

export const getPacientes = async (req, res) => {
  try {
    const { comorbilidad = null, modulo: moduloQuery = null, search: searchQuery = null } = req.query;
    const estadoParam = normalizeEstadoParam(req.query.estado);
    const sortParam = req.query.sort == null || req.query.sort === '' ? 'recent' : String(req.query.sort).toLowerCase().trim();
    const queryForBuild = { ...req.query, estado: estadoParam, sort: sortParam === 'oldest' ? 'oldest' : 'recent' };

    const idModuloFilter = parseModuloFilter(moduloQuery);

    // Usar utility functions para construir opciones de paginación
    const { order, where: estadoWhere, limit, offset } = buildPaginationOptions(
      queryForBuild,
      {
        defaultField: 'fecha_registro',
        maxLimit: PAGINATION.MAX_LIMIT,
        defaultLimit: PAGINATION.PACIENTES_LIMIT
      }
    );

    // Combinar condiciones
    let whereCondition = { ...estadoWhere };
    if (idModuloFilter != null) {
      whereCondition.id_modulo = idModuloFilter;
    }

    const nameSearchWhere = buildNameSearchWhere(searchQuery);
    if (nameSearchWhere) {
      whereCondition = {
        [Op.and]: [whereCondition, nameSearchWhere],
      };
    }

    // Log específico para debug del filtro "todos" - Solo en desarrollo
    if (process.env.NODE_ENV === 'development' && req.query.estado === 'todos') {
      logger.debug('🔍 Backend pacientes filtro todos', {
        estado: req.query.estado,
        sort: req.query.sort,
        query: req.query,
        order,
        whereCondition
      });
    }
    
    // Inicializar opciones de inclusión
    let includeOptions = [];
    
    // Configurar inclusión de Doctor según el rol
    if (req.user.rol === 'Doctor') {
      // Buscar el doctor por id_usuario
      const doctor = await Doctor.findOne({ where: { id_usuario: req.user.id } });
      if (!doctor) {
        return res.status(403).json({ error: 'Doctor no encontrado' });
      }
      
      // Incluir solo pacientes asignados a este doctor (INNER JOIN)
      includeOptions.push({
        model: Doctor,
        through: { model: DoctorPaciente },
        where: { id_doctor: doctor.id_doctor },
        required: true,
        attributes: ['nombre', 'apellido_paterno', 'apellido_materno']
      });
    } else {
      // Para Admin: incluir todos los doctores asignados (LEFT JOIN)
      includeOptions.push({
        model: Doctor,
        through: { model: DoctorPaciente },
        required: false, // LEFT JOIN para incluir pacientes sin doctor
        attributes: ['nombre', 'apellido_paterno', 'apellido_materno']
      });
    }
    
    // Log específico para debug del filtro de comorbilidades - Solo en desarrollo
    if (process.env.NODE_ENV === 'development' && comorbilidad && comorbilidad !== 'todas') {
      logger.debug('🔍 Backend pacientes filtro comorbilidad', {
        comorbilidad,
        queryParams: req.query,
        includeOptionsCount: includeOptions.length
      });
    }
    
    // Configurar inclusión de comorbilidades (filtro por id_comorbilidad)
    const idComorbilidadFilter = parseComorbilidadFilter(comorbilidad);
    if (idComorbilidadFilter != null) {
      includeOptions.push({
        model: Comorbilidad,
        as: 'Comorbilidades',
        through: { model: PacienteComorbilidad },
        where: { id_comorbilidad: idComorbilidadFilter },
        required: true,
        attributes: ['id_comorbilidad', 'nombre_comorbilidad']
      });
    } else {
      // Incluir todas las comorbilidades para todos los usuarios
        includeOptions.push({
          model: Comorbilidad,
          as: 'Comorbilidades', // ✅ Usar alias explícito
          through: { model: PacienteComorbilidad },
          required: false, // LEFT JOIN para incluir pacientes sin comorbilidades
          attributes: ['id_comorbilidad', 'nombre_comorbilidad']
        });
    }
    
    let pacientes;
    try {
      // Determinar si se está filtrando por comorbilidad (requiere subQuery: false para que el INNER JOIN funcione correctamente con paginación)
      const isFilteringByComorbilidad = idComorbilidadFilter != null;
      
      // Separar la consulta de conteo y de datos para evitar problemas con MySQL only_full_group_by
      // Primero, obtener el conteo total de pacientes únicos
      let totalCount;
      
      if (isFilteringByComorbilidad) {
        // Si hay filtro de comorbilidad, contar pacientes con esa comorbilidad
        const countInclude = includeOptions.map(opt => ({
          ...opt,
          attributes: [] // No necesitamos atributos para el conteo
        }));
        
        totalCount = await Paciente.count({
          where: whereCondition,
          include: countInclude,
          distinct: true,
          col: 'id_paciente'
        });
      } else {
        // Sin filtro de comorbilidad, conteo simple
        totalCount = await Paciente.count({
          where: whereCondition
        });
      }
      
      // Luego, obtener los datos paginados
      const rows = await Paciente.findAll({
        limit: Math.min(limit, 100),
        offset,
        attributes: { exclude: ['created_at', 'updated_at'] },
        where: whereCondition,
        include: includeOptions,
        order: order,
        raw: false,
        subQuery: !isFilteringByComorbilidad
      });
      
      pacientes = {
        count: totalCount,
        rows: rows
      };
      
      logger.debug('Pacientes obtenidos de BD', {
        count: pacientes.count,
        rowsCount: pacientes.rows.length,
        firstPacienteSample: pacientes.rows.length > 0 ? {
          id_paciente: pacientes.rows[0].id_paciente,
          hasFechaNacimiento: !!pacientes.rows[0].fecha_nacimiento,
          fechaNacimientoType: typeof pacientes.rows[0].fecha_nacimiento,
          hasCurp: !!pacientes.rows[0].curp,
          curpType: typeof pacientes.rows[0].curp
        } : null
      });
    } catch (queryError) {
      logger.error('Error en consulta de pacientes', {
        error: queryError.message,
        stack: queryError.stack,
        name: queryError.name,
        originalError: queryError.original?.message || queryError.original,
        sql: queryError.sql || queryError.original?.sql
      });
      throw queryError;
    }
    
    // Procesar datos para agregar campos calculados
    const pacientesConDoctor = pacientes.rows.map(paciente => {
      try {
        // Convertir a JSON para asegurar que los hooks se hayan aplicado
        const pacienteData = paciente.toJSON ? paciente.toJSON() : paciente;
        
        // Calcular nombre completo del paciente
        const nombreCompleto = [
          pacienteData.nombre || '',
          pacienteData.apellido_paterno || '',
          pacienteData.apellido_materno || ''
        ].filter(Boolean).join(' ').trim() || 'Sin nombre';
        
        // Calcular nombre del doctor asignado
        let doctorNombre = 'Sin doctor asignado';
        if (pacienteData.Doctors && Array.isArray(pacienteData.Doctors) && pacienteData.Doctors.length > 0) {
          const doctor = pacienteData.Doctors[0];
          doctorNombre = [
            doctor.nombre || '',
            doctor.apellido_paterno || '',
            doctor.apellido_materno || ''
          ].filter(Boolean).join(' ').trim() || 'Sin nombre';
        }
        
        // Calcular edad de forma segura
        let edad = null;
        try {
          if (pacienteData.fecha_nacimiento) {
            // Los hooks de Sequelize ya desencriptaron fecha_nacimiento si estaba encriptado
            const fechaNacimiento = new Date(pacienteData.fecha_nacimiento);
            if (!isNaN(fechaNacimiento.getTime())) {
              const hoy = new Date();
              edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
              // Ajustar si aún no ha cumplido años este año
              const mesCumple = fechaNacimiento.getMonth();
              const diaCumple = fechaNacimiento.getDate();
              if (hoy.getMonth() < mesCumple || (hoy.getMonth() === mesCumple && hoy.getDate() < diaCumple)) {
                edad--;
              }
            }
          }
        } catch (edadError) {
          logger.warn('Error calculando edad del paciente', {
            pacienteId: pacienteData.id_paciente,
            fechaNacimiento: pacienteData.fecha_nacimiento,
            error: edadError.message
          });
          edad = null;
        }
        
        // Procesar comorbilidades
        let comorbilidades = [];
        if (pacienteData.Comorbilidades && Array.isArray(pacienteData.Comorbilidades) && pacienteData.Comorbilidades.length > 0) {
          comorbilidades = pacienteData.Comorbilidades.map(com => ({
            id: com.id_comorbilidad,
            nombre: com.nombre_comorbilidad || 'Sin nombre'
          })).filter(com => com.id); // Filtrar comorbilidades inválidas
        }
        
        return {
          ...pacienteData,
          nombre_completo: nombreCompleto,
          doctor_nombre: doctorNombre,
          edad: edad,
          comorbilidades: comorbilidades
        };
      } catch (mapError) {
        logger.error('Error mapeando paciente individual', {
          error: mapError.message,
          pacienteId: paciente?.id_paciente || paciente?.id || 'unknown',
          stack: mapError.stack
        });
        // Retornar objeto mínimo si falla el mapeo
        return {
          id_paciente: paciente?.id_paciente || paciente?.id || null,
          nombre: 'Error cargando datos',
          nombre_completo: 'Error cargando datos',
          doctor_nombre: 'Error cargando datos',
          edad: null,
          comorbilidades: [],
          activo: false
        };
      }
    });
    
    // Log específico para debug del filtro "todos" - Solo en desarrollo
    if (process.env.NODE_ENV === 'development' && req.query.estado === 'todos') {
      const activos = pacientesConDoctor.filter(p => p.activo === true).length;
      const inactivos = pacientesConDoctor.filter(p => p.activo === false).length;
      
      logger.debug('🔍 Backend pacientes resultado filtro todos', {
        total: pacientes.count,
        procesados: pacientesConDoctor.length,
        activos,
        inactivos,
        whereCondition,
        order,
        primeros5: pacientesConDoctor.slice(0, 5).map(p => ({
          nombre: p.nombre_completo,
          activo: p.activo,
          fecha: p.fecha_registro
        }))
      });
    }
    
    // Log específico para debug del filtro de comorbilidades - Solo en desarrollo
    if (process.env.NODE_ENV === 'development' && comorbilidad && comorbilidad !== 'todas') {
      logger.debug('🔍 Backend pacientes resultado filtro comorbilidad', {
        comorbilidad,
        total: pacientes.count,
        procesados: pacientesConDoctor.length,
        primeros3: pacientesConDoctor.slice(0, 3).map(p => ({
          nombre: p.nombre_completo,
          comorbilidades: p.comorbilidades.map(c => c.nombre).join(', ') || 'Ninguna'
        }))
      });
    }
    
    return sendSuccess(res, {
      pacientes: pacientesConDoctor,
      total: pacientes.count,
      limit,
      offset
    });
  } catch (error) {
    logger.error('Error en getPacientes', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      originalError: error.original?.message || error.original,
      sql: error.sql || error.original?.sql,
      query: req.query,
      user: req.user?.rol
    });
    return sendServerError(res, error);
  }
};

export const getPacienteById = async (req, res) => {
  try {
    // Admin y Doctor pueden ver ficha aunque el paciente esté inactivo (baja GAM).
    // El rol Paciente solo ve su expediente si sigue activo en el programa.
    let whereCondition = { id_paciente: req.params.id };
    if (req.user.rol === 'Paciente') {
      whereCondition.activo = true;
    }
    let includeOptions = [];
    
    // Configurar inclusión de Doctor según el rol
    if (req.user.rol === 'Doctor') {
      const doctor = await Doctor.findOne({ where: { id_usuario: req.user.id } });
      if (!doctor) {
        return res.status(403).json({ error: 'Doctor no encontrado' });
      }
      
      includeOptions.push({
        model: Doctor,
        through: { model: DoctorPaciente },
        where: { id_doctor: doctor.id_doctor },
        required: true,
        attributes: ['id_doctor', 'nombre', 'apellido_paterno', 'apellido_materno']
      });
    } else {
      // Admin y Paciente: todos los médicos asignados (paciente ve el suyo o la lista completa)
      includeOptions.push({
        model: Doctor,
        through: { model: DoctorPaciente },
        required: false,
        attributes: ['id_doctor', 'nombre', 'apellido_paterno', 'apellido_materno']
      });
    }
    
    const paciente = await Paciente.findOne({
      where: whereCondition,
      include: [
        ...includeOptions,
        {
          model: Usuario,
          attributes: ['email', 'rol', 'activo']
        },
        {
          model: Comorbilidad,
          as: 'Comorbilidades', // ✅ Usar alias explícito definido en associations.js
          through: { 
            attributes: ['fecha_deteccion', 'observaciones'] // ✅ Incluir datos de la tabla intermedia
          },
          attributes: ['id_comorbilidad', 'nombre_comorbilidad', 'descripcion'],
          required: false // LEFT JOIN para incluir pacientes sin comorbilidades
        }
      ]
    });
    
    if (!paciente) {
      return res.status(404).json({ error: 'Paciente no encontrado o no autorizado' });
    }
    
    // ✅ Usar mapper centralizado para normalizar datos
    const pacienteData = paciente.toJSON();
    const pacienteNormalizado = normalizePaciente(pacienteData, {
      includeComorbilidades: true,
      includeDoctor: true
    });
    
    if (!pacienteNormalizado) {
      logger.error('Error normalizando datos del paciente', { pacienteId: req.params.id });
      return res.status(500).json({ error: 'Error procesando datos del paciente' });
    }
    
    logger.info('Paciente obtenido y normalizado exitosamente', {
      pacienteId: pacienteNormalizado.id_paciente,
      comorbilidadesCount: pacienteNormalizado.comorbilidades?.length || 0
    });

    const rolAcceso = String(req.user?.rol || '').toLowerCase();
    if (rolAcceso === 'doctor' || rolAcceso === 'admin') {
      void logDataAccess({
        id_usuario: req.user.id_usuario,
        rol: req.user.rol,
        accion: 'READ_PACIENTE_FICHA',
        recurso_tipo: 'paciente',
        id_recurso: pacienteNormalizado.id_paciente,
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
      });
    }

    res.json(pacienteNormalizado);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createPaciente = async (req, res) => {
  try {
    // Log detallado de lo que recibimos
    logger.info('PacienteController: Datos recibidos', {
      body: req.body,
      tipos: {
        id_usuario: typeof req.body?.id_usuario,
        id_modulo: typeof req.body?.id_modulo,
        fecha_nacimiento: typeof req.body?.fecha_nacimiento,
        activo: typeof req.body?.activo
      }
    });

    // Validar campos requeridos
    if (!req.body.nombre || !req.body.apellido_paterno || !req.body.fecha_nacimiento) {
      return res.status(400).json({
        success: false,
        error: 'Los campos nombre, apellido_paterno y fecha_nacimiento son requeridos'
      });
    }

    // Convertir y validar tipos de datos
    const fechaNac = new Date(req.body.fecha_nacimiento);
    if (isNaN(fechaNac.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'fecha_nacimiento debe ser una fecha válida'
      });
    }

    let numeroExpediente = null;
    try {
      numeroExpediente = normalizeNumeroExpediente(req.body.numero_expediente);
    } catch (validationError) {
      return res.status(400).json({
        success: false,
        error: validationError.message
      });
    }

    if (numeroExpediente) {
      const existing = await Paciente.findOne({ where: { numero_expediente: numeroExpediente } });
      if (existing) {
        return res.status(400).json({
          success: false,
          error: 'Ya existe un paciente con este número de expediente'
        });
      }
    }

    const pacienteData = {
      id_usuario: req.body.id_usuario ? parseInt(req.body.id_usuario, 10) : null,
      nombre: String(req.body.nombre).trim(),
      apellido_paterno: String(req.body.apellido_paterno).trim(),
      apellido_materno: req.body.apellido_materno ? String(req.body.apellido_materno).trim() : null,
      fecha_nacimiento: fechaNac.toISOString().slice(0, 10),
      curp: req.body.curp ? String(req.body.curp).trim().toUpperCase() : null,
      institucion_salud: req.body.institucion_salud ? String(req.body.institucion_salud).trim() : null,
      sexo: req.body.sexo ? String(req.body.sexo).trim() : null,
      direccion: req.body.direccion ? String(req.body.direccion).trim() : null,
      estado: req.body.estado ? String(req.body.estado).trim() : null,
      localidad: req.body.localidad ? String(req.body.localidad).trim() : null,
      numero_celular: req.body.numero_celular ? String(req.body.numero_celular).trim() : null,
      numero_expediente: numeroExpediente,
      id_modulo: req.body.id_modulo ? parseInt(req.body.id_modulo, 10) : null,
      fecha_registro: new Date(),
      activo: req.body.activo !== undefined ? Boolean(req.body.activo) : true
    };

    // Validar que id_usuario sea válido si se proporciona
    if (pacienteData.id_usuario !== null && (isNaN(pacienteData.id_usuario) || pacienteData.id_usuario <= 0)) {
      return res.status(400).json({
        success: false,
        error: 'id_usuario debe ser un número válido'
      });
    }

    // Validar que id_modulo sea válido si se proporciona
    if (pacienteData.id_modulo !== null && (isNaN(pacienteData.id_modulo) || pacienteData.id_modulo <= 0)) {
      return res.status(400).json({
        success: false,
        error: 'id_modulo debe ser un número válido'
      });
    }

    // Validar institución de salud contra catálogo dinámico (si se proporciona)
    if (pacienteData.institucion_salud) {
      const { InstitucionSalud } = await import('../models/associations.js');
      const instituciones = await InstitucionSalud.findAll({ where: { activo: true }, attributes: ['nombre'] });
      const nombresValidos = instituciones.map(i => i.nombre);
      if (nombresValidos.length > 0 && !nombresValidos.includes(pacienteData.institucion_salud)) {
        return res.status(400).json({
          success: false,
          error: `La institución de salud debe ser una del catálogo. Valores válidos: ${nombresValidos.join(', ')}`
        });
      }
    }

    logger.info('PacienteController: Creando nuevo paciente', { 
      nombre: pacienteData.nombre,
      apellido_paterno: pacienteData.apellido_paterno,
      id_modulo: pacienteData.id_modulo 
    });
    
    const paciente = await Paciente.create(pacienteData);
    if (!paciente.numero_expediente) {
      paciente.numero_expediente = `EXP-${paciente.id_paciente}`;
      await paciente.save();
    }
    
    logger.info('PacienteController: Paciente creado exitosamente', { 
      id_paciente: paciente.id_paciente,
      id_usuario: paciente.id_usuario 
    });

    setImmediate(() => {
      const creatorEmail = req.user?.email;
      const pacienteNombre = [paciente.nombre, paciente.apellido_paterno, paciente.apellido_materno].filter(Boolean).join(' ').trim() || 'Paciente';
      if (creatorEmail && creatorEmail.includes('@')) {
        emailService.sendPatientRegisteredNotification(creatorEmail, { pacienteNombre, id_paciente: paciente.id_paciente }).catch(() => {});
      }
      const extraEmails = (process.env.NOTIFY_NEW_PATIENT_EMAILS || '').split(',').map(e => e.trim()).filter(e => e.includes('@'));
      for (const to of extraEmails) {
        emailService.sendPatientRegisteredNotification(to, { pacienteNombre, id_paciente: paciente.id_paciente }).catch(() => {});
      }
    });
    
    // No devolver campos sensibles
    const { password_hash, ...safeData } = paciente.toJSON();
    
    res.status(201).json({
      message: 'Paciente creado exitosamente',
      data: safeData
    });
  } catch (error) {
    // Log detallado del error
    logger.error('PacienteController: Error creando paciente', { 
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
        error: 'Ya existe un paciente con este CURP, id_usuario o número de expediente'
      });
    }

    if (error.name === 'SequelizeDatabaseError' || error.original?.code) {
      return res.status(500).json({
        success: false,
        error: 'Error en la base de datos',
        message: process.env.NODE_ENV === 'development' ? (error.original?.sqlMessage || error.message) : 'Error interno del servidor'
      });
    }

    throw error;
  }
};

// Crear paciente completo con usuario y PIN
export const createPacienteCompleto = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Log del body recibido (sin datos sensibles completos)
    logger.info('createPacienteCompleto: Body recibido', {
      bodyKeys: Object.keys(req.body),
      hasNombre: !!req.body.nombre,
      hasApellidoPaterno: !!req.body.apellido_paterno,
      hasFechaNacimiento: !!req.body.fecha_nacimiento,
      hasCurp: !!req.body.curp,
      hasInstitucionSalud: !!req.body.institucion_salud,
      hasSexo: !!req.body.sexo,
      hasDireccion: !!req.body.direccion,
      hasEstado: !!req.body.estado,
      hasLocalidad: !!req.body.localidad,
      hasNumeroCelular: !!req.body.numero_celular,
      hasIdModulo: !!req.body.id_modulo,
      idModuloType: typeof req.body.id_modulo,
      idModuloValue: req.body.id_modulo
    });
    
    const {
      // Datos del paciente
      nombre,
      apellido_paterno,
      apellido_materno,
      fecha_nacimiento,
      curp,
      institucion_salud,
      sexo,
      direccion,
      estado,
      localidad,
      numero_celular,
      numero_expediente,
      id_modulo,
      activo = true,
      
      // Datos de autenticación
      pin,
      device_id
    } = req.body;

    // VALIDACIÓN DE CAMPOS REQUERIDOS
    // Nota: Los campos sensibles (curp, numero_celular, direccion, fecha_nacimiento) 
    // pueden estar encriptados por autoEncryptRequest, pero aún así deben existir
    // La validación verifica que existan y no estén vacíos (incluso si están encriptados)
    // 
    // Campos requeridos según modelo Paciente:
    // - nombre: allowNull: false
    // - apellido_paterno: allowNull: false
    // - fecha_nacimiento: allowNull: false
    // - estado: allowNull: false
    // - id_modulo: puede ser null pero validamos que si se envía sea válido
    //
    // Campos opcionales según modelo:
    // - numero_celular: allowNull: true (OPCIONAL)
    // - curp: allowNull: true (pero validamos formato si se envía)
    // - direccion: allowNull: true (pero validamos si se envía)
    // - localidad: allowNull: true
    // - institucion_salud: allowNull: true (pero validamos enum si se envía)
    // - sexo: allowNull: true (pero validamos enum si se envía)
    
    // Normalizar undefined a null para manejar campos que no se envían
    // NOTA: Para campos requeridos como 'estado', normalizamos strings vacíos a null
    // para que la validación isEmpty los detecte correctamente
    const normalizedFields = {
      nombre: nombre !== undefined ? (typeof nombre === 'string' ? nombre.trim() : nombre) : null,
      apellido_paterno: apellido_paterno !== undefined ? (typeof apellido_paterno === 'string' ? apellido_paterno.trim() : apellido_paterno) : null,
      fecha_nacimiento: fecha_nacimiento !== undefined ? fecha_nacimiento : null,
      curp: curp !== undefined ? (typeof curp === 'string' ? curp.trim() : curp) : null,
      institucion_salud: institucion_salud !== undefined ? institucion_salud : null,
      sexo: sexo !== undefined ? sexo : null,
      direccion: direccion !== undefined ? (typeof direccion === 'string' ? direccion.trim() : direccion) : null,
      estado: estado !== undefined ? (typeof estado === 'string' ? estado.trim() : estado) : null, // REQUERIDO según modelo - normalizar string vacío
      localidad: localidad !== undefined ? (typeof localidad === 'string' ? localidad.trim() : localidad) : null,
      numero_celular: numero_celular !== undefined ? (typeof numero_celular === 'string' ? numero_celular.trim() : numero_celular) : null, // OPCIONAL según modelo
      numero_expediente: numero_expediente !== undefined ? (typeof numero_expediente === 'string' ? numero_expediente.trim() : numero_expediente) : null,
      id_modulo: id_modulo !== undefined ? id_modulo : null
    };
    
    // Si estado es string vacío después de trim, convertirlo a null para que isEmpty lo detecte
    if (normalizedFields.estado === '') {
      normalizedFields.estado = null;
    }
    
    // Solo validar campos realmente requeridos según el modelo
    const requiredFields = {
      nombre: normalizedFields.nombre,
      apellido_paterno: normalizedFields.apellido_paterno,
      fecha_nacimiento: normalizedFields.fecha_nacimiento,
      estado: normalizedFields.estado, // REQUERIDO según modelo
      id_modulo: normalizedFields.id_modulo // Validamos que si se envía sea válido
    };

    // Función helper para verificar si un campo está vacío
    // Maneja tanto valores normales como valores encriptados (strings JSON)
    // NOTA: autoEncryptRequest puede haber encriptado algunos campos antes de llegar aquí
    const isEmpty = (value, fieldName) => {
      if (value === null || value === undefined) return true;
      
      // Para id_modulo, manejar como número especial
      if (fieldName === 'id_modulo') {
        if (typeof value === 'number') {
          return isNaN(value) || value <= 0;
        }
        if (typeof value === 'string') {
          const num = parseInt(value, 10);
          return isNaN(num) || num <= 0;
        }
        return true;
      }
      
      if (typeof value === 'string') {
        // Si es un string, verificar si está vacío o solo tiene espacios
        const trimmed = value.trim();
        if (trimmed.length === 0) return true;
        
        // Si parece estar encriptado (formato JSON), aún es válido (tiene contenido)
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed === 'object') {
            // Es un objeto JSON (probablemente encriptado), verificar que tenga propiedades válidas
            // Si tiene encrypted, iv, authTag, es un valor encriptado válido
            if (parsed.encrypted && parsed.iv && parsed.authTag) {
              return false; // Valor encriptado válido, no está vacío
            }
            // Si es otro tipo de objeto, verificar que tenga propiedades
            return Object.keys(parsed).length === 0;
          }
        } catch (e) {
          // No es JSON, es un string normal - verificar si está vacío
          return trimmed.length === 0;
        }
      }
      
      if (typeof value === 'number') {
        // Para números, verificar si es NaN
        return isNaN(value);
      }
      
      return false;
    };

    // Usar solo campos requeridos para la validación (no todos los campos normalizados)
    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => isEmpty(value, key))
      .map(([key]) => key);

    if (missingFields.length > 0) {
      await transaction.rollback();
      logger.warn('Campos requeridos faltantes al crear paciente', { 
        missingFields,
        receivedFields: Object.keys(requiredFields),
        fieldTypes: Object.entries(requiredFields).reduce((acc, [key, value]) => {
          acc[key] = {
            type: typeof value,
            isNull: value === null,
            isUndefined: value === undefined,
            length: typeof value === 'string' ? value.length : 'N/A',
            value: typeof value === 'string' && value.length > 0 ? value.substring(0, 20) + '...' : value
          };
          return acc;
        }, {})
      });
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos',
        missing_fields: missingFields
      });
    }

    // VALIDACIÓN DE FORMATOS
    // NOTA: Los campos curp y fecha_nacimiento pueden estar encriptados por autoEncryptRequest
    // Si están encriptados, no podemos validar su formato aquí, pero los hooks de Sequelize
    // los desencriptarán antes de guardarlos en la BD
    
    // Helper para verificar si un campo está encriptado
    const isEncrypted = (value) => {
      if (typeof value !== 'string') return false;
      try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' && parsed.encrypted && parsed.iv && parsed.authTag;
      } catch (e) {
        return false;
      }
    };
    
    // Validar CURP (solo si se proporciona y no está encriptado)
    if (normalizedFields.curp) {
      const curpIsEncrypted = isEncrypted(normalizedFields.curp);
      if (!curpIsEncrypted) {
        if (!/^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9]{2}$/.test(normalizedFields.curp.toUpperCase())) {
          await transaction.rollback();
          logger.warn('CURP con formato inválido', { curp: normalizedFields.curp.substring(0, 10) + '...' });
          return res.status(400).json({
            success: false,
            error: 'El formato del CURP no es válido'
          });
        }
      } else {
        logger.debug('CURP está encriptado, omitiendo validación de formato');
      }
    }

    // Validar fecha de nacimiento (requerida, pero puede estar encriptada)
    const fechaNacIsEncrypted = isEncrypted(normalizedFields.fecha_nacimiento);
    if (!fechaNacIsEncrypted) {
      const fechaNac = new Date(normalizedFields.fecha_nacimiento);
      if (isNaN(fechaNac.getTime()) || fechaNac > new Date()) {
        await transaction.rollback();
        logger.warn('Fecha de nacimiento inválida', { fecha_nacimiento: normalizedFields.fecha_nacimiento });
        return res.status(400).json({
          success: false,
          error: 'La fecha de nacimiento no es válida'
        });
      }
    } else {
      logger.debug('Fecha de nacimiento está encriptada, omitiendo validación de formato');
    }

    // Validar sexo contra ENUM (solo si se proporciona)
    if (normalizedFields.sexo) {
      const sexosValidos = ['Hombre', 'Mujer'];
      if (!sexosValidos.includes(normalizedFields.sexo)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: `El sexo debe ser uno de: ${sexosValidos.join(', ')}`
        });
      }
    }

    // Validar institución de salud contra catálogo dinámico (solo si se proporciona)
    if (normalizedFields.institucion_salud) {
      const { InstitucionSalud } = await import('../models/associations.js');
      const instituciones = await InstitucionSalud.findAll({
        where: { activo: true },
        attributes: ['nombre']
      });
      const nombresValidos = instituciones.map(i => i.nombre);
      if (nombresValidos.length > 0 && !nombresValidos.includes(normalizedFields.institucion_salud)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: `La institución de salud debe ser una del catálogo. Valores válidos: ${nombresValidos.join(', ')}`
        });
      }
    }

    // Validar id_modulo (puede venir como string o número)
    // NOTA: id_modulo NO se encripta, solo los campos sensibles (curp, numero_celular, direccion, fecha_nacimiento)
    let idModuloNum = id_modulo;
    if (typeof id_modulo === 'string') {
      // Intentar parsear si es string numérico
      idModuloNum = parseInt(id_modulo, 10);
    }
    
    if (!Number.isInteger(idModuloNum) || idModuloNum <= 0 || isNaN(idModuloNum)) {
      await transaction.rollback();
      logger.warn('id_modulo inválido', { 
        id_modulo, 
        type: typeof id_modulo, 
        parsed: idModuloNum,
        isNaN: isNaN(idModuloNum)
      });
      return res.status(400).json({
        success: false,
        error: 'El módulo debe ser un número válido',
        received: id_modulo,
        type: typeof id_modulo
      });
    }
    
    // Usar el valor numérico validado
    const idModuloValidado = idModuloNum;

    // Validar número de expediente (opcional) y unicidad si se envía
    let numeroExpedienteNormalizado = null;
    try {
      numeroExpedienteNormalizado = normalizeNumeroExpediente(normalizedFields.numero_expediente);
    } catch (validationError) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: validationError.message
      });
    }
    if (numeroExpedienteNormalizado) {
      const existing = await Paciente.findOne({
        where: { numero_expediente: numeroExpedienteNormalizado },
        transaction
      });
      if (existing) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'Ya existe un paciente con este número de expediente'
        });
      }
    }

    // 1. Crear usuario base para el paciente
    const email = `paciente_${Date.now()}@temp.com`; // Email temporal
    const password = Math.random().toString(36).slice(-8); // Password temporal
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const usuario = await Usuario.create({
      email,
      password_hash: hashedPassword,
      rol: 'Paciente',
      activo: true
    }, { transaction });

    // 2. Crear perfil de paciente
    // Usar los campos normalizados y el id_modulo validado
    const paciente = await Paciente.create({
      id_usuario: usuario.id_usuario,
      nombre: normalizedFields.nombre,
      apellido_paterno: normalizedFields.apellido_paterno,
      apellido_materno: normalizedFields.apellido_materno || null,
      fecha_nacimiento: normalizedFields.fecha_nacimiento,
      curp: normalizedFields.curp || null,
      institucion_salud: normalizedFields.institucion_salud || null,
      sexo: normalizedFields.sexo || null,
      direccion: normalizedFields.direccion || null,
      estado: normalizedFields.estado, // REQUERIDO
      localidad: normalizedFields.localidad || null,
      numero_celular: normalizedFields.numero_celular || null, // OPCIONAL
      numero_expediente: numeroExpedienteNormalizado,
      id_modulo: idModuloValidado,
      activo,
      fecha_registro: new Date()
    }, { transaction });

    if (!paciente.numero_expediente) {
      const generatedNumeroExpediente = `EXP-${paciente.id_paciente}`;
      await paciente.update({ numero_expediente: generatedNumeroExpediente }, { transaction });
    }

    // 3. Crear autenticación PIN (si se proporciona) - Usando sistema unificado
    if (pin && device_id) {
      // Importar servicio unificado
      const UnifiedAuthService = await import('../services/unifiedAuthService.js').then(m => m.default);
      
      // Validar formato de PIN
      if (!/^\d{4}$/.test(pin)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'El PIN debe tener exactamente 4 dígitos'
        });
      }

      // Validar PINs débiles
      const weakPINs = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321'];
      if (weakPINs.includes(pin)) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          error: 'El PIN es demasiado débil. Elige un PIN más seguro'
        });
      }

      try {
        // Crear credencial PIN usando servicio unificado
        // Nota: El servicio maneja la validación de unicidad internamente
        await UnifiedAuthService.setupCredential(
          'Paciente',
          paciente.id_paciente,
          'pin',
          pin,
          {
            deviceId: device_id,
            deviceName: `${paciente.nombre} ${paciente.apellido_paterno} - Mobile`,
            deviceType: 'mobile',
            isPrimary: true
          },
          transaction // Pasar transacción para atomicidad
        );
        
        logger.info('PIN configurado exitosamente para nuevo paciente', {
          id_paciente: paciente.id_paciente,
          device_id: device_id.substring(0, 10) + '...'
        });
      } catch (authError) {
        await transaction.rollback();
        logger.error('Error configurando PIN para nuevo paciente', {
          error: authError.message,
          id_paciente: paciente.id_paciente
        });
        
        // Si el error es de PIN duplicado, retornar mensaje claro
        if (authError.message.includes('ya está en uso') || authError.message.includes('duplicado')) {
          return res.status(409).json({
            success: false,
            error: 'Este PIN ya está en uso por otro paciente. Por favor, elige un PIN diferente.'
          });
        }
        
        return res.status(400).json({
          success: false,
          error: authError.message || 'Error configurando PIN'
        });
      }
    }

    await transaction.commit();

    // Enviar evento WebSocket para actualización en tiempo real
    const pacienteData = {
      id_paciente: paciente.id_paciente,
      id_usuario: usuario.id_usuario,
      nombre: paciente.nombre,
      apellido_paterno: paciente.apellido_paterno,
      apellido_materno: paciente.apellido_materno,
      fecha_registro: paciente.fecha_registro,
      institucion_salud: paciente.institucion_salud,
      sexo: paciente.sexo,
      numero_celular: paciente.numero_celular,
      numero_expediente: paciente.numero_expediente,
      activo: paciente.activo
    };

    // Notificar a administradores sobre nuevo paciente
    realtimeService.sendToRole('Admin', 'patient_created', pacienteData);
    
    // Notificar a doctores si hay módulo asignado
    if (paciente.id_modulo) {
      realtimeService.sendToRole('Doctor', 'patient_created', pacienteData);
    }

    setImmediate(() => {
      const pacienteNombre = [paciente.nombre, paciente.apellido_paterno, paciente.apellido_materno].filter(Boolean).join(' ').trim() || 'Paciente';
      const creatorEmail = req.user?.email;
      if (creatorEmail && creatorEmail.includes('@')) {
        emailService.sendPatientRegisteredNotification(creatorEmail, { pacienteNombre, id_paciente: paciente.id_paciente }).catch(() => {});
      }
      const extraEmails = (process.env.NOTIFY_NEW_PATIENT_EMAILS || '').split(',').map(e => e.trim()).filter(e => e.includes('@'));
      for (const to of extraEmails) {
        emailService.sendPatientRegisteredNotification(to, { pacienteNombre, id_paciente: paciente.id_paciente }).catch(() => {});
      }
    });

    res.status(201).json({
      success: true,
      message: 'Paciente creado exitosamente con PIN',
      data: {
        id_paciente: paciente.id_paciente,
        id_usuario: usuario.id_usuario,
        nombre: paciente.nombre,
        apellido_paterno: paciente.apellido_paterno,
        apellido_materno: paciente.apellido_materno,
        numero_expediente: paciente.numero_expediente
      }
    });

  } catch (error) {
    await transaction.rollback();
    logger.error('Error creando paciente completo', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};

export const updatePaciente = async (req, res) => {
  try {
    const pacienteId = req.params.id;
    logger.info('updatePaciente: Iniciando actualización', { 
      pacienteId, 
      rol: req.user.rol,
      userId: req.user.id 
    });
    
    // Primero verificar que el paciente existe (sin filtro de activo para verificar)
    const pacienteExists = await Paciente.findByPk(pacienteId);
    if (!pacienteExists) {
      logger.warn('updatePaciente: Paciente no encontrado', { pacienteId });
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }
    
    // Si es Doctor, verificar que el paciente le pertenece
    if (req.user.rol === 'Doctor') {
      const doctor = await Doctor.findOne({ where: { id_usuario: req.user.id } });
      if (!doctor) {
        logger.warn('updatePaciente: Doctor no encontrado', { userId: req.user.id });
        return res.status(403).json({ error: 'Doctor no encontrado' });
      }
      
      // Verificar asignación del paciente al doctor
      const asignacion = await DoctorPaciente.findOne({
        where: {
          id_doctor: doctor.id_doctor,
          id_paciente: pacienteId
        }
      });
      
      if (!asignacion) {
        logger.warn('updatePaciente: Doctor no tiene acceso al paciente', {
          doctorId: doctor.id_doctor,
          pacienteId
        });
        return res.status(403).json({ error: 'No tienes acceso a este paciente' });
      }
    }
    
    // Paciente inactivo: Admin o Doctor asignado pueden actualizar (reactivar o datos de baja)
    const rolNorm = (req.user.rol || '').toString();
    const esAdmin = rolNorm === 'Admin' || rolNorm === 'admin';
    const esDoctor = rolNorm === 'Doctor' || rolNorm === 'doctor';
    if (!pacienteExists.activo && !esAdmin && !esDoctor) {
      logger.warn('updatePaciente: Paciente inactivo', { pacienteId });
      return res.status(404).json({ error: 'Paciente inactivo' });
    }
    
    // Preparar datos de actualización
    const updateData = { ...req.body };
    
    // Solo Admin y Doctor (paciente asignado ya verificado arriba) pueden cambiar activo / baja GAM
    if (!esAdmin && !esDoctor && 'activo' in updateData) {
      delete updateData.activo;
    }
    
    // Mapear 'telefono' a 'numero_celular' si está presente
    if ('telefono' in updateData && !('numero_celular' in updateData)) {
      updateData.numero_celular = updateData.telefono;
      delete updateData.telefono;
    }
    
    // Asegurar que 'estado' tenga un valor si está presente pero vacío
    if ('estado' in updateData && (!updateData.estado || updateData.estado.trim() === '')) {
      // Si el estado está vacío, mantener el valor actual
      delete updateData.estado;
    }

    // Validar fecha_baja si se proporciona
    if ('fecha_baja' in updateData) {
      if (updateData.fecha_baja === null || updateData.fecha_baja === '') {
        updateData.fecha_baja = null;
      } else {
        const fechaBaja = new Date(updateData.fecha_baja);
        if (isNaN(fechaBaja.getTime())) {
          return res.status(400).json({
            error: 'fecha_baja debe ser una fecha válida'
          });
        }
        // Validar que fecha_baja >= fecha_registro
        if (pacienteExists.fecha_registro && fechaBaja < new Date(pacienteExists.fecha_registro)) {
          return res.status(400).json({
            error: 'Fecha de baja no puede ser anterior a fecha de registro'
          });
        }
        // Si se establece fecha_baja, también establecer activo = false
        if (updateData.activo === undefined) {
          updateData.activo = false;
        }
      }
    }

    // Validar numero_gam si se proporciona
    if ('numero_gam' in updateData) {
      if (updateData.numero_gam === null || updateData.numero_gam === '') {
        updateData.numero_gam = null;
      } else {
        const numeroGam = parseInt(updateData.numero_gam, 10);
        if (isNaN(numeroGam) || numeroGam < 1) {
          return res.status(400).json({
            error: 'numero_gam debe ser un número entero mayor a 0'
          });
        }
        // Verificar unicidad por módulo
        const pacienteConMismoNumero = await Paciente.findOne({
          where: {
            id_modulo: pacienteExists.id_modulo || updateData.id_modulo || null,
            numero_gam: numeroGam,
            id_paciente: { [Op.ne]: pacienteId }
          }
        });
        if (pacienteConMismoNumero) {
          return res.status(400).json({
            error: 'Ya existe otro paciente con el mismo número GAM en este módulo'
          });
        }
        updateData.numero_gam = numeroGam;
      }
    }

    // Validar institución de salud contra catálogo dinámico (si se actualiza)
    if (updateData.institucion_salud !== undefined) {
      const valor = updateData.institucion_salud === null || updateData.institucion_salud === '' ? null : String(updateData.institucion_salud).trim();
      updateData.institucion_salud = valor || null;
      if (valor) {
        const { InstitucionSalud } = await import('../models/associations.js');
        const instituciones = await InstitucionSalud.findAll({ where: { activo: true }, attributes: ['nombre'] });
        const nombresValidos = instituciones.map(i => i.nombre);
        if (nombresValidos.length > 0 && !nombresValidos.includes(valor)) {
          return res.status(400).json({
            success: false,
            error: `La institución de salud debe ser una del catálogo. Valores válidos: ${nombresValidos.join(', ')}`
          });
        }
      }
    }

    // Sincronizar activo con fecha_baja
    if ('activo' in updateData && updateData.activo === false && !updateData.fecha_baja) {
      // Si se desactiva sin fecha_baja, establecer fecha actual
      updateData.fecha_baja = new Date().toISOString().split('T')[0];
    } else if ('activo' in updateData && updateData.activo === true) {
      // Reactivación: siempre limpiar baja en GAM
      updateData.fecha_baja = null;
      updateData.motivo_baja = null;
    }

    // Validar número de expediente (opcional) y unicidad global
    if ('numero_expediente' in updateData) {
      try {
        const numeroExpedienteNormalizado = normalizeNumeroExpediente(updateData.numero_expediente);
        updateData.numero_expediente = numeroExpedienteNormalizado;
        if (numeroExpedienteNormalizado) {
          const existing = await Paciente.findOne({
            where: {
              numero_expediente: numeroExpedienteNormalizado,
              id_paciente: { [Op.ne]: pacienteId }
            }
          });
          if (existing) {
            return res.status(400).json({
              error: 'Ya existe otro paciente con este número de expediente'
            });
          }
        }
      } catch (validationError) {
        return res.status(400).json({
          error: validationError.message
        });
      }
    }
    
    // Verificar si hay datos para actualizar
    if (Object.keys(updateData).length === 0) {
      logger.info('updatePaciente: No hay cambios para actualizar', { pacienteId });
      // Si no hay cambios, devolver el paciente actual
      const pacienteActual = await Paciente.findByPk(pacienteId, {
        attributes: { exclude: ['password_hash'] }
      });
      return res.json({
        message: 'Paciente actualizado exitosamente (sin cambios)',
        data: pacienteActual
      });
    }
    
    logger.info('updatePaciente: Datos a actualizar', { 
      pacienteId, 
      campos: Object.keys(updateData),
      tieneEstado: 'estado' in updateData,
      updateData: updateData
    });
    
    // Actualizar solo campos permitidos
    try {
      const [updatedRows] = await Paciente.update(updateData, {
        where: { id_paciente: pacienteId }
      });
      
      logger.info('updatePaciente: Resultado de actualización', { 
        pacienteId, 
        filasActualizadas: updatedRows,
        camposActualizados: Object.keys(updateData)
      });

      // ✅ Sincronizar baja de paciente si se actualizó activo o fecha_baja
      if (updatedRows > 0 && ('activo' in updateData || 'fecha_baja' in updateData || 'motivo_baja' in updateData)) {
        try {
          const { sincronizarBajaPaciente } = await import('../services/sincronizar-baja-paciente.js');
          await sincronizarBajaPaciente(
            pacienteId,
            updateData.fecha_baja || undefined,
            updateData.motivo_baja || undefined
          );
          logger.info('Baja de paciente sincronizada después de actualizar', { pacienteId });
        } catch (syncError) {
          logger.warn('Error sincronizando baja de paciente (no crítico):', syncError);
          // No fallar la operación si la sincronización falla
        }
      }
      
      if (updatedRows === 0) {
        // Verificar si los datos son iguales a los actuales
        const pacienteActual = await Paciente.findByPk(pacienteId);
        const hayCambios = Object.keys(updateData).some(key => {
          const valorActual = pacienteActual[key];
          const valorNuevo = updateData[key];
          // Comparar valores, manejando null/undefined
          if (valorActual === null || valorActual === undefined) {
            return valorNuevo !== null && valorNuevo !== undefined;
          }
          return String(valorActual) !== String(valorNuevo);
        });
        
        if (!hayCambios) {
          logger.info('updatePaciente: No hay cambios reales, datos ya actualizados', { pacienteId });
          return res.json({
            message: 'Paciente actualizado exitosamente (sin cambios)',
            data: pacienteActual
          });
        }
        
        logger.warn('updatePaciente: No se actualizaron filas pero hay cambios', { 
          pacienteId,
          updateData,
          pacienteActual: pacienteActual.toJSON()
        });
        return res.status(400).json({ error: 'No se pudo actualizar el paciente. Verifique los datos enviados.' });
      }
    } catch (updateError) {
      logger.error('updatePaciente: Error en actualización de base de datos', {
        pacienteId,
        error: updateError.message,
        stack: updateError.stack,
        updateData
      });
      
      // Si es un error de validación de Sequelize
      if (updateError.name === 'SequelizeValidationError' || updateError.name === 'SequelizeDatabaseError') {
        return res.status(400).json({ 
          error: 'Error de validación al actualizar paciente',
          details: updateError.message
        });
      }
      
      throw updateError;
    }
    
    const pacienteActualizado = await Paciente.findByPk(pacienteId, {
      attributes: { exclude: ['password_hash'] }
    });
    
    res.json({
      message: 'Paciente actualizado exitosamente',
      data: pacienteActualizado
    });
  } catch (error) {
    throw error;
  }
};

// =====================================================
// ENDPOINTS DE GESTIÓN DE DOCTORES DESDE PERSPECTIVA PACIENTE
// =====================================================

/**
 * Obtener todos los doctores asignados a un paciente
 * GET /api/pacientes/:id/doctores
 */
export const getPacienteDoctores = async (req, res) => {
  try {
    const { id } = req.params;

    // Validar parámetros
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    const pacienteId = parseInt(id, 10);

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

    // Obtener todas las asignaciones de doctores para este paciente
    const asignaciones = await DoctorPaciente.findAll({
      where: { id_paciente: pacienteId },
      order: [['fecha_asignacion', 'DESC']]
    });

    // Obtener información de los doctores
    const doctoresIds = asignaciones.map(a => a.id_doctor);
    const doctoresData = await Doctor.findAll({
      where: { id_doctor: doctoresIds },
      attributes: [
        'id_doctor',
        'nombre',
        'apellido_paterno',
        'apellido_materno',
        'telefono',
        'institucion_hospitalaria',
        'grado_estudio',
        'anos_servicio',
        'activo'
      ]
    });

    // Crear un mapa de doctores por ID para acceso rápido
    const doctoresMap = new Map(doctoresData.map(d => [d.id_doctor, d]));

    // Formatear respuesta combinando asignaciones con datos de doctores
    const doctores = asignaciones.map(asignacion => {
      const doctor = doctoresMap.get(asignacion.id_doctor);
      return {
        id_doctor: asignacion.id_doctor,
        nombre_completo: doctor 
          ? `${doctor.nombre} ${doctor.apellido_paterno} ${doctor.apellido_materno || ''}`.trim()
          : 'Doctor no encontrado',
        telefono: doctor?.telefono || null,
        institucion_hospitalaria: doctor?.institucion_hospitalaria || null,
        grado_estudio: doctor?.grado_estudio || null,
        anos_servicio: doctor?.anos_servicio || null,
        activo: doctor?.activo ?? false,
        fecha_asignacion: asignacion.fecha_asignacion,
        observaciones: asignacion.observaciones
      };
    });

    logger.info('Doctores del paciente obtenidos', {
      pacienteId,
      total: doctores.length
    });

    res.json({
      success: true,
      data: doctores,
      total: doctores.length
    });

  } catch (error) {
    logger.error('Error obteniendo doctores del paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Asignar un doctor a un paciente (desde perspectiva del paciente)
 * POST /api/pacientes/:id/doctores
 */
export const assignDoctorToPaciente = async (req, res) => {
  try {
    const { id } = req.params; // id_paciente
    const { id_doctor, observaciones = '' } = req.body;

    // Validar parámetros
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    if (!id_doctor || isNaN(id_doctor)) {
      return res.status(400).json({
        success: false,
        error: 'ID de doctor inválido o requerido'
      });
    }

    const pacienteId = parseInt(id, 10);
    const doctorId = parseInt(id_doctor, 10);

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
        error: 'El doctor ya está asignado a este paciente'
      });
    }

    // Crear la asignación
    const assignment = await DoctorPaciente.create({
      id_doctor: doctorId,
      id_paciente: pacienteId,
      fecha_asignacion: new Date().toISOString().split('T')[0],
      observaciones: observaciones && observaciones.trim() ? observaciones.trim() : null
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

    logger.info('Doctor asignado al paciente exitosamente', {
      doctorId,
      pacienteId,
      doctor: doctor.nombre,
      paciente: paciente.nombre
    });

    res.status(201).json({
      success: true,
      message: 'Doctor asignado exitosamente',
      data: {
        id_doctor: doctorId,
        id_paciente: pacienteId,
        fecha_asignacion: assignment.fecha_asignacion,
        observaciones: assignment.observaciones
      }
    });

  } catch (error) {
    logger.error('Error asignando doctor al paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Desasignar un doctor de un paciente (desde perspectiva del paciente)
 * DELETE /api/pacientes/:id/doctores/:doctorId
 */
export const unassignDoctorFromPaciente = async (req, res) => {
  try {
    const { id, doctorId } = req.params; // id_paciente, id_doctor

    // Validar parámetros
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    if (!doctorId || isNaN(doctorId)) {
      return res.status(400).json({
        success: false,
        error: 'ID de doctor inválido'
      });
    }

    const pacienteId = parseInt(id, 10);
    const doctorIdInt = parseInt(doctorId, 10);

    // Verificar que existe la asignación
    const assignment = await DoctorPaciente.findOne({
      where: {
        id_doctor: doctorIdInt,
        id_paciente: pacienteId
      }
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Asignación no encontrada'
      });
    }

    // Obtener información del doctor y paciente para el evento WebSocket
    const doctor = await Doctor.findByPk(doctorIdInt, {
      attributes: ['nombre', 'apellido_paterno']
    });
    
    const paciente = await Paciente.findByPk(pacienteId, {
      attributes: ['nombre', 'apellido_paterno']
    });

    // Eliminar la asignación
    await DoctorPaciente.destroy({
      where: {
        id_doctor: doctorIdInt,
        id_paciente: pacienteId
      }
    });

    // Enviar evento WebSocket para actualización en tiempo real
    const unassignmentData = {
      id_doctor: doctorIdInt,
      id_paciente: pacienteId,
      doctor_nombre: doctor ? `${doctor.nombre} ${doctor.apellido_paterno}` : 'Doctor desconocido',
      paciente_nombre: paciente ? `${paciente.nombre} ${paciente.apellido_paterno}` : 'Paciente desconocido'
    };

    realtimeService.sendToRole('Admin', 'patient_unassigned', unassignmentData);
    realtimeService.sendToRole('Doctor', 'patient_unassigned', unassignmentData);

    logger.info('Doctor desasignado del paciente exitosamente', {
      doctorId: doctorIdInt,
      pacienteId,
      doctor: doctor ? doctor.nombre : 'Desconocido',
      paciente: paciente ? paciente.nombre : 'Desconocido'
    });

    res.json({
      success: true,
      message: 'Doctor desasignado exitosamente'
    });

  } catch (error) {
    logger.error('Error desasignando doctor del paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Reemplazar un doctor por otro en un paciente
 * PUT /api/pacientes/:id/doctores/:doctorIdAntiguo
 */
export const replacePacienteDoctor = async (req, res) => {
  try {
    const { id, doctorIdAntiguo } = req.params; // id_paciente, id_doctor_antiguo
    const { id_doctor_nuevo, observaciones = '' } = req.body;

    // Validar parámetros
    if (!id || isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'ID de paciente inválido'
      });
    }

    if (!doctorIdAntiguo || isNaN(doctorIdAntiguo)) {
      return res.status(400).json({
        success: false,
        error: 'ID de doctor antiguo inválido'
      });
    }

    if (!id_doctor_nuevo || isNaN(id_doctor_nuevo)) {
      return res.status(400).json({
        success: false,
        error: 'ID de doctor nuevo requerido'
      });
    }

    const pacienteId = parseInt(id, 10);
    const doctorIdAntiguoInt = parseInt(doctorIdAntiguo, 10);
    const doctorIdNuevoInt = parseInt(id_doctor_nuevo, 10);

    // Verificar que el paciente existe
    const paciente = await Paciente.findOne({
      where: { id_paciente: pacienteId, activo: true }
    });

    if (!paciente) {
      return res.status(404).json({
        success: false,
        error: 'Paciente no encontrado o inactivo'
      });
    }

    // Verificar que el doctor antiguo existe y está asignado
    const assignmentAntigua = await DoctorPaciente.findOne({
      where: {
        id_doctor: doctorIdAntiguoInt,
        id_paciente: pacienteId
      }
    });

    // Obtener información del doctor antiguo
    const doctorAntiguo = await Doctor.findByPk(doctorIdAntiguoInt, {
      attributes: ['nombre', 'apellido_paterno', 'activo']
    });

    if (!assignmentAntigua) {
      return res.status(404).json({
        success: false,
        error: 'El doctor antiguo no está asignado a este paciente'
      });
    }

    // Verificar que el doctor nuevo existe y está activo
    const doctorNuevo = await Doctor.findOne({
      where: { id_doctor: doctorIdNuevoInt, activo: true }
    });

    if (!doctorNuevo) {
      return res.status(404).json({
        success: false,
        error: 'Doctor nuevo no encontrado o inactivo'
      });
    }

    // Verificar que el doctor nuevo no esté ya asignado
    const existingAssignment = await DoctorPaciente.findOne({
      where: {
        id_doctor: doctorIdNuevoInt,
        id_paciente: pacienteId
      }
    });

    if (existingAssignment) {
      return res.status(409).json({
        success: false,
        error: 'El doctor nuevo ya está asignado a este paciente'
      });
    }

    // Si el doctor antiguo y nuevo son el mismo, no hacer nada
    if (doctorIdAntiguoInt === doctorIdNuevoInt) {
      return res.status(400).json({
        success: false,
        error: 'El doctor antiguo y nuevo son el mismo'
      });
    }

    // Usar transacción para asegurar atomicidad
    const transaction = await sequelize.transaction();

    try {
      // Eliminar asignación antigua
      await DoctorPaciente.destroy({
        where: {
          id_doctor: doctorIdAntiguoInt,
          id_paciente: pacienteId
        },
        transaction
      });

      // Crear nueva asignación
      const nuevaAsignacion = await DoctorPaciente.create({
        id_doctor: doctorIdNuevoInt,
        id_paciente: pacienteId,
        fecha_asignacion: new Date().toISOString().split('T')[0],
        observaciones: observaciones && observaciones.trim() ? observaciones.trim() : null
      }, { transaction });

      await transaction.commit();

      // Enviar eventos WebSocket
      const replacementData = {
        id_paciente: pacienteId,
        id_doctor_antiguo: doctorIdAntiguoInt,
        id_doctor_nuevo: doctorIdNuevoInt,
        doctor_antiguo_nombre: doctorAntiguo 
          ? `${doctorAntiguo.nombre} ${doctorAntiguo.apellido_paterno}`
          : 'Doctor desconocido',
        doctor_nuevo_nombre: `${doctorNuevo.nombre} ${doctorNuevo.apellido_paterno}`,
        paciente_nombre: `${paciente.nombre} ${paciente.apellido_paterno}`,
        fecha_asignacion: nuevaAsignacion.fecha_asignacion
      };

      realtimeService.sendToRole('Admin', 'doctor_replaced', replacementData);
      realtimeService.sendToRole('Doctor', 'doctor_replaced', replacementData);

      logger.info('Doctor reemplazado exitosamente', {
        pacienteId,
        doctorAntiguo: doctorIdAntiguoInt,
        doctorNuevo: doctorIdNuevoInt
      });

      res.json({
        success: true,
        message: 'Doctor reemplazado exitosamente',
        data: {
          id_doctor_antiguo: doctorIdAntiguoInt,
          id_doctor_nuevo: doctorIdNuevoInt,
          id_paciente: pacienteId,
          fecha_asignacion: nuevaAsignacion.fecha_asignacion,
          observaciones: nuevaAsignacion.observaciones
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    logger.error('Error reemplazando doctor del paciente:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const deletePaciente = async (req, res) => {
  try {
    const pacienteId = parseInt(req.params.id);
    
    if (!pacienteId || isNaN(pacienteId)) {
      return res.status(400).json({ 
        success: false,
        error: 'ID de paciente inválido' 
      });
    }
    
    // Verificar acceso al paciente (valida que Doctor tenga acceso al paciente asignado)
    // authorizePatientAccess ya valida esto, pero lo verificamos aquí también por seguridad
    if (req.user.rol === 'Doctor' || req.user.rol === 'doctor') {
      const doctor = await Doctor.findOne({ 
        where: { id_usuario: req.user.id } 
      });
      
      if (!doctor) {
        return res.status(403).json({ 
          success: false,
          error: 'Doctor no encontrado' 
        });
      }

      // Verificar asignación
      const asignacion = await DoctorPaciente.findOne({
        where: {
          id_doctor: doctor.id_doctor,
          id_paciente: pacienteId
        }
      });

      if (!asignacion) {
        return res.status(403).json({ 
          success: false,
          error: 'No tienes acceso a este paciente' 
        });
      }
    }
    
    // Validar que el paciente existe
    const paciente = await Paciente.findOne({
      where: { id_paciente: pacienteId }
    });
    
    if (!paciente) {
      return res.status(404).json({ 
        success: false,
        error: 'Paciente no encontrado' 
      });
    }
    
    // Soft delete (marcar como eliminado y activo=false)
    await Paciente.update(
      { 
        activo: false,
        deleted_at: new Date() 
      },
      { where: { id_paciente: pacienteId } }
    );
    
    logger.info('Paciente eliminado (soft delete)', { 
      pacienteId, 
      pacienteNombre: `${paciente.nombre} ${paciente.apellido_paterno}` 
    });
    
    res.json({ 
      success: true, 
      message: 'Paciente eliminado correctamente',
      data: { id: pacienteId }
    });
  } catch (error) {
    logger.error('Error eliminando paciente', { 
      error: error.message, 
      stack: error.stack 
    });
    res.status(500).json({ error: 'Error al eliminar el paciente' });
  }
};