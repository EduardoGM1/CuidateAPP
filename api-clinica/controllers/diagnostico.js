import { Diagnostico, Cita, Paciente, Doctor } from '../models/associations.js';

export const getDiagnosticos = async (req, res) => {
  try {
    const diagnosticos = await Diagnostico.findAll({
      include: [
        { model: Cita, attributes: ['fecha_cita', 'motivo'] },
        { model: Paciente, attributes: ['nombre', 'apellido_paterno'] },
        { model: Doctor, attributes: ['nombre', 'apellido_paterno'] }
      ]
    });
    res.json(diagnosticos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDiagnostico = async (req, res) => {
  try {
    const diagnostico = await Diagnostico.findByPk(req.params.id, {
      include: [
        { model: Cita, attributes: ['fecha_cita', 'motivo'] },
        { model: Paciente, attributes: ['nombre', 'apellido_paterno'] },
        { model: Doctor, attributes: ['nombre', 'apellido_paterno'] }
      ]
    });
    if (!diagnostico) {
      return res.status(404).json({ error: 'Diagnóstico no encontrado' });
    }
    res.json(diagnostico);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDiagnosticosByPaciente = async (req, res) => {
  try {
    const diagnosticos = await Diagnostico.findAll({
      where: { id_paciente: req.params.pacienteId },
      include: [
        { model: Cita, attributes: ['fecha_cita', 'motivo'] },
        { model: Doctor, attributes: ['nombre', 'apellido_paterno'] }
      ],
      order: [['fecha_diagnostico', 'DESC']]
    });
    res.json(diagnosticos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createDiagnostico = async (req, res) => {
  try {
    const diagnostico = await Diagnostico.create(req.body);
    res.status(201).json(diagnostico);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateDiagnostico = async (req, res) => {
  try {
    const [updated] = await Diagnostico.update(req.body, {
      where: { id_diagnostico: req.params.id }
    });
    if (!updated) {
      return res.status(404).json({ error: 'Diagnóstico no encontrado' });
    }
    const diagnostico = await Diagnostico.findByPk(req.params.id);
    res.json(diagnostico);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteDiagnostico = async (req, res) => {
  try {
    const deleted = await Diagnostico.destroy({
      where: { id_diagnostico: req.params.id }
    });
    if (!deleted) {
      return res.status(404).json({ error: 'Diagnóstico no encontrado' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};