-- ============================================================
-- SCRIPT DE VERIFICACIÓN: COLESTEROL LDL Y HDL
-- Fecha: 2025-12-28
-- Descripción: Verifica la estructura y datos de los campos
--              de colesterol LDL y HDL en la base de datos
-- ============================================================

USE clinica_db; -- ⚠️ Cambiar por el nombre de tu base de datos

-- ============================================================
-- 1. VERIFICAR ESTRUCTURA DE LA TABLA
-- ============================================================
SELECT 
    'ESTRUCTURA DE COLUMNAS' AS seccion,
    COLUMN_NAME AS columna,
    COLUMN_TYPE AS tipo,
    IS_NULLABLE AS permite_null,
    COLUMN_DEFAULT AS valor_default,
    COLUMN_COMMENT AS comentario
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'signos_vitales' 
AND COLUMN_NAME LIKE 'colesterol%'
ORDER BY COLUMN_NAME;

-- ============================================================
-- 2. VERIFICAR ÍNDICES
-- ============================================================
SELECT 
    'ÍNDICES' AS seccion,
    INDEX_NAME AS nombre_indice,
    COLUMN_NAME AS columna,
    NON_UNIQUE AS no_unico,
    SEQ_IN_INDEX AS secuencia
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'signos_vitales'
AND COLUMN_NAME IN ('colesterol_ldl', 'colesterol_hdl')
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- ============================================================
-- 3. VERIFICAR DATOS EXISTENTES CON LDL/HDL
-- ============================================================
SELECT 
    'DATOS CON LDL/HDL' AS seccion,
    id_signo,
    id_paciente,
    colesterol_mg_dl AS colesterol_total,
    colesterol_ldl,
    colesterol_hdl,
    fecha_medicion,
    registrado_por
FROM signos_vitales
WHERE colesterol_ldl IS NOT NULL OR colesterol_hdl IS NOT NULL
ORDER BY fecha_medicion DESC
LIMIT 10;

-- ============================================================
-- 4. ESTADÍSTICAS DE DATOS
-- ============================================================
SELECT 
    'ESTADÍSTICAS' AS seccion,
    COUNT(*) AS total_signos_vitales,
    COUNT(colesterol_mg_dl) AS con_colesterol_total,
    COUNT(colesterol_ldl) AS con_colesterol_ldl,
    COUNT(colesterol_hdl) AS con_colesterol_hdl,
    COUNT(CASE WHEN colesterol_ldl IS NOT NULL AND colesterol_hdl IS NOT NULL THEN 1 END) AS con_ambos_ldl_hdl,
    AVG(colesterol_mg_dl) AS promedio_colesterol_total,
    AVG(colesterol_ldl) AS promedio_colesterol_ldl,
    AVG(colesterol_hdl) AS promedio_colesterol_hdl,
    MIN(colesterol_ldl) AS minimo_ldl,
    MAX(colesterol_ldl) AS maximo_ldl,
    MIN(colesterol_hdl) AS minimo_hdl,
    MAX(colesterol_hdl) AS maximo_hdl
FROM signos_vitales;

-- ============================================================
-- 5. VERIFICAR PACIENTES CON DIAGNÓSTICO DE DISLIPIDEMIA/HIPERCOLESTEROLEMIA
-- ============================================================
SELECT 
    'PACIENTES CON DIAGNÓSTICO' AS seccion,
    p.id_paciente,
    CONCAT(p.nombre, ' ', p.apellido_paterno) AS nombre_paciente,
    c.nombre_comorbilidad,
    c.descripcion,
    pc.fecha_deteccion,
    pc.observaciones AS observaciones_comorbilidad
FROM pacientes p
INNER JOIN paciente_comorbilidad pc ON p.id_paciente = pc.id_paciente
INNER JOIN comorbilidades c ON pc.id_comorbilidad = c.id_comorbilidad
WHERE c.nombre_comorbilidad LIKE '%Dislipidemia%' 
   OR c.nombre_comorbilidad LIKE '%Hipercolesterolemia%'
   OR c.nombre_comorbilidad LIKE '%dislipidemia%'
   OR c.nombre_comorbilidad LIKE '%hipercolesterolemia%'
ORDER BY pc.fecha_deteccion DESC
LIMIT 20;

-- ============================================================
-- 6. VERIFICAR SIGNOS VITALES DE PACIENTES CON DIAGNÓSTICO
-- ============================================================
SELECT 
    'SIGNOS VITALES DE PACIENTES CON DIAGNÓSTICO' AS seccion,
    sv.id_signo,
    sv.id_paciente,
    CONCAT(p.nombre, ' ', p.apellido_paterno) AS nombre_paciente,
    sv.colesterol_mg_dl AS colesterol_total,
    sv.colesterol_ldl,
    sv.colesterol_hdl,
    sv.fecha_medicion,
    CASE 
        WHEN sv.colesterol_ldl IS NULL AND sv.colesterol_hdl IS NULL THEN 'Sin LDL/HDL'
        WHEN sv.colesterol_ldl IS NOT NULL AND sv.colesterol_hdl IS NOT NULL THEN 'Con ambos'
        WHEN sv.colesterol_ldl IS NOT NULL THEN 'Solo LDL'
        WHEN sv.colesterol_hdl IS NOT NULL THEN 'Solo HDL'
    END AS estado_ldl_hdl
FROM signos_vitales sv
INNER JOIN pacientes p ON sv.id_paciente = p.id_paciente
INNER JOIN paciente_comorbilidad pc ON p.id_paciente = pc.id_paciente
INNER JOIN comorbilidades c ON pc.id_comorbilidad = c.id_comorbilidad
WHERE (c.nombre_comorbilidad LIKE '%Dislipidemia%' 
   OR c.nombre_comorbilidad LIKE '%Hipercolesterolemia%'
   OR c.nombre_comorbilidad LIKE '%dislipidemia%'
   OR c.nombre_comorbilidad LIKE '%hipercolesterolemia%')
ORDER BY sv.fecha_medicion DESC
LIMIT 20;

-- ============================================================
-- 7. VERIFICAR CASOS PROBLEMÁTICOS
-- ============================================================
-- Pacientes con diagnóstico pero sin LDL/HDL en signos vitales
SELECT 
    'CASOS: CON DIAGNÓSTICO PERO SIN LDL/HDL' AS seccion,
    p.id_paciente,
    CONCAT(p.nombre, ' ', p.apellido_paterno) AS nombre_paciente,
    c.nombre_comorbilidad,
    COUNT(sv.id_signo) AS total_signos_vitales,
    MAX(sv.fecha_medicion) AS ultimo_signo_vital
FROM pacientes p
INNER JOIN paciente_comorbilidad pc ON p.id_paciente = pc.id_paciente
INNER JOIN comorbilidades c ON pc.id_comorbilidad = c.id_comorbilidad
LEFT JOIN signos_vitales sv ON p.id_paciente = sv.id_paciente
WHERE (c.nombre_comorbilidad LIKE '%Dislipidemia%' 
   OR c.nombre_comorbilidad LIKE '%Hipercolesterolemia%'
   OR c.nombre_comorbilidad LIKE '%dislipidemia%'
   OR c.nombre_comorbilidad LIKE '%hipercolesterolemia%')
AND (sv.id_signo IS NULL OR (sv.colesterol_ldl IS NULL AND sv.colesterol_hdl IS NULL))
GROUP BY p.id_paciente, p.nombre, p.apellido_paterno, c.nombre_comorbilidad
LIMIT 10;

-- Pacientes sin diagnóstico pero con LDL/HDL en signos vitales (PROBLEMA)
SELECT 
    'CASOS PROBLEMÁTICOS: SIN DIAGNÓSTICO PERO CON LDL/HDL' AS seccion,
    sv.id_signo,
    sv.id_paciente,
    CONCAT(p.nombre, ' ', p.apellido_paterno) AS nombre_paciente,
    sv.colesterol_ldl,
    sv.colesterol_hdl,
    sv.fecha_medicion
FROM signos_vitales sv
INNER JOIN pacientes p ON sv.id_paciente = p.id_paciente
LEFT JOIN paciente_comorbilidad pc ON p.id_paciente = pc.id_paciente
LEFT JOIN comorbilidades c ON pc.id_comorbilidad = c.id_comorbilidad
    AND (c.nombre_comorbilidad LIKE '%Dislipidemia%' 
     OR c.nombre_comorbilidad LIKE '%Hipercolesterolemia%'
     OR c.nombre_comorbilidad LIKE '%dislipidemia%'
     OR c.nombre_comorbilidad LIKE '%hipercolesterolemia%')
WHERE (sv.colesterol_ldl IS NOT NULL OR sv.colesterol_hdl IS NOT NULL)
AND c.id_comorbilidad IS NULL
ORDER BY sv.fecha_medicion DESC
LIMIT 10;

-- ============================================================
-- 8. VERIFICAR VALORES FUERA DE RANGO (si existen)
-- ============================================================
SELECT 
    'VALORES FUERA DE RANGO' AS seccion,
    id_signo,
    id_paciente,
    colesterol_ldl,
    colesterol_hdl,
    CASE 
        WHEN colesterol_ldl > 500 THEN 'LDL > 500'
        WHEN colesterol_ldl < 0 THEN 'LDL < 0'
        WHEN colesterol_hdl > 200 THEN 'HDL > 200'
        WHEN colesterol_hdl < 0 THEN 'HDL < 0'
    END AS problema,
    fecha_medicion
FROM signos_vitales
WHERE (colesterol_ldl IS NOT NULL AND (colesterol_ldl > 500 OR colesterol_ldl < 0))
   OR (colesterol_hdl IS NOT NULL AND (colesterol_hdl > 200 OR colesterol_hdl < 0))
ORDER BY fecha_medicion DESC;

-- ============================================================
-- RESUMEN FINAL
-- ============================================================
SELECT 
    'RESUMEN FINAL' AS seccion,
    'Verificación completada' AS mensaje,
    NOW() AS fecha_verificacion;

