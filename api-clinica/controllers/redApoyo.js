import { RedApoyo, Paciente } from '../models/associations.js';

export const getRedesApoyo = async (req, res) => {
  try {
    const redes = await RedApoyo.findAll({
      include: [{ model: Paciente, attributes: ['nombre', 'apellido_paterno'] }]
    });
    res.json(redes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getRedApoyo = async (req, res) => {
  try {
    const red = await RedApoyo.findByPk(req.params.id, {
      include: [{ model: Paciente, attributes: ['nombre', 'apellido_paterno'] }]
    });
    if (!red) {
      return res.status(404).json({ error: 'Red de apoyo no encontrada' });
    }
    res.json(red);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getRedApoyoByPaciente = async (req, res) => {
  try {
    const redes = await RedApoyo.findAll({
      where: { id_paciente: req.params.pacienteId, activo: true }
    });
    res.json(redes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getContactosEmergencia = async (req, res) => {
  try {
    const contactos = await RedApoyo.findAll({
      where: { 
        id_paciente: req.params.pacienteId, 
        es_contacto_emergencia: true,
        activo: true 
      }
    });
    res.json(contactos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createRedApoyo = async (req, res) => {
  try {
    const red = await RedApoyo.create(req.body);
    res.status(201).json(red);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateRedApoyo = async (req, res) => {
  try {
    const [updated] = await RedApoyo.update(req.body, {
      where: { id_red: req.params.id }
    });
    if (!updated) {
      return res.status(404).json({ error: 'Red de apoyo no encontrada' });
    }
    const red = await RedApoyo.findByPk(req.params.id);
    res.json(red);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteRedApoyo = async (req, res) => {
  try {
    const deleted = await RedApoyo.destroy({
      where: { id_red: req.params.id }
    });
    if (!deleted) {
      return res.status(404).json({ error: 'Red de apoyo no encontrada' });
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};