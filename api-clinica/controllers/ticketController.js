import { Op } from 'sequelize';
import sequelize from '../config/db.js';
import { SoporteTicket, SoporteTicketMensaje, Usuario } from '../models/associations.js';
import { sendSuccess, sendError, sendServerError, sendUnauthorized } from '../utils/responseHelpers.js';
import logger from '../utils/logger.js';
import emailService from '../services/emailService.js';

const CATEGORIAS = new Set(['tecnico', 'cita_paciente', 'acceso', 'otro']);
const PRIORIDADES = new Set(['baja', 'media', 'alta']);
const ESTADOS = new Set(['abierto', 'en_curso', 'resuelto', 'cerrado']);

function isDoctor(req) {
  return String(req.user?.rol || '').toLowerCase() === 'doctor';
}

function isAdmin(req) {
  return String(req.user?.rol || '').toLowerCase() === 'admin';
}

async function loadAdminEmails() {
  const admins = await Usuario.findAll({
    where: {
      activo: true,
      rol: { [Op.or]: ['Admin', 'admin'] },
    },
    attributes: ['email'],
  });
  return admins.map((u) => u.email).filter((e) => e && String(e).includes('@'));
}

export async function createTicket(req, res) {
  const t = await sequelize.transaction();
  try {
    if (!isDoctor(req)) return sendUnauthorized(res, 'Solo los doctores pueden crear tickets de soporte');

    const asunto = String(req.body?.asunto || '').trim().slice(0, 200);
    const cuerpo = String(req.body?.cuerpo || '').trim().slice(0, 8000);
    let categoria = String(req.body?.categoria || 'otro').toLowerCase();
    let prioridad = String(req.body?.prioridad || 'media').toLowerCase();
    if (!CATEGORIAS.has(categoria)) categoria = 'otro';
    if (!PRIORIDADES.has(prioridad)) prioridad = 'media';

    if (!asunto || !cuerpo) {
      await t.rollback();
      return sendError(res, 'asunto y cuerpo son obligatorios', 400);
    }

    const ticket = await SoporteTicket.create(
      {
        id_usuario_creador: req.user.id_usuario,
        asunto,
        categoria,
        prioridad,
        estado: 'abierto',
      },
      { transaction: t }
    );

    await SoporteTicketMensaje.create(
      {
        id_ticket: ticket.id_ticket,
        id_usuario_autor: req.user.id_usuario,
        cuerpo,
      },
      { transaction: t }
    );

    await t.commit();

    const doctor = await Usuario.findByPk(req.user.id_usuario, { attributes: ['email'] });
    const adminEmails = await loadAdminEmails();
    if (adminEmails.length > 0) {
      emailService
        .sendTicketNuevoAdmins(adminEmails, {
          id_ticket: ticket.id_ticket,
          asunto,
          doctorEmail: doctor?.email || '—',
        })
        .catch((err) => logger.warn('[ticket] email admins', { error: err.message }));
    }

    return sendSuccess(res, { ticket: { id_ticket: ticket.id_ticket, estado: ticket.estado } }, 201);
  } catch (error) {
    await t.rollback();
    logger.error('[ticket] create', { error: error.message });
    return sendServerError(res, error);
  }
}

export async function listMyTickets(req, res) {
  try {
    if (!isDoctor(req)) return sendUnauthorized(res, 'Solo doctores');
    const rows = await SoporteTicket.findAll({
      where: { id_usuario_creador: req.user.id_usuario },
      order: [['updated_at', 'DESC']],
      limit: 200,
      attributes: ['id_ticket', 'asunto', 'categoria', 'prioridad', 'estado', 'created_at', 'updated_at'],
    });
    return sendSuccess(res, { tickets: rows.map((r) => r.toJSON()) });
  } catch (error) {
    logger.error('[ticket] list mine', { error: error.message });
    return sendServerError(res, error);
  }
}

export async function listAdminTickets(req, res) {
  try {
    if (!isAdmin(req)) return sendUnauthorized(res, 'Solo administradores');
    const estado = req.query.estado ? String(req.query.estado).toLowerCase() : null;
    const where = {};
    if (estado && ESTADOS.has(estado)) where.estado = estado;

    const rows = await SoporteTicket.findAll({
      where,
      order: [['updated_at', 'DESC']],
      limit: 300,
      include: [
        {
          model: Usuario,
          as: 'Creador',
          attributes: ['id_usuario', 'email', 'rol'],
        },
      ],
    });

    return sendSuccess(res, {
      tickets: rows.map((r) => {
        const j = r.toJSON();
        return {
          id_ticket: j.id_ticket,
          asunto: j.asunto,
          categoria: j.categoria,
          prioridad: j.prioridad,
          estado: j.estado,
          created_at: j.created_at,
          updated_at: j.updated_at,
          creador_email: j.Creador?.email,
        };
      }),
    });
  } catch (error) {
    logger.error('[ticket] list admin', { error: error.message });
    return sendServerError(res, error);
  }
}

export async function getTicket(req, res) {
  try {
    const tid = parseInt(req.params.id, 10);
    if (!tid || Number.isNaN(tid)) return sendError(res, 'ID inválido', 400);

    const ticket = await SoporteTicket.findByPk(tid, {
      include: [{ model: Usuario, as: 'Creador', attributes: ['id_usuario', 'email', 'rol'] }],
    });
    if (!ticket) return sendError(res, 'Ticket no encontrado', 404);

    if (!isAdmin(req) && !(isDoctor(req) && ticket.id_usuario_creador === req.user.id_usuario)) {
      return sendUnauthorized(res, 'No autorizado');
    }

    const mensajes = await SoporteTicketMensaje.findAll({
      where: { id_ticket: tid },
      order: [['created_at', 'ASC']],
      include: [{ model: Usuario, as: 'Autor', attributes: ['id_usuario', 'email', 'rol'] }],
    });

    const j = ticket.toJSON();
    return sendSuccess(res, {
      ticket: {
        id_ticket: j.id_ticket,
        asunto: j.asunto,
        categoria: j.categoria,
        prioridad: j.prioridad,
        estado: j.estado,
        created_at: j.created_at,
        updated_at: j.updated_at,
        creador_email: j.Creador?.email,
        mensajes: mensajes.map((m) => {
          const mj = m.toJSON();
          return {
            id_mensaje: mj.id_mensaje,
            cuerpo: mj.cuerpo,
            created_at: mj.created_at,
            autor_email: mj.Autor?.email,
            id_usuario_autor: mj.id_usuario_autor,
          };
        }),
      },
    });
  } catch (error) {
    logger.error('[ticket] get', { error: error.message });
    return sendServerError(res, error);
  }
}

export async function addTicketMessage(req, res) {
  try {
    const tid = parseInt(req.params.id, 10);
    if (!tid || Number.isNaN(tid)) return sendError(res, 'ID inválido', 400);

    const ticket = await SoporteTicket.findByPk(tid);
    if (!ticket) return sendError(res, 'Ticket no encontrado', 404);

    if (!isAdmin(req) && !(isDoctor(req) && ticket.id_usuario_creador === req.user.id_usuario)) {
      return sendUnauthorized(res, 'No autorizado');
    }

    const cuerpo = String(req.body?.cuerpo || '').trim().slice(0, 8000);
    if (!cuerpo) return sendError(res, 'cuerpo es obligatorio', 400);

    if (ticket.estado === 'cerrado') return sendError(res, 'El ticket está cerrado', 400);

    await SoporteTicketMensaje.create({
      id_ticket: ticket.id_ticket,
      id_usuario_autor: req.user.id_usuario,
      cuerpo,
    });

    if (ticket.estado === 'abierto' && isAdmin(req)) {
      await ticket.update({ estado: 'en_curso' });
    } else {
      await sequelize.query('UPDATE soporte_tickets SET updated_at = NOW() WHERE id_ticket = ?', {
        replacements: [ticket.id_ticket],
      });
    }

    if (isAdmin(req)) {
      const creador = await Usuario.findByPk(ticket.id_usuario_creador, { attributes: ['email'] });
      if (creador?.email) {
        emailService
          .sendTicketRespuestaDoctor(creador.email, {
            id_ticket: ticket.id_ticket,
            asunto: ticket.asunto,
            preview: cuerpo.slice(0, 280),
          })
          .catch((err) => logger.warn('[ticket] email doctor', { error: err.message }));
      }
    }

    return sendSuccess(res, { ok: true });
  } catch (error) {
    logger.error('[ticket] message', { error: error.message });
    return sendServerError(res, error);
  }
}

export async function patchTicket(req, res) {
  try {
    if (!isAdmin(req)) return sendUnauthorized(res, 'Solo administradores');

    const tid = parseInt(req.params.id, 10);
    const ticket = await SoporteTicket.findByPk(tid);
    if (!ticket) return sendError(res, 'Ticket no encontrado', 404);

    const patch = {};
    if (req.body.estado != null) {
      const e = String(req.body.estado).toLowerCase();
      if (ESTADOS.has(e)) patch.estado = e;
    }
    if (req.body.prioridad != null) {
      const p = String(req.body.prioridad).toLowerCase();
      if (PRIORIDADES.has(p)) patch.prioridad = p;
    }
    if (Object.keys(patch).length === 0) return sendError(res, 'Sin cambios válidos', 400);

    await ticket.update(patch);
    return sendSuccess(res, { ticket: { id_ticket: ticket.id_ticket, ...patch } });
  } catch (error) {
    logger.error('[ticket] patch', { error: error.message });
    return sendServerError(res, error);
  }
}
