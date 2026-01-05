-- Script SQL para agregar el campo 'estado' a la tabla 'pacientes'
-- Ejecutar este script en la base de datos para actualizar el esquema

-- Agregar columna 'estado' a la tabla pacientes
-- NOTA: Si la columna ya existe, este script fallará. 
-- Ajustar según el sistema de base de datos utilizado (MySQL, PostgreSQL, etc.)

-- Para MySQL/MariaDB:
ALTER TABLE pacientes 
ADD COLUMN estado VARCHAR(100) NOT NULL DEFAULT '' AFTER direccion;

-- Para PostgreSQL:
-- ALTER TABLE pacientes 
-- ADD COLUMN estado VARCHAR(100) NOT NULL DEFAULT '';

-- Actualizar registros existentes con un valor por defecto si es necesario
-- (Ajustar según necesidades del negocio)
UPDATE pacientes 
SET estado = '' 
WHERE estado IS NULL OR estado = '';

-- Verificar que la columna se agregó correctamente
-- SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'pacientes' AND COLUMN_NAME = 'estado';


