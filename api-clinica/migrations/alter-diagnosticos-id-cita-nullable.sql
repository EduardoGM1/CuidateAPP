-- Migración: Hacer id_cita nullable en tabla diagnosticos
-- Fecha: 2025-11-06
-- Descripción: Permite crear diagnósticos sin asociar una cita médica

-- Verificar estructura actual
DESCRIBE diagnosticos;

-- Alterar columna id_cita para permitir NULL
ALTER TABLE `diagnosticos` 
MODIFY COLUMN `id_cita` INT NULL DEFAULT NULL;

-- Verificar que el cambio se aplicó correctamente
DESCRIBE diagnosticos;

-- Verificar que la foreign key (si existe) permite NULL
SHOW CREATE TABLE diagnosticos;


