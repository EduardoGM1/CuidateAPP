/**
 * Script para verificar que los componentes de Victory se importen correctamente
 */

try {
  const victory = require('victory-native');
  
  console.log('✅ victory-native importado correctamente');
  console.log('\nComponentes disponibles:');
  console.log('  VictoryChart:', typeof victory.VictoryChart);
  console.log('  VictoryLine:', typeof victory.VictoryLine);
  console.log('  VictoryAxis:', typeof victory.VictoryAxis);
  console.log('  VictoryArea:', typeof victory.VictoryArea);
  
  console.log('\nPrimeras 20 claves exportadas:');
  console.log(Object.keys(victory).slice(0, 20).join(', '));
  
  if (victory.VictoryChart && victory.VictoryLine && victory.VictoryAxis && victory.VictoryArea) {
    console.log('\n✅ Todos los componentes están disponibles');
    process.exit(0);
  } else {
    console.log('\n❌ Algunos componentes no están disponibles');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Error importando victory-native:', error.message);
  console.error(error.stack);
  process.exit(1);
}
