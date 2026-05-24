/**
 * Despliega en VPS: bash deploy/actualizar-vps.sh
 * VPS_SSH_PASSWORD o VPS_PASS
 */
import { Client } from 'ssh2';

const host = process.env.VPS_HOST || '187.77.14.148';
const user = process.env.VPS_USER || 'root';
const password = process.env.VPS_SSH_PASSWORD || process.env.VPS_PASS;

if (!password) {
  console.error('Define VPS_SSH_PASSWORD o VPS_PASS');
  process.exit(1);
}

const cmd = [
  'cd /var/www/CuidateAPP 2>/dev/null || cd /var/www/cuidateapp/CuidateAPP',
  'git fetch origin main && git pull origin main',
  'bash deploy/actualizar-vps.sh',
].join(' && ');

const conn = new Client();
conn.on('keyboard-interactive', (_n, _i, _l, prompts, finish) => {
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
    readyTimeout: 300000,
  });
