-- ============================================================
-- MIGRACIÓN: Agregar campos baja y número GAM a pacientes
-- Fecha: 2025-12-30
-- Descripción: Añade campos según instrucción ⑭ del formato GAM
-- ============================================================

-- Verificar si las columnas ya existen
SELECT COUNT(*) INTO @col_fecha_baja_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'pacientes'
AND COLUMN_NAME = 'fecha_baja';

SELECT COUNT(*) INTO @col_motivo_baja_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'pacientes'
AND COLUMN_NAME = 'motivo_baja';

SELECT COUNT(*) INTO @col_numero_gam_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'pacientes'
AND COLUMN_NAME = 'numero_gam';

-- Iniciar transacción
START TRANSACTION;

-- Paso 1: Agregar fecha_baja (instrucción ⑭)
SET @sql_fecha_baja = IF(@col_fecha_baja_exists = 0,
    'ALTER TABLE pacientes ADD COLUMN fecha_baja DATE NULL COMMENT ''⑭ Fecha en que el paciente fue dado de baja del GAM. Debe ser >= fecha_registro'';',
    'SELECT ''Columna fecha_baja ya existe'' AS message;'
);
PREPARE stmt_fecha_baja FROM @sql_fecha_baja;
EXECUTE stmt_fecha_baja;
DEALLOCATE PREPARE stmt_fecha_baja;

-- Paso 2: Agregar motivo_baja
SET @sql_motivo_baja = IF(@col_motivo_baja_exists = 0,
    'ALTER TABLE pacientes ADD COLUMN motivo_baja TEXT NULL COMMENT ''Motivo de la baja del paciente del GAM'';',
    'SELECT ''Columna motivo_baja ya existe'' AS message;'
);
PREPARE stmt_motivo_baja FROM @sql_motivo_baja;
EXECUTE stmt_motivo_baja;
DEALLOCATE PREPARE stmt_motivo_baja;

-- Paso 3: Agregar numero_gam
SET @sql_numero_gam = IF(@col_numero_gam_exists = 0,
    'ALTER TABLE pacientes ADD COLUMN numero_gam INT NULL COMMENT ''Número de integrante en el GAM (para fórmulas y reportes). Debe ser único por módulo'';',
    'SELECT ''Columna numero_gam ya existe'' AS message;'
);
PREPARE stmt_numero_gam FROM @sql_numero_gam;
EXECUTE stmt_numero_gam;
DEALLOCATE PREPARE stmt_numero_gam;

-- Paso 4: Agregar índice único compuesto para numero_gam por módulo
SELECT COUNT(*) INTO @idx_numero_gam_exists 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'pacientes' 
AND INDEX_NAME = 'idx_modulo_numero_gam';

SET @sql_idx_numero_gam = IF(@idx_numero_gam_exists = 0, 
    'CREATE UNIQUE INDEX idx_modulo_numero_gam ON pacientes (id_modulo, numero_gam);', 
    'SELECT ''Índice idx_modulo_numero_gam ya existe'' AS message;'
);
PREPARE stmt_idx_numero_gam FROM @sql_idx_numero_gam;
EXECUTE stmt_idx_numero_gam;
DEALLOCATE PREPARE stmt_idx_numero_gam;

-- Confirmar transacción
COMMIT;

-- Verificación final
SELECT 
    'Migración completada' AS resultado,
    CASE WHEN @col_fecha_baja_exists = 0 THEN 'Columna fecha_baja agregada' ELSE 'Columna fecha_baja ya existía' END AS fecha_baja,
    CASE WHEN @col_motivo_baja_exists = 0 THEN 'Columna motivo_baja agregada' ELSE 'Columna motivo_baja ya existía' END AS motivo_baja,
    CASE WHEN @col_numero_gam_exists = 0 THEN 'Columna numero_gam agregada' ELSE 'Columna numero_gam ya existía' END AS numero_gam;

