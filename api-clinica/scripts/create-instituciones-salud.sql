-- Crear tabla instituciones_salud y migrar institucion_salud de ENUM a VARCHAR(100)
-- Ejecutar en la BD: mysql -u usuario -p nombre_bd < scripts/create-instituciones-salud.sql

-- 1) Crear tabla catálogo
CREATE TABLE IF NOT EXISTS instituciones_salud (
  id_institucion_salud INT NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  orden INT DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id_institucion_salud),
  UNIQUE KEY uk_instituciones_salud_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) Insertar datos actuales (los que estaban en código)
INSERT IGNORE INTO instituciones_salud (nombre, activo, orden) VALUES
('IMSS', 1, 1),
('Bienestar', 1, 2),
('ISSSTE', 1, 3),
('Particular', 1, 4),
('Otro', 1, 5),
('SEMAR', 1, 6),
('INSABI', 1, 7),
('PEMEX', 1, 8),
('SEDENA', 1, 9),
('Secretaría de Salud', 1, 10),
('Ninguna', 1, 11);

-- 3) Cambiar columna pacientes.institucion_salud de ENUM a VARCHAR(100) para catálogo dinámico
ALTER TABLE pacientes MODIFY COLUMN institucion_salud VARCHAR(100) NULL DEFAULT NULL;
