/**
 * Evita columnas inexistentes en consultas Sequelize (p. ej. Paciente.codigo_paciente).
 */
import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const FORBIDDEN_IN_ATTRIBUTES = [
  'codigo_paciente',
  'diagnostico_principal',
];

const MODEL_ATTRS = {};

function loadModelColumns() {
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

function scanInvalidAttributes(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const issues = [];

  for (const forbidden of FORBIDDEN_IN_ATTRIBUTES) {
    const attrRe = new RegExp(
      `attributes:\\s*\\[[^\\]]*['"]${forbidden}['"]`,
      'g',
    );
    if (attrRe.test(text)) {
      issues.push({ file: filePath, column: forbidden });
    }
  }

  const attrBlockRe = /attributes:\s*\[([\s\S]*?)\]/g;
  let block;
  while ((block = attrBlockRe.exec(text)) !== null) {
    const before = text.slice(Math.max(0, block.index - 500), block.index);
    const modelMatch = [...before.matchAll(/model:\s*(\w+)/g)].pop();
    const modelName = modelMatch?.[1];
    if (!modelName || !MODEL_ATTRS[modelName]) continue;
    const valid = MODEL_ATTRS[modelName];
    const attrs = block[1]
      .split(',')
      .map((s) => s.replace(/['"`\s]/g, '').trim())
      .filter(Boolean);
    for (const attr of attrs) {
      if (attr === 'nombre' && modelName === 'Medicamento' && !valid.has('nombre')) {
        issues.push({ file: filePath, column: `${modelName}.nombre (usar nombre_medicamento)` });
      }
      if (attr === 'dosis_recomendada' || attr === 'contraindicaciones') {
        issues.push({ file: filePath, column: `${modelName}.${attr}` });
      }
    }
  }

  return issues;
}

function walkControllers(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkControllers(p, out);
    else if (ent.name.endsWith('.js')) out.push(p);
  }
  return out;
}

loadModelColumns();

describe('Guardia de columnas Sequelize', () => {
  it('no debe usar columnas prohibidas en attributes de controllers/services', () => {
    const dirs = ['controllers', 'services'].map((d) => path.join(ROOT, d));
    const files = dirs.flatMap((d) => (fs.existsSync(d) ? walkControllers(d) : []));
    const issues = files.flatMap(scanInvalidAttributes);
    expect(issues).toEqual([]);
  });

  it('getCita no debe solicitar codigo_paciente en Paciente', () => {
    const citaSource = fs.readFileSync(path.join(ROOT, 'controllers', 'cita.js'), 'utf8');
    expect(citaSource).not.toMatch(/['"]codigo_paciente['"]/);
    expect(citaSource).toMatch(/numero_expediente/);
  });
});
