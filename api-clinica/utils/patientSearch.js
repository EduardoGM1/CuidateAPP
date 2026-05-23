import { Op } from 'sequelize';
import { Paciente, Doctor, DoctorPaciente } from '../models/associations.js';

/** Escapa %, _ y \ para uso seguro en LIKE */
export function escapeLikePattern(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Filtro por nombre o apellidos: cada palabra debe aparecer en al menos uno de los campos (AND entre palabras).
 * @param {string|null|undefined} searchRaw
 * @returns {object|null}
 */
export function buildNameSearchWhere(searchRaw) {
  if (searchRaw == null || searchRaw === '') return null;
  const s = String(searchRaw).trim().slice(0, 100);
  if (!s) return null;
  const words = s.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  return {
    [Op.and]: words.map((word) => {
      const pattern = `%${escapeLikePattern(word)}%`;
      return {
        [Op.or]: [
          { nombre: { [Op.like]: pattern } },
          { apellido_paterno: { [Op.like]: pattern } },
          { apellido_materno: { [Op.like]: pattern } },
        ],
      };
    }),
  };
}

/**
 * IDs de pacientes cuyo nombre coincide con la búsqueda.
 * Si idDoctor está definido, solo pacientes asignados a ese doctor.
 */
export async function findPacienteIdsByNameSearch({ search, idDoctor = null }) {
  const nameWhere = buildNameSearchWhere(search);
  if (!nameWhere) return [];

  const query = {
    attributes: ['id_paciente'],
    where: { activo: true, ...nameWhere },
    raw: true,
  };

  if (idDoctor != null && !Number.isNaN(Number(idDoctor))) {
    query.include = [
      {
        model: Doctor,
        through: { model: DoctorPaciente },
        where: { id_doctor: Number(idDoctor) },
        required: true,
        attributes: [],
      },
    ];
  }

  const rows = await Paciente.findAll(query);
  return rows.map((r) => r.id_paciente);
}
