-- Fix: Actualizar fecha_nacimiento a TEXT
ALTER TABLE pacientes 
MODIFY COLUMN fecha_nacimiento TEXT NOT NULL 
COMMENT 'Fecha de nacimiento encriptada con AES-256-GCM (LFPDPPP, HIPAA §164.514)';

