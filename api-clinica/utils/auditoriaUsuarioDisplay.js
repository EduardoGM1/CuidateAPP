import { Usuario, Doctor, Paciente } from '../models/associations.js';

/** Include estándar para resolver nombre del usuario en registros de auditoría. */
export const usuarioIncludeAuditoria = {
  model: Usuario,
  attributes: ['id_usuario', 'email', 'rol'],
  required: false,
  include: [
    {
      model: Doctor,
      attributes: ['nombre', 'apellido_paterno', 'apellido_materno'],
      required: false,
    },
    {
      model: Paciente,
      attributes: ['nombre', 'apellido_paterno', 'apellido_materno'],
      required: false,
    },
  ],
};

function nombreDesdePerfil(perfil) {
  if (!perfil) return '';
  return [perfil.nombre, perfil.apellido_paterno, perfil.apellido_materno]
    .filter((p) => p != null && String(p).trim() !== '')
    .join(' ')
    .trim();
}

/**
 * Nombre legible del usuario que realizó la acción (doctor, paciente o email/admin).
 * @param {object|null|undefined} usuario - Usuario con Doctor/Paciente incluidos
 * @returns {string}
 */
export function formatUsuarioAuditoriaDisplay(usuario) {
  if (!usuario) return 'Sistema automático';

  const rol = String(usuario.rol || '').toLowerCase();
  if (rol === 'doctor') {
    const nombre = nombreDesdePerfil(usuario.Doctor);
    if (nombre) return nombre;
  }
  if (rol === 'paciente') {
    const nombre = nombreDesdePerfil(usuario.Paciente);
    if (nombre) return nombre;
  }
  if (rol === 'admin') {
    const nombreDoctor = nombreDesdePerfil(usuario.Doctor);
    if (nombreDoctor) return nombreDoctor;
    return 'Administrador';
  }
  if (usuario.email) return usuario.email;
  return 'Sistema automático';
}

/**
 * @param {import('sequelize').Model|object} registro
 * @returns {object}
 */
export function enrichAuditoriaRegistro(registro) {
  const json = typeof registro.toJSON === 'function' ? registro.toJSON() : { ...registro };
  const usuario = json.Usuario ?? null;
  return {
    ...json,
    usuario_nombre: formatUsuarioAuditoriaDisplay(usuario),
    usuario_email: usuario?.email ?? null,
    usuario_rol: usuario?.rol ?? null,
  };
}
