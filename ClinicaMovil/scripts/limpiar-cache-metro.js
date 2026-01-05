const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧹 Limpiando caché de Metro y dependencias...\n');

const projectRoot = path.resolve(__dirname, '..');

try {
  // 1. Limpiar caché de Metro
  console.log('1️⃣ Limpiando caché de Metro...');
  const metroCachePath = path.join(projectRoot, 'node_modules', '.cache');
  if (fs.existsSync(metroCachePath)) {
    fs.rmSync(metroCachePath, { recursive: true, force: true });
    console.log('   ✅ Caché de Metro eliminado');
  } else {
    console.log('   ℹ️  No se encontró caché de Metro');
  }

  // 2. Limpiar watchman (si está instalado)
  console.log('\n2️⃣ Limpiando Watchman...');
  try {
    execSync('watchman watch-del-all', { stdio: 'ignore' });
    console.log('   ✅ Watchman limpiado');
  } catch (error) {
    console.log('   ℹ️  Watchman no está instalado o no se pudo limpiar');
  }

  // 3. Limpiar caché de npm/yarn
  console.log('\n3️⃣ Limpiando caché de npm...');
  try {
    execSync('npm cache clean --force', { stdio: 'inherit' });
    console.log('   ✅ Caché de npm limpiado');
  } catch (error) {
    console.log('   ⚠️  Error limpiando caché de npm:', error.message);
  }

  // 4. Eliminar node_modules
  console.log('\n4️⃣ Eliminando node_modules...');
  const nodeModulesPath = path.join(projectRoot, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    fs.rmSync(nodeModulesPath, { recursive: true, force: true });
    console.log('   ✅ node_modules eliminado');
  } else {
    console.log('   ℹ️  No se encontró node_modules');
  }

  // 5. Eliminar package-lock.json o yarn.lock
  console.log('\n5️⃣ Eliminando archivos de lock...');
  const lockFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
  lockFiles.forEach(lockFile => {
    const lockPath = path.join(projectRoot, lockFile);
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
      console.log(`   ✅ ${lockFile} eliminado`);
    }
  });

  // 6. Limpiar caché de React Native
  console.log('\n6️⃣ Limpiando caché de React Native...');
  const rnCachePaths = [
    path.join(projectRoot, '.gradle'),
    path.join(projectRoot, 'android', '.gradle'),
    path.join(projectRoot, 'android', 'app', 'build'),
    path.join(projectRoot, 'ios', 'build'),
    path.join(projectRoot, 'ios', 'Pods'),
    path.join(projectRoot, 'ios', 'Podfile.lock'),
  ];

  rnCachePaths.forEach(cachePath => {
    if (fs.existsSync(cachePath)) {
      fs.rmSync(cachePath, { recursive: true, force: true });
      console.log(`   ✅ ${path.basename(cachePath)} eliminado`);
    }
  });

  console.log('\n✅ ¡Limpieza completada!\n');
  console.log('📦 Ahora ejecuta: npm install');
  console.log('🚀 Luego inicia Metro con: npm run start:reset\n');

} catch (error) {
  console.error('❌ Error durante la limpieza:', error.message);
  process.exit(1);
}

