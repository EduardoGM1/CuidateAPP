-- =====================================================
-- MIGRACIÓN: Crear tabla auth_credentials
-- Sistema unificado de autenticación
-- =====================================================

-- Crear tabla auth_credentials
CREATE TABLE IF NOT EXISTS `auth_credentials` (
  `id_credential` INT NOT NULL AUTO_INCREMENT,
  `user_type` ENUM('Usuario', 'Paciente', 'Doctor', 'Admin') NOT NULL COMMENT 'Tipo de usuario',
  `user_id` INT NOT NULL COMMENT 'ID del usuario según user_type',
  `auth_method` ENUM('password', 'pin', 'biometric', 'totp') NOT NULL COMMENT 'Método de autenticación',
  `credential_value` TEXT NOT NULL COMMENT 'Hash de password/pin, public key para biometric, secret para totp',
  `credential_salt` VARCHAR(64) NULL COMMENT 'Salt adicional (usado para PIN legacy)',
  `device_id` VARCHAR(128) NULL COMMENT 'ID único del dispositivo (para PIN/biometric)',
  `device_name` VARCHAR(100) NULL COMMENT 'Nombre descriptivo del dispositivo',
  `device_type` ENUM('mobile', 'tablet', 'web', 'desktop') NULL COMMENT 'Tipo de dispositivo',
  `credential_metadata` JSON NULL COMMENT 'Datos adicionales: {biometric_type, last_challenge, etc.}',
  `is_primary` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Si es la credencial principal del usuario',
  `failed_attempts` SMALLINT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Intentos fallidos de autenticación',
  `locked_until` DATETIME NULL COMMENT 'Fecha hasta la cual está bloqueada la cuenta',
  `last_used` DATETIME NULL COMMENT 'Última vez que se usó esta credencial',
  `expires_at` DATETIME NULL COMMENT 'Fecha de expiración de la credencial (si aplica)',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Si la credencial está activa',
  PRIMARY KEY (`id_credential`),
  INDEX `idx_user_lookup` (`user_type`, `user_id`, `auth_method`) COMMENT 'Búsqueda rápida por usuario y método',
  INDEX `idx_device_lookup` (`device_id`, `activo`) COMMENT 'Búsqueda por dispositivo',
  INDEX `idx_credential_value` (`credential_value`(255)) COMMENT 'Índice parcial para verificación de unicidad PIN',
  INDEX `idx_locked_until` (`locked_until`) COMMENT 'Búsqueda de cuentas bloqueadas',
  INDEX `idx_primary_credential` (`user_type`, `user_id`, `is_primary`) COMMENT 'Búsqueda de credencial primaria'
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

-- Comentario de tabla
ALTER TABLE `auth_credentials` COMMENT = 'Sistema unificado de autenticación - Reemplaza paciente_auth, paciente_auth_pin, paciente_auth_biometric';



