import crypto from 'crypto';
import { Op } from 'sequelize';
import { Paciente, Modulo } from '../models/associations.js';

function anonRef(idPaciente) {
  const salt = process.env.EXPORT_ANON_SALT || process.env.JWT_SECRET || 'cuidate-anon';
  return crypto.createHash('sha256').update(`${idPaciente}:${salt}`).digest('hex').slice(0, 16);
}

function escapeCsv(v) {
  const s = v != null ? String(v) : '';
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Listado agregado sin nombres ni contacto (solo admin).
 */
export async function buildPacientesAnonimizadoCsv({ id_modulo, activo } = {}) {
  const where = {};
  if (id_modulo != null && !Number.isNaN(Number(id_modulo))) {
    where.id_modulo = Number(id_modulo);
  }
  if (activo === 'true' || activo === true) where.activo = true;
  if (activo === 'false' || activo === false) where.activo = false;

  const rows = await Paciente.findAll({
    where,
    attributes: ['id_paciente', 'sexo', 'estado', 'localidad', 'fecha_registro', 'activo', 'id_modulo'],
    include: [{ model: Modulo, attributes: ['nombre_modulo'], required: false }],
    order: [['fecha_registro', 'DESC']],
    limit: 50000,
  });

  const headers = [
    'ref_anonima',
    'id_modulo',
    'modulo',
    'sexo',
    'estado',
    'localidad',
    'fecha_registro',
    'activo',
  ];
  const lines = [headers.join(',')];
  for (const p of rows) {
    const j = p.toJSON();
    lines.push(
      [
        anonRef(j.id_paciente),
        j.id_modulo ?? '',
        escapeCsv(j.Modulo?.nombre_modulo ?? ''),
        j.sexo ?? '',
        escapeCsv(j.estado ?? ''),
        escapeCsv(j.localidad ?? ''),
        j.fecha_registro ? new Date(j.fecha_registro).toISOString() : '',
        j.activo ? '1' : '0',
      ].join(',')
    );
  }
  return lines.join('\n');
}
