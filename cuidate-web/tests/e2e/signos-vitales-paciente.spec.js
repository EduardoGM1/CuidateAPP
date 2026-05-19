/**
 * QA E2E: registro de signos vitales en ficha de paciente.
 *
 * Requiere:
 *   E2E_EMAIL, E2E_PASSWORD (admin o doctor con permiso médico)
 *   PLAYWRIGHT_BASE_URL (opcional; prod: https://cuidateapp.com.mx)
 *   E2E_PATIENT_NAME (opcional; default: armando perez aguilar)
 *
 * En prod con rate limit: bash deploy/qa-toggle-auth-rate-limit.sh off
 */
import { test, expect } from '@playwright/test';
import { hasE2ECredentials, loginAsTestUser } from './helpers/auth.js';
import { openPacienteByNombre } from './helpers/paciente.js';
import { buildSignosVitalesTestData, fillSignosVitalesForm } from './helpers/signosVitales.js';

const PATIENT_NAME = process.env.E2E_PATIENT_NAME || 'armando perez aguilar';

test.describe('Signos vitales — paciente', () => {
  test.skip(!hasE2ECredentials(), 'Define E2E_EMAIL y E2E_PASSWORD');

  test.beforeEach(async ({ page }) => {
    test.setTimeout(120_000);
    await loginAsTestUser(page);
  });

  test('inserta registro completo en formulario de signos vitales', async ({ page }) => {
    const suffix = Date.now();
    const signosData = buildSignosVitalesTestData(suffix);

    await openPacienteByNombre(page, PATIENT_NAME);

    await page.getByRole('button', { name: /abrir signos vitales/i }).click();
    await expect(page.getByRole('dialog').filter({ hasText: /signos vitales/i }).first()).toBeVisible({
      timeout: 15000,
    });

    await page.getByRole('button', { name: /^agregar registro$/i }).click();
    const formModal = page.getByRole('dialog').filter({ hasText: /nuevo registro de signos vitales/i });
    await expect(formModal).toBeVisible({ timeout: 10000 });

    await fillSignosVitalesForm(page, signosData);
    await expect(formModal.getByText(/IMC:/i)).toBeVisible();

    await formModal.getByRole('button', { name: /^guardar registro$/i }).click();

    await expect(page.getByText(/registro de signos vitales guardado/i)).toBeVisible({ timeout: 20000 });

    await expect(formModal).toBeHidden({ timeout: 10000 });

    await expect(page.getByText(signosData.observaciones)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Peso:\s*72/).first()).toBeVisible();
  });
});
