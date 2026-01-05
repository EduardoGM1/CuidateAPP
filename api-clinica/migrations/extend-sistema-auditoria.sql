-- Migración: Extender tabla sistema_auditoria con nuevas funcionalidades
-- Fecha: 2025-11-06
-- Descripción: Añade campos para auditoría de accesos, errores, alertas y navegación contextual

-- 1. Añadir nuevos valores a ENUM tipo_accion
ALTER TABLE sistema_auditoria 
MODIFY COLUMN tipo_accion ENUM(
  'cita_estado_actualizado',
  'cita_reprogramada',
  'paciente_creado',
  'paciente_modificado',
  'doctor_creado',
  'doctor_modificado',
  'asignacion_paciente',
  'configuracion_cambiada',
  'sistema_automatico',
  'login_exitoso',
  'login_fallido',
  'acceso_sospechoso',
  'error_sistema',
  'error_critico'
) NOT NULL;

-- 2. Añadir nuevos valores a ENUM entidad_afectada
ALTER TABLE sistema_auditoria 
MODIFY COLUMN entidad_afectada ENUM(
  'cita',
  'paciente',
  'doctor',
  'sistema',
  'configuracion',
  'acceso',
  'error'
) NOT NULL;

-- 3. Añadir nuevos campos
ALTER TABLE sistema_auditoria
ADD COLUMN ip_address VARCHAR(45) NULL COMMENT 'Dirección IP del usuario',
ADD COLUMN user_agent TEXT NULL COMMENT 'User Agent del navegador/aplicación',
ADD COLUMN severidad ENUM('info', 'warning', 'error', 'critical') DEFAULT 'info' COMMENT 'Nivel de severidad de la acción',
ADD COLUMN stack_trace TEXT NULL COMMENT 'Stack trace para errores del sistema';

-- 4. Crear índices para mejorar performance de consultas
CREATE INDEX idx_severidad ON sistema_auditoria(severidad);
CREATE INDEX idx_ip_address ON sistema_auditoria(ip_address);
CREATE INDEX idx_fecha_severidad ON sistema_auditoria(fecha_creacion, severidad);

-- 5. Comentario de tabla actualizado
ALTER TABLE sistema_auditoria 
COMMENT = 'Registro de auditoría de cambios del sistema para administradores. Incluye accesos, errores y acciones críticas.';

