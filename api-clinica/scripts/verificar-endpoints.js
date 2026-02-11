/**
 * Script para verificar endpoints clave de la API en producción.
 *
 * Ejecutar desde api-clinica:
 *   node scripts/verificar-endpoints.js
 *   node scripts/verificar-endpoints.js "admin@clinica.com" "Admin123!"
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const BASE_URL = process.env.API_BASE_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;

const ADMIN_EMAIL = process.argv[2] || 'admin@clinica.com';
const ADMIN_PASSWORD = process.argv[3] || 'Admin123!';

const endpoints = [
  { method: 'POST', path: '/api/auth/login', name: 'Login Admin' },
  { method: 'GET', path: '/api/dashboard', name: 'Dashboard' },
  { method: 'GET', path: '/api/pacientes', name: 'Listado pacientes' },
  { method: 'GET', path: '/api/doctores', name: 'Listado doctores' },
  { method: 'GET', path: '/api/citas', name: 'Listado citas' },
  { method: 'GET', path: '/api/reportes/dashboard', name: 'Reportes dashboard' },
  { method: 'GET', path: '/api/auditoria', name: 'Auditoría' },
  { method: 'GET', path: '/api/mobile/config', name: 'Config móvil' },
];

async function main() {
  console.log('\n========== VERIFICACIÓN DE ENDPOINTS ==========\n');
  console.log(`Base URL: ${BASE_URL}`);

  // 1. Login Admin
  console.log(`\n1) Login Admin (${ADMIN_EMAIL})`);
  let token = null;
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
      signal: AbortSignal.timeout(15000),
    });
    const status = res.status;
    const text = await res.text();
    let body;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    console.log(`   Status: ${status}`);
    if (status === 200 && body?.token) {
      token = body.token;
      console.log('   ✅ Login OK, token obtenido.');
    } else {
      console.log('   ⚠️ Login no exitoso. Body:', typeof body === 'object' ? JSON.stringify(body) : body);
    }
  } catch (err) {
    console.log(`   ❌ Error en login: ${err.message}`);
  }

  // 2. Endpoints protegidos con token
  for (const ep of endpoints.slice(1)) {
    console.log(`\n> ${ep.name} [${ep.method} ${ep.path}]`);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${BASE_URL}${ep.path}`, {
        method: ep.method,
        headers,
        signal: AbortSignal.timeout(15000),
      });
      const status = res.status;
      const text = await res.text();
      let body;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text;
      }
      console.log(`   Status: ${status}`);
      if (status === 200 || status === 404 || status === 429) {
        console.log('   ✅ Endpoint responde (200/404/429 aceptado).');
      } else {
        console.log('   ⚠️ Respuesta inesperada. Body:', typeof body === 'object' ? JSON.stringify(body) : body);
      }
    } catch (err) {
      console.log(`   ❌ Error llamando al endpoint: ${err.message}`);
    }
  }

  console.log('\n========== FIN VERIFICACIÓN ==========\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

