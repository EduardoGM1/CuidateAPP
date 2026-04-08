#!/usr/bin/env node
/**
 * Lista rutas mutadoras declaradas en api-clinica/routes/*.js (heurística por regex).
 * Sirve para comparar cobertura frente a mutationCatalog.js.
 *
 *   npm run test:contract:scan
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const routesDir = path.join(__dirname, '../../routes');

const METHOD_RE =
  /router\.(post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/gi;

function scanFile(filePath) {
  const src = fs.readFileSync(filePath, 'utf8');
  const rel = path.relative(path.join(__dirname, '../..'), filePath);
  const out = [];
  let m;
  while ((m = METHOD_RE.exec(src)) !== null) {
    out.push({
      file: rel.replace(/\\/g, '/'),
      method: m[1].toUpperCase(),
      path: m[2],
    });
  }
  return out;
}

function main() {
  const files = fs
    .readdirSync(routesDir)
    .filter((f) => f.endsWith('.js'))
    .map((f) => path.join(routesDir, f));

  const all = files.flatMap(scanFile).sort((a, b) => {
    const c = a.file.localeCompare(b.file);
    if (c !== 0) return c;
    return a.path.localeCompare(b.path) || a.method.localeCompare(b.method);
  });

  console.log(JSON.stringify({ total: all.length, routes: all }, null, 2));
  console.error(`\nTotal rutas mutadoras detectadas (aprox.): ${all.length}`);
}

main();
