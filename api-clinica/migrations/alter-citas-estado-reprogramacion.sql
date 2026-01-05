-- Migración: Agregar campos de estado y reprogramación a la tabla citas
-- Fecha: 2025-11-06

-- 1. Agregar campo estado ENUM
ALTER TABLE citas 
ADD COLUMN estado ENUM('pendiente', 'atendida', 'no_asistida', 'reprogramada', 'cancelada') 
DEFAULT 'pendiente' 
AFTER fecha_cita;

-- 2. Agregar campos de reprogramación
ALTER TABLE citas 
ADD COLUMN fecha_reprogramada DATE NULL AFTER asistencia,
ADD COLUMN motivo_reprogramacion TEXT NULL AFTER fecha_reprogramada,
ADD COLUMN solicitado_por ENUM('paciente', 'doctor', 'admin') NULL AFTER motivo_reprogramacion,
ADD COLUMN fecha_solicitud_reprogramacion DATETIME NULL AFTER solicitado_por;

-- 3. Crear tabla de solicitudes de reprogramación
CREATE TABLE IF NOT EXISTS solicitudes_reprogramacion (
  id_solicitud INT PRIMARY KEY AUTO_INCREMENT,
  id_cita INT NOT NULL,
  id_paciente INT NOT NULL,
  motivo TEXT NOT NULL,
  fecha_solicitada DATE NULL,
  estado ENUM('pendiente', 'aprobada', 'rechazada', 'cancelada') NOT NULL DEFAULT 'pendiente',
  respuesta_doctor TEXT NULL,
  fecha_respuesta DATETIME NULL,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  -- Índices para performance
  INDEX idx_cita (id_cita),
  INDEX idx_paciente (id_paciente),
  INDEX idx_estado (estado),
  INDEX idx_fecha_creacion (fecha_creacion),
  
  -- Foreign Keys
  FOREIGN KEY (id_cita) REFERENCES citas(id_cita) ON DELETE CASCADE,
  FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- 4. Migrar datos existentes: actualizar estado basado en asistencia
UPDATE citas 
SET estado = CASE 
  WHEN asistencia = 1 THEN 'atendida'
  WHEN asistencia = 0 THEN 'no_asistida'
  ELSE 'pendiente'
END
WHERE estado IS NULL;

-- 5. Crear índice en estado para queries rápidas
CREATE INDEX idx_estado ON citas(estado);
CREATE INDEX idx_fecha_reprogramada ON citas(fecha_reprogramada);

