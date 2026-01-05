-- Script SQL para cambiar el método de autenticación del usuario de MySQL
-- Ejecutar este script en MySQL como usuario root o con permisos suficientes

-- Reemplazar 'tu_usuario' y 'tu_password' con los valores reales de tu .env
-- O ejecutar directamente en MySQL:

-- Opción 1: Cambiar a caching_sha2_password (recomendado para MySQL 8.0+)
-- ALTER USER 'tu_usuario'@'localhost' IDENTIFIED WITH caching_sha2_password BY 'tu_password';
-- FLUSH PRIVILEGES;

-- Opción 2: Si necesitas usar mysql_native_password, primero cargar el plugin:
-- INSTALL PLUGIN mysql_native_password SONAME 'auth_native_password.so';
-- ALTER USER 'tu_usuario'@'localhost' IDENTIFIED WITH mysql_native_password BY 'tu_password';
-- FLUSH PRIVILEGES;

-- Para verificar el método de autenticación actual:
-- SELECT user, host, plugin FROM mysql.user WHERE user = 'tu_usuario';

