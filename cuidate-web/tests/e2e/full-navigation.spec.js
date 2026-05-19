import { test, expect } from '@playwright/test';
import { hasE2ECredentials, loginAsTestUser } from './helpers/auth.js';

const DOCTOR_ROUTES = [
  '/',
  '/dashboard',
  '/pacientes',
  '/citas',
  '/reportes',
  '/notificaciones',
  '/solicitudes-reprogramacion',
  '/chat',
  '/soporte/tickets',
  '/soporte/tickets/nuevo',
  '/perfil',
];

const ADMIN_EXTRA = [
  '/doctores',
  '/admin/auditoria',
  '/admin/catalogos',
  '/admin/usuarios',
  '/admin/operaciones',
  '/admin/tickets',
];

const PUBLIC_ROUTES = ['/login', '/forgot-password', '/aviso-privacidad'];

test.describe('Rutas públicas', () => {
  test('pantallas públicas sin auth', async ({ page }) => {
    for (const path of PUBLIC_ROUTES) {
      await page.goto(path);
      await expect(page.locator('body')).toBeVisible();
      const err500 = page.getByText(/error 500|internal server/i);
      await expect(err500).toHaveCount(0);
    }
  });
});

test.describe('Navegación completa (autenticado)', () => {
  test.skip(!hasE2ECredentials(), 'Requiere E2E_EMAIL y E2E_PASSWORD');
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await loginAsTestUser(page);
  });

  test('recorre rutas principales sin error fatal', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    const routes = [...DOCTOR_ROUTES];
    const isAdmin = await page.getByText(/usuarios|operaciones|auditoría/i).first().isVisible({ timeout: 2000 }).catch(() => false);
    if (isAdmin) routes.push(...ADMIN_EXTRA);

    for (const path of routes) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);
      const fatal = page.getByText(/something went wrong|error inesperado|failed to fetch/i);
      const fatalCount = await fatal.count();
      if (fatalCount > 0) {
        errors.push(`Ruta ${path}: mensaje de error visible`);
      }
    }

    const critical = errors.filter(
      (e) =>
        !/React Router Future Flag|favicon|404.*chunk|websocket|socket\.io|Failed to load resource/i.test(e)
    );
    expect(critical, critical.join('\n')).toEqual([]);
  });

  test('listado pacientes carga tabla o estado vacío', async ({ page }) => {
    await page.goto('/pacientes');
    await expect(
      page.locator('.ant-table, .ant-empty, [class*="pacientes"]').first()
    ).toBeVisible({ timeout: 20000 });
  });

  test('listado citas carga', async ({ page }) => {
    await page.goto('/citas');
    await expect(
      page.locator('.ant-table, .ant-empty, [class*="citas"]').first()
    ).toBeVisible({ timeout: 20000 });
  });
});
