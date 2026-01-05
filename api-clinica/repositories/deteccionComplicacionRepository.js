import { DeteccionComplicacion, Paciente, Comorbilidad, Cita, Doctor } from '../models/associations.js';
import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';

export class DeteccionComplicacionRepository {
  
  /**
   * Obtener todas las detecciones de complicaciones de un paciente
   * @param {number} pacienteId - ID del paciente
   * @param {object} options - Opciones de consulta (limit, offset, sort)
   * @returns {Promise<Array>} Array de detecciones
   */
  async getDeteccionesByPaciente(pacienteId, options = {}) {
    try {
      const { limit = 100, offset = 0, sort = 'DESC' } = options;
      
      const detecciones = await DeteccionComplicacion.findAndCountAll({
        where: { id_paciente: pacienteId },
        include: [
          {
            model: Comorbilidad,
            attributes: ['id_comorbilidad', 'nombre_comorbilidad'],
            required: false
          },
          {
            model: Cita,
            attributes: ['id_cita', 'fecha_cita', 'motivo'],
            required: false
          },
          {
            model: Doctor,
            attributes: ['id_doctor', 'nombre', 'apellido_paterno', 'apellido_materno'],
            required: false
          }
        ],
        order: [['fecha_deteccion', sort], ['id_deteccion', sort]],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return {
        data: detecciones.rows,
        total: detecciones.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
    } catch (error) {
      logger.error('Error obteniendo detecciones de complicaciones del paciente', error);
      throw error;
    }
  }

  /**
   * Obtener una detección específica por ID
   * @param {number} deteccionId - ID de la detección
   * @returns {Promise<Object>} Detección encontrada
   */
  async getDeteccionById(deteccionId) {
    try {
      const deteccion = await DeteccionComplicacion.findByPk(deteccionId, {
        include: [
          {
            model: Paciente,
            attributes: ['id_paciente', 'nombre', 'apellido_paterno', 'apellido_materno'],
            required: true
          },
          {
            model: Comorbilidad,
            attributes: ['id_comorbilidad', 'nombre_comorbilidad'],
            required: false
          },
          {
            model: Cita,
            attributes: ['id_cita', 'fecha_cita', 'motivo'],
            required: false
          },
          {
            model: Doctor,
            attributes: ['id_doctor', 'nombre', 'apellido_paterno', 'apellido_materno'],
            required: false
          }
        ]
      });

      if (!deteccion) {
        throw new Error('Detección de complicación no encontrada');
      }

      return deteccion;
    } catch (error) {
      logger.error('Error obteniendo detección de complicación por ID', error);
      throw error;
    }
  }

  /**
   * Crear una nueva detección de complicación
   * @param {object} deteccionData - Datos de la detección
   * @returns {Promise<Object>} Detección creada
   */
  async createDeteccion(deteccionData) {
    try {
      // Validar que el paciente existe
      const paciente = await Paciente.findOne({
        where: { id_paciente: deteccionData.id_paciente, activo: true }
      });

      if (!paciente) {
        throw new Error('Paciente no encontrado o inactivo');
      }

      // Validar que la cita pertenece al mismo paciente (si se proporciona)
      if (deteccionData.id_cita) {
        const cita = await Cita.findOne({
          where: {
            id_cita: deteccionData.id_cita,
            id_paciente: deteccionData.id_paciente
          }
        });

        if (!cita) {
          throw new Error('La cita no existe o no pertenece a este paciente');
        }
      }

      // Validar que la comorbilidad existe (si se proporciona)
      if (deteccionData.id_comorbilidad) {
        const comorbilidad = await Comorbilidad.findByPk(deteccionData.id_comorbilidad);
        if (!comorbilidad) {
          throw new Error('Comorbilidad no encontrada');
        }
      }

      // Validar que el doctor existe (si se proporciona)
      if (deteccionData.id_doctor) {
        const doctor = await Doctor.findByPk(deteccionData.id_doctor);
        if (!doctor) {
          throw new Error('Doctor no encontrado');
        }
      }

      // Validar fechas
      const fechaDeteccion = new Date(deteccionData.fecha_deteccion);
      if (isNaN(fechaDeteccion.getTime())) {
        throw new Error('Fecha de detección inválida');
      }

      // Validar que fecha_deteccion no sea futura
      const hoy = new Date();
      hoy.setHours(23, 59, 59, 999);
      if (fechaDeteccion > hoy) {
        throw new Error('La fecha de detección no puede ser futura');
      }

      // Validar que fecha_diagnostico >= fecha_deteccion (si ambas están presentes)
      if (deteccionData.fecha_diagnostico) {
        const fechaDiagnostico = new Date(deteccionData.fecha_diagnostico);
        if (isNaN(fechaDiagnostico.getTime())) {
          throw new Error('Fecha de diagnóstico inválida');
        }
        if (fechaDiagnostico < fechaDeteccion) {
          throw new Error('La fecha de diagnóstico no puede ser anterior a la fecha de detección');
        }
      }

      // Validar auto-monitoreo: si realiza_auto_monitoreo = true, al menos un sub-campo debe ser true
      if (deteccionData.realiza_auto_monitoreo === true) {
        if (!deteccionData.auto_monitoreo_glucosa && !deteccionData.auto_monitoreo_presion) {
          throw new Error('Si realiza auto-monitoreo, debe especificar al menos glucosa o presión');
        }
      }

      // Si realiza_auto_monitoreo = false, ambos sub-campos deben ser false
      if (deteccionData.realiza_auto_monitoreo === false) {
        deteccionData.auto_monitoreo_glucosa = false;
        deteccionData.auto_monitoreo_presion = false;
      }

      // Establecer registrado_por si no se proporciona
      if (!deteccionData.registrado_por) {
        deteccionData.registrado_por = 'doctor';
      }

      const deteccion = await DeteccionComplicacion.create(deteccionData);

      logger.info('Detección de complicación creada exitosamente', {
        id_deteccion: deteccion.id_deteccion,
        id_paciente: deteccion.id_paciente
      });

      return deteccion;
    } catch (error) {
      logger.error('Error creando detección de complicación', error);
      throw error;
    }
  }

  /**
   * Actualizar una detección de complicación
   * @param {number} deteccionId - ID de la detección
   * @param {object} updateData - Datos a actualizar
   * @returns {Promise<Object>} Detección actualizada
   */
  async updateDeteccion(deteccionId, updateData) {
    try {
      const deteccion = await DeteccionComplicacion.findByPk(deteccionId);
      
      if (!deteccion) {
        throw new Error('Detección de complicación no encontrada');
      }

      // Validar fechas si se proporcionan
      if (updateData.fecha_deteccion) {
        const fechaDeteccion = new Date(updateData.fecha_deteccion);
        if (isNaN(fechaDeteccion.getTime())) {
          throw new Error('Fecha de detección inválida');
        }

        const hoy = new Date();
        hoy.setHours(23, 59, 59, 999);
        if (fechaDeteccion > hoy) {
          throw new Error('La fecha de detección no puede ser futura');
        }
      }

      // Validar que fecha_diagnostico >= fecha_deteccion
      const fechaDeteccionFinal = updateData.fecha_deteccion 
        ? new Date(updateData.fecha_deteccion)
        : new Date(deteccion.fecha_deteccion);

      if (updateData.fecha_diagnostico) {
        const fechaDiagnostico = new Date(updateData.fecha_diagnostico);
        if (isNaN(fechaDiagnostico.getTime())) {
          throw new Error('Fecha de diagnóstico inválida');
        }
        if (fechaDiagnostico < fechaDeteccionFinal) {
          throw new Error('La fecha de diagnóstico no puede ser anterior a la fecha de detección');
        }
      }

      // Validar auto-monitoreo
      if (updateData.realiza_auto_monitoreo === true) {
        const autoMonitoreoGlucosa = updateData.auto_monitoreo_glucosa !== undefined 
          ? updateData.auto_monitoreo_glucosa 
          : deteccion.auto_monitoreo_glucosa;
        const autoMonitoreoPresion = updateData.auto_monitoreo_presion !== undefined 
          ? updateData.auto_monitoreo_presion 
          : deteccion.auto_monitoreo_presion;

        if (!autoMonitoreoGlucosa && !autoMonitoreoPresion) {
          throw new Error('Si realiza auto-monitoreo, debe especificar al menos glucosa o presión');
        }
      }

      if (updateData.realiza_auto_monitoreo === false) {
        updateData.auto_monitoreo_glucosa = false;
        updateData.auto_monitoreo_presion = false;
      }

      // Validar que la cita pertenece al mismo paciente (si se actualiza)
      if (updateData.id_cita) {
        const cita = await Cita.findOne({
          where: {
            id_cita: updateData.id_cita,
            id_paciente: deteccion.id_paciente
          }
        });

        if (!cita) {
          throw new Error('La cita no existe o no pertenece a este paciente');
        }
      }

      await deteccion.update(updateData);

      logger.info('Detección de complicación actualizada exitosamente', {
        id_deteccion: deteccion.id_deteccion,
        id_paciente: deteccion.id_paciente
      });

      return deteccion;
    } catch (error) {
      logger.error('Error actualizando detección de complicación', error);
      throw error;
    }
  }

  /**
   * Eliminar una detección de complicación
   * @param {number} deteccionId - ID de la detección
   * @returns {Promise<boolean>} true si se eliminó correctamente
   */
  async deleteDeteccion(deteccionId) {
    try {
      const deteccion = await DeteccionComplicacion.findByPk(deteccionId);
      
      if (!deteccion) {
        throw new Error('Detección de complicación no encontrada');
      }

      await deteccion.destroy();

      logger.info('Detección de complicación eliminada exitosamente', {
        id_deteccion: deteccionId
      });

      return true;
    } catch (error) {
      logger.error('Error eliminando detección de complicación', error);
      throw error;
    }
  }
}

export default DeteccionComplicacionRepository;

