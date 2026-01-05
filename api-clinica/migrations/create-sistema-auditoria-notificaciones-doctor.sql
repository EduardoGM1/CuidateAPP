-- Migración: Crear tablas de auditoría y notificaciones
-- Fecha: 2025-11-06

-- 1. Tabla de auditoría del sistema (para administradores)
CREATE TABLE IF NOT EXISTS sistema_auditoria (
  id_auditoria INT PRIMARY KEY AUTO_INCREMENT,
  id_usuario INT NULL,
  tipo_accion ENUM(
    'cita_estado_actualizado',
    'cita_reprogramada',
    'paciente_creado',
    'paciente_modificado',
    'doctor_creado',
    'doctor_modificado',
    'asignacion_paciente',
    'configuracion_cambiada',
    'sistema_automatico'
  ) NOT NULL,
  entidad_afectada ENUM('cita', 'paciente', 'doctor', 'sistema', 'configuracion') NOT NULL,
  id_entidad INT NULL,
  descripcion TEXT NOT NULL,
  datos_anteriores JSON NULL,
  datos_nuevos JSON NULL,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_tipo_accion (tipo_accion),
  INDEX idx_entidad (entidad_afectada, id_entidad),
  INDEX idx_fecha (fecha_creacion),
  INDEX idx_usuario (id_usuario),
  
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
COMMENT='Registro de auditoría de cambios del sistema para administradores';

-- 2. Tabla de notificaciones para doctores
CREATE TABLE IF NOT EXISTS notificaciones_doctor (
  id_notificacion INT PRIMARY KEY AUTO_INCREMENT,
  id_doctor INT NOT NULL,
  id_paciente INT NULL,
  id_cita INT NULL,
  id_mensaje INT NULL,
  tipo ENUM(
    'cita_actualizada',
    'cita_reprogramada',
    'cita_cancelada',
    'nuevo_mensaje',
    'alerta_signos_vitales',
    'paciente_registro_signos'
  ) NOT NULL,
  titulo VARCHAR(255) NOT NULL,
  mensaje TEXT NOT NULL,
  datos_adicionales JSON NULL,
  estado ENUM('enviada', 'leida', 'archivada') NOT NULL DEFAULT 'enviada',
  fecha_envio DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_lectura DATETIME NULL,
  
  INDEX idx_doctor_estado (id_doctor, estado),
  INDEX idx_doctor_fecha (id_doctor, fecha_envio),
  INDEX idx_tipo (tipo),
  INDEX idx_paciente (id_paciente),
  INDEX idx_cita (id_cita),
  
  FOREIGN KEY (id_doctor) REFERENCES doctores(id_doctor) ON DELETE CASCADE,
  FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente) ON DELETE SET NULL,
  FOREIGN KEY (id_cita) REFERENCES citas(id_cita) ON DELETE SET NULL,
  FOREIGN KEY (id_mensaje) REFERENCES mensajes_chat(id_mensaje) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
COMMENT='Notificaciones para doctores sobre citas, mensajes y alertas de pacientes';

