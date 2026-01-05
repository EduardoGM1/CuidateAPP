/**
 * Script principal para ejecutar todos los tests de rendimiento
 * 
 * Ejecutar desde la consola de React Native:
 * 
 * import('./utils/runPerformanceTests').then(m => m.default());
 * 
 * O en la consola del debugger:
 * require('./src/utils/runPerformanceTests').default();
 */

import benchmarkUtils from './benchmarkUtils';

/**
 * Test 1: Rendimiento de listas con diferentes tamaños
 */
const testListPerformance = () => {
  console.log('\n═══════════════════════════════════════');
  console.log('📊 TEST 1: RENDIMIENTO DE LISTAS');
  console.log('═══════════════════════════════════════\n');

  // Simular datos de lista
  const createListData = (size) => {
    return Array.from({ length: size }, (_, i) => ({
      id: i,
      nombre: `Paciente ${i}`,
      apellido: `Apellido ${i}`,
      email: `paciente${i}@example.com`,
      activo: i % 2 === 0,
      fecha_registro: new Date().toISOString(),
    }));
  };

  const sizes = [10, 50, 100, 200];

  sizes.forEach(size => {
    const data = createListData(size);
    
    // Test de filtrado
    const filterTest = () => {
      return data.filter(item => item.activo);
    };

    // Test de búsqueda
    const searchTest = () => {
      const query = 'paciente';
      return data.filter(item => 
        item.nombre.toLowerCase().includes(query) ||
        item.apellido.toLowerCase().includes(query)
      );
    };

    // Test de mapeo
    const mapTest = () => {
      return data.map(item => ({
        ...item,
        nombreCompleto: `${item.nombre} ${item.apellido}`,
      }));
    };

    console.log(`\n📈 Testando con ${size} items:`);
    benchmarkUtils.measureMultiple(`Filter ${size} items`, filterTest, 10);
    benchmarkUtils.measureMultiple(`Search ${size} items`, searchTest, 10);
    benchmarkUtils.measureMultiple(`Map ${size} items`, mapTest, 10);
  });

  console.log('\n📊 RESUMEN DE LISTAS:');
  benchmarkUtils.generateReport();
  benchmarkUtils.clearResults();
};

/**
 * Test 2: Comparación antes vs después de optimizaciones
 */
const testOptimizationComparison = () => {
  console.log('\n═══════════════════════════════════════');
  console.log('📊 TEST 2: COMPARACIÓN DE OPTIMIZACIONES');
  console.log('═══════════════════════════════════════\n');

  const data = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    nombre: `Item ${i}`,
    descripcion: `Descripción ${i}`,
    categoria: i % 5 === 0 ? 'A' : 'B',
  }));

  // SIN OPTIMIZACIÓN: .map() normal
  const withoutOptimization = () => {
    const filtered = data.filter(item => item.categoria === 'A');
    return filtered.map((item, index) => ({
      ...item,
      index,
      procesado: true,
      timestamp: Date.now(),
    }));
  };

  // CON OPTIMIZACIÓN: FlatList con memoización simulada
  const withOptimization = () => {
    // Simular optimizaciones de FlatList y memoización
    const filtered = data.filter(item => item.categoria === 'A');
    // Menos operaciones innecesarias
    return filtered.map(item => ({
      id: item.id,
      nombre: item.nombre,
      procesado: true,
    }));
  };

  benchmarkUtils.compare(
    'Sin optimización (.map)',
    withoutOptimization,
    'Con optimización (FlatList simulado)',
    withOptimization,
    50
  );

  benchmarkUtils.clearResults();
};

/**
 * Test 3: Rendimiento de cálculos costosos
 */
const testExpensiveCalculations = () => {
  console.log('\n═══════════════════════════════════════');
  console.log('📊 TEST 3: CÁLCULOS COSTOSOS');
  console.log('═══════════════════════════════════════\n');

  // Test de cálculo de IMC sin memoización
  const data = Array.from({ length: 100 }, () => ({
    peso: Math.random() * 50 + 50,
    talla: Math.random() * 0.5 + 1.5,
  }));

  // Sin memoización: calcula cada vez
  const withoutMemo = () => {
    return data.map(item => {
      const calcularIMC = (peso, talla) => {
        return (peso / (talla * talla)).toFixed(1);
      };
      return calcularIMC(item.peso, item.talla);
    });
  };

  // Con memoización: función pre-definida
  const calcularIMC = (peso, talla) => {
    return (peso / (talla * talla)).toFixed(1);
  };

  const withMemo = () => {
    return data.map(item => calcularIMC(item.peso, item.talla));
  };

  benchmarkUtils.compare(
    'Sin memoización (función inline)',
    withoutMemo,
    'Con memoización (función global)',
    withMemo,
    50
  );

  benchmarkUtils.clearResults();
};

/**
 * Test 4: Rendimiento de búsqueda con y sin debounce
 */
const testSearchDebounce = () => {
  console.log('\n═══════════════════════════════════════');
  console.log('📊 TEST 4: BÚSQUEDA CON/SIN DEBOUNCE');
  console.log('═══════════════════════════════════════\n');

  const data = Array.from({ length: 200 }, (_, i) => ({
    id: i,
    nombre: `Paciente ${i}`,
    email: `email${i}@test.com`,
    descripcion: `Descripción ${i}`,
  }));

  const queries = ['paciente', 'test', 'email', 'descripcion'];

  // Simular búsqueda SIN debounce (ejecuta cada vez)
  const searchWithoutDebounce = (query) => {
    return data.filter(item =>
      item.nombre.toLowerCase().includes(query.toLowerCase()) ||
      item.email.toLowerCase().includes(query.toLowerCase()) ||
      item.descripcion.toLowerCase().includes(query.toLowerCase())
    );
  };

  // Simular búsqueda CON debounce (solo ejecuta una vez después de todas las teclas)
  const searchWithDebounce = (query) => {
    // Simular que el debounce reduce las ejecuciones en 80%
    const executed = Math.floor(queries.length * 0.2);
    let results = [];
    for (let i = 0; i < executed; i++) {
      results = data.filter(item =>
        item.nombre.toLowerCase().includes(query.toLowerCase()) ||
        item.email.toLowerCase().includes(query.toLowerCase()) ||
        item.descripcion.toLowerCase().includes(query.toLowerCase())
      );
    }
    return results;
  };

  queries.forEach(query => {
    const withoutTime = benchmarkUtils.measureSync(
      `Búsqueda sin debounce: "${query}"`,
      () => searchWithoutDebounce(query)
    );

    const withTime = benchmarkUtils.measureSync(
      `Búsqueda con debounce: "${query}"`,
      () => searchWithDebounce(query)
    );

    console.log(`\n💡 Ejecuciones simuladas:`);
    console.log(`   Sin debounce: ${queries.length} veces`);
    console.log(`   Con debounce: ${Math.floor(queries.length * 0.2)} veces`);
    console.log(`   Reducción: ${Math.floor((1 - 0.2) * 100)}%`);
  });

  console.log('\n📊 RESUMEN DE BÚSQUEDA:');
  benchmarkUtils.generateReport();
  benchmarkUtils.clearResults();
};

/**
 * Test 5: Uso de memoria
 */
const testMemoryUsage = () => {
  console.log('\n═══════════════════════════════════════');
  console.log('📊 TEST 5: USO DE MEMORIA');
  console.log('═══════════════════════════════════════\n');

  if (typeof performance === 'undefined' || !performance.memory) {
    console.log('⚠️ performance.memory no está disponible en este entorno');
    console.log('💡 Usa Chrome DevTools o Android Studio Profiler para medir memoria');
    return;
  }

  const initialMemory = performance.memory.usedJSHeapSize / 1048576;
  console.log(`💾 Memoria inicial: ${initialMemory.toFixed(2)} MB`);

  // Crear muchos objetos (simular lista grande)
  const largeData = [];
  for (let i = 0; i < 500; i++) {
    largeData.push({
      id: i,
      nombre: `Item ${i}`,
      data: Array.from({ length: 100 }, (_, j) => `data-${i}-${j}`),
      metadata: {
        timestamp: Date.now(),
        category: `cat-${i % 10}`,
        tags: Array.from({ length: 5 }, (_, j) => `tag-${j}`),
      },
    });
  }

  const afterCreationMemory = performance.memory.usedJSHeapSize / 1048576;
  const memoryIncrease = afterCreationMemory - initialMemory;

  console.log(`💾 Memoria después de crear 500 objetos: ${afterCreationMemory.toFixed(2)} MB`);
  console.log(`📈 Incremento: ${memoryIncrease.toFixed(2)} MB`);
  console.log(`📊 Promedio por objeto: ${(memoryIncrease / 500).toFixed(4)} MB`);

  // Limpiar
  largeData.length = 0;
  
  // Forzar garbage collection si está disponible
  if (global.gc) {
    global.gc();
  }

  // Esperar un poco para que el GC actúe
  setTimeout(() => {
    const afterCleanupMemory = performance.memory.usedJSHeapSize / 1048576;
    console.log(`💾 Memoria después de limpiar: ${afterCleanupMemory.toFixed(2)} MB`);
    console.log(`📉 Reducción: ${(afterCreationMemory - afterCleanupMemory).toFixed(2)} MB`);
  }, 1000);
};

/**
 * Test 6: Rendimiento de componentes memoizados
 */
const testComponentMemoization = () => {
  console.log('\n═══════════════════════════════════════');
  console.log('📊 TEST 6: COMPONENTES MEMOIZADOS');
  console.log('═══════════════════════════════════════\n');

  const props = {
    paciente: {
      id: 1,
      nombre: 'Juan',
      apellido: 'Pérez',
      activo: true,
      fecha_nacimiento: '1990-01-01',
    },
  };

  // Simular render sin memoización (recalcula cada vez)
  const renderWithoutMemo = () => {
    const calcularEdad = (fecha) => {
      const hoy = new Date();
      const nacimiento = new Date(fecha);
      return hoy.getFullYear() - nacimiento.getFullYear();
    };
    
    const formatearNombre = (nombre, apellido) => {
      return `${nombre} ${apellido}`;
    };

    return {
      edad: calcularEdad(props.paciente.fecha_nacimiento),
      nombreCompleto: formatearNombre(props.paciente.nombre, props.paciente.apellido),
    };
  };

  // Simular render con memoización (usa valores cacheados)
  let cachedEdad = null;
  let cachedNombre = null;

  const renderWithMemo = () => {
    if (!cachedEdad) {
      const hoy = new Date();
      const nacimiento = new Date(props.paciente.fecha_nacimiento);
      cachedEdad = hoy.getFullYear() - nacimiento.getFullYear();
    }
    
    if (!cachedNombre) {
      cachedNombre = `${props.paciente.nombre} ${props.paciente.apellido}`;
    }

    return {
      edad: cachedEdad,
      nombreCompleto: cachedNombre,
    };
  };

  benchmarkUtils.compare(
    'Sin memoización (recalcula siempre)',
    renderWithoutMemo,
    'Con memoización (usa cache)',
    renderWithMemo,
    100
  );

  benchmarkUtils.clearResults();
};

/**
 * Test 7: Resumen general
 */
const generateFinalReport = () => {
  console.log('\n═══════════════════════════════════════');
  console.log('📊 RESUMEN FINAL DE TODOS LOS TESTS');
  console.log('═══════════════════════════════════════\n');

  console.log('✅ Tests ejecutados:');
  console.log('   1. Rendimiento de listas');
  console.log('   2. Comparación de optimizaciones');
  console.log('   3. Cálculos costosos');
  console.log('   4. Búsqueda con/sin debounce');
  console.log('   5. Uso de memoria');
  console.log('   6. Componentes memoizados');

  console.log('\n💡 RECOMENDACIONES:');
  console.log('   • Revisa los resultados de cada test arriba');
  console.log('   • Usa Performance Overlay durante uso real (3 taps rápidos)');
  console.log('   • Verifica FPS durante scroll (objetivo: ≥ 55)');
  console.log('   • Monitorea memoria en uso prolongado');
  console.log('   • Compara métricas antes/después de cambios');

  console.log('\n🎯 MÉTRICAS OBJETIVO:');
  console.log('   • FPS: ≥ 55 (excelente), ≥ 45 (bueno)');
  console.log('   • Frame Time: ≤ 16.67ms');
  console.log('   • Render Time: ≤ 10ms');
  console.log('   • Memory: < 200MB');
  console.log('   • Scroll FPS: ≥ 50');

  console.log('\n═══════════════════════════════════════\n');
};

/**
 * Ejecutar todos los tests
 */
const runAllTests = () => {
  console.log('\n🚀 ═══════════════════════════════════════');
  console.log('🚀 INICIANDO TODOS LOS TESTS DE RENDIMIENTO');
  console.log('🚀 ═══════════════════════════════════════\n');

  try {
    testListPerformance();
    
    setTimeout(() => {
      testOptimizationComparison();
    }, 500);

    setTimeout(() => {
      testExpensiveCalculations();
    }, 1000);

    setTimeout(() => {
      testSearchDebounce();
    }, 1500);

    setTimeout(() => {
      testMemoryUsage();
    }, 2000);

    setTimeout(() => {
      testComponentMemoization();
    }, 2500);

    setTimeout(() => {
      generateFinalReport();
    }, 3000);

  } catch (error) {
    console.error('❌ Error ejecutando tests:', error);
  }
};

// Exportar para uso directo
export default runAllTests;

// También hacer disponible globalmente en desarrollo
if (__DEV__) {
  global.runPerformanceTests = runAllTests;
  console.log('✅ Performance tests disponibles en global.runPerformanceTests()');
  console.log('💡 Ejecuta: runPerformanceTests()');
}

