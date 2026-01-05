-- =====================================================
-- MIGRACIÓN: Agregar campos de Diagnóstico Basal y Tratamiento
-- a la tabla paciente_comorbilidad según FORMA_2022_OFICIAL
-- =====================================================
-- Fecha: 4 de enero de 2026
-- Objetivo: Agregar campos requeridos por el formato GAM:
--   - ① Basal del paciente (es_diagnostico_basal, año_diagnostico, es_agregado_posterior)
--   - ② No Farmacológico (recibe_tratamiento_no_farmacologico)
--   - ③ Farmacológico (recibe_tratamiento_farmacologico)
-- =====================================================

-- Verificar si los campos ya existen antes de agregarlos
-- Esto permite ejecutar la migración múltiples veces sin errores

-- 1. Agregar campo es_diagnostico_basal (① Basal del paciente)
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'paciente_comorbilidad'
    AND COLUMN_NAME = 'es_diagnostico_basal'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE paciente_comorbilidad 
   ADD COLUMN es_diagnostico_basal BOOLEAN NOT NULL DEFAULT FALSE 
   COMMENT ''① Indica si es el diagnóstico basal (inicial) del paciente''',
  'SELECT ''Campo es_diagnostico_basal ya existe'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Agregar campo es_agregado_posterior
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'paciente_comorbilidad'
    AND COLUMN_NAME = 'es_agregado_posterior'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE paciente_comorbilidad 
   ADD COLUMN es_agregado_posterior BOOLEAN NOT NULL DEFAULT FALSE 
   COMMENT ''Indica si el diagnóstico fue agregado después del diagnóstico basal''',
  'SELECT ''Campo es_agregado_posterior ya existe'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Agregar campo año_diagnostico
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'paciente_comorbilidad'
    AND COLUMN_NAME = 'año_diagnostico'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE paciente_comorbilidad 
   ADD COLUMN año_diagnostico INT NULL 
   COMMENT ''Año en que se diagnosticó la comorbilidad (YYYY). Rango válido: 1900 - año actual''',
  'SELECT ''Campo año_diagnostico ya existe'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Agregar campo recibe_tratamiento_no_farmacologico (② No Farmacológico)
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'paciente_comorbilidad'
    AND COLUMN_NAME = 'recibe_tratamiento_no_farmacologico'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE paciente_comorbilidad 
   ADD COLUMN recibe_tratamiento_no_farmacologico BOOLEAN NOT NULL DEFAULT FALSE 
   COMMENT ''② Indica si el paciente recibe tratamiento no farmacológico (dieta, ejercicio, cambios de estilo de vida)''',
  'SELECT ''Campo recibe_tratamiento_no_farmacologico ya existe'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 5. Agregar campo recibe_tratamiento_farmacologico (③ Farmacológico)
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'paciente_comorbilidad'
    AND COLUMN_NAME = 'recibe_tratamiento_farmacologico'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE paciente_comorbilidad 
   ADD COLUMN recibe_tratamiento_farmacologico BOOLEAN NOT NULL DEFAULT FALSE 
   COMMENT ''③ Indica si el paciente recibe tratamiento farmacológico. Debe sincronizarse con PlanMedicacion activo''',
  'SELECT ''Campo recibe_tratamiento_farmacologico ya existe'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar que todos los campos fueron agregados correctamente
SELECT 
  COLUMN_NAME,
  DATA_TYPE,
  IS_NULLABLE,
  COLUMN_DEFAULT,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'paciente_comorbilidad'
  AND COLUMN_NAME IN (
    'es_diagnostico_basal',
    'es_agregado_posterior',
    'año_diagnostico',
    'recibe_tratamiento_no_farmacologico',
    'recibe_tratamiento_farmacologico'
  )
ORDER BY COLUMN_NAME;

