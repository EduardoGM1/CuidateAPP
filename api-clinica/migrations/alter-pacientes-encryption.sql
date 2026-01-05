-- =====================================================
-- MIGRACIÓN: Alterar tabla pacientes para encriptación
-- Cambiar campos sensibles de STRING a TEXT para almacenar datos encriptados
-- =====================================================

-- Cambiar CURP de STRING(18) a TEXT
ALTER TABLE `pacientes` 
MODIFY COLUMN `curp` TEXT NULL COMMENT 'CURP encriptado con AES-256-GCM';

-- Cambiar direccion de STRING(255) a TEXT
ALTER TABLE `pacientes` 
MODIFY COLUMN `direccion` TEXT NULL COMMENT 'Dirección encriptada con AES-256-GCM';

-- Cambiar numero_celular de STRING(20) a TEXT
ALTER TABLE `pacientes` 
MODIFY COLUMN `numero_celular` TEXT NULL COMMENT 'Número de celular encriptado con AES-256-GCM';

-- Eliminar constraint UNIQUE de CURP (ya que valores encriptados son únicos)
-- Nota: La unicidad se validará a nivel de aplicación después de desencriptar
ALTER TABLE `pacientes` 
DROP INDEX IF EXISTS `curp`;

