import MedicamentoToma from '../models/MedicamentoToma.js';
import { PlanMedicacion, PlanDetalle } from '../models/associations.js';
import sequelize from '../config/db.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';

/**
 * Registrar toma de medicamento
 * POST /api/medicamentos-toma
 */
export const registrarToma = async (req, res) => {
  try {
    const { id_plan_medicacion, id_plan_detalle, hora_toma, observaciones } = req.body;
    const userRole = req.user?.rol;
    const userId = req.user?.id;

    // Validar campos requeridos
    if (!id_plan_medicacion) {
      return res.status(400).json({ success: false, error: 'id_plan_medicacion es requerido' });
    }

    // Verificar que el plan de medicación existe y pertenece al paciente
    const plan = await PlanMedicacion.findByPk(id_plan_medicacion);
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan de medicación no encontrado' });
    }

    // Si es paciente, verificar que el plan le pertenece
    if ((userRole === 'Paciente' || userRole === 'paciente') && plan.id_paciente !== userId) {
      return res.status(403).json({ success: false, error: 'No autorizado' });
    }

    // Determinar quién confirma
    let confirmadoPor = 'Paciente';
    if (userRole === 'Doctor' || userRole === 'Admin') {
      confirmadoPor = 'Doctor';
    }

    // Crear registro de toma
    const toma = await MedicamentoToma.create({
      id_plan_medicacion,
      id_plan_detalle: id_plan_detalle || null,
      fecha_toma: new Date(),
      hora_toma: hora_toma || new Date().toTimeString().slice(0, 5),
      confirmado_por: confirmadoPor,
      observaciones: observaciones || null,
    });

    logger.info('Toma de medicamento registrada', { 
      id_toma: toma.id_toma,
      id_plan_medicacion,
      confirmado_por: confirmadoPor 
    });

    res.status(201).json({ success: true, data: toma });
  } catch (error) {
    logger.error('Error registrando toma de medicamento:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Obtener tomas de medicamento de un paciente
 * GET /api/medicamentos-toma/paciente/:idPaciente
 */
export const getTomasByPaciente = async (req, res) => {
  try {
    const { idPaciente } = req.params;
    const { fechaInicio, fechaFin, idPlan } = req.query;
    const userRole = req.user?.rol;
    const userId = req.user?.id;

    // Verificar autorización
    if (userRole !== 'Admin' && userRole !== 'Doctor' && userId !== parseInt(idPaciente)) {
      return res.status(403).json({ success: false, error: 'No autorizado' });
    }

    // Construir condiciones de búsqueda
    const where = {};
    
    if (idPlan) {
      where.id_plan_medicacion = parseInt(idPlan);
    }

    if (fechaInicio && fechaFin) {
      where.fecha_toma = {
        [Op.between]: [new Date(fechaInicio), new Date(fechaFin)]
      };
    }

    // Obtener planes de medicación del paciente
    const planes = await PlanMedicacion.findAll({
      where: { id_paciente: parseInt(idPaciente) },
      attributes: ['id_plan']
    });

    const planIds = planes.map(p => p.id_plan);
    
    if (planIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Construir where con planIds
    const finalWhere = {
      ...where,
      id_plan_medicacion: { [Op.in]: planIds }
    };

    // Obtener tomas
    const tomas = await MedicamentoToma.findAll({
      where: finalWhere,
      include: [
        {
          model: PlanMedicacion,
          attributes: ['id_plan', 'id_paciente', 'fecha_inicio', 'fecha_fin']
        },
        {
          model: PlanDetalle,
          attributes: ['id_detalle', 'id_medicamento', 'dosis', 'frecuencia', 'horario'],
          required: false
        }
      ],
      order: [['fecha_toma', 'DESC']],
      limit: 100
    });

    res.json({ success: true, data: tomas });
  } catch (error) {
    logger.error('Error obteniendo tomas de medicamento:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Obtener tomas de un plan de medicación específico
 * GET /api/medicamentos-toma/plan/:idPlan
 */
export const getTomasByPlan = async (req, res) => {
  try {
    const { idPlan } = req.params;
    const userRole = req.user?.rol;
    const userId = req.user?.id;

    // Verificar que el plan existe
    const plan = await PlanMedicacion.findByPk(idPlan);
    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan de medicación no encontrado' });
    }

    // Verificar autorización
    if (userRole !== 'Admin' && userRole !== 'Doctor' && plan.id_paciente !== userId) {
      return res.status(403).json({ success: false, error: 'No autorizado' });
    }

    const tomas = await MedicamentoToma.findAll({
      where: { id_plan_medicacion: parseInt(idPlan) },
      include: [
        {
          model: PlanDetalle,
          attributes: ['id_detalle', 'id_medicamento', 'dosis', 'frecuencia', 'horario']
        }
      ],
      order: [['fecha_toma', 'DESC']]
    });

    res.json({ success: true, data: tomas });
  } catch (error) {
    logger.error('Error obteniendo tomas por plan:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Eliminar toma de medicamento (solo Admin/Doctor)
 * DELETE /api/medicamentos-toma/:id
 */
export const deleteToma = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.rol;

    // Solo Admin y Doctor pueden eliminar
    if (userRole !== 'Admin' && userRole !== 'Doctor') {
      return res.status(403).json({ success: false, error: 'No autorizado' });
    }

    const toma = await MedicamentoToma.findByPk(id);
    if (!toma) {
      return res.status(404).json({ success: false, error: 'Toma de medicamento no encontrada' });
    }

    await toma.destroy();

    logger.info('Toma de medicamento eliminada', { id_toma: id });

    res.json({ success: true, message: 'Toma de medicamento eliminada' });
  } catch (error) {
    logger.error('Error eliminando toma de medicamento:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

