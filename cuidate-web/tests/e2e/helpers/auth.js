import { expect } from '@playwright/test';

const EMAIL = process.env.E2E_EMAIL || process.env.TEST_EMAIL || '';
const PASSWORD = process.env.E2E_PASSWORD || process.env.TEST_PASSWORD || '';

export function hasE2ECredentials() {
  return Boolean(EMAIL && PASSWORD);
}

/**
 * Inicia sesión y acepta aviso de privacidad si aparece (Doctor).
 */
export async function loginAsTestUser(page) {
  if (!hasE2ECredentials()) {
    throw new Error('Define E2E_EMAIL y E2E_PASSWORD para pruebas autenticadas');
  }
  await page.goto('/login');
  await page.getByLabel(/correo electrónico/i).fill(EMAIL);
  await page.getByLabel(/contraseña/i).fill(PASSWORD);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();

  const rateLimitAuth = page.getByText(/demasiados intentos de autenticación/i);
  const rateLimitIp = page.getByText(/demasiadas solicitudes desde esta ip/i);
  if (await rateLimitAuth.isVisible({ timeout: 3000 }).catch(() => false)) {
    throw new Error(
      'Rate limit de login (15 min). Espera antes de repetir pruebas E2E o API contra producción.'
    );
  }
  if (await rateLimitIp.isVisible({ timeout: 3000 }).catch(() => false)) {
    throw new Error(
      'Rate limit general por IP (429). Ejecuta desde el VPS, espera 15 min o aumenta RATE_LIMIT_MAX en api-clinica.'
    );
  }

  const badCreds = page.getByText(/credenciales inválidas/i);
  if (await badCreds.isVisible({ timeout: 5000 }).catch(() => false)) {
    throw new Error('Credenciales inválidas para E2E_EMAIL / E2E_PASSWORD');
  }

  const acceptBtn = page.getByRole('button', { name: /aceptar y continuar/i });
  if (await acceptBtn.isVisible({ timeout: 12000 }).catch(() => false)) {
    const checks = page.locator('input[type="checkbox"]');
    const count = await checks.count();
    for (let i = 0; i < count; i++) await checks.nth(i).check();
    await acceptBtn.click();
  }

  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 45000 });
  await expect(page.locator('.ant-layout-sider, .saas-sidebar, nav, [class*="MainLayout"]').first()).toBeVisible({
    timeout: 15000,
  });
}

export { EMAIL, PASSWORD };
