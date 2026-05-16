/**
 * Escribe manifest.json tras backup-db.sh (variables BK_* en entorno).
 */
import fs from 'fs';

const manifestPath = process.env.BK_MANIFEST;
if (!manifestPath) {
  process.exit(0);
}

const data = {
  lastRun: new Date().toISOString(),
  success: process.env.BK_SUCCESS === 'true',
  type: process.env.BK_TYPE || 'daily',
  file: process.env.BK_FILE || null,
  sizeBytes: parseInt(process.env.BK_SIZE || '0', 10) || 0,
  durationSec: parseInt(process.env.BK_DURATION || '0', 10) || 0,
  error: process.env.BK_ERROR || null,
};

fs.writeFileSync(manifestPath, JSON.stringify(data, null, 2), 'utf8');
