/**
 * Utilidades para benchmarking de operaciones específicas
 */

class BenchmarkUtils {
  constructor() {
    this.results = [];
  }

  /**
   * Mide el tiempo de ejecución de una operación síncrona
   * @param {string} operationName - Nombre de la operación
   * @param {Function} operation - Función a medir
   * @returns {*} Resultado de la operación
   */
  measureSync(operationName, operation) {
    const startTime = performance.now();
    const result = operation();
    const endTime = performance.now();
    const duration = endTime - startTime;

    this.recordResult(operationName, duration, 'sync');

    return result;
  }

  /**
   * Mide el tiempo de ejecución de una operación asíncrona
   * @param {string} operationName - Nombre de la operación
   * @param {Function} operation - Función asíncrona a medir
   * @returns {Promise} Resultado de la operación
   */
  async measureAsync(operationName, operation) {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();
    const duration = endTime - startTime;

    this.recordResult(operationName, duration, 'async');

    return result;
  }

  /**
   * Mide múltiples ejecuciones de una operación para obtener promedio
   * @param {string} operationName - Nombre de la operación
   * @param {Function} operation - Función a medir
   * @param {number} iterations - Número de iteraciones
   * @returns {Object} Estadísticas (promedio, min, max, total)
   */
  measureMultiple(operationName, operation, iterations = 10) {
    const times = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      operation();
      const endTime = performance.now();
      times.push(endTime - startTime);
    }

    const total = times.reduce((a, b) => a + b, 0);
    const average = total / iterations;
    const min = Math.min(...times);
    const max = Math.max(...times);

    const stats = {
      operationName,
      average: average.toFixed(2),
      min: min.toFixed(2),
      max: max.toFixed(2),
      total: total.toFixed(2),
      iterations,
    };

    this.results.push({
      ...stats,
      type: 'multiple',
      timestamp: Date.now(),
    });

    console.log(`📊 Benchmark ${operationName}:`, stats);

    return stats;
  }

  /**
   * Registra un resultado
   */
  recordResult(operationName, duration, type) {
    this.results.push({
      operationName,
      duration: duration.toFixed(2),
      type,
      timestamp: Date.now(),
    });
  }

  /**
   * Obtiene todos los resultados
   */
  getResults() {
    return this.results;
  }

  /**
   * Limpia todos los resultados
   */
  clearResults() {
    this.results = [];
  }

  /**
   * Genera un reporte de resultados
   */
  generateReport() {
    if (this.results.length === 0) {
      console.log('📊 No hay resultados de benchmark para reportar');
      return;
    }

    console.log('\n═══════════════════════════════════════');
    console.log('📊 REPORTE DE BENCHMARKS');
    console.log('═══════════════════════════════════════\n');

    const grouped = this.results.reduce((acc, result) => {
      if (!acc[result.operationName]) {
        acc[result.operationName] = [];
      }
      acc[result.operationName].push(parseFloat(result.duration));
      return acc;
    }, {});

    Object.keys(grouped).forEach(operationName => {
      const times = grouped[operationName];
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);

      console.log(`📈 ${operationName}:`);
      console.log(`   Promedio: ${avg.toFixed(2)}ms`);
      console.log(`   Mínimo: ${min.toFixed(2)}ms`);
      console.log(`   Máximo: ${max.toFixed(2)}ms`);
      console.log(`   Ejecuciones: ${times.length}\n`);
    });

    console.log('═══════════════════════════════════════\n');
  }

  /**
   * Compara dos operaciones
   * @param {string} name1 - Nombre de la primera operación
   * @param {Function} op1 - Primera función
   * @param {string} name2 - Nombre de la segunda operación
   * @param {Function} op2 - Segunda función
   * @param {number} iterations - Número de iteraciones
   */
  compare(name1, op1, name2, op2, iterations = 10) {
    console.log(`\n🔄 Comparando ${name1} vs ${name2} (${iterations} iteraciones)...\n`);

    const stats1 = this.measureMultiple(name1, op1, iterations);
    const stats2 = this.measureMultiple(name2, op2, iterations);

    const diff = parseFloat(stats2.average) - parseFloat(stats1.average);
    const percentDiff = ((diff / parseFloat(stats1.average)) * 100).toFixed(2);

    console.log('\n═══════════════════════════════════════');
    console.log('📊 COMPARACIÓN DE RESULTADOS');
    console.log('═══════════════════════════════════════');
    console.log(`${name1}: ${stats1.average}ms (promedio)`);
    console.log(`${name2}: ${stats2.average}ms (promedio)`);
    console.log(`Diferencia: ${diff > 0 ? '+' : ''}${diff.toFixed(2)}ms (${percentDiff > 0 ? '+' : ''}${percentDiff}%)`);
    
    if (parseFloat(stats1.average) < parseFloat(stats2.average)) {
      console.log(`✅ ${name1} es ${percentDiff}% más rápido`);
    } else {
      console.log(`✅ ${name2} es ${Math.abs(percentDiff)}% más rápido`);
    }
    console.log('═══════════════════════════════════════\n');

    return { stats1, stats2, diff, percentDiff };
  }
}

// Exportar instancia singleton
const benchmarkUtils = new BenchmarkUtils();
export default benchmarkUtils;

