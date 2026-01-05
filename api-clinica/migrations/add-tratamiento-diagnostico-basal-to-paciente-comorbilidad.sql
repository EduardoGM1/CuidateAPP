-- ============================================================
-- MIGRACIÓN: Agregar campos tratamiento y diagnóstico basal a paciente_comorbilidad
-- Fecha: 2025-12-30
-- Descripción: Añade campos según instrucciones ①, ②, ③ del formato GAM
-- ============================================================

-- Verificar si las columnas ya existen
SELECT COUNT(*) INTO @col_basal_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'paciente_comorbilidad'
AND COLUMN_NAME = 'es_diagnostico_basal';

SELECT COUNT(*) INTO @col_agregado_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'paciente_comorbilidad'
AND COLUMN_NAME = 'es_agregado_posterior';

SELECT COUNT(*) INTO @col_año_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'paciente_comorbilidad'
AND COLUMN_NAME = 'año_diagnostico';

SELECT COUNT(*) INTO @col_trat_no_farm_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'paciente_comorbilidad'
AND COLUMN_NAME = 'recibe_tratamiento_no_farmacologico';

SELECT COUNT(*) INTO @col_trat_farm_exists
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'paciente_comorbilidad'
AND COLUMN_NAME = 'recibe_tratamiento_farmacologico';

-- Iniciar transacción
START TRANSACTION;

-- Paso 1: Agregar es_diagnostico_basal (instrucción ①)
SET @sql_basal = IF(@col_basal_exists = 0,
    'ALTER TABLE paciente_comorbilidad ADD COLUMN es_diagnostico_basal BOOLEAN DEFAULT FALSE COMMENT ''① Indica si es el diagnóstico basal (inicial) del paciente'';',
    'SELECT ''Columna es_diagnostico_basal ya existe'' AS message;'
);
PREPARE stmt_basal FROM @sql_basal;
EXECUTE stmt_basal;
DEALLOCATE PREPARE stmt_basal;

-- Paso 2: Agregar es_agregado_posterior
SET @sql_agregado = IF(@col_agregado_exists = 0,
    'ALTER TABLE paciente_comorbilidad ADD COLUMN es_agregado_posterior BOOLEAN DEFAULT FALSE COMMENT ''Indica si el diagnóstico fue agregado después del diagnóstico basal'';',
    'SELECT ''Columna es_agregado_posterior ya existe'' AS message;'
);
PREPARE stmt_agregado FROM @sql_agregado;
EXECUTE stmt_agregado;
DEALLOCATE PREPARE stmt_agregado;

-- Paso 3: Agregar año_diagnostico
SET @sql_año = IF(@col_año_exists = 0,
    'ALTER TABLE paciente_comorbilidad ADD COLUMN año_diagnostico INTEGER NULL COMMENT ''Año en que se diagnosticó la comorbilidad (YYYY). Rango válido: 1900 - año actual'';',
    'SELECT ''Columna año_diagnostico ya existe'' AS message;'
);
PREPARE stmt_año FROM @sql_año;
EXECUTE stmt_año;
DEALLOCATE PREPARE stmt_año;

-- Paso 4: Agregar recibe_tratamiento_no_farmacologico (instrucción ②)
SET @sql_trat_no_farm = IF(@col_trat_no_farm_exists = 0,
    'ALTER TABLE paciente_comorbilidad ADD COLUMN recibe_tratamiento_no_farmacologico BOOLEAN DEFAULT FALSE COMMENT ''② Indica si el paciente recibe tratamiento no farmacológico (dieta, ejercicio, cambios de estilo de vida)'';',
    'SELECT ''Columna recibe_tratamiento_no_farmacologico ya existe'' AS message;'
);
PREPARE stmt_trat_no_farm FROM @sql_trat_no_farm;
EXECUTE stmt_trat_no_farm;
DEALLOCATE PREPARE stmt_trat_no_farm;

-- Paso 5: Agregar recibe_tratamiento_farmacologico (instrucción ③)
SET @sql_trat_farm = IF(@col_trat_farm_exists = 0,
    'ALTER TABLE paciente_comorbilidad ADD COLUMN recibe_tratamiento_farmacologico BOOLEAN DEFAULT FALSE COMMENT ''③ Indica si el paciente recibe tratamiento farmacológico. Debe sincronizarse con PlanMedicacion activo'';',
    'SELECT ''Columna recibe_tratamiento_farmacologico ya existe'' AS message;'
);
PREPARE stmt_trat_farm FROM @sql_trat_farm;
EXECUTE stmt_trat_farm;
DEALLOCATE PREPARE stmt_trat_farm;

-- Paso 6: Agregar índice para año_diagnostico
SELECT COUNT(*) INTO @idx_año_exists 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'paciente_comorbilidad' 
AND INDEX_NAME = 'idx_año_diagnostico';

SET @sql_idx_año = IF(@idx_año_exists = 0, 
    'CREATE INDEX idx_año_diagnostico ON paciente_comorbilidad (año_diagnostico);', 
    'SELECT ''Índice idx_año_diagnostico ya existe'' AS message;'
);
PREPARE stmt_idx_año FROM @sql_idx_año;
EXECUTE stmt_idx_año;
DEALLOCATE PREPARE stmt_idx_año;

-- Confirmar transacción
COMMIT;

-- Verificación final
SELECT 
    'Migración completada' AS resultado,
    CASE WHEN @col_basal_exists = 0 THEN 'Columna es_diagnostico_basal agregada' ELSE 'Columna es_diagnostico_basal ya existía' END AS es_diagnostico_basal,
    CASE WHEN @col_agregado_exists = 0 THEN 'Columna es_agregado_posterior agregada' ELSE 'Columna es_agregado_posterior ya existía' END AS es_agregado_posterior,
    CASE WHEN @col_año_exists = 0 THEN 'Columna año_diagnostico agregada' ELSE 'Columna año_diagnostico ya existía' END AS año_diagnostico,
    CASE WHEN @col_trat_no_farm_exists = 0 THEN 'Columna recibe_tratamiento_no_farmacologico agregada' ELSE 'Columna recibe_tratamiento_no_farmacologico ya existía' END AS recibe_tratamiento_no_farmacologico,
    CASE WHEN @col_trat_farm_exists = 0 THEN 'Columna recibe_tratamiento_farmacologico agregada' ELSE 'Columna recibe_tratamiento_farmacologico ya existía' END AS recibe_tratamiento_farmacologico;

