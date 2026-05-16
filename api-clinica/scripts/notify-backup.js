/**
 * Notifica por correo el resultado del backup (sin adjuntar el archivo).
 * Invocado desde deploy/backup/backup-db.sh tras el dump.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Op } from 'sequelize';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { default: emailService } = await import('../services/emailService.js');
const { Usuario } = await import('../models/associations.js');
const { default: sequelize } = await import('../config/db.js');

const manifestPath =
  process.env.BK_MANIFEST ||
  path.join(process.env.BACKUP_ROOT || '/var/backups/cuidateapp', 'manifest.json');

let manifest = {};
try {
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  }
} catch {
  manifest = { success: false, error: 'No se pudo leer manifest.json' };
}

async function resolveAdminEmails() {
  const fromEnv = process.env.BACKUP_NOTIFY_EMAILS || '';
  const list = fromEnv
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  if (list.length > 0) return list;

  try {
    const rows = await Usuario.findAll({
      where: { rol: { [Op.in]: ['Admin', 'admin', 'Administrador'] }, activo: true },
      attributes: ['email'],
    });
    return rows.map((r) => r.email).filter(Boolean);
  } catch {
    return [];
  }
}

const emails = await resolveAdminEmails();
if (emails.length === 0) {
  console.warn('[notify-backup] Sin destinatarios (BACKUP_NOTIFY_EMAILS o admins activos)');
  process.exit(0);
}

for (const to of emails) {
  await emailService.sendBackupNotificationEmail(to, manifest);
}

await sequelize.close().catch(() => {});
console.log(`[notify-backup] Notificación enviada a ${emails.length} admin(s)`);
