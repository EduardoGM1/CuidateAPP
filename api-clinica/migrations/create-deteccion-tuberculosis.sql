-- ============================================================
-- MIGRACIÓN: Crear tabla deteccion_tuberculosis
-- Fecha: 2025-12-30
-- Descripción: Tabla para registro de detección de tuberculosis según instrucciones ⑬ del formato GAM
-- ============================================================

-- Verificar si la tabla ya existe
SELECT COUNT(*) INTO @table_exists
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'deteccion_tuberculosis';

-- Iniciar transacción
START TRANSACTION;

-- Crear tabla si no existe
SET @sql_create = IF(@table_exists = 0,
    'CREATE TABLE deteccion_tuberculosis (
      id_deteccion_tb INT PRIMARY KEY AUTO_INCREMENT,
      id_paciente INT NOT NULL,
      id_cita INT NULL,
      fecha_deteccion DATE NOT NULL,
      aplicacion_encuesta BOOLEAN DEFAULT FALSE COMMENT ''Aplicación de ENCUESTA de Tuberculosis (1=SI, 0=NO)'',
      baciloscopia_realizada BOOLEAN DEFAULT FALSE COMMENT ''Se realizó baciloscopia (1=SI, 0=NO)'',
      baciloscopia_resultado ENUM(
        ''positivo'',
        ''negativo'',
        ''pendiente'',
        ''no_aplicable''
      ) NULL COMMENT ''⑬ En caso de Baciloscopia anote el resultado'',
      ingreso_tratamiento BOOLEAN DEFAULT FALSE COMMENT ''¿Ingresó a tratamiento? (1=SI, 0=NO)'',
      observaciones TEXT,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      -- Foreign Keys
      FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente) ON DELETE CASCADE,
      FOREIGN KEY (id_cita) REFERENCES citas(id_cita) ON DELETE SET NULL,
      
      -- Índices
      INDEX idx_paciente (id_paciente),
      INDEX idx_cita (id_cita),
      INDEX idx_fecha_deteccion (fecha_deteccion),
      INDEX idx_baciloscopia_resultado (baciloscopia_resultado),
      INDEX idx_paciente_fecha (id_paciente, fecha_deteccion)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT ''Registro de detección de tuberculosis'';',
    'SELECT ''Tabla deteccion_tuberculosis ya existe'' AS message;'
);
PREPARE stmt_create FROM @sql_create;
EXECUTE stmt_create;
DEALLOCATE PREPARE stmt_create;

-- Confirmar transacción
COMMIT;

-- Verificación final
SELECT 
    'Migración completada' AS resultado,
    CASE WHEN @table_exists = 0 THEN 'Tabla deteccion_tuberculosis creada' ELSE 'Tabla deteccion_tuberculosis ya existía' END AS estado;

