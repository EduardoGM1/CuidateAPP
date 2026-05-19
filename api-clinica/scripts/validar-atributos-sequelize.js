#!/usr/bin/env node
/**
 * Valida que los attributes en includes Sequelize existan en los modelos.
 * Uso: node scripts/validar-atributos-sequelize.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const MODEL_ATTRS = {};

function loadModels() {
  const dir = path.join(ROOT, 'models');
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.js') || file === 'index.js' || file === 'associations.js') continue;
    const name = file.replace('.js', '');
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    const attrs = new Set();
    const re = /^\s{2}([a-zA-Z_][\w]*):\s*\{/gm;
    let m;
    while ((m = re.exec(text)) !== null) attrs.add(m[1]);
    MODEL_ATTRS[name] = attrs;
  }
}

function scanFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  const modelRe = /model:\s*(\w+)/g;
  const attrBlockRe = /attributes:\s*\[([\s\S]*?)\]/g;
  let block;
  while ((block = attrBlockRe.exec(text)) !== null) {
    const before = text.slice(Math.max(0, block.index - 400), block.index);
    const modelMatch = [...before.matchAll(/model:\s*(\w+)/g)].pop();
    const modelName = modelMatch?.[1];
    if (!modelName || !MODEL_ATTRS[modelName]) continue;
    const valid = MODEL_ATTRS[modelName];
    const attrs = block[1]
      .split(',')
      .map((s) => s.replace(/['"`\s]/g, '').trim())
      .filter((s) => s && !s.startsWith('[') && !s.includes('Sequelize'));
    for (const attr of attrs) {
      if (attr.includes('.')) continue;
      if (!valid.has(attr)) {
        issues.push({ model: modelName, attr, file: path.relative(ROOT, filePath) });
      }
    }
  }
  return issues;
}

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'dist') continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith('.js')) out.push(p);
  }
  return out;
}

loadModels();
const dirs = ['controllers', 'services', 'routes', 'middlewares'];
let all = [];
for (const d of dirs) {
  const full = path.join(ROOT, d);
  if (fs.existsSync(full)) all = all.concat(walk(full));
}

const issues = all.flatMap(scanFile);
if (issues.length === 0) {
  console.log('OK: No se encontraron attributes invalidos en includes Sequelize.');
  process.exit(0);
}
console.error('Atributos invalidos en consultas Sequelize:\n');
for (const i of issues) {
  console.error(`  ${i.file} → ${i.model}.${i.attr}`);
}
process.exit(1);
