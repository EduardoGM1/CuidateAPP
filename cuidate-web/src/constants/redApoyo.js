/**
 * Red de apoyo: estructura de un contacto (paridad web/móvil).
 * Reutilizado en AgregarPaciente y EditarPaciente.
 */
export const RED_APOYO_EMPTY_ITEM = {
  nombre_contacto: '',
  numero_celular: '',
  email: '',
  direccion: '',
  localidad: '',
  parentesco: '',
};

export function createEmptyRedApoyoItem() {
  return { ...RED_APOYO_EMPTY_ITEM };
}
