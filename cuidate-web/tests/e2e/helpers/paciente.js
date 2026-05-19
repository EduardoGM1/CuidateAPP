import { expect } from '@playwright/test';

const DEFAULT_PATIENT = 'armando perez aguilar';

/**
 * Busca un paciente por nombre en /pacientes y abre su ficha.
 * @param {import('@playwright/test').Page} page
 * @param {string} [nombre]
 * @returns {Promise<string>} id del paciente (desde la URL)
 */
export async function openPacienteByNombre(page, nombre = process.env.E2E_PATIENT_NAME || DEFAULT_PATIENT) {
  await page.goto('/pacientes');
  await expect(page.getByRole('heading', { name: /pacientes/i })).toBeVisible({ timeout: 20000 });

  const search = page.getByPlaceholder(/buscar por nombre/i);
  await search.fill(nombre);
  await page.getByRole('button', { name: /^buscar$/i }).click();

  const row = page.locator('table tbody tr').filter({ hasText: new RegExp(nombre.split(/\s+/).slice(0, 2).join('|'), 'i') }).first();
  await expect(row).toBeVisible({ timeout: 25000 });
  await row.click();

  await page.waitForURL(/\/pacientes\/\d+/, { timeout: 30000 });
  const match = page.url().match(/\/pacientes\/(\d+)/);
  expect(match, 'URL debe incluir id de paciente').toBeTruthy();
  return match[1];
}
