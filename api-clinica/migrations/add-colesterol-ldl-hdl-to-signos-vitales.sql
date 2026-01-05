-- ============================================================
-- MIGRACIÓN: Agregar campos colesterol_ldl y colesterol_hdl a signos_vitales
-- Fecha: 2025-12-29
-- Descripción: Añade campos para colesterol LDL y HDL según formato GAM
--              y actualiza el comentario de colesterol_mg_dl
-- ============================================================

-- Verificar si la columna colesterol_ldl ya existe
SELECT COUNT(*) INTO @col_ldl_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'signos_vitales'
AND COLUMN_NAME = 'colesterol_ldl';

-- Verificar si la columna colesterol_hdl ya existe
SELECT COUNT(*) INTO @col_hdl_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'signos_vitales'
AND COLUMN_NAME = 'colesterol_hdl';

-- Iniciar transacción
START TRANSACTION;

-- Paso 1: Agregar colesterol_ldl si no existe
SET @sql_ldl = IF(@col_ldl_exists = 0,
    'ALTER TABLE signos_vitales ADD COLUMN colesterol_ldl DECIMAL(6,2) NULL COMMENT ''Colesterol LDL (mg/dl) - Solo para pacientes con diagnóstico de Hipercolesterolemia'';',
    'SELECT ''Columna colesterol_ldl ya existe'' AS message;'
);
PREPARE stmt_ldl FROM @sql_ldl;
EXECUTE stmt_ldl;
DEALLOCATE PREPARE stmt_ldl;

-- Paso 2: Agregar colesterol_hdl si no existe
SET @sql_hdl = IF(@col_hdl_exists = 0,
    'ALTER TABLE signos_vitales ADD COLUMN colesterol_hdl DECIMAL(6,2) NULL COMMENT ''Colesterol HDL (mg/dl) - Solo para pacientes con diagnóstico de Hipercolesterolemia'';',
    'SELECT ''Columna colesterol_hdl ya existe'' AS message;'
);
PREPARE stmt_hdl FROM @sql_hdl;
EXECUTE stmt_hdl;
DEALLOCATE PREPARE stmt_hdl;

-- Paso 3: Actualizar comentario de colesterol_mg_dl
ALTER TABLE signos_vitales MODIFY COLUMN colesterol_mg_dl DECIMAL(6,2) NULL COMMENT 'Colesterol Total (mg/dl) - Campo obligatorio para criterios de acreditación';

-- Paso 4: Añadir índices para optimización si no existen
SELECT COUNT(*) INTO @idx_ldl_exists 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'signos_vitales' 
AND INDEX_NAME = 'idx_colesterol_ldl';

SET @sql_idx_ldl = IF(@idx_ldl_exists = 0, 
    'CREATE INDEX idx_colesterol_ldl ON signos_vitales (colesterol_ldl);', 
    'SELECT ''Índice idx_colesterol_ldl ya existe'' AS message;'
);
PREPARE stmt_idx_ldl FROM @sql_idx_ldl;
EXECUTE stmt_idx_ldl;
DEALLOCATE PREPARE stmt_idx_ldl;

SELECT COUNT(*) INTO @idx_hdl_exists 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'signos_vitales' 
AND INDEX_NAME = 'idx_colesterol_hdl';

SET @sql_idx_hdl = IF(@idx_hdl_exists = 0, 
    'CREATE INDEX idx_colesterol_hdl ON signos_vitales (colesterol_hdl);', 
    'SELECT ''Índice idx_colesterol_hdl ya existe'' AS message;'
);
PREPARE stmt_idx_hdl FROM @sql_idx_hdl;
EXECUTE stmt_idx_hdl;
DEALLOCATE PREPARE stmt_idx_hdl;

-- Confirmar transacción
COMMIT;

-- Verificación final
SELECT 
    'Migración completada' AS resultado,
    CASE WHEN @col_ldl_exists = 0 THEN 'Columna colesterol_ldl agregada' ELSE 'Columna colesterol_ldl ya existía' END AS colesterol_ldl,
    CASE WHEN @col_hdl_exists = 0 THEN 'Columna colesterol_hdl agregada' ELSE 'Columna colesterol_hdl ya existía' END AS colesterol_hdl;
