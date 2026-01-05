-- ============================================================
-- MIGRACIÓN: Agregar campos referencia a deteccion_complicaciones
-- Fecha: 2025-12-30
-- Descripción: Añade campos para referencia según instrucción ⑪ del formato GAM
-- ============================================================

-- Verificar si las columnas ya existen
SELECT COUNT(*) INTO @col_referido_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'deteccion_complicaciones'
AND COLUMN_NAME = 'fue_referido';

SELECT COUNT(*) INTO @col_observaciones_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'deteccion_complicaciones'
AND COLUMN_NAME = 'referencia_observaciones';

-- Iniciar transacción
START TRANSACTION;

-- Paso 1: Agregar fue_referido si no existe
SET @sql_referido = IF(@col_referido_exists = 0,
    'ALTER TABLE deteccion_complicaciones ADD COLUMN fue_referido BOOLEAN DEFAULT FALSE COMMENT ''⑪ Indica si el paciente fue referido a otro nivel de atención (1=SI, 0=NO)'';',
    'SELECT ''Columna fue_referido ya existe'' AS message;'
);
PREPARE stmt_referido FROM @sql_referido;
EXECUTE stmt_referido;
DEALLOCATE PREPARE stmt_referido;

-- Paso 2: Agregar referencia_observaciones si no existe
SET @sql_observaciones = IF(@col_observaciones_exists = 0,
    'ALTER TABLE deteccion_complicaciones ADD COLUMN referencia_observaciones TEXT NULL COMMENT ''Detalles de la referencia (especialidad, institución, motivo)'';',
    'SELECT ''Columna referencia_observaciones ya existe'' AS message;'
);
PREPARE stmt_observaciones FROM @sql_observaciones;
EXECUTE stmt_observaciones;
DEALLOCATE PREPARE stmt_observaciones;

-- Confirmar transacción
COMMIT;

-- Verificación final
SELECT 
    'Migración completada' AS resultado,
    CASE WHEN @col_referido_exists = 0 THEN 'Columna fue_referido agregada' ELSE 'Columna fue_referido ya existía' END AS fue_referido,
    CASE WHEN @col_observaciones_exists = 0 THEN 'Columna referencia_observaciones agregada' ELSE 'Columna referencia_observaciones ya existía' END AS referencia_observaciones;

