/**
 * Normaliza el conteo de notificaciones de doctor pendientes de leer
 * (backend: estado `enviada`, campo `no_leidas`).
 *
 * No utiliza `total` del API (recuento global de filas), para evitar badges
 * incoherentes con la lista filtrada o con “pendientes de leer”.
 *
 * @param {Record<string, unknown> | null | undefined} payload - Cuerpo ya normalizado (`data` del JSON).
 * @returns {number} Entero ≥ 0
 */
export function parseNoLeidasCount(payload) {
  if (payload == null || typeof payload !== 'object') return 0;
  const raw = payload.no_leidas ?? payload.contador;
  if (raw == null || raw === '') return 0;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.floor(n));
}
