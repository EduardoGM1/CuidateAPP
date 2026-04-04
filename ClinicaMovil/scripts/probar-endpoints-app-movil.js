/**
 * Prueba de conectividad y existencia de rutas usadas por la app móvil (ClinicaMovil).
 * No modifica datos: usa cuerpos vacíos o inválidos para obtener 400/401/422 cuando aplica.
 *
 * Uso:
 *   node scripts/probar-endpoints-app-movil.js
 *   API_BASE_URL=http://127.0.0.1:3000 node scripts/probar-endpoints-app-movil.js
 *   ENDPOINT_DELAY_MS=300 node scripts/probar-endpoints-app-movil.js
 *
 * Por defecto lee PRODUCTION_API_BASE_URL de src/config/apiEndpoints.js
 *
 * Evita lanzar la batería completa muchas veces seguidas contra producción: muchos VPS
 * aplican rate-limit (HTTP 429). Usa --smoke para 5 comprobaciones o sube ENDPOINT_DELAY_MS.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

function readProductionBaseUrl() {
  if (process.env.API_BASE_URL) {
    return process.env.API_BASE_URL.replace(/\/$/, '');
  }
  const ep = path.join(__dirname, '../src/config/apiEndpoints.js');
  const raw = fs.readFileSync(ep, 'utf8');
  const m = raw.match(/PRODUCTION_API_BASE_URL\s*=\s*['"]([^'"]+)['"]/);
  if (!m) throw new Error('No se encontró PRODUCTION_API_BASE_URL en apiEndpoints.js');
  return m[1].replace(/\/$/, '');
}

const MOBILE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Client-Type': 'app',
  'X-Platform': 'android',
  'X-Device-ID': 'probe-script',
  'X-App-Version': '1.0.0',
};

const P = '00000000-0000-0000-0000-000000000001';
const D = '00000000-0000-0000-0000-000000000002';
const C = '00000000-0000-0000-0000-000000000003';
const U = '00000000-0000-0000-0000-000000000004';
const M = '00000000-0000-0000-0000-000000000005';

function isOkStatus(status, critical) {
  if (status >= 200 && status < 300) return { ok: true, label: '2xx' };
  if (critical && (status === 404 || status === 401 || status === 403)) {
    return { ok: false, label: `crítico debe ser 2xx (recibió ${status})` };
  }
  if (status === 401 || status === 403) return { ok: true, label: 'auth-requerido' };
  if (status === 400 || status === 422) return { ok: true, label: 'validación/cuerpo' };
  // Servidor respondió “ya no existe / migrado” — útil saberlo sin marcar como red fallida.
  if (status === 410) return { ok: true, label: '410 Gone (revisar app vs backend)' };
  if (status === 404) return { ok: true, label: '404(recurso/ruta)' };
  if (status >= 500 && status < 600) {
    return { ok: critical ? false : true, label: `5xx(${status})` };
  }
  if (status === 429) return { ok: false, label: '429 rate-limit' };
  if (status === 502 || status === 503 || status === 504) return { ok: false, label: 'proxy/upstream' };
  return { ok: false, label: `status-${status}` };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function requestOnce(method, url, body, headers) {
  const cfg = {
    timeout: 20000,
    validateStatus: () => true,
    headers: { ...headers },
  };
  if (method === 'get') return axios.get(url, cfg);
  if (method === 'post') return axios.post(url, body !== undefined ? body : {}, cfg);
  if (method === 'put') return axios.put(url, body !== undefined ? body : {}, cfg);
  if (method === 'delete') return axios.delete(url, cfg);
  if (method === 'patch') return axios.patch(url, body !== undefined ? body : {}, cfg);
  throw new Error(`Método ${method}`);
}

function buildEndpoints() {
  const e = [];

  const add = (name, method, pathSuffix, body = null, critical = false) => {
    e.push({ name, method, path: `/api${pathSuffix.startsWith('/') ? pathSuffix : `/${pathSuffix}`}`, body, critical });
  };

  // Públicos / semi-públicos (app real)
  // Único crítico público: la app usa esto para probar conectividad (ver apiConfig.js).
  add('mobile/config', 'get', '/mobile/config', null, true);
  // En muchos despliegues /dashboard/* exige JWT igual que el resto; 401 implica ruta montada.
  add('dashboard/health', 'get', '/dashboard/health', null, false);

  add('mobile/login (credenciales inválidas)', 'post', '/mobile/login', { email: 'probe@invalid.local', password: 'x' });
  add('mobile/refresh-token inválido', 'post', '/mobile/refresh-token', { refreshToken: 'invalid' });
  add('mobile/device/register cuerpo mínimo', 'post', '/mobile/device/register', {});
  add('mobile/device/unregister', 'post', '/mobile/device/unregister', {});

  add('auth/register vacío', 'post', '/auth/register', {});
  add('auth/forgot-password', 'post', '/auth/forgot-password', { email: 'probe@invalid.local' });
  add('auth/reset-password vacío', 'post', '/auth/reset-password', {});
  add('auth/change-password sin sesión', 'put', '/auth/change-password', {});

  add('auth-unified/setup-pin', 'post', '/auth-unified/setup-pin', {});
  add('auth-unified/change-pin', 'put', '/auth-unified/change-pin', {});
  add('auth-unified/setup-biometric', 'post', '/auth-unified/setup-biometric', {});
  add('auth-unified/login-paciente PIN inválido', 'post', '/auth-unified/login-paciente', {
    pin: '0000',
    device_id: 'probe',
  });
  // /paciente-auth queda 410 en el backend (legacy); la app usa auth-unified.
  add('paciente-auth legacy (410 esperado)', 'post', '/paciente-auth/login-pin', {});

  // Listados (sin token → suele 401)
  add('doctores listado', 'get', '/doctores');
  add('pacientes listado', 'get', '/pacientes');
  add('citas listado', 'get', '/citas');
  add('medicamentos listado', 'get', '/medicamentos');
  add('modulos', 'get', '/modulos');
  add('instituciones-salud', 'get', '/instituciones-salud');
  add('comorbilidades', 'get', '/comorbilidades');
  add('vacunas', 'get', '/vacunas');

  // Dashboard admin/doctor
  add('dashboard/admin/summary', 'get', '/dashboard/admin/summary');
  add('dashboard/admin/metrics', 'get', '/dashboard/admin/metrics');
  add('dashboard/admin/charts/test', 'get', '/dashboard/admin/charts/test');
  add('dashboard/admin/alerts', 'get', '/dashboard/admin/alerts');
  add('dashboard/admin/analytics', 'get', '/dashboard/admin/analytics');
  add('dashboard/doctor/summary', 'get', '/dashboard/doctor/summary');
  add('dashboard/doctor/patients', 'get', '/dashboard/doctor/patients');
  add('dashboard/doctor/appointments', 'get', '/dashboard/doctor/appointments');
  add('dashboard/doctor/messages', 'get', '/dashboard/doctor/messages');
  add('dashboard/doctor/patient por id', 'get', `/dashboard/doctor/patient/${P}`);
  add('dashboard/doctor/patient vitals', 'get', `/dashboard/doctor/patient/${P}/vitals`);

  // Doctores / pacientes por id
  add('doctor por id', 'get', `/doctores/${D}`);
  add('paciente por id', 'get', `/pacientes/${P}`);
  add('doctor dashboard', 'get', `/doctores/${D}/dashboard`);
  add('doctor available-patients', 'get', `/doctores/${D}/available-patients`);

  // Auth usuarios
  add('auth/usuarios', 'get', '/auth/usuarios');
  add('auth/usuario por id', 'get', `/auth/usuarios/${U}`);

  // Citas
  add('cita por id', 'get', `/citas/${C}`);
  add('citas solicitudes reprogramación (admin)', 'get', '/citas/solicitudes-reprogramacion');
  add('post citas (vacío)', 'post', '/citas', {});
  add('post citas/consulta-completa', 'post', '/citas/consulta-completa', {});
  add('post citas/primera-consulta', 'post', '/citas/primera-consulta', {});
  add('post pacientes/completo vacío', 'post', '/pacientes/completo', {});
  add('put auth/admin/change-password', 'put', '/auth/admin/change-password', {});

  // Paciente — subrecursos GET
  const sub = (label, suffix) => add(label, 'get', `/pacientes/${P}${suffix}`);
  sub('paciente citas', '/citas');
  sub('paciente signos-vitales', '/signos-vitales');
  sub('paciente diagnosticos', '/diagnosticos');
  sub('paciente medicamentos', '/medicamentos');
  sub('paciente resumen-medico', '/resumen-medico');
  sub('paciente red-apoyo', '/red-apoyo');
  sub('paciente esquema-vacunacion', '/esquema-vacunacion');
  sub('paciente sesiones-educativas', '/sesiones-educativas');
  sub('paciente solicitudes-reprogramacion', '/solicitudes-reprogramacion');
  sub('paciente doctores', '/doctores');
  sub('paciente detecciones-complicaciones', '/detecciones-complicaciones');
  sub('paciente salud-bucal', '/salud-bucal');
  sub('paciente detecciones-tuberculosis', '/detecciones-tuberculosis');
  sub('paciente comorbilidades', '/comorbilidades');
  add('medicamentos-toma por paciente', 'get', `/medicamentos-toma/paciente/${P}`);

  // POST mínimos (sin datos válidos → 400/401)
  add('post medicamentos-toma', 'post', '/medicamentos-toma', {});
  add('post detecciones-complicaciones', 'post', `/pacientes/${P}/detecciones-complicaciones`, {});
  add('post salud-bucal', 'post', `/pacientes/${P}/salud-bucal`, {});
  add('post detecciones-tuberculosis', 'post', `/pacientes/${P}/detecciones-tuberculosis`, {});

  // Chat
  add('mensajes-chat conversación paciente', 'get', `/mensajes-chat/paciente/${P}`);
  add('mensajes-chat paciente-doctor', 'get', `/mensajes-chat/paciente/${P}/doctor/${D}`);
  add('mensajes-chat doctor conversaciones', 'get', `/mensajes-chat/doctor/${D}/conversaciones`);
  add('mensajes-chat no leídos', 'get', `/mensajes-chat/paciente/${P}/no-leidos`);
  add('post mensajes-chat vacío', 'post', '/mensajes-chat', {});
  add('put mensajes-chat leido', 'put', `/mensajes-chat/${M}/leido`);
  add('put leer-todos conversación', 'put', `/mensajes-chat/paciente/${P}/doctor/${D}/leer-todos`, {});
  add('put mensajes-chat actualizar', 'put', `/mensajes-chat/${M}`, { mensaje_texto: 'x' });
  add('delete mensajes-chat', 'delete', `/mensajes-chat/${M}`);

  // Notificaciones doctor
  add('notificaciones listado', 'get', `/doctores/${D}/notificaciones`);
  add('notificaciones contador', 'get', `/doctores/${D}/notificaciones/contador`);
  add('put notificación leída', 'put', `/doctores/${D}/notificaciones/${M}/leida`, {});
  add('put notif mensaje leída', 'put', `/doctores/${D}/notificaciones/mensaje/${P}/leida`, {});
  add('put notif archivar', 'put', `/doctores/${D}/notificaciones/${M}/archivar`, {});

  // Asignaciones (POST vacío)
  add('post assign-patient', 'post', `/doctores/${D}/assign-patient`, {});
  add('post paciente doctores', 'post', `/pacientes/${P}/doctores`, {});

  // Auditoría
  add('admin/auditoria', 'get', '/admin/auditoria');
  add('admin/auditoria por id', 'get', `/admin/auditoria/${U}`);
  add('admin/auditoria/usuarios', 'get', '/admin/auditoria/usuarios');
  add('admin/auditoria/estadisticas', 'get', '/admin/auditoria/estadisticas');
  add('post admin/auditoria/exportar', 'post', '/admin/auditoria/exportar', {});

  // Reportes
  add('reportes estadísticas html', 'get', '/reportes/estadisticas/html');
  add('reportes signos-vitales csv', 'get', `/reportes/signos-vitales/${P}/csv`);
  add('reportes citas csv', 'get', `/reportes/citas/${P}/csv`);
  add('reportes diagnosticos csv', 'get', `/reportes/diagnosticos/${P}/csv`);
  add('reportes expediente html', 'get', `/reportes/expediente/${P}/html`);
  add('reportes pdf genérico', 'get', `/reportes/signos-vitales/${P}/pdf`);

  return e;
}

async function probeRootHealth(baseURL) {
  try {
    const r = await axios.get(`${baseURL}/health`, {
      timeout: 12000,
      validateStatus: () => true,
      headers: MOBILE_HEADERS,
    });
    return { name: 'GET /health (sin /api)', status: r.status, ok: r.status >= 200 && r.status < 300 };
  } catch (err) {
    return {
      name: 'GET /health (sin /api)',
      status: null,
      ok: false,
      error: err.code || err.message,
    };
  }
}

async function run() {
  const baseURL = readProductionBaseUrl();
  const smoke = process.argv.includes('--smoke');
  const allEndpoints = buildEndpoints();
  const smokeNames = new Set([
    'mobile/config',
    'dashboard/health',
    'doctores listado',
    'mobile/login (credenciales inválidas)',
    'modulos',
  ]);
  const endpoints = smoke ? allEndpoints.filter((e) => smokeNames.has(e.name)) : allEndpoints;
  const results = [];

  console.log('\n══════════════════════════════════════════════════════════');
  console.log(' Pruebas de endpoints — app móvil CuidaTe');
  console.log(' Base:', baseURL);
  console.log(smoke ? ' Modo: --smoke (muestra)' : ' Modo: batería completa');
  console.log(' Total peticiones /api:', endpoints.length);
  console.log('══════════════════════════════════════════════════════════\n');

  const rootH = await probeRootHealth(baseURL);
  console.log(
    `${rootH.ok ? '✅' : '⚠️'} ${rootH.name} → ${rootH.status != null ? rootH.status : rootH.error}\n`,
  );

  const delayMs = Math.max(0, parseInt(process.env.ENDPOINT_DELAY_MS || '200', 10) || 0);

  for (const ep of endpoints) {
    const url = `${baseURL}${ep.path}`;
    try {
      let res = await requestOnce(ep.method, url, ep.body, MOBILE_HEADERS);
      if (res.status === 429) {
        await sleep(3000);
        res = await requestOnce(ep.method, url, ep.body, MOBILE_HEADERS);
      }

      const verdict = isOkStatus(res.status, ep.critical);
      results.push({
        name: ep.name,
        method: ep.method.toUpperCase(),
        path: ep.path,
        status: res.status,
        ok: verdict.ok,
        label: verdict.label,
        critical: ep.critical,
      });
      const icon = verdict.ok ? '✅' : '❌';
      console.log(`${icon} ${ep.method.toUpperCase()} ${ep.path} → ${res.status} (${verdict.label})  # ${ep.name}`);
    } catch (err) {
      results.push({
        name: ep.name,
        method: ep.method.toUpperCase(),
        path: ep.path,
        status: null,
        ok: false,
        label: 'network',
        error: err.code || err.message,
        critical: ep.critical,
      });
      console.log(`❌ ${ep.method.toUpperCase()} ${ep.path} → ERROR ${err.code || err.message}  # ${ep.name}`);
    }
    if (delayMs) await sleep(delayMs);
  }

  const failed = results.filter((r) => !r.ok);
  const criticalFail = failed.filter((r) => r.critical);

  console.log('\n══════════════════════════════════════════════════════════');
  console.log(` Resumen: ${results.length - failed.length} OK / ${failed.length} fallo`);
  if (criticalFail.length) {
    console.log(` Críticos fallidos: ${criticalFail.map((r) => r.name).join(', ')}`);
  }
  console.log('══════════════════════════════════════════════════════════\n');

  const many429 = failed.filter((r) => r.label === '429 rate-limit').length;
  if (many429 >= Math.max(3, Math.floor(endpoints.length * 0.5))) {
    console.log(
      'Aviso: muchas respuestas 429 (rate-limit). Espera unos minutos o prueba con API_BASE_URL apuntando a local.\n',
    );
  }

  if (criticalFail.length) process.exit(1);
  if (failed.length) process.exit(2);
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
