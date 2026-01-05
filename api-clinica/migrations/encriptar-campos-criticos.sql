-- =====================================================
-- MIGRACIÓN: Encriptar Campos Críticos
-- =====================================================
-- Fecha: 2025-12-31
-- Objetivo: Cambiar tipos de datos a TEXT para permitir encriptación
--           de campos críticos según LFPDPPP, NOM-004-SSA3-2012, HIPAA
-- 
-- IMPORTANTE: Esta migración solo cambia los tipos de datos.
--             Los datos existentes se encriptarán automáticamente
--             mediante los hooks de Sequelize al actualizarse.
-- =====================================================

-- 1. PACIENTES: fecha_nacimiento
ALTER TABLE pacientes 
MODIFY COLUMN fecha_nacimiento TEXT NOT NULL 
COMMENT 'Fecha de nacimiento encriptada con AES-256-GCM (LFPDPPP, HIPAA §164.514)';

-- 2. SIGNOS_VITALES: Campos numéricos críticos
ALTER TABLE signos_vitales 
MODIFY COLUMN presion_sistolica TEXT NULL 
COMMENT 'Presión sistólica encriptada con AES-256-GCM (NOM-004-SSA3-2012, HIPAA)';

ALTER TABLE signos_vitales 
MODIFY COLUMN presion_diastolica TEXT NULL 
COMMENT 'Presión diastólica encriptada con AES-256-GCM (NOM-004-SSA3-2012, HIPAA)';

ALTER TABLE signos_vitales 
MODIFY COLUMN glucosa_mg_dl TEXT NULL 
COMMENT 'Glucosa encriptada con AES-256-GCM (NOM-004-SSA3-2012, HIPAA)';

ALTER TABLE signos_vitales 
MODIFY COLUMN colesterol_mg_dl TEXT NULL 
COMMENT 'Colesterol Total (mg/dl) encriptado con AES-256-GCM - Campo obligatorio para criterios de acreditación (NOM-004-SSA3-2012, HIPAA)';

ALTER TABLE signos_vitales 
MODIFY COLUMN colesterol_ldl TEXT NULL 
COMMENT 'Colesterol LDL (mg/dl) encriptado con AES-256-GCM - Solo para pacientes con diagnóstico de Hipercolesterolemia (NOM-004-SSA3-2012, HIPAA)';

ALTER TABLE signos_vitales 
MODIFY COLUMN colesterol_hdl TEXT NULL 
COMMENT 'Colesterol HDL (mg/dl) encriptado con AES-256-GCM - Solo para pacientes con diagnóstico de Hipercolesterolemia (NOM-004-SSA3-2012, HIPAA)';

ALTER TABLE signos_vitales 
MODIFY COLUMN trigliceridos_mg_dl TEXT NULL 
COMMENT 'Triglicéridos encriptados con AES-256-GCM (NOM-004-SSA3-2012, HIPAA)';

ALTER TABLE signos_vitales 
MODIFY COLUMN hba1c_porcentaje TEXT NULL 
COMMENT '*HbA1c (%) encriptado con AES-256-GCM - Campo obligatorio para criterios de acreditación. Rangos: 20-59 años <7%, 60+ años <8% (NOM-004-SSA3-2012, HIPAA)';

-- 3. CITAS: motivo
ALTER TABLE citas 
MODIFY COLUMN motivo TEXT NULL 
COMMENT 'Motivo de la cita encriptado con AES-256-GCM (NOM-004-SSA3-2012, HIPAA)';

-- 4. RED_APOYO: numero_celular, email, direccion
ALTER TABLE red_apoyo 
MODIFY COLUMN numero_celular TEXT NULL 
COMMENT 'Número de celular encriptado con AES-256-GCM (LFPDPPP, HIPAA §164.514)';

ALTER TABLE red_apoyo 
MODIFY COLUMN email TEXT NULL 
COMMENT 'Email encriptado con AES-256-GCM (LFPDPPP)';

ALTER TABLE red_apoyo 
MODIFY COLUMN direccion TEXT NULL 
COMMENT 'Dirección encriptada con AES-256-GCM (LFPDPPP, HIPAA §164.514)';

-- =====================================================
-- NOTAS IMPORTANTES:
-- =====================================================
-- 1. Los campos TEXT ya existentes (observaciones, descripcion) 
--    no requieren cambio de tipo, solo se aplicarán hooks.
--
-- 2. Los datos existentes se encriptarán automáticamente cuando:
--    - Se actualice un registro existente
--    - O mediante script de migración de datos
--
-- 3. Los hooks de Sequelize manejarán automáticamente:
--    - Encriptación al guardar (beforeCreate, beforeUpdate)
--    - Desencriptación al leer (afterFind)
--
-- 4. Para campos numéricos encriptados:
--    - Se almacenan como TEXT encriptado
--    - Se convierten a número automáticamente al desencriptar
--    - La aplicación trabaja con números transparentemente
-- =====================================================

