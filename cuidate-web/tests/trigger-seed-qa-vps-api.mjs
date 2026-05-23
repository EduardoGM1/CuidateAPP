/**
 * Dispara el seed QA en el servidor (tras deploy + ALLOW_ADMIN_SEED_QA=true).
 *
 *   API_BASE_URL=https://cuidateapp.com.mx \
 *   ADMIN_EMAIL=admin@clinica.com ADMIN_PASSWORD=Admin123! \
 *   node tests/trigger-seed-qa-vps-api.mjs
 */
const API = (process.env.API_BASE_URL || 'https://cuidateapp.com.mx').replace(/\/$/, '');
const EMAIL = process.env.ADMIN_EMAIL || 'admin@clinica.com';
const PASS = process.env.ADMIN_PASSWORD || 'Admin123!';
const PACIENTE_ID = Number(process.env.PACIENTE_ID || '1123');

const login = await fetch(`${API}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Client-Type': 'web' },
  body: JSON.stringify({ email: EMAIL, password: PASS }),
});
const loginData = await login.json();
if (!login.ok) {
  console.error('Login falló:', loginData);
  process.exit(1);
}

const token = loginData.token;
const seed = await fetch(`${API}/api/admin/operations/seed/qa-paciente`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Client-Type': 'web',
  },
  body: JSON.stringify({ paciente_id: PACIENTE_ID }),
});
const body = await seed.json();
console.log('HTTP', seed.status);
console.log(JSON.stringify(body, null, 2));
process.exit(seed.ok ? 0 : 1);
