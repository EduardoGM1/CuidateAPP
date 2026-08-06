import { PlanMedicacion, PlanDetalle, Medicamento } from '../models/associations.js';
import { ok, created, fail } from '../utils/apiResponse.js';

const planDetalleInclude = {
  model: PlanDetalle,
  include: [
    {
      model: Medicamento,
      attributes: ['id_medicamento', 'nombre_medicamento', 'descripcion'],
    },
  ],
};

export const getPlanesMedicacion = async (req, res) => {
  try {
    const planes = await PlanMedicacion.findAll({
      include: [planDetalleInclude],
    });
    return ok(res, planes);
  } catch (error) {
    return fail(res, 500, error.message);
  }
};

export const getPlanMedicacion = async (req, res) => {
  try {
    const plan = await PlanMedicacion.findByPk(req.params.id, {
      include: [planDetalleInclude],
    });
    if (!plan) {
      return fail(res, 404, 'Plan de medicación no encontrado');
    }
    return ok(res, plan);
  } catch (error) {
    return fail(res, 500, error.message);
  }
};

export const getPlanesByDiagnostico = async (req, res) => {
  try {
    const planes = await PlanMedicacion.findAll({
      where: { id_cita: req.params.diagnosticoId },
      include: [planDetalleInclude],
    });
    return ok(res, planes);
  } catch (error) {
    return fail(res, 500, error.message);
  }
};

export const createPlanMedicacion = async (req, res) => {
  try {
    const plan = await PlanMedicacion.create(req.body);
    return created(res, plan);
  } catch (error) {
    return fail(res, 400, error.message);
  }
};

export const updatePlanMedicacion = async (req, res) => {
  try {
    const [updated] = await PlanMedicacion.update(req.body, {
      where: { id_plan: req.params.id },
    });
    if (!updated) {
      return fail(res, 404, 'Plan de medicación no encontrado');
    }
    const plan = await PlanMedicacion.findByPk(req.params.id);
    return ok(res, plan);
  } catch (error) {
    return fail(res, 400, error.message);
  }
};

export const deletePlanMedicacion = async (req, res) => {
  try {
    const deleted = await PlanMedicacion.destroy({
      where: { id_plan: req.params.id },
    });
    if (!deleted) {
      return fail(res, 404, 'Plan de medicación no encontrado');
    }
    return ok(res, { deleted: true });
  } catch (error) {
    return fail(res, 400, error.message);
  }
};
