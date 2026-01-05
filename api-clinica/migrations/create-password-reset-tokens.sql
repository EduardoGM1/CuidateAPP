-- Migración: Crear tabla password_reset_tokens
-- Fecha: 2025-01-01
-- Descripción: Tabla para gestionar tokens de recuperación de contraseña

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id_token INT PRIMARY KEY AUTO_INCREMENT,
  id_usuario INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_expiracion DATETIME NOT NULL,
  usado BOOLEAN DEFAULT FALSE,
  fecha_uso DATETIME NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  INDEX idx_token (token),
  INDEX idx_usuario (id_usuario),
  INDEX idx_expiracion (fecha_expiracion),
  INDEX idx_usado_expiracion (usado, fecha_expiracion),
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comentarios
ALTER TABLE password_reset_tokens 
  MODIFY COLUMN id_token INT AUTO_INCREMENT COMMENT 'ID único del token',
  MODIFY COLUMN id_usuario INT NOT NULL COMMENT 'ID del usuario que solicita recuperación',
  MODIFY COLUMN token VARCHAR(255) NOT NULL UNIQUE COMMENT 'Token único de recuperación',
  MODIFY COLUMN fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha de creación del token',
  MODIFY COLUMN fecha_expiracion DATETIME NOT NULL COMMENT 'Fecha de expiración del token (1 hora después de creación)',
  MODIFY COLUMN usado BOOLEAN DEFAULT FALSE COMMENT 'Indica si el token ya fue usado',
  MODIFY COLUMN fecha_uso DATETIME NULL COMMENT 'Fecha en que se usó el token',
  MODIFY COLUMN ip_address VARCHAR(45) COMMENT 'IP desde donde se solicitó el reset',
  MODIFY COLUMN user_agent TEXT COMMENT 'User agent del navegador';

