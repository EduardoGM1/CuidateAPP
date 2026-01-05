-- ============================================================
-- MIGRACIÓN: Crear tabla sesiones_educativas
-- Fecha: 2025-12-30
-- Descripción: Tabla para registro de sesiones e intervenciones educativas según formato GAM
-- ============================================================

-- Verificar si la tabla ya existe
SELECT COUNT(*) INTO @table_exists
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'sesiones_educativas';

-- Iniciar transacción
START TRANSACTION;

-- Crear tabla si no existe
SET @sql_create = IF(@table_exists = 0,
    'CREATE TABLE sesiones_educativas (
      id_sesion INT PRIMARY KEY AUTO_INCREMENT,
      id_paciente INT NOT NULL,
      id_cita INT NULL,
      fecha_sesion DATE NOT NULL,
      asistio BOOLEAN DEFAULT FALSE COMMENT ''Asistió a sesión educativa (1=SI, 0=NO)'',
      tipo_sesion ENUM(
        ''nutricional'', 
        ''actividad_fisica'', 
        ''medico_preventiva'', 
        ''trabajo_social'', 
        ''psicologica'', 
        ''odontologica''
      ) NOT NULL COMMENT ''Tipo de intervención educativa'',
      numero_intervenciones INT DEFAULT 1 COMMENT ''N° de intervenciones en el mes por integrante'',
      observaciones TEXT,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      -- Foreign Keys
      FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente) ON DELETE CASCADE,
      FOREIGN KEY (id_cita) REFERENCES citas(id_cita) ON DELETE SET NULL,
      
      -- Índices
      INDEX idx_paciente (id_paciente),
      INDEX idx_cita (id_cita),
      INDEX idx_fecha_sesion (fecha_sesion),
      INDEX idx_tipo_sesion (tipo_sesion),
      INDEX idx_paciente_fecha (id_paciente, fecha_sesion)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT ''Registro de sesiones e intervenciones educativas para la salud'';',
    'SELECT ''Tabla sesiones_educativas ya existe'' AS message;'
);
PREPARE stmt_create FROM @sql_create;
EXECUTE stmt_create;
DEALLOCATE PREPARE stmt_create;

-- Confirmar transacción
COMMIT;

-- Verificación final
SELECT 
    'Migración completada' AS resultado,
    CASE WHEN @table_exists = 0 THEN 'Tabla sesiones_educativas creada' ELSE 'Tabla sesiones_educativas ya existía' END AS estado;

