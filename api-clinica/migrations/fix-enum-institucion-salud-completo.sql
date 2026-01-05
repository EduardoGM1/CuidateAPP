-- =====================================================
-- MIGRACIÓN: Corregir ENUM de institucion_salud
-- =====================================================
-- Fecha: 2025-12-31
-- Descripción: Actualizar ENUM para coincidir con modelo y frontend
-- =====================================================

-- Verificar valores actuales
SELECT COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'pacientes'
  AND COLUMN_NAME = 'institucion_salud';

-- Actualizar ENUM para incluir todos los valores necesarios
-- Nota: MySQL requiere recrear la columna para modificar ENUM
ALTER TABLE pacientes 
MODIFY COLUMN institucion_salud ENUM(
  'IMSS', 
  'Bienestar', 
  'ISSSTE', 
  'Particular', 
  'Otro',
  'SEMAR',
  'INSABI',
  'PEMEX',
  'SEDENA',
  'Secretaría de Salud',
  'Ninguna'
) NULL DEFAULT NULL;

-- Verificar que se aplicó correctamente
SELECT COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'pacientes'
  AND COLUMN_NAME = 'institucion_salud';

