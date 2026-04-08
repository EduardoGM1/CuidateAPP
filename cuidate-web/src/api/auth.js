import client from './client';
import { API_PATHS, ROLES, STORAGE_KEYS } from '../utils/constants';
import { sanitizeEmail } from '../utils/sanitize';
import { normalizeString } from '../utils/sanitize';

/**
 * Login Doctor/Admin. Los valores deben estar ya validados/sanitizados por el formulario.
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{ token: string, user: object }>}
 */
export async function login(credentials) {
  const email = sanitizeEmail(credentials.email);
  const { data } = await client.post(API_PATHS.LOGIN, {
    email,
    password: credentials.password,
  });
  return data;
}

/**
 * Crear usuario (solo Admin). Para vincular a un doctor o admin.
 * Con invite: true no se envía password; el backend envía correo para confirmar cuenta y crear contraseña.
 * @param {{ email: string, password?: string, rol: string, invite?: boolean }} payload
 * @returns {Promise<{ usuario: { id_usuario, email, rol } }>}
 */
export async function createUsuario(payload) {
  const email = sanitizeEmail(payload.email);
  const rol = payload.rol === ROLES.DOCTOR ? ROLES.DOCTOR : payload.rol === ROLES.ADMIN ? ROLES.ADMIN : 'Paciente';
  const invite = payload.invite === true;

  const body = { email, rol };
  if (invite) {
    body.invite = true;
  } else {
    body.password = normalizeString(payload.password, { maxLength: 128 });
  }
  const { data } = await client.post(API_PATHS.AUTH_USUARIOS, body);
  return data;
}

/**
 * Cambiar contraseña (propia o de otro usuario si Admin).
 * @param {{ currentPassword: string, newPassword: string, userId?: number }} payload
 */
export async function changePassword(payload) {
  const body = {
    currentPassword: payload.currentPassword,
    newPassword: payload.newPassword,
  };
  if (payload.userId != null) body.userId = payload.userId;
  const { data } = await client.put(API_PATHS.AUTH_CHANGE_PASSWORD, body);
  return data;
}

/**
 * Cambiar contraseña de otro usuario (solo Admin, sin contraseña actual).
 * @param {{ userId: number, newPassword: string }} payload
 */
export async function adminChangePassword(payload) {
  const newPassword = normalizeString(payload.newPassword, { maxLength: 128 });
  if (!newPassword || newPassword.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres');
  const body = { newPassword };
  if (payload.userId != null) body.userId = Number(payload.userId);
  if (payload.email != null) body.email = sanitizeEmail(payload.email);
  if (!body.userId && !body.email) throw new Error('userId o email es requerido');
  const { data } = await client.put(API_PATHS.AUTH_ADMIN_CHANGE_PASSWORD, body);
  return data;
}

/**
 * Restablecer PIN de un paciente para la app móvil (solo Admin o Doctor).
 * @param {{ id_paciente: number, newPin: string }} payload
 */
export async function adminResetPatientPin(payload) {
  const id = Number(payload?.id_paciente);
  const raw = String(payload?.newPin ?? '').replace(/\s/g, '');
  if (!id || id <= 0) throw new Error('Paciente inválido');
  if (!/^\d{4}$/.test(raw)) throw new Error('El PIN debe ser exactamente 4 dígitos');
  const { data } = await client.put(API_PATHS.AUTH_UNIFIED_ADMIN_RESET_PATIENT_PIN, {
    id_paciente: id,
    newPin: raw,
  });
  return data;
}

/**
 * Lista de usuarios (solo Admin).
 * @returns {Promise<Array>}
 */
export async function getUsuarios() {
  const { data } = await client.get(API_PATHS.AUTH_USUARIOS);
  const list = data?.todos_usuarios ?? data?.usuarios ?? data?.data?.usuarios ?? data?.data ?? (Array.isArray(data) ? data : []);
  return Array.isArray(list) ? list : [];
}

/**
 * Obtener usuario por ID (solo Admin).
 * @param {number|string} id
 */
export async function getUsuarioById(id) {
  const parsed = Number(id);
  if (!parsed || parsed <= 0) throw new Error('ID de usuario inválido');
  const { data } = await client.get(`${API_PATHS.AUTH_USUARIOS}/${parsed}`);
  return data?.usuario ?? data?.data ?? data;
}

/**
 * Actualizar usuario (solo Admin).
 * @param {number|string} id
 * @param {{ email?: string, rol?: string, activo?: boolean }} body
 */
export async function updateUsuario(id, body) {
  const parsed = Number(id);
  if (!parsed || parsed <= 0) throw new Error('ID de usuario inválido');
  const { data } = await client.put(`${API_PATHS.AUTH_USUARIOS}/${parsed}`, body);
  return data?.usuario ?? data?.data ?? data;
}

/**
 * Eliminar/desactivar usuario (solo Admin).
 * @param {number|string} id
 */
export async function deleteUsuario(id) {
  const parsed = Number(id);
  if (!parsed || parsed <= 0) throw new Error('ID de usuario inválido');
  await client.delete(`${API_PATHS.AUTH_USUARIOS}/${parsed}`);
}

/**
 * Solicitar recuperación de contraseña (envía email con enlace).
 * @param {{ email: string }} payload
 */
export async function forgotPassword(payload) {
  const email = sanitizeEmail(payload?.email);
  if (!email) throw new Error('El correo es obligatorio');
  const { data } = await client.post(API_PATHS.AUTH_FORGOT_PASSWORD, { email });
  return data;
}

/**
 * Restablecer contraseña con token recibido por email.
 * @param {{ token: string, newPassword: string }} payload
 */
export async function resetPassword(payload) {
  const token = payload?.token?.trim();
  const newPassword = normalizeString(payload?.newPassword, { maxLength: 128 });
  if (!token || !newPassword) throw new Error('Token y nueva contraseña son requeridos');
  const { data } = await client.post(API_PATHS.AUTH_RESET_PASSWORD, { token, newPassword });
  return data;
}

/**
 * Cierra sesión en el cliente (no llama al backend).
 */
export function logout() {
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
}
