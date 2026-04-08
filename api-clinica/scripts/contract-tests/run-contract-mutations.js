#!/usr/bin/env node
/**
 * Contratos API: POST/PUT/PATCH/DELETE + validación de tipos JSON (misma forma web y app móvil).
 * Antes de la petición HTTP se valida el cuerpo con validatePayloadTypes (ver mutationCatalog.js).
 * Variables: API_BASE_URL, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD (o TEST_DOCTOR_*).
 * Uso: npm run test:contract
 * Cobertura vs rutas: npm run test:contract:scan
 * Chequeo local de esquemas (sin API): npm run test:contract:schemas
 */

import dotenv from 'dotenv';
import axios from 'axios';
import { getBaseUrl, createApiClient } from './http.js';
import { validatePayloadTypes } from './validatePayloadTypes.js';
import { buildScenarios } from './mutationCatalog.js';

dotenv.config();

const DELAY_MS = Math.max(0, parseInt(process.env.CONTRACT_TEST_DELAY_MS || '120', 10) || 0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loadRefs(ctx) {
  const client = createApiClient(getBaseUrl(), 'web', ctx.token);
  const [pr, dr] = await Promise.all([
    client.get('/pacientes?limit=1'),
    client.get('/doctores?limit=1'),
  ]);
  const pacientes = pr.data?.data?.pacientes;
  if (Array.isArray(pacientes) && pacientes[0]?.id_paciente) {
    ctx.pacienteId = pacientes[0].id_paciente;
  }
  const docData = dr.data?.data;
  if (Array.isArray(docData) && docData[0]?.id_doctor) {
    ctx.doctorId = docData[0].id_doctor;
  }
}

async function main() {
  const base = getBaseUrl();
  const ctx = {
    token: null,
    refreshToken: null,
    pacienteId: null,
    doctorId: null,
    citaId: null,
    signoId: null,
    diagnosticoId: null,
    redApoyoId: null,
  };

  const results = { passed: 0, failed: 0, skipped: 0 };
  const all = buildScenarios();
  const loginOnes = all.filter((s) => s.id.startsWith('auth.login'));
  const rest = all.filter((s) => !s.id.startsWith('auth.login'));

  console.log('\n=== Contratos API (POST/PUT/DELETE + tipos) ===');
  console.log('Base:', base, '\n');

  try {
    const h = await axios.get(`${base}/health`, { timeout: 10000, validateStatus: () => true });
    if (h.status < 200 || h.status >= 300) {
      console.error('GET /health fallo:', h.status);
      process.exit(1);
    }
    console.log('OK GET /health', h.status);
  } catch (e) {
    console.error('Sin conexion API:', e.message);
    process.exit(1);
  }

  async function runOne(scenario, variant) {
    const label = `${scenario.id} [${variant}]`;
    if (scenario.skipIf?.(ctx)) {
      results.skipped++;
      console.log('SKIP', label);
      return;
    }

    const urlPath = scenario.path(ctx);
    const body = scenario.body ? scenario.body(ctx) : undefined;

    if (body != null && scenario.requestSchema) {
      const { ok, errors } = validatePayloadTypes(body, scenario.requestSchema);
      if (!ok) {
        results.failed++;
        console.log('FAIL', label, '- tipos locales:', errors.join('; '));
        return;
      }
    }

    const client = createApiClient(base, variant, ctx.token);
    const cfg = {
      method: scenario.method,
      url: urlPath,
      validateStatus: () => true,
    };
    if (body !== undefined && scenario.method !== 'get' && scenario.method !== 'delete') {
      cfg.data = body;
    }

    let res;
    try {
      res = await client.request(cfg);
    } catch (e) {
      results.failed++;
      console.log('FAIL', label, '- red:', e.message);
      return;
    }

    if (!scenario.expectStatuses.includes(res.status)) {
      results.failed++;
      const snippet = JSON.stringify(res.data || {}).slice(0, 280);
      console.log('FAIL', label, '- HTTP', res.status, 'esperado', scenario.expectStatuses.join('|'));
      console.log(' ', snippet);
      return;
    }

    results.passed++;
    console.log('OK', label, '->', res.status);
    scenario.after?.(ctx, res);
  }

  for (const s of loginOnes) {
    for (const variant of s.clients) {
      await runOne(s, variant);
      if (DELAY_MS) await sleep(DELAY_MS);
    }
  }

  if (!ctx.token) {
    console.error('Sin token: defina TEST_ADMIN_EMAIL y TEST_ADMIN_PASSWORD');
    process.exit(1);
  }

  await loadRefs(ctx);
  if (!ctx.pacienteId) console.warn('Aviso: sin pacienteId');
  if (!ctx.doctorId) console.warn('Aviso: sin doctorId');

  for (const s of rest) {
    for (const variant of s.clients) {
      await runOne(s, variant);
      if (DELAY_MS) await sleep(DELAY_MS);
    }
  }

  console.log('\nResumen: OK', results.passed, 'Fallos', results.failed, 'Omitidos', results.skipped);
  if (results.failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
