import { PlanMedicacion, Diagnostico, Medicamento } from '../models/associations.js';

export const getPlanesMedicacion = async (req, res) => {
  try {
    const planes = await PlanMedicacion.findAll({
      include: [
        { model: Diagnostico, attributes: ['diagnostico_principal'] },
        { model: Medicamento, attributes: ['nombre', 'dosis_recomendada'] }
      ]
    });
    res.json(planes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPlanMedicacion = async (req, res) => {
  try {
    const plan = await PlanMedicacion.findByPk(req.params.id, {
      include: [
        { model: Diagnostico, attributes: ['diagnostico_principal'] },
        { model: Medicamento, attributes: ['nombre', 'dosis_recomendada', 'contraindicaciones'] }
      ]
    });
    if (!plan) {
      return res.status(404).json({ error: 'Plan de medicación no encontrado' });
    }
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPlanesByDiagnostico = async (req, res) => {
  try {
    const planes = await PlanMedicacion.findAll({
      where: { id_diagnostico: req.params.diagnosticoId },
      include: [{ model: Medicamento, attributes: ['nombre', 'dosis_recomendada'] }]
    });
    res.json(planes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createPlanMedicacion = async (req, res) => {
  try {
    const plan = await PlanMedicacion.create(req.body);
    res.status(201).json(plan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updatePlanMedicacion = async (req, res) => {
  try {
    const [updated] = await PlanMedicacion.update(req.body, {
      where: { id_plan: req.params.id }
    });
    if (!updated) {
      return res.status(404).json({ error: 'Plan de medicación no encontrado' });
    }
    const plan = await PlanMedicacion.findByPk(req.params.id);
    res.json(plan);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deletePlanMedicacion = async (req, res) => {
  try {
    const deleted = await PlanMedicacion.destroy({
      where: { id_plan: req.params.id }
    });
    if (!deleted) {
      return res.status(404).json({ error: 'Plan de medicación no encontrado' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};