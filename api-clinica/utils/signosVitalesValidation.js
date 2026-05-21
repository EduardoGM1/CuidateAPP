/**
 * Validación y normalización de signos vitales antes de persistir (evita 500 por DECIMAL overflow).
 */

const LIMITS = {
  peso_kg: { min: 1, max: 500, label: 'Peso (kg)' },
  talla_m: { min: 0.5, max: 2.5, label: 'Talla (m)' },
  medida_cintura_cm: { min: 30, max: 250, label: 'Cintura (cm)' },
  presion_sistolica: { min: 50, max: 250, label: 'PA sistólica' },
  presion_diastolica: { min: 30, max: 150, label: 'PA diastólica' },
  glucosa_mg_dl: { min: 20, max: 600, label: 'Glucosa' },
  colesterol_mg_dl: { min: 50, max: 500, label: 'Colesterol total' },
  trigliceridos_mg_dl: { min: 20, max: 1000, label: 'Triglicéridos' },
};

function parseOptionalNumber(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = parseFloat(String(raw).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Si el usuario ingresa centímetros (ej. 155), convertir a metros (1.55).
 * @param {number} talla
 * @returns {{ value: number|null, normalizedFromCm: boolean, error: string|null }}
 */
export function normalizeTallaMetros(talla) {
  const n = typeof talla === 'number' ? talla : parseOptionalNumber(talla);
  if (n === null) return { value: null, normalizedFromCm: false, error: null };
  if (Number.isNaN(n)) {
    return { value: null, normalizedFromCm: false, error: 'Talla inválida' };
  }
  if (n > 3 && n <= 250) {
    const metros = parseFloat((n / 100).toFixed(2));
    if (metros < LIMITS.talla_m.min || metros > LIMITS.talla_m.max) {
      return {
        value: null,
        normalizedFromCm: true,
        error: `Tras convertir ${n} cm a metros (${metros}), la talla queda fuera de rango (${LIMITS.talla_m.min}–${LIMITS.talla_m.max} m)`,
      };
    }
    return { value: metros, normalizedFromCm: true, error: null };
  }
  if (n < LIMITS.talla_m.min || n > LIMITS.talla_m.max) {
    return {
      value: null,
      normalizedFromCm: false,
      error: `La talla debe estar entre ${LIMITS.talla_m.min} y ${LIMITS.talla_m.max} metros (ej. 1.70). Si usaste centímetros, ingresa 1.55 en lugar de 155.`,
    };
  }
  return { value: n, normalizedFromCm: false, error: null };
}

function checkRange(key, raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = parseOptionalNumber(raw);
  const { min, max, label } = LIMITS[key];
  if (Number.isNaN(n)) return `${label}: valor numérico inválido`;
  if (n < min || n > max) return `${label} debe estar entre ${min} y ${max}`;
  return null;
}

/**
 * @param {Record<string, unknown>} body
 * @param {{ partial?: boolean }} [opts] - partial: solo valida claves presentes (PUT)
 * @returns {{ ok: true, values: Record<string, number|null>, warnings: string[] } | { ok: false, error: string }}
 */
export function validateAndNormalizeSignosVitalesBody(body, opts = {}) {
  const { partial = false } = opts;
  const warnings = [];
  const values = {};

  const skip = (key) => partial && body[key] === undefined;

  if (!skip('peso_kg') && body.peso_kg !== undefined && body.peso_kg !== null && body.peso_kg !== '') {
    const err = checkRange('peso_kg', body.peso_kg);
    if (err) return { ok: false, error: err };
    values.peso_kg = parseOptionalNumber(body.peso_kg);
  } else if (!skip('peso_kg')) {
    values.peso_kg = null;
  }

  if (!skip('talla_m') && body.talla_m !== undefined && body.talla_m !== null && body.talla_m !== '') {
    const talla = normalizeTallaMetros(body.talla_m);
    if (talla.error) return { ok: false, error: talla.error };
    if (talla.normalizedFromCm) {
      warnings.push('La talla se interpretó en centímetros y se guardó en metros.');
    }
    values.talla_m = talla.value;
  } else if (!skip('talla_m')) {
    values.talla_m = null;
  }

  for (const key of ['medida_cintura_cm', 'presion_sistolica', 'presion_diastolica', 'glucosa_mg_dl', 'colesterol_mg_dl', 'trigliceridos_mg_dl']) {
    if (skip(key)) continue;
    if (body[key] !== undefined && body[key] !== null && body[key] !== '') {
      const err = checkRange(key, body[key]);
      if (err) return { ok: false, error: err };
      values[key] = key.startsWith('presion_')
        ? Math.round(parseOptionalNumber(body[key]))
        : parseOptionalNumber(body[key]);
    } else {
      values[key] = null;
    }
  }

  return { ok: true, values, warnings };
}

/**
 * @param {unknown} error
 * @returns {string|null}
 */
export function mapSignosVitalesDbError(error) {
  const msg = String(error?.message || '');
  if (/out of range|Data too long|decimal/i.test(msg)) {
    return 'Uno o más valores numéricos están fuera de rango permitido. Revisa talla (metros, ej. 1.70), peso y presión.';
  }
  if (/ValidationError|SequelizeValidationError/i.test(error?.name || '')) {
    return 'Datos de signos vitales inválidos. Verifica los valores ingresados.';
  }
  return null;
}
