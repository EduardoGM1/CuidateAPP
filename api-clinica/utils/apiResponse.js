/**
 * Envelope REST uniforme (adopción gradual en endpoints nuevos/tocados).
 */

export function ok(res, data = null, meta = undefined, status = 200) {
  const body = { success: true };
  if (data !== null && data !== undefined) body.data = data;
  if (meta !== undefined) body.meta = meta;
  return res.status(status).json(body);
}

export function created(res, data = null, meta = undefined) {
  return ok(res, data, meta, 201);
}

export function fail(res, status, error, details = undefined) {
  const body = {
    success: false,
    error: typeof error === 'string' ? error : (error?.message || 'Error'),
  };
  if (details !== undefined) body.details = details;
  return res.status(status).json(body);
}

export default { ok, created, fail };
