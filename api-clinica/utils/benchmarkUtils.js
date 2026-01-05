// Utilidades para benchmarking y comparación de rendimiento
import fs from 'fs/promises';
import path from 'path';

class BenchmarkUtils {
  constructor() {
    this.benchmarks = [];
    this.currentBenchmark = null;
  }

  // Iniciar benchmark
  startBenchmark(name, description = '') {
    this.currentBenchmark = {
      name,
      description,
      startTime: Date.now(),
      metrics: {
        requests: 0,
        successes: 0,
        errors: 0,
        responseTimes: [],
        throughput: [],
        memory: [],
        cpu: []
      }
    };

    console.log(`🚀 Starting benchmark: ${name}`);
    if (description) {
      console.log(`📝 Description: ${description}`);
    }
  }

  // Finalizar benchmark
  endBenchmark() {
    if (!this.currentBenchmark) {
      console.warn('No active benchmark to end');
      return null;
    }

    const endTime = Date.now();
    const duration = endTime - this.currentBenchmark.startTime;

    const benchmark = {
      ...this.currentBenchmark,
      endTime,
      duration,
      results: this.calculateResults(this.currentBenchmark.metrics, duration)
    };

    this.benchmarks.push(benchmark);
    this.currentBenchmark = null;

    console.log(`✅ Benchmark completed: ${benchmark.name}`);
    this.printBenchmarkResults(benchmark);

    return benchmark;
  }

  // Registrar métrica de request
  recordRequest(responseTime, success = true, errorType = null) {
    if (!this.currentBenchmark) return;

    const metrics = this.currentBenchmark.metrics;
    metrics.requests++;
    metrics.responseTimes.push(responseTime);

    if (success) {
      metrics.successes++;
    } else {
      metrics.errors++;
    }

    // Calcular throughput (requests por segundo)
    const elapsed = Date.now() - this.currentBenchmark.startTime;
    const currentThroughput = (metrics.requests / elapsed) * 1000;
    metrics.throughput.push({
      timestamp: Date.now(),
      rps: currentThroughput
    });
  }

  // Registrar métrica de sistema
  recordSystemMetrics(cpuUsage, memoryUsage) {
    if (!this.currentBenchmark) return;

    this.currentBenchmark.metrics.cpu.push({
      timestamp: Date.now(),
      usage: cpuUsage
    });

    this.currentBenchmark.metrics.memory.push({
      timestamp: Date.now(),
      usage: memoryUsage
    });
  }

  // Calcular resultados del benchmark
  calculateResults(metrics, duration) {
    const responseTimes = metrics.responseTimes;
    const throughput = metrics.throughput;

    return {
      summary: {
        totalRequests: metrics.requests,
        successfulRequests: metrics.successes,
        failedRequests: metrics.errors,
        successRate: (metrics.successes / metrics.requests) * 100,
        duration: duration,
        avgThroughput: metrics.requests / (duration / 1000)
      },
      responseTime: {
        average: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
        median: this.getMedian(responseTimes),
        p50: this.getPercentile(responseTimes, 50),
        p90: this.getPercentile(responseTimes, 90),
        p95: this.getPercentile(responseTimes, 95),
        p99: this.getPercentile(responseTimes, 99),
        min: Math.min(...responseTimes),
        max: Math.max(...responseTimes)
      },
      throughput: {
        average: throughput.reduce((sum, t) => sum + t.rps, 0) / throughput.length,
        peak: Math.max(...throughput.map(t => t.rps)),
        min: Math.min(...throughput.map(t => t.rps))
      },
      system: {
        avgCpuUsage: metrics.cpu.length > 0 ? 
          metrics.cpu.reduce((sum, c) => sum + c.usage, 0) / metrics.cpu.length : 0,
        peakCpuUsage: metrics.cpu.length > 0 ? 
          Math.max(...metrics.cpu.map(c => c.usage)) : 0,
        avgMemoryUsage: metrics.memory.length > 0 ? 
          metrics.memory.reduce((sum, m) => sum + m.usage, 0) / metrics.memory.length : 0,
        peakMemoryUsage: metrics.memory.length > 0 ? 
          Math.max(...metrics.memory.map(m => m.usage)) : 0
      }
    };
  }

  // Calcular mediana
  getMedian(numbers) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  // Calcular percentil
  getPercentile(numbers, percentile) {
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  // Imprimir resultados del benchmark
  printBenchmarkResults(benchmark) {
    const { summary, responseTime, throughput, system } = benchmark.results;

    console.log('\n📊 BENCHMARK RESULTS');
    console.log('====================');
    console.log(`🏷️  Name: ${benchmark.name}`);
    console.log(`⏱️  Duration: ${(summary.duration / 1000).toFixed(2)}s`);
    console.log(`📡 Total Requests: ${summary.totalRequests}`);
    console.log(`✅ Success Rate: ${summary.successRate.toFixed(2)}%`);
    console.log(`⚡ Avg Throughput: ${summary.avgThroughput.toFixed(2)} req/s`);
    
    console.log('\n📈 Response Times:');
    console.log(`   Average: ${responseTime.average.toFixed(2)}ms`);
    console.log(`   Median: ${responseTime.median.toFixed(2)}ms`);
    console.log(`   P95: ${responseTime.p95.toFixed(2)}ms`);
    console.log(`   P99: ${responseTime.p99.toFixed(2)}ms`);
    console.log(`   Min: ${responseTime.min.toFixed(2)}ms`);
    console.log(`   Max: ${responseTime.max.toFixed(2)}ms`);
    
    console.log('\n🚀 Throughput:');
    console.log(`   Average: ${throughput.average.toFixed(2)} req/s`);
    console.log(`   Peak: ${throughput.peak.toFixed(2)} req/s`);
    console.log(`   Min: ${throughput.min.toFixed(2)} req/s`);
    
    console.log('\n🖥️  System Resources:');
    console.log(`   CPU Usage: ${system.avgCpuUsage.toFixed(1)}% (peak: ${system.peakCpuUsage.toFixed(1)}%)`);
    console.log(`   Memory Usage: ${(system.avgMemoryUsage / 1024 / 1024).toFixed(1)}MB (peak: ${(system.peakMemoryUsage / 1024 / 1024).toFixed(1)}MB)`);
    console.log('====================\n');
  }

  // Comparar benchmarks
  compareBenchmarks(benchmark1Name, benchmark2Name) {
    const bench1 = this.benchmarks.find(b => b.name === benchmark1Name);
    const bench2 = this.benchmarks.find(b => b.name === benchmark2Name);

    if (!bench1 || !bench2) {
      console.error('One or both benchmarks not found');
      return null;
    }

    const comparison = {
      benchmark1: bench1.name,
      benchmark2: bench2.name,
      performance: {
        throughput: {
          improvement: ((bench2.results.summary.avgThroughput - bench1.results.summary.avgThroughput) / bench1.results.summary.avgThroughput) * 100,
          bench1: bench1.results.summary.avgThroughput,
          bench2: bench2.results.summary.avgThroughput
        },
        responseTime: {
          improvement: ((bench1.results.responseTime.average - bench2.results.responseTime.average) / bench1.results.responseTime.average) * 100,
          bench1: bench1.results.responseTime.average,
          bench2: bench2.results.responseTime.average
        },
        successRate: {
          improvement: bench2.results.summary.successRate - bench1.results.summary.successRate,
          bench1: bench1.results.summary.successRate,
          bench2: bench2.results.summary.successRate
        }
      }
    };

    this.printComparison(comparison);
    return comparison;
  }

  // Imprimir comparación
  printComparison(comparison) {
    console.log('\n🆚 BENCHMARK COMPARISON');
    console.log('======================');
    console.log(`📊 ${comparison.benchmark1} vs ${comparison.benchmark2}`);
    
    const { throughput, responseTime, successRate } = comparison.performance;
    
    console.log('\n⚡ Throughput:');
    console.log(`   ${comparison.benchmark1}: ${throughput.bench1.toFixed(2)} req/s`);
    console.log(`   ${comparison.benchmark2}: ${throughput.bench2.toFixed(2)} req/s`);
    console.log(`   Improvement: ${throughput.improvement.toFixed(2)}%`);
    
    console.log('\n📈 Response Time:');
    console.log(`   ${comparison.benchmark1}: ${responseTime.bench1.toFixed(2)}ms`);
    console.log(`   ${comparison.benchmark2}: ${responseTime.bench2.toFixed(2)}ms`);
    console.log(`   Improvement: ${responseTime.improvement.toFixed(2)}%`);
    
    console.log('\n✅ Success Rate:');
    console.log(`   ${comparison.benchmark1}: ${successRate.bench1.toFixed(2)}%`);
    console.log(`   ${comparison.benchmark2}: ${successRate.bench2.toFixed(2)}%`);
    console.log(`   Difference: ${successRate.improvement.toFixed(2)}%`);
    
    console.log('======================\n');
  }

  // Guardar resultados en archivo
  async saveResults(filename = null) {
    if (this.benchmarks.length === 0) {
      console.warn('No benchmarks to save');
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const defaultFilename = `benchmark-results-${timestamp}.json`;
    const finalFilename = filename || defaultFilename;

    const results = {
      timestamp: new Date().toISOString(),
      benchmarks: this.benchmarks,
      summary: {
        totalBenchmarks: this.benchmarks.length,
        avgThroughput: this.benchmarks.reduce((sum, b) => sum + b.results.summary.avgThroughput, 0) / this.benchmarks.length,
        avgResponseTime: this.benchmarks.reduce((sum, b) => sum + b.results.responseTime.average, 0) / this.benchmarks.length,
        avgSuccessRate: this.benchmarks.reduce((sum, b) => sum + b.results.summary.successRate, 0) / this.benchmarks.length
      }
    };

    try {
      const reportsDir = path.join(process.cwd(), 'performance', 'reports');
      await fs.mkdir(reportsDir, { recursive: true });
      
      const filepath = path.join(reportsDir, finalFilename);
      await fs.writeFile(filepath, JSON.stringify(results, null, 2));
      
      console.log(`💾 Benchmark results saved to: ${filepath}`);
      return filepath;
    } catch (error) {
      console.error('Error saving benchmark results:', error);
      throw error;
    }
  }

  // Cargar resultados desde archivo
  async loadResults(filename) {
    try {
      const filepath = path.join(process.cwd(), 'performance', 'reports', filename);
      const data = await fs.readFile(filepath, 'utf8');
      const results = JSON.parse(data);
      
      this.benchmarks = results.benchmarks;
      console.log(`📁 Loaded ${results.benchmarks.length} benchmarks from ${filename}`);
      return results;
    } catch (error) {
      console.error('Error loading benchmark results:', error);
      throw error;
    }
  }

  // Generar reporte HTML
  generateHTMLReport() {
    if (this.benchmarks.length === 0) {
      console.warn('No benchmarks to generate report');
      return;
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Benchmark Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .benchmark { border: 1px solid #ddd; margin: 20px 0; padding: 20px; border-radius: 5px; }
        .metric { display: inline-block; margin: 10px; padding: 10px; background: #f5f5f5; border-radius: 3px; }
        .improvement { color: green; }
        .degradation { color: red; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>🚀 Performance Benchmark Report</h1>
    <p>Generated: ${new Date().toISOString()}</p>
    
    ${this.benchmarks.map(benchmark => `
        <div class="benchmark">
            <h2>${benchmark.name}</h2>
            <p>${benchmark.description}</p>
            <div class="metric">
                <strong>Duration:</strong> ${(benchmark.results.summary.duration / 1000).toFixed(2)}s
            </div>
            <div class="metric">
                <strong>Success Rate:</strong> ${benchmark.results.summary.successRate.toFixed(2)}%
            </div>
            <div class="metric">
                <strong>Avg Throughput:</strong> ${benchmark.results.summary.avgThroughput.toFixed(2)} req/s
            </div>
            <div class="metric">
                <strong>Avg Response Time:</strong> ${benchmark.results.responseTime.average.toFixed(2)}ms
            </div>
        </div>
    `).join('')}
</body>
</html>`;

    return html;
  }
}

// Instancia singleton
const benchmarkUtils = new BenchmarkUtils();

export default benchmarkUtils;

// Función helper para medir tiempo de ejecución
export function measureExecutionTime(fn, ...args) {
  const start = Date.now();
  const result = fn(...args);
  const end = Date.now();
  
  return {
    result,
    executionTime: end - start
  };
}

// Función helper para medir tiempo de ejecución asíncrono
export async function measureAsyncExecutionTime(fn, ...args) {
  const start = Date.now();
  const result = await fn(...args);
  const end = Date.now();
  
  return {
    result,
    executionTime: end - start
  };
}
