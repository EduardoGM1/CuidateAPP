-- Migración: Agregar campo anos_padecimiento a paciente_comorbilidad
-- Fecha: 2025-11-09
-- Descripción: Agrega el campo para registrar cuántos años tiene el paciente con cada comorbilidad

-- Verificar si la columna ya existe
SELECT COUNT(*) INTO @column_exists
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'paciente_comorbilidad'
AND COLUMN_NAME = 'anos_padecimiento';

-- Agregar columna solo si no existe
SET @sql = IF(@column_exists = 0,
    'ALTER TABLE paciente_comorbilidad ADD COLUMN anos_padecimiento INT NULL COMMENT ''Años que el paciente ha tenido esta comorbilidad'' AFTER observaciones',
    'SELECT ''Columna anos_padecimiento ya existe'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

