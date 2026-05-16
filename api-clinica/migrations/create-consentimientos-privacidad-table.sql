-- =====================================================
-- MIGRACIÓN: consentimientos de privacidad (historial append-only)
-- LFPDPPP — trazabilidad de aceptación de aviso y datos de salud
-- =====================================================

CREATE TABLE IF NOT EXISTS `consentimientos_privacidad` (
  `id_consentimiento` INT NOT NULL AUTO_INCREMENT,
  `id_usuario` INT NULL COMMENT 'usuarios.id_usuario cuando aplica',
  `id_paciente` INT NULL COMMENT 'pacientes.id_paciente',
  `id_doctor` INT NULL COMMENT 'doctores.id_doctor',
  `rol` ENUM('Paciente', 'Doctor') NOT NULL,
  `version_aviso` VARCHAR(20) NOT NULL COMMENT 'Versión del aviso aceptado (ej. 1.1.0)',
  `acepto_aviso_terminos` TINYINT(1) NOT NULL DEFAULT 0,
  `acepto_datos_salud` TINYINT(1) NOT NULL DEFAULT 0,
  `canal` ENUM('web', 'mobile') NOT NULL DEFAULT 'web',
  `user_agent` VARCHAR(500) NULL,
  `ip_address` VARCHAR(45) NULL,
  `revocado` TINYINT(1) NOT NULL DEFAULT 0,
  `revocado_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_consentimiento`),
  INDEX `idx_consent_paciente` (`id_paciente`, `version_aviso`, `revocado`, `created_at`),
  INDEX `idx_consent_doctor` (`id_doctor`, `version_aviso`, `revocado`, `created_at`),
  INDEX `idx_consent_usuario` (`id_usuario`, `rol`, `created_at`),
  CONSTRAINT `fk_consent_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_consent_paciente` FOREIGN KEY (`id_paciente`) REFERENCES `pacientes` (`id_paciente`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_consent_doctor` FOREIGN KEY (`id_doctor`) REFERENCES `doctores` (`id_doctor`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Historial de consentimientos de aviso de privacidad y datos de salud';
