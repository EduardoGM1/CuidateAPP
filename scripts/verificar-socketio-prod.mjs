#!/usr/bin/env node
/**
 * Verifica que /socket.io responda desde el proxy (no HTML de la SPA).
 * Uso: node scripts/verificar-socketio-prod.mjs [baseUrl]
 */
const base = (process.argv[2] || 'https://cuidateapp.com.mx').replace(/\/$/, '');
const url = `${base}/socket.io/?EIO=4&transport=polling`;

const res = await fetch(url, { headers: { Accept: '*/*' } });
const ct = res.headers.get('content-type') || '';
const body = (await res.text()).slice(0, 120);

const isSocketIo =
  ct.includes('application/json') ||
  body.startsWith('0{') ||
  body.includes('"sid"') ||
  body.includes('Bad request');

const isSpaHtml = ct.includes('text/html') || body.includes('<!DOCTYPE') || body.includes('<html');

console.log(`URL: ${url}`);
console.log(`HTTP: ${res.status}`);
console.log(`Content-Type: ${ct}`);
console.log(`Body preview: ${body.replace(/\s+/g, ' ')}`);

if (isSpaHtml && !isSocketIo) {
  console.error('\n[FALLO] Nginx está sirviendo la SPA en /socket.io (falta proxy).');
  process.exit(1);
}
if (isSocketIo || res.status === 400) {
  console.log('\n[OK] El endpoint /socket.io llega al backend Socket.IO.');
  process.exit(0);
}
console.warn('\n[WARN] Respuesta inesperada; revisar Nginx y PM2.');
process.exit(2);
