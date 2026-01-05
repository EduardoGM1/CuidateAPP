import DeteccionComplicacionRepository from '../repositories/deteccionComplicacionRepository.js';
import { Doctor, DoctorPaciente } from '../models/associations.js';
import logger from '../utils/logger.js';

export class DeteccionComplicacionService {
  constructor() {
    this.repository = new DeteccionComplicacionRepository();
  }

  /**
   * Obtener todas las detecciones de un paciente con autorización
   * @param {number} pacienteId - ID del paciente
   * @param {number} doctorId - ID del doctor (si es doctor)
   * @param {string} userRole - Rol del usuario
   * @param {object} options - Opciones de consulta
   * @returns {Promise<Object>} Detecciones del paciente
   */
  async getDeteccionesPaciente(pacienteId, doctorId, userRole, options = {}) {
    try {
      // Si es Doctor, verificar que tiene acceso al paciente
      if (userRole === 'Doctor' && doctorId) {
        const asignacion = await DoctorPaciente.findOne({
          where: {
            id_doctor: doctorId,
            id_paciente: pacienteId
          }
        });

        if (!asignacion) {
          throw new Error('No tienes acceso a este paciente');
        }
      }

      // Si es Paciente, verificar que está accediendo a sus propios datos
      if (userRole === 'Paciente') {
        // El middleware authorizePatientAccess ya valida esto, pero por seguridad adicional
        // podríamos verificar aquí también si es necesario
      }

      const resultado = await this.repository.getDeteccionesByPaciente(pacienteId, options);

      logger.info('Detecciones de complicaciones obtenidas', {
        pacienteId,
        total: resultado.total,
        userRole
      });

      return resultado;
    } catch (error) {
      logger.error('Error obteniendo detecciones de complicaciones', error);
      throw error;
    }
  }

  /**
   * Obtener una detección específica con autorización
   * @param {number} deteccionId - ID de la detección
   * @param {number} doctorId - ID del doctor (si es doctor)
   * @param {string} userRole - Rol del usuario
   * @returns {Promise<Object>} Detección encontrada
   */
  async getDeteccionById(deteccionId, doctorId, userRole) {
    try {
      const deteccion = await this.repository.getDeteccionById(deteccionId);

      // Si es Doctor, verificar que tiene acceso al paciente
      if (userRole === 'Doctor' && doctorId) {
        const asignacion = await DoctorPaciente.findOne({
          where: {
            id_doctor: doctorId,
            id_paciente: deteccion.id_paciente
          }
        });

        if (!asignacion) {
          throw new Error('No tienes acceso a este paciente');
        }
      }

      // Si es Paciente, verificar que está accediendo a sus propios datos
      if (userRole === 'Paciente') {
        // El middleware authorizePatientAccess ya valida esto
      }

      return deteccion;
    } catch (error) {
      logger.error('Error obteniendo detección de complicación por ID', error);
      throw error;
    }
  }

  /**
   * Crear una nueva detección con autorización
   * @param {object} deteccionData - Datos de la detección
   * @param {number} doctorId - ID del doctor (si es doctor)
   * @param {string} userRole - Rol del usuario
   * @returns {Promise<Object>} Detección creada
   */
  async createDeteccion(deteccionData, doctorId, userRole) {
    try {
      // Solo Doctor y Admin pueden crear
      if (userRole !== 'Doctor' && userRole !== 'Admin') {
        throw new Error('No tienes permisos para crear detecciones de complicaciones');
      }

      // Si es Doctor, verificar que tiene acceso al paciente
      if (userRole === 'Doctor' && doctorId) {
        const asignacion = await DoctorPaciente.findOne({
          where: {
            id_doctor: doctorId,
            id_paciente: deteccionData.id_paciente
          }
        });

        if (!asignacion) {
          throw new Error('No tienes acceso a este paciente');
        }

        // Establecer id_doctor automáticamente si no se proporciona
        if (!deteccionData.id_doctor) {
          deteccionData.id_doctor = doctorId;
        }
      }

      // Establecer registrado_por según el rol
      if (!deteccionData.registrado_por) {
        deteccionData.registrado_por = userRole === 'Doctor' ? 'doctor' : 'doctor';
      }

      const deteccion = await this.repository.createDeteccion(deteccionData);

      logger.info('Detección de complicación creada', {
        id_deteccion: deteccion.id_deteccion,
        id_paciente: deteccion.id_paciente,
        userRole
      });

      return deteccion;
    } catch (error) {
      logger.error('Error creando detección de complicación', error);
      throw error;
    }
  }

  /**
   * Actualizar una detección con autorización
   * @param {number} deteccionId - ID de la detección
   * @param {object} updateData - Datos a actualizar
   * @param {number} doctorId - ID del doctor (si es doctor)
   * @param {string} userRole - Rol del usuario
   * @returns {Promise<Object>} Detección actualizada
   */
  async updateDeteccion(deteccionId, updateData, doctorId, userRole) {
    try {
      // Solo Doctor y Admin pueden actualizar
      if (userRole !== 'Doctor' && userRole !== 'Admin') {
        throw new Error('No tienes permisos para actualizar detecciones de complicaciones');
      }

      // Obtener la detección para verificar acceso
      const deteccion = await this.repository.getDeteccionById(deteccionId);

      // Si es Doctor, verificar que tiene acceso al paciente
      if (userRole === 'Doctor' && doctorId) {
        const asignacion = await DoctorPaciente.findOne({
          where: {
            id_doctor: doctorId,
            id_paciente: deteccion.id_paciente
          }
        });

        if (!asignacion) {
          throw new Error('No tienes acceso a este paciente');
        }
      }

      const deteccionActualizada = await this.repository.updateDeteccion(deteccionId, updateData);

      logger.info('Detección de complicación actualizada', {
        id_deteccion: deteccionId,
        id_paciente: deteccion.id_paciente,
        userRole
      });

      return deteccionActualizada;
    } catch (error) {
      logger.error('Error actualizando detección de complicación', error);
      throw error;
    }
  }

  /**
   * Eliminar una detección con autorización
   * @param {number} deteccionId - ID de la detección
   * @param {string} userRole - Rol del usuario
   * @returns {Promise<boolean>} true si se eliminó correctamente
   */
  async deleteDeteccion(deteccionId, userRole) {
    try {
      // Solo Admin puede eliminar
      if (userRole !== 'Admin') {
        throw new Error('Solo los administradores pueden eliminar detecciones de complicaciones');
      }

      const resultado = await this.repository.deleteDeteccion(deteccionId);

      logger.info('Detección de complicación eliminada', {
        id_deteccion: deteccionId,
        userRole
      });

      return resultado;
    } catch (error) {
      logger.error('Error eliminando detección de complicación', error);
      throw error;
    }
  }
}

export default DeteccionComplicacionService;

