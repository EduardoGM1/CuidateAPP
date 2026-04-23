-- ============================================================
-- MIGRACIÓN: Agregar número de expediente clínico a pacientes
-- Fecha: 2026-04-22
-- Descripción: Añade columna numero_expediente e índice único
-- ============================================================

SELECT COUNT(*) INTO @col_numero_expediente_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'pacientes'
AND COLUMN_NAME = 'numero_expediente';

START TRANSACTION;

SET @sql_numero_expediente = IF(@col_numero_expediente_exists = 0,
    'ALTER TABLE pacientes ADD COLUMN numero_expediente VARCHAR(50) NULL COMMENT ''Número de expediente clínico del paciente. Debe ser único.'';',
    'SELECT ''Columna numero_expediente ya existe'' AS message;'
);
PREPARE stmt_numero_expediente FROM @sql_numero_expediente;
EXECUTE stmt_numero_expediente;
DEALLOCATE PREPARE stmt_numero_expediente;

SELECT COUNT(*) INTO @idx_numero_expediente_exists
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'pacientes'
AND INDEX_NAME = 'idx_numero_expediente_unico';

SET @sql_idx_numero_expediente = IF(@idx_numero_expediente_exists = 0,
    'CREATE UNIQUE INDEX idx_numero_expediente_unico ON pacientes (numero_expediente);',
    'SELECT ''Índice idx_numero_expediente_unico ya existe'' AS message;'
);
PREPARE stmt_idx_numero_expediente FROM @sql_idx_numero_expediente;
EXECUTE stmt_idx_numero_expediente;
DEALLOCATE PREPARE stmt_idx_numero_expediente;

COMMIT;

SELECT
  'Migración completada' AS resultado,
  CASE
    WHEN @col_numero_expediente_exists = 0 THEN 'Columna numero_expediente agregada'
    ELSE 'Columna numero_expediente ya existía'
  END AS numero_expediente,
  CASE
    WHEN @idx_numero_expediente_exists = 0 THEN 'Índice único de numero_expediente agregado'
    ELSE 'Índice único de numero_expediente ya existía'
  END AS indice;

