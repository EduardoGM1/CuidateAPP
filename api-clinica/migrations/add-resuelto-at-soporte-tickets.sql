-- Tickets en "resuelto" pasan a "cerrado" automáticamente tras TICKET_RESUELTO_CIERRE_DIAS (default 2).
-- Ejecutar en MySQL si no usas el asegurado automático al arranque (ensureTicketResueltoAt).

ALTER TABLE soporte_tickets
  ADD COLUMN resuelto_at DATETIME NULL
    COMMENT 'Cuando pasó a resuelto; tras N días el job pasa el ticket a cerrado'
  AFTER estado;

UPDATE soporte_tickets
SET resuelto_at = updated_at
WHERE estado = 'resuelto' AND resuelto_at IS NULL;
