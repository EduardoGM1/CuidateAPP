-- =====================================================
-- MIGRACIÓN: Corregir ENUM de institucion_salud
-- =====================================================
-- Fecha: 2025-12-31
-- Descripción: Asegurar que el ENUM incluya todos los valores válidos
-- =====================================================

-- Verificar valores actuales del ENUM
SELECT COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'pacientes'
  AND COLUMN_NAME = 'institucion_salud';

-- Modificar el ENUM para incluir todos los valores válidos
-- Nota: MySQL requiere recrear la columna para modificar ENUM
ALTER TABLE pacientes 
MODIFY COLUMN institucion_salud ENUM('IMSS', 'Bienestar', 'ISSSTE', 'Particular', 'Otro') 
NULL DEFAULT NULL;

-- Verificar que se aplicó correctamente
SELECT COLUMN_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'pacientes'
  AND COLUMN_NAME = 'institucion_salud';

