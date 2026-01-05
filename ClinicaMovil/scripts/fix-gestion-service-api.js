/**
 * Script para actualizar gestionService.js
 * Reemplaza todas las instancias de 'await apiClient.' con 'await (await ensureApiClient()).'
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'api', 'gestionService.js');

console.log('📝 Leyendo archivo gestionService.js...');
let content = fs.readFileSync(filePath, 'utf8');

console.log('🔍 Buscando instancias de apiClient...');
const matches = content.match(/await apiClient\./g);
if (matches) {
  console.log(`✅ Encontradas ${matches.length} instancias`);
  
  // Reemplazar todas las instancias
  content = content.replace(/await apiClient\./g, 'await (await ensureApiClient()).');
  
  console.log('💾 Guardando cambios...');
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('✅ Archivo actualizado exitosamente!');
} else {
  console.log('⚠️  No se encontraron instancias de "await apiClient."');
}

