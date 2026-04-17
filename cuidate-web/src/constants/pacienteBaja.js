/**
 * Catálogo y utilidades para baja de paciente (GAM ⑭).
 * Paridad con app móvil: ClinicaMovil/src/constants/pacienteBaja.js (misma lógica).
 * `motivo_baja` en API es TEXT; categorías fijas + detalle para "Otros".
 */

export const MOTIVO_BAJA_VALUE = {
  DEFUNCION: 'defuncion',
  CAMBIO_DOMICILIO: 'cambio_domicilio',
  OTROS: 'otros',
};

const LABEL = {
  [MOTIVO_BAJA_VALUE.DEFUNCION]: 'Defunción',
  [MOTIVO_BAJA_VALUE.CAMBIO_DOMICILIO]: 'Cambio de domicilio',
  [MOTIVO_BAJA_VALUE.OTROS]: 'Otros',
};

/** Texto exacto guardado en BD para categorías cerradas (legible en reportes). */
export function motivoBajaLabelForValue(value) {
  if (!value) return '';
  return LABEL[value] || '';
}

/** Opciones para Select (valor interno → etiqueta). */
export function getMotivoBajaSelectOptions() {
  return [
    { value: '', label: '— Seleccionar motivo —' },
    { value: MOTIVO_BAJA_VALUE.DEFUNCION, label: LABEL[MOTIVO_BAJA_VALUE.DEFUNCION] },
    { value: MOTIVO_BAJA_VALUE.CAMBIO_DOMICILIO, label: LABEL[MOTIVO_BAJA_VALUE.CAMBIO_DOMICILIO] },
    { value: MOTIVO_BAJA_VALUE.OTROS, label: LABEL[MOTIVO_BAJA_VALUE.OTROS] },
  ];
}

/**
 * Serializa motivo para `motivo_baja` (TEXT en API).
 */
export function buildMotivoBajaStorageString(tipo, detalleOtros) {
  if (!tipo) return null;
  if (tipo === MOTIVO_BAJA_VALUE.DEFUNCION) return LABEL[MOTIVO_BAJA_VALUE.DEFUNCION];
  if (tipo === MOTIVO_BAJA_VALUE.CAMBIO_DOMICILIO) return LABEL[MOTIVO_BAJA_VALUE.CAMBIO_DOMICILIO];
  const d = (detalleOtros || '').trim();
  return d ? `Otros: ${d}` : LABEL[MOTIVO_BAJA_VALUE.OTROS];
}

/**
 * Interpreta `motivo_baja` existente (web categorizado o texto libre de móvil) para el formulario.
 * @returns {{ tipo: string, detalleOtros: string }}
 */
export function parseMotivoBajaForForm(motivoBajaRaw) {
  const raw = String(motivoBajaRaw ?? '').trim();
  if (!raw) return { tipo: '', detalleOtros: '' };

  const def = LABEL[MOTIVO_BAJA_VALUE.DEFUNCION];
  const cam = LABEL[MOTIVO_BAJA_VALUE.CAMBIO_DOMICILIO];
  if (raw === def || raw.toLowerCase() === def.toLowerCase()) {
    return { tipo: MOTIVO_BAJA_VALUE.DEFUNCION, detalleOtros: '' };
  }
  if (raw === cam || raw.toLowerCase() === cam.toLowerCase()) {
    return { tipo: MOTIVO_BAJA_VALUE.CAMBIO_DOMICILIO, detalleOtros: '' };
  }

  const otrosMatch = raw.match(/^otros\s*:\s*(.*)$/i);
  if (otrosMatch) {
    return { tipo: MOTIVO_BAJA_VALUE.OTROS, detalleOtros: otrosMatch[1].trim() };
  }

  return { tipo: MOTIVO_BAJA_VALUE.OTROS, detalleOtros: raw };
}

/**
 * Fragmento de body para PATCH de paciente (solo uso admin: activo + baja GAM).
 */
export function buildPacienteBajaApiPatchForAdmin({
  activo,
  fecha_baja,
  motivo_baja_tipo,
  motivo_baja_detalle,
}) {
  if (activo !== false) {
    return { activo: true, fecha_baja: null, motivo_baja: null };
  }
  const f = (fecha_baja || '').trim();
  return {
    activo: false,
    fecha_baja: f || null,
    motivo_baja: buildMotivoBajaStorageString(motivo_baja_tipo, motivo_baja_detalle),
  };
}
