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

function extractModelIncludeBodies(text) {
  const out = [];
  const re = /model:\s*(\w+)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const modelName = m[1];
    const braceStart = text.lastIndexOf('{', m.index);
    if (braceStart < 0) continue;
    let depth = 0;
    let end = braceStart;
    for (let i = braceStart; i < text.length; i++) {
      if (text[i] === '{') depth += 1;
      else if (text[i] === '}') {
        depth -= 1;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }
    out.push({ modelName, body: text.slice(m.index, end) });
  }
  return out;
}

function scanFile(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  for (const block of extractModelIncludeBodies(text)) {
    const modelName = block.modelName;
    const body = block.body;
    const throughMatch = body.match(/through:\s*\{([\s\S]*?)\}/);
    if (throughMatch) {
      const throughBody = throughMatch[1];
      const throughAttrsMatch = throughBody.match(/attributes:\s*\[([\s\S]*?)\]/);
      if (throughAttrsMatch) {
        const throughModel =
          throughBody.match(/model:\s*(\w+)/)?.[1] ||
          (modelName === 'Comorbilidad' ? 'PacienteComorbilidad' : null) ||
          (modelName === 'Doctor' ? 'DoctorPaciente' : null);
        if (throughModel && MODEL_ATTRS[throughModel]) {
          const validThrough = MODEL_ATTRS[throughModel];
          const tAttrs = throughAttrsMatch[1]
            .split(',')
            .map((s) => s.replace(/['"`\s]/g, '').trim())
            .filter((s) => s && !s.startsWith('['));
          for (const attr of tAttrs) {
            if (attr.includes('.')) continue;
            if (!validThrough.has(attr)) {
              issues.push({ model: throughModel, attr, file: path.relative(ROOT, filePath) });
            }
          }
        }
      }
    }
    const beforeThrough = throughMatch ? body.slice(0, body.indexOf('through:')) : body;
    const attrMatch = beforeThrough.match(/attributes:\s*\[([\s\S]*?)\]/);
    if (!attrMatch) continue;
    if (beforeThrough.includes('include:') && attrMatch.index > beforeThrough.indexOf('include:')) continue;
    if (!modelName || !MODEL_ATTRS[modelName]) continue;
    const valid = MODEL_ATTRS[modelName];
    const attrs = attrMatch[1]
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
