-- =====================================================
-- ÍNDICES PARA OPTIMIZAR CONSULTAS DEL DASHBOARD
-- =====================================================

-- Índices para tabla de citas
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha_cita);
CREATE INDEX IF NOT EXISTS idx_citas_doctor_fecha ON citas(id_doctor, fecha_cita);
CREATE INDEX IF NOT EXISTS idx_citas_paciente_fecha ON citas(id_paciente, fecha_cita);
CREATE INDEX IF NOT EXISTS idx_citas_asistencia ON citas(asistencia);
CREATE INDEX IF NOT EXISTS idx_citas_fecha_asistencia ON citas(fecha_cita, asistencia);

-- Índices para tabla de pacientes
CREATE INDEX IF NOT EXISTS idx_pacientes_activo ON pacientes(activo);
CREATE INDEX IF NOT EXISTS idx_pacientes_fecha_nacimiento ON pacientes(fecha_nacimiento);

-- Índices para tabla de doctores
CREATE INDEX IF NOT EXISTS idx_doctores_activo ON doctores(activo);

-- Índices para tabla de signos vitales
CREATE INDEX IF NOT EXISTS idx_signos_vitales_paciente_fecha ON signos_vitales(id_paciente, fecha_medicion);
CREATE INDEX IF NOT EXISTS idx_signos_vitales_fecha ON signos_vitales(fecha_medicion);
CREATE INDEX IF NOT EXISTS idx_signos_vitales_glucosa ON signos_vitales(glucosa_mg_dl);
CREATE INDEX IF NOT EXISTS idx_signos_vitales_presion ON signos_vitales(presion_sistolica, presion_diastolica);

-- Índices para tabla de mensajes de chat
CREATE INDEX IF NOT EXISTS idx_mensajes_chat_doctor ON mensajes_chat(id_doctor);
CREATE INDEX IF NOT EXISTS idx_mensajes_chat_paciente ON mensajes_chat(id_paciente);
CREATE INDEX IF NOT EXISTS idx_mensajes_chat_leido ON mensajes_chat(leido);
CREATE INDEX IF NOT EXISTS idx_mensajes_chat_fecha ON mensajes_chat(fecha_envio);

-- Índices para tabla de planes de medicación
CREATE INDEX IF NOT EXISTS idx_planes_medicacion_activo ON planes_medicacion(activo);
CREATE INDEX IF NOT EXISTS idx_planes_medicacion_paciente ON planes_medicacion(id_paciente);

-- Índices para tabla de diagnósticos
CREATE INDEX IF NOT EXISTS idx_diagnosticos_paciente ON diagnosticos(id_paciente);
CREATE INDEX IF NOT EXISTS idx_diagnosticos_fecha ON diagnosticos(fecha_diagnostico);

-- Índices para tabla de comorbilidades
CREATE INDEX IF NOT EXISTS idx_paciente_comorbilidad_paciente ON paciente_comorbilidad(id_paciente);
CREATE INDEX IF NOT EXISTS idx_paciente_comorbilidad_comorbilidad ON paciente_comorbilidad(id_comorbilidad);

-- Índices para tabla de medicamentos
CREATE INDEX IF NOT EXISTS idx_plan_detalle_medicamento ON plan_detalle(id_medicamento);
CREATE INDEX IF NOT EXISTS idx_plan_detalle_plan ON plan_detalle(id_plan);

-- Índices para tabla de usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo);

-- Índices compuestos para consultas complejas
CREATE INDEX IF NOT EXISTS idx_citas_doctor_fecha_asistencia ON citas(id_doctor, fecha_cita, asistencia);
CREATE INDEX IF NOT EXISTS idx_signos_vitales_paciente_fecha_glucosa ON signos_vitales(id_paciente, fecha_medicion, glucosa_mg_dl);
CREATE INDEX IF NOT EXISTS idx_mensajes_chat_doctor_leido_fecha ON mensajes_chat(id_doctor, leido, fecha_envio);

-- =====================================================
-- VERIFICAR ÍNDICES CREADOS
-- =====================================================

-- Consulta para verificar que los índices fueron creados correctamente
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    COLUMN_NAME,
    NON_UNIQUE
FROM 
    INFORMATION_SCHEMA.STATISTICS 
WHERE 
    TABLE_SCHEMA = DATABASE()
    AND INDEX_NAME LIKE 'idx_%'
ORDER BY 
    TABLE_NAME, INDEX_NAME;
