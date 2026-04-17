-- Lugar / institución donde se aplicó la vacuna (opcional).
-- Si no usas el asegurado al arranque (ensureEsquemaVacunacionLugarColumn), ejecutar en MySQL:

ALTER TABLE esquema_vacunacion
  ADD COLUMN lugar_aplicacion VARCHAR(150) NULL
    COMMENT 'Lugar o institución donde se aplicó la vacuna (ej. IMSS, ISSSTE)'
  AFTER lote;
