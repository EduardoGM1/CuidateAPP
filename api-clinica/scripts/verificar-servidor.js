/**
 * Script de verificación: base de datos, usuarios y login.
 * Ejecutar desde api-clinica: node scripts/verificar-servidor.js
 * En la VPS: cd /var/www/CuidateAPP/api-clinica && node scripts/verificar-servidor.js
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import Sequelize from 'sequelize';

const DB_NAME = process.env.DB_NAME || 'medical_db';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 3306;
const PORT = process.env.PORT || 3000;

async function main() {
  console.log('\n========== VERIFICACIÓN SERVIDOR / BASE DE DATOS ==========\n');

  // 0. Variables críticas
  console.log('0. Variables de entorno (.env)...');
  const envVars = ['DB_HOST', 'DB_NAME', 'DB_USER', 'PORT', 'NODE_ENV'];
  const missing = envVars.filter((k) => !process.env[k]);
  if (missing.length) {
    console.log(`   ⚠️ Faltan o están vacías: ${missing.join(', ')}`);
  } else {
    console.log('   OK: DB_HOST, DB_NAME, DB_USER, PORT, NODE_ENV definidos.');
  }
  if (process.env.NODE_ENV === 'production' && process.env.FORCE_HTTPS !== 'false') {
    console.log('   ⚠️ En producción por IP sin SSL, pon FORCE_HTTPS=false en .env para evitar 301 en login.');
  }
  console.log('');

  // 1. Conexión MySQL
  console.log('1. Conexión a MySQL...');
  console.log(`   Host: ${DB_HOST}:${DB_PORT}, DB: ${DB_NAME}, User: ${DB_USER}`);
  const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: Number(DB_PORT),
    dialect: 'mysql',
    logging: false,
  });

  try {
    await sequelize.authenticate();
    console.log('   ✅ Conexión a la base de datos OK.\n');
  } catch (err) {
    console.log('   ❌ Error conectando a la base de datos:', err.message);
    console.log('   Revisa DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT en .env\n');
    process.exit(1);
  }

  // 2. Tabla usuarios
  console.log('2. Tabla usuarios...');
  try {
    const [rows] = await sequelize.query(
      "SELECT id_usuario, email, rol, activo FROM usuarios LIMIT 10"
    );
    const [countRows] = await sequelize.query("SELECT COUNT(*) as total FROM usuarios");
    const total = countRows[0]?.total ?? 0;
    console.log(`   Total de usuarios: ${total}`);
    if (rows.length === 0) {
      console.log('   ⚠️ No hay usuarios en la tabla. Crea al menos uno (Admin) para poder hacer login.');
      console.log('   Puedes usar un script de seed o INSERT manual en MySQL.\n');
    } else {
      console.log('   Primeros usuarios (email, rol, activo):');
      rows.forEach((u) => {
        console.log(`      - ${u.email} | rol: ${u.rol} | activo: ${u.activo}`);
      });
      console.log('');
    }
  } catch (err) {
    console.log('   ❌ Error leyendo usuarios:', err.message);
    if (err.message.includes("doesn't exist")) {
      console.log('   La tabla "usuarios" no existe. Ejecuta las migraciones o crea la base de datos.\n');
    }
    process.exit(1);
  }

  // 3. Test login vía HTTP (localhost)
  console.log('3. Prueba de login (POST /api/auth/login)...');
  const testEmail = process.argv[2] || rows?.[0]?.email;
  const testPassword = process.argv[3] || 'test';
  if (!testEmail) {
    console.log('   ⚠️ No hay usuarios para probar. Uso: node scripts/verificar-servidor.js [email] [password]\n');
  } else {
    try {
      const url = `http://127.0.0.1:${PORT}/api/auth/login`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, password: testPassword }),
        signal: AbortSignal.timeout(5000),
      });
      const status = res.status;
      let body;
      try {
        body = await res.json();
      } catch {
        body = await res.text();
      }
      if (status === 200 && body?.token) {
        console.log(`   ✅ Login OK (${testEmail}). Token recibido.`);
      } else if (status === 401) {
        console.log(`   ⚠️ Credenciales incorrectas (${status}). Revisa email y contraseña.`);
        console.log('   Respuesta:', typeof body === 'object' ? JSON.stringify(body) : body);
      } else {
        console.log(`   ❌ Respuesta inesperada: ${status}`);
        console.log('   Body:', typeof body === 'object' ? JSON.stringify(body) : body);
      }
    } catch (err) {
      console.log('   ❌ No se pudo conectar a la API:', err.message);
      console.log(`   ¿Está la API corriendo en el puerto ${PORT}? (pm2 status / pm2 start index.js)`);
    }
  }

  await sequelize.close();

  console.log('Comandos útiles en la VPS:');
  console.log('  pm2 status');
  console.log('  pm2 logs api-clinica --lines 30');
  console.log('  curl -X POST http://127.0.0.1:3000/api/auth/login -H "Content-Type: application/json" -d \'{"email":"TU_EMAIL","password":"TU_PASSWORD"}\'');
  console.log('\n========== FIN VERIFICACIÓN ==========\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
