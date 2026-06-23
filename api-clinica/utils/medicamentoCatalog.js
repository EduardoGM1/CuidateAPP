import { Op } from 'sequelize';
import sequelize from '../config/db.js';
import { Medicamento } from '../models/associations.js';

const MIN_NOMBRE_LEN = 2;
const MAX_NOMBRE_LEN = 150;

/**
 * Normaliza nombre para búsqueda/alta en catálogo.
 * @param {string} nombre
 * @returns {string}
 */
export function normalizeNombreMedicamento(nombre) {
  return String(nombre || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, MAX_NOMBRE_LEN);
}

/**
 * Busca por nombre (insensible a mayúsculas) o crea entrada en catálogo.
 * @param {string} nombre
 * @param {{ descripcion?: string|null }} [opts]
 * @returns {Promise<{ medicamento: import('../models/Medicamento.js').default, created: boolean }>}
 */
export async function findOrCreateMedicamentoByNombre(nombre, opts = {}) {
  const normalized = normalizeNombreMedicamento(nombre);
  if (normalized.length < MIN_NOMBRE_LEN) {
    const err = new Error(`El nombre del medicamento debe tener al menos ${MIN_NOMBRE_LEN} caracteres`);
    err.statusCode = 400;
    throw err;
  }

  const existing = await Medicamento.findOne({
    where: sequelize.where(
      sequelize.fn('LOWER', sequelize.col('nombre_medicamento')),
      normalized.toLowerCase()
    ),
  });

  if (existing) {
    return { medicamento: existing, created: false };
  }

  try {
    const medicamento = await Medicamento.create({
      nombre_medicamento: normalized,
      descripcion: opts.descripcion?.trim() || null,
    });
    return { medicamento, created: true };
  } catch (error) {
    if (error?.name === 'SequelizeUniqueConstraintError') {
      const dup = await Medicamento.findOne({
        where: { nombre_medicamento: normalized },
      });
      if (dup) return { medicamento: dup, created: false };
    }
    throw error;
  }
}

/**
 * Resuelve id_medicamento desde id o nombre libre (plan de medicación).
 * @param {{ id_medicamento?: number|string, nombre_medicamento?: string }} med
 * @returns {Promise<number>}
 */
export async function resolveMedicamentoIdForPlan(med) {
  const idRaw = med?.id_medicamento;
  const id = idRaw != null && idRaw !== '' ? parseInt(idRaw, 10) : NaN;

  if (!Number.isNaN(id) && id > 0) {
    const medicamento = await Medicamento.findByPk(id);
    if (!medicamento) {
      const err = new Error(`Medicamento con ID ${id} no encontrado`);
      err.statusCode = 404;
      throw err;
    }
    return id;
  }

  const nombre = normalizeNombreMedicamento(med?.nombre_medicamento);
  if (!nombre) {
    const err = new Error('Cada medicamento debe tener id_medicamento o nombre_medicamento');
    err.statusCode = 400;
    throw err;
  }

  const { medicamento } = await findOrCreateMedicamentoByNombre(nombre);
  return medicamento.id_medicamento;
}
