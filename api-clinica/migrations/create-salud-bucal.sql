-- ============================================================
-- MIGRACIÓN: Crear tabla salud_bucal
-- Fecha: 2025-12-30
-- Descripción: Tabla para registro de salud bucal según instrucción ⑫ del formato GAM
-- ============================================================

-- Verificar si la tabla ya existe
SELECT COUNT(*) INTO @table_exists
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'salud_bucal';

-- Iniciar transacción
START TRANSACTION;

-- Crear tabla si no existe
SET @sql_create = IF(@table_exists = 0,
    'CREATE TABLE salud_bucal (
      id_salud_bucal INT PRIMARY KEY AUTO_INCREMENT,
      id_paciente INT NOT NULL,
      id_cita INT NULL,
      fecha_registro DATE NOT NULL,
      presenta_enfermedades_odontologicas BOOLEAN DEFAULT FALSE COMMENT ''⑫ ¿Presenta enfermedades odontológicas? (1=SI, 0=NO)'',
      recibio_tratamiento_odontologico BOOLEAN DEFAULT FALSE COMMENT ''¿Recibió tratamiento odontológico? (1=SI, 0=NO)'',
      observaciones TEXT,
      fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
      
      -- Foreign Keys
      FOREIGN KEY (id_paciente) REFERENCES pacientes(id_paciente) ON DELETE CASCADE,
      FOREIGN KEY (id_cita) REFERENCES citas(id_cita) ON DELETE SET NULL,
      
      -- Índices
      INDEX idx_paciente (id_paciente),
      INDEX idx_cita (id_cita),
      INDEX idx_fecha_registro (fecha_registro),
      INDEX idx_paciente_fecha (id_paciente, fecha_registro)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    COMMENT ''Registro de salud bucal del paciente'';',
    'SELECT ''Tabla salud_bucal ya existe'' AS message;'
);
PREPARE stmt_create FROM @sql_create;
EXECUTE stmt_create;
DEALLOCATE PREPARE stmt_create;

-- Confirmar transacción
COMMIT;

-- Verificación final
SELECT 
    'Migración completada' AS resultado,
    CASE WHEN @table_exists = 0 THEN 'Tabla salud_bucal creada' ELSE 'Tabla salud_bucal ya existía' END AS estado;

