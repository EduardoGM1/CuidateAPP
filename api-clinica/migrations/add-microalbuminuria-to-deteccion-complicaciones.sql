-- ============================================================
-- MIGRACIÓN: Agregar campos microalbuminuria a deteccion_complicaciones
-- Fecha: 2025-12-30
-- Descripción: Añade campos para microalbuminuria según instrucción ⑥ del formato GAM
-- ============================================================

-- Verificar si las columnas ya existen
SELECT COUNT(*) INTO @col_realizada_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'deteccion_complicaciones'
AND COLUMN_NAME = 'microalbuminuria_realizada';

SELECT COUNT(*) INTO @col_resultado_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'deteccion_complicaciones'
AND COLUMN_NAME = 'microalbuminuria_resultado';

-- Iniciar transacción
START TRANSACTION;

-- Paso 1: Agregar microalbuminuria_realizada si no existe
SET @sql_realizada = IF(@col_realizada_exists = 0,
    'ALTER TABLE deteccion_complicaciones ADD COLUMN microalbuminuria_realizada BOOLEAN DEFAULT FALSE COMMENT ''⑥ Indica si se realizó examen de microalbuminuria (1=SI, 0=NO)'';',
    'SELECT ''Columna microalbuminuria_realizada ya existe'' AS message;'
);
PREPARE stmt_realizada FROM @sql_realizada;
EXECUTE stmt_realizada;
DEALLOCATE PREPARE stmt_realizada;

-- Paso 2: Agregar microalbuminuria_resultado si no existe
SET @sql_resultado = IF(@col_resultado_exists = 0,
    'ALTER TABLE deteccion_complicaciones ADD COLUMN microalbuminuria_resultado DECIMAL(10,2) NULL COMMENT ''Resultado del examen de microalbuminuria (mg/L o mg/g de creatinina). Valores normales <30 mg/g'';',
    'SELECT ''Columna microalbuminuria_resultado ya existe'' AS message;'
);
PREPARE stmt_resultado FROM @sql_resultado;
EXECUTE stmt_resultado;
DEALLOCATE PREPARE stmt_resultado;

-- Confirmar transacción
COMMIT;

-- Verificación final
SELECT 
    'Migración completada' AS resultado,
    CASE WHEN @col_realizada_exists = 0 THEN 'Columna microalbuminuria_realizada agregada' ELSE 'Columna microalbuminuria_realizada ya existía' END AS microalbuminuria_realizada,
    CASE WHEN @col_resultado_exists = 0 THEN 'Columna microalbuminuria_resultado agregada' ELSE 'Columna microalbuminuria_resultado ya existía' END AS microalbuminuria_resultado;

