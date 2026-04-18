/**
 * Al desactivar la cuenta de un Usuario con rol Doctor o Paciente,
 * se desactiva también el perfil clínico vinculado (misma transacción).
 * Evita el error 409 y deja datos coherentes en un solo paso desde «Usuarios».
 */

/**
 * @param {number|string} idUsuario
 * @param {string} rol - Rol actual del usuario en BD
 * @param {import('sequelize').Transaction} [transaction]
 */
export async function cascadeDeactivateLinkedProfiles(idUsuario, rol, transaction) {
  const id = parseInt(idUsuario, 10);
  if (!id || Number.isNaN(id)) {
    throw new Error('ID de usuario inválido');
  }

  const r = (rol || '').toString();
  const { Doctor, Paciente } = await import('../models/associations.js');
  const opts = transaction ? { transaction } : {};

  if (r === 'Doctor' || r === 'doctor') {
    const doctor = await Doctor.findOne({ where: { id_usuario: id }, ...opts });
    if (doctor?.activo) {
      await doctor.update({ activo: false }, opts);
    }
  }

  if (r === 'Paciente' || r === 'paciente') {
    const paciente = await Paciente.findOne({ where: { id_usuario: id }, ...opts });
    if (paciente?.activo) {
      await paciente.update({ activo: false }, opts);
    }
  }
}

/**
 * Al reactivar la cuenta (Usuario.activo = true), reactiva el perfil Doctor/Paciente vinculado si existe.
 */
export async function cascadeReactivateLinkedProfiles(idUsuario, rol, transaction) {
  const id = parseInt(idUsuario, 10);
  if (!id || Number.isNaN(id)) {
    throw new Error('ID de usuario inválido');
  }

  const r = (rol || '').toString();
  const { Doctor, Paciente } = await import('../models/associations.js');
  const opts = transaction ? { transaction } : {};

  if (r === 'Doctor' || r === 'doctor') {
    const doctor = await Doctor.findOne({ where: { id_usuario: id }, ...opts });
    if (doctor && doctor.activo === false) {
      await doctor.update({ activo: true }, opts);
    }
  }

  if (r === 'Paciente' || r === 'paciente') {
    const paciente = await Paciente.findOne({ where: { id_usuario: id }, ...opts });
    if (paciente && paciente.activo === false) {
      await paciente.update({ activo: true }, opts);
    }
  }
}
