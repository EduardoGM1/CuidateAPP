-- ============================================================
-- MIGRACIÓN: Agregar campos hba1c_porcentaje y edad_paciente_en_medicion a signos_vitales
-- Fecha: 2025-12-29
-- Descripción: Añade campos para HbA1c (%) y edad en medición según formato GAM
--              Campo obligatorio para criterios de acreditación
-- ============================================================

-- Verificar si la columna hba1c_porcentaje ya existe
SELECT COUNT(*) INTO @col_hba1c_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'signos_vitales'
AND COLUMN_NAME = 'hba1c_porcentaje';

-- Verificar si la columna edad_paciente_en_medicion ya existe
SELECT COUNT(*) INTO @col_edad_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'signos_vitales'
AND COLUMN_NAME = 'edad_paciente_en_medicion';

-- Iniciar transacción
START TRANSACTION;

-- Paso 1: Agregar hba1c_porcentaje si no existe
SET @sql_hba1c = IF(@col_hba1c_exists = 0,
    'ALTER TABLE signos_vitales ADD COLUMN hba1c_porcentaje DECIMAL(5,2) NULL COMMENT ''*HbA1c (%) - Campo obligatorio para criterios de acreditación. Rangos: 20-59 años <7%, 60+ años <8%'';',
    'SELECT ''Columna hba1c_porcentaje ya existe'' AS message;'
);
PREPARE stmt_hba1c FROM @sql_hba1c;
EXECUTE stmt_hba1c;
DEALLOCATE PREPARE stmt_hba1c;

-- Paso 2: Agregar edad_paciente_en_medicion si no existe
SET @sql_edad = IF(@col_edad_exists = 0,
    'ALTER TABLE signos_vitales ADD COLUMN edad_paciente_en_medicion INT NULL COMMENT ''Edad del paciente al momento de la medición (para clasificar rangos de HbA1c: 20-59 años vs 60+ años)'';',
    'SELECT ''Columna edad_paciente_en_medicion ya existe'' AS message;'
);
PREPARE stmt_edad FROM @sql_edad;
EXECUTE stmt_edad;
DEALLOCATE PREPARE stmt_edad;

-- Paso 3: Añadir índices para optimización si no existen
SELECT COUNT(*) INTO @idx_hba1c_exists 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'signos_vitales' 
AND INDEX_NAME = 'idx_hba1c';

SET @sql_idx_hba1c = IF(@idx_hba1c_exists = 0, 
    'CREATE INDEX idx_hba1c ON signos_vitales (hba1c_porcentaje);', 
    'SELECT ''Índice idx_hba1c ya existe'' AS message;'
);
PREPARE stmt_idx_hba1c FROM @sql_idx_hba1c;
EXECUTE stmt_idx_hba1c;
DEALLOCATE PREPARE stmt_idx_hba1c;

SELECT COUNT(*) INTO @idx_edad_exists 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'signos_vitales' 
AND INDEX_NAME = 'idx_edad_medicion';

SET @sql_idx_edad = IF(@idx_edad_exists = 0, 
    'CREATE INDEX idx_edad_medicion ON signos_vitales (edad_paciente_en_medicion);', 
    'SELECT ''Índice idx_edad_medicion ya existe'' AS message;'
);
PREPARE stmt_idx_edad FROM @sql_idx_edad;
EXECUTE stmt_idx_edad;
DEALLOCATE PREPARE stmt_idx_edad;

-- Confirmar transacción
COMMIT;

-- Verificación final
SELECT 
    'Migración completada' AS resultado,
    CASE WHEN @col_hba1c_exists = 0 THEN 'Columna hba1c_porcentaje agregada' ELSE 'Columna hba1c_porcentaje ya existía' END AS hba1c_porcentaje,
    CASE WHEN @col_edad_exists = 0 THEN 'Columna edad_paciente_en_medicion agregada' ELSE 'Columna edad_paciente_en_medicion ya existía' END AS edad_paciente_en_medicion;

