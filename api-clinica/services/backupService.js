import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

const BACKUP_ROOT = process.env.BACKUP_ROOT || '/var/backups/cuidateapp';
const BACKUP_SCRIPT =
  process.env.BACKUP_SCRIPT_PATH || path.join(REPO_ROOT, 'deploy/backup/backup-db.sh');
const BACKUP_ENV_FILE = process.env.BACKUP_ENV_FILE || '/etc/cuidateapp/backup.env';
const ALLOW_API_TRIGGER = process.env.BACKUP_ALLOW_API_TRIGGER === 'true';

const SAFE_FILE = /^[\w./-]+\.(sql\.gz|sql\.gz\.gpg)$/;

function readManifest() {
  const manifestPath = path.join(BACKUP_ROOT, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return {
      configured: fs.existsSync(BACKUP_ROOT),
      lastRun: null,
      success: null,
      type: null,
      file: null,
      sizeBytes: 0,
      durationSec: 0,
      error: fs.existsSync(BACKUP_ROOT) ? null : 'Directorio de respaldos no encontrado en el servidor',
    };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return { configured: true, ...raw };
  } catch (e) {
    return { configured: true, success: false, error: e.message };
  }
}

function resolveBackupFile(relFile) {
  if (!relFile || typeof relFile !== 'string') return null;
  const normalized = relFile.replace(/\\/g, '/').replace(/^\/+/, '');
  if (normalized.includes('..') || !SAFE_FILE.test(path.basename(normalized))) {
    return null;
  }
  const full = path.resolve(BACKUP_ROOT, normalized);
  if (!full.startsWith(path.resolve(BACKUP_ROOT))) return null;
  if (!fs.existsSync(full) || !fs.statSync(full).isFile()) return null;
  return full;
}

function listRecentBackups(limit = 10) {
  const dirs = ['daily', 'weekly'];
  const files = [];
  for (const dir of dirs) {
    const abs = path.join(BACKUP_ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs)) {
      if (!SAFE_FILE.test(name)) continue;
      const full = path.join(abs, name);
      const st = fs.statSync(full);
      files.push({
        type: dir,
        file: `${dir}/${name}`,
        sizeBytes: st.size,
        mtime: st.mtime.toISOString(),
      });
    }
  }
  return files.sort((a, b) => new Date(b.mtime) - new Date(a.mtime)).slice(0, limit);
}

function runBackupScript(type = 'daily') {
  if (!ALLOW_API_TRIGGER) {
    const err = new Error('Respaldo manual por API deshabilitado. Configure BACKUP_ALLOW_API_TRIGGER=true.');
    err.statusCode = 403;
    throw err;
  }
  if (!fs.existsSync(BACKUP_SCRIPT)) {
    const err = new Error(`Script de respaldo no encontrado: ${BACKUP_SCRIPT}`);
    err.statusCode = 500;
    throw err;
  }

  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      BACKUP_TYPE: type === 'weekly' ? 'weekly' : 'daily',
      BACKUP_ENV_FILE,
    };
    const child = spawn('bash', [BACKUP_SCRIPT], { env, detached: true, stdio: 'ignore' });
    child.unref();
    child.on('error', reject);
    logger.info('[backup] Respaldo iniciado desde API', { type, pid: child.pid });
    resolve({ started: true, type, message: 'Respaldo en segundo plano. Actualice el estado en unos minutos.' });
  });
}

export default {
  getStatus() {
    const manifest = readManifest();
    const backups = manifest.configured ? listRecentBackups() : [];
    return {
      backupRoot: BACKUP_ROOT,
      allowApiTrigger: ALLOW_API_TRIGGER,
      manifest,
      recentBackups: backups,
    };
  },

  getDownloadablePath(relFile) {
    const target = relFile || readManifest().file;
    return resolveBackupFile(target);
  },

  runBackupNow(type) {
    return runBackupScript(type);
  },
};
