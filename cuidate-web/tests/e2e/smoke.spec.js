import { test, expect } from '@playwright/test';

test.describe('Smoke web', () => {
  test('página de login muestra formulario de acceso', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Área de Doctores y Administradores')).toBeVisible();
    await expect(page.getByLabel(/correo electrónico/i)).toBeVisible();
    await expect(page.getByLabel(/contraseña/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible();
  });

  test('enlace a recuperación de contraseña', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('link', { name: /olvidaste tu contraseña/i })).toBeVisible();
  });
});
