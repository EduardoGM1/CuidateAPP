/**
 * Reglas compartidas antes de marcar un registro de Usuario como inactivo (desactivar cuenta).
 * Debe coincidir con la lógica usada en DELETE /api/auth/usuarios/:id y en PUT cuando activo pasa a false.
 */

/**
 * @param {number|string} idUsuario
 * @param {string} rol - Rol actual del usuario en BD (Doctor, Paciente, Admin, …)
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export async function validateUsuarioCanBeDeactivated(idUsuario, rol) {
  const id = parseInt(idUsuario, 10);
  if (!id || Number.isNaN(id)) {
    return { ok: false, error: 'ID de usuario inválido' };
  }

  const r = (rol || '').toString();
  const { Doctor, Paciente } = await import('../models/associations.js');

  if (r === 'Doctor' || r === 'doctor') {
    const doctorAsociado = await Doctor.findOne({ where: { id_usuario: id } });
    if (doctorAsociado && doctorAsociado.activo) {
      return {
        ok: false,
        error:
          'No se puede desactivar la cuenta porque está vinculada a un doctor activo. Desactiva primero el doctor en la sección Doctores.',
      };
    }
  }

  if (r === 'Paciente' || r === 'paciente') {
    const pacienteAsociado = await Paciente.findOne({ where: { id_usuario: id } });
    if (pacienteAsociado && pacienteAsociado.activo) {
      return {
        ok: false,
        error:
          'No se puede desactivar la cuenta porque está vinculada a un paciente activo. Desactiva primero el paciente.',
      };
    }
  }

  return { ok: true };
}
