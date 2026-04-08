/**
 * Validación declarativa de tipos en payloads (JSON web/móvil).
 */

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function checkOne(value, type, keyPath) {
  if (type.endsWith('?')) {
    const inner = type.slice(0, -1);
    if (value === undefined || value === null) return null;
    return checkOne(value, inner, keyPath);
  }

  switch (type) {
    case 'string':
      if (typeof value !== 'string') return `${keyPath}: se esperaba string, recibió ${typeof value}`;
      return null;
    case 'number':
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return `${keyPath}: se esperaba number finito, recibió ${typeof value}`;
      }
      return null;
    case 'integer':
      if (typeof value !== 'number' || !Number.isInteger(value)) {
        return `${keyPath}: se esperaba integer, recibió ${typeof value} (${value})`;
      }
      return null;
    case 'boolean':
      if (typeof value !== 'boolean') return `${keyPath}: se esperaba boolean, recibió ${typeof value}`;
      return null;
    case 'object':
      if (!isPlainObject(value)) return `${keyPath}: se esperaba object plano, recibió ${typeof value}`;
      return null;
    case 'array':
      if (!Array.isArray(value)) return `${keyPath}: se esperaba array, recibió ${typeof value}`;
      return null;
    case 'isoDate':
      if (typeof value !== 'string') return `${keyPath}: se esperaba string ISO date, recibió ${typeof value}`;
      if (Number.isNaN(Date.parse(value))) return `${keyPath}: fecha no parseable: ${value}`;
      return null;
    /** Entero estricto o string numérico (algunos formularios web envían "42"). */
    case 'integerFlexible':
      if (typeof value === 'number' && Number.isInteger(value)) return null;
      if (typeof value === 'string' && value.trim() !== '' && Number.isInteger(Number(value))) return null;
      return `${keyPath}: se esperaba integer o string entero, recibió ${typeof value} (${value})`;
    /** Número finito o string parseable (evitar boolean). */
    case 'numberFlexible':
      if (typeof value === 'number' && Number.isFinite(value)) return null;
      if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return null;
      return `${keyPath}: se esperaba number o string numérico, recibió ${typeof value}`;
    case 'null':
      if (value !== null) return `${keyPath}: se esperaba null`;
      return null;
    default:
      return `${keyPath}: tipo desconocido "${type}"`;
  }
}

/**
 * @param {object} payload
 * @param {Record<string, string>} schema
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validatePayloadTypes(payload, schema) {
  if (!isPlainObject(payload)) {
    return { ok: false, errors: ['El cuerpo debe ser un objeto JSON'] };
  }
  const errors = [];
  for (const [key, type] of Object.entries(schema)) {
    if (!(key in payload)) {
      if (String(type).endsWith('?')) continue;
      errors.push(`Falta campo requerido: ${key}`);
      continue;
    }
    const err = checkOne(payload[key], type, key);
    if (err) errors.push(err);
  }
  return { ok: errors.length === 0, errors };
}
