import MedicamentoToma from '../models/MedicamentoToma.js';
import { PlanMedicacion, PlanDetalle } from '../models/associations.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';

/** TIME / string → HH:mm */
function sliceHoraHHmm(raw) {
  if (raw == null || raw === '') return null;
  const s = typeof raw === 'string' ? raw : String(raw);
  return s.length >= 5 ? s.slice(0, 5) : s;
}

/** Horarios de un detalle (array, JSON string o horario único). */
function horariosFromPlanDetalleJson(dj) {
  const out = [];
  let list = dj?.horarios;
  if (typeof list === 'string' && list.trim()) {
    try {
      const parsed = JSON.parse(list);
      list = Array.isArray(parsed) ? parsed : [];
    } catch {
      list = [];
    }
  }
  if (Array.isArray(list)) {
    for (const x of list) {
      const h = sliceHoraHHmm(x);
      if (h) out.push(h);
    }
  }
  const single = sliceHoraHHmm(dj?.horario);
  if (single) out.push(single);
  return [...new Set(out)];
}

/** Une HH:mm de todos los detalles de un plan (ordenados). */
function mergeHorariosPlanFromDetallesRows(planId, detalleRows) {
  const set = new Set();
  for (const row of detalleRows) {
    const j = row.toJSON ? row.toJSON() : row;
    if (j.id_plan !== planId) continue;
    horariosFromPlanDetalleJson(j).forEach((h) => set.add(h));
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Normaliza PlanDetalle en JSON de toma (horarios como string JSON → array). */
function normalizePlanDetalleHorariosJson(planDetalle) {
  if (!planDetalle || typeof planDetalle !== 'object') return;
  let list = planDetalle.horarios;
  if (typeof list === 'string' && list.trim()) {
    try {
      const parsed = JSON.parse(list);
      if (Array.isArray(parsed)) planDetalle.horarios = parsed;
    } catch {
      /* mantener */
    }
  }
}

/**
 * Si la toma no trae PlanDetalle (p. ej. id_plan_detalle null), adjunta horarios del plan.
 * @param {Array} tomasJson - filas toJSON()
 * @param {number[]} planIds
 */
async function enrichTomasPlanDetalleHorarios(tomasJson, planIds) {
  if (!tomasJson.length || !planIds.length) return;
  const detalleRows = await PlanDetalle.findAll({
    where: { id_plan: { [Op.in]: planIds } },
    attributes: ['id_plan', 'id_detalle', 'horario', 'horarios'],
    order: [['id_plan', 'ASC'], ['id_detalle', 'ASC']]
  });
  const mergedByPlan = {};
  for (const pid of planIds) {
    mergedByPlan[pid] = mergeHorariosPlanFromDetallesRows(pid, detalleRows);
  }
  for (const row of tomasJson) {
    if (row.PlanDetalle) {
      normalizePlanDetalleHorariosJson(row.PlanDetalle);
    } else if (row.id_plan_medicacion) {
      const hrs = mergedByPlan[row.id_plan_medicacion];
      if (hrs && hrs.length > 0) {
        row.PlanDetalle = { horarios: hrs };
      }
    }
  }
}

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
      const inicio = new Date(fechaInicio);
      inicio.setUTCHours(0, 0, 0, 0);
      const fin = new Date(fechaFin);
      fin.setUTCHours(23, 59, 59, 999);
      where.fecha_toma = {
        [Op.between]: [inicio, fin]
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
          attributes: ['id_detalle', 'id_plan', 'id_medicamento', 'dosis', 'frecuencia', 'horario', 'horarios'],
          required: false
        }
      ],
      order: [['fecha_toma', 'DESC']],
      limit: 100
    });

    const tomasJson = tomas.map((t) => (t.toJSON ? t.toJSON() : t));
    await enrichTomasPlanDetalleHorarios(tomasJson, planIds);

    res.json({ success: true, data: tomasJson });
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

    const idPlanNum = parseInt(idPlan, 10);
    const tomas = await MedicamentoToma.findAll({
      where: { id_plan_medicacion: idPlanNum },
      include: [
        {
          model: PlanDetalle,
          attributes: ['id_detalle', 'id_plan', 'id_medicamento', 'dosis', 'frecuencia', 'horario', 'horarios'],
          required: false
        }
      ],
      order: [['fecha_toma', 'DESC']]
    });

    const tomasJson = tomas.map((t) => (t.toJSON ? t.toJSON() : t));
    await enrichTomasPlanDetalleHorarios(tomasJson, [idPlanNum]);

    res.json({ success: true, data: tomasJson });
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

