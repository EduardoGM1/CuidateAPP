-- Script para crear la base de datos medical_db
-- Ejecutar con: mysql -u root -p < crear-base-datos.sql

CREATE DATABASE IF NOT EXISTS medical_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE medical_db;

-- La base de datos está lista
-- Sequelize creará las tablas automáticamente al iniciar el servidor
