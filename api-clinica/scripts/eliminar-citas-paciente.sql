-- Script para eliminar citas del paciente Eduardo Gonzalez Gonzalez
-- excepto la primera consulta

-- Primero, identificar al paciente
SELECT 
    id_paciente,
    nombre,
    apellido_paterno,
    apellido_materno,
    CONCAT(nombre, ' ', apellido_paterno, ' ', apellido_materno) AS nombre_completo
FROM pacientes
WHERE nombre LIKE '%Eduardo%' 
  AND apellido_paterno LIKE '%Gonzalez%'
  AND apellido_materno LIKE '%Gonzalez%';

-- Ver todas las citas del paciente (antes de eliminar)
SELECT 
    c.id_cita,
    c.fecha_cita,
    c.motivo,
    c.es_primera_consulta,
    c.estado,
    c.asistencia,
    ROW_NUMBER() OVER (ORDER BY c.fecha_cita ASC, c.id_cita ASC) AS orden
FROM citas c
INNER JOIN pacientes p ON c.id_paciente = p.id_paciente
WHERE p.nombre LIKE '%Eduardo%' 
  AND p.apellido_paterno LIKE '%Gonzalez%'
  AND p.apellido_materno LIKE '%Gonzalez%'
ORDER BY c.fecha_cita ASC, c.id_cita ASC;

-- Eliminar citas excepto la primera consulta
-- NOTA: Esto eliminará también los registros relacionados en otras tablas
-- debido a las restricciones de clave foránea (ON DELETE CASCADE o manual)

DELETE c FROM citas c
INNER JOIN pacientes p ON c.id_paciente = p.id_paciente
WHERE p.nombre LIKE '%Eduardo%' 
  AND p.apellido_paterno LIKE '%Gonzalez%'
  AND p.apellido_materno LIKE '%Gonzalez%'
  AND (
    -- Eliminar si NO es la primera consulta
    c.es_primera_consulta = 0 
    OR c.es_primera_consulta IS NULL
    OR (
      -- Si hay múltiples con es_primera_consulta = 1, mantener solo la más antigua
      c.es_primera_consulta = 1 
      AND c.id_cita NOT IN (
        SELECT MIN(id_cita) 
        FROM citas c2
        INNER JOIN pacientes p2 ON c2.id_paciente = p2.id_paciente
        WHERE p2.nombre LIKE '%Eduardo%' 
          AND p2.apellido_paterno LIKE '%Gonzalez%'
          AND p2.apellido_materno LIKE '%Gonzalez%'
          AND (c2.es_primera_consulta = 1 OR c2.es_primera_consulta IS NULL)
        ORDER BY c2.fecha_cita ASC, c2.id_cita ASC
        LIMIT 1
      )
    )
  );

-- Verificar las citas restantes
SELECT 
    c.id_cita,
    c.fecha_cita,
    c.motivo,
    c.es_primera_consulta,
    c.estado,
    c.asistencia
FROM citas c
INNER JOIN pacientes p ON c.id_paciente = p.id_paciente
WHERE p.nombre LIKE '%Eduardo%' 
  AND p.apellido_paterno LIKE '%Gonzalez%'
  AND p.apellido_materno LIKE '%Gonzalez%'
ORDER BY c.fecha_cita ASC, c.id_cita ASC;

