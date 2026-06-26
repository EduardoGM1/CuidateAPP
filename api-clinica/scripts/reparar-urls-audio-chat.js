/**
 * Repara mensaje_audio_url corruptas por sanitizeStrings (entidades HTML).
 * Uso: node scripts/reparar-urls-audio-chat.js
 */
import dotenv from 'dotenv';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';
import MensajeChat from '../models/MensajeChat.js';
import { persistUploadPath } from '../utils/uploadSignedUrl.js';

dotenv.config();

async function main() {
  const rows = await MensajeChat.findAll({
    where: { mensaje_audio_url: { [Op.ne]: null } },
    attributes: ['id_mensaje', 'mensaje_audio_url'],
  });

  let fixed = 0;
  let skipped = 0;
  for (const row of rows) {
    const raw = row.mensaje_audio_url;
    const clean = persistUploadPath(raw);
    if (!clean) {
      console.warn('No se pudo reparar id_mensaje', row.id_mensaje, raw?.slice(0, 80));
      skipped++;
      continue;
    }
    if (clean !== raw) {
      await row.update({ mensaje_audio_url: clean });
      console.log('Reparado', row.id_mensaje, '->', clean);
      fixed++;
    }
  }

  console.log(`Listo. Reparados: ${fixed}, sin cambio/error: ${skipped + rows.length - fixed - skipped}`);
  await sequelize.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
