-- =====================================================
-- MIGRACIÓN: Crear tabla refresh_tokens
-- Sistema de Refresh Tokens para autenticación
-- =====================================================

CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL COMMENT 'ID del usuario',
  `user_type` ENUM('Usuario', 'Paciente', 'Doctor', 'Admin') NOT NULL COMMENT 'Tipo de usuario',
  `token_hash` VARCHAR(64) NOT NULL COMMENT 'Hash SHA-256 del refresh token',
  `jti` VARCHAR(32) NOT NULL COMMENT 'JWT ID único del token',
  `expires_at` DATETIME NOT NULL COMMENT 'Fecha de expiración del token',
  `user_agent` VARCHAR(500) NULL COMMENT 'User agent del dispositivo',
  `ip_address` VARCHAR(45) NULL COMMENT 'Dirección IP del cliente',
  `revoked` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Si el token ha sido revocado',
  `revoked_at` DATETIME NULL COMMENT 'Fecha de revocación',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_token_hash` (`token_hash`),
  INDEX `idx_jti` (`jti`),
  INDEX `idx_user` (`user_id`, `user_type`),
  INDEX `idx_expires` (`expires_at`),
  INDEX `idx_revoked` (`revoked`),
  UNIQUE KEY `unique_jti` (`jti`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tabla para almacenar refresh tokens revocables';

