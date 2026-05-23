/**
 * Ejecuta seed QA en VPS por SSH (VPS_PASS o VPS_SSH_PASSWORD).
 * node scripts/run-seed-qa-vps-ssh.mjs
 */
import { Client } from 'ssh2';

const host = process.env.VPS_HOST || '187.77.14.148';
const user = process.env.VPS_USER || 'root';
const password = process.env.VPS_SSH_PASSWORD || process.env.VPS_PASS;
const pacienteId = process.env.PACIENTE_ID || '1123';

if (!password) {
  console.error('Define VPS_PASS o VPS_SSH_PASSWORD');
  process.exit(1);
}

const cmd = `cd /var/www/CuidateAPP 2>/dev/null || cd /var/www/cuidateapp/CuidateAPP; git pull origin main && PACIENTE_ID=${pacienteId} bash deploy/ejecutar-seed-qa-paciente-vps.sh`;

const conn = new Client();
conn.on('keyboard-interactive', (_name, _instr, _lang, prompts, finish) => {
  finish(prompts.map(() => password));
});
conn
  .on('ready', () => {
    console.log(`Conectado a ${user}@${host}\n`);
    conn.exec(cmd, (err, stream) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      stream.on('close', (code) => {
        conn.end();
        process.exit(code || 0);
      });
      stream.on('data', (d) => process.stdout.write(d));
      stream.stderr.on('data', (d) => process.stderr.write(d));
    });
  })
  .on('error', (e) => {
    console.error('SSH error:', e.message);
    process.exit(1);
  })
  .connect({
    host,
    port: 22,
    username: user,
    password,
    tryKeyboard: true,
    readyTimeout: 30000,
  });
