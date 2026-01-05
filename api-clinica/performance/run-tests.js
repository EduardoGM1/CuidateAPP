// Script para ejecutar todos los tests de performance
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PerformanceTestRunner {
  constructor() {
    this.tests = [
      {
        name: 'Performance Tests (Jest)',
        command: 'npm',
        args: ['run', 'test:performance'],
        type: 'jest'
      },
      {
        name: 'Load Tests (Jest)',
        command: 'npm',
        args: ['run', 'test:load'],
        type: 'jest'
      },
      {
        name: 'Stress Tests (Jest)',
        command: 'npm',
        args: ['run', 'test:stress'],
        type: 'jest'
      },
      {
        name: 'Load Test (Artillery)',
        command: 'npx',
        args: ['artillery', 'run', 'performance/load-test.yml'],
        type: 'artillery'
      },
      {
        name: 'Stress Test (Artillery)',
        command: 'npx',
        args: ['artillery', 'run', 'performance/stress-test.yml'],
        type: 'artillery'
      },
      {
        name: 'Spike Test (Artillery)',
        command: 'npx',
        args: ['artillery', 'run', 'performance/spike-test.yml'],
        type: 'artillery'
      }
    ];
    
    this.results = [];
    this.startTime = Date.now();
  }

  async runAllTests() {
    console.log('🚀 Starting Performance Test Suite');
    console.log('=====================================');
    console.log(`⏰ Started at: ${new Date().toISOString()}`);
    console.log(`📊 Total tests: ${this.tests.length}`);
    console.log('');

    for (let i = 0; i < this.tests.length; i++) {
      const test = this.tests[i];
      console.log(`\n[${i + 1}/${this.tests.length}] Running: ${test.name}`);
      console.log('─'.repeat(50));
      
      const result = await this.runTest(test);
      this.results.push(result);
      
      if (result.success) {
        console.log(`✅ ${test.name} - PASSED (${result.duration}ms)`);
      } else {
        console.log(`❌ ${test.name} - FAILED (${result.duration}ms)`);
        console.log(`   Error: ${result.error}`);
      }
    }

    this.printSummary();
  }

  async runTest(test) {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const process = spawn(test.command, test.args, {
        stdio: 'pipe',
        shell: true,
        cwd: path.join(__dirname, '..')
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        const result = {
          name: test.name,
          type: test.type,
          success: code === 0,
          duration,
          exitCode: code,
          stdout,
          stderr,
          error: code !== 0 ? stderr : null
        };

        resolve(result);
      });

      process.on('error', (error) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        resolve({
          name: test.name,
          type: test.type,
          success: false,
          duration,
          exitCode: -1,
          stdout: '',
          stderr: '',
          error: error.message
        });
      });
    });
  }

  printSummary() {
    const endTime = Date.now();
    const totalDuration = endTime - this.startTime;
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;

    console.log('\n📊 PERFORMANCE TEST SUMMARY');
    console.log('============================');
    console.log(`⏰ Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Success Rate: ${((passed / this.results.length) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Detailed Results:');
    this.results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      const duration = (result.duration / 1000).toFixed(2);
      console.log(`   ${index + 1}. ${status} ${result.name} (${duration}s)`);
    });

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => !r.success)
        .forEach(result => {
          console.log(`   • ${result.name}: ${result.error}`);
        });
    }

    console.log('\n🎯 Recommendations:');
    this.generateRecommendations();

    console.log('\n📈 Next Steps:');
    console.log('   1. Review failed tests and fix issues');
    console.log('   2. Optimize slow endpoints');
    console.log('   3. Run individual tests for detailed analysis');
    console.log('   4. Consider infrastructure scaling if needed');

    console.log('\n🛠️  Available Commands:');
    console.log('   • npm run test:performance  - Jest performance tests');
    console.log('   • npm run test:load        - Jest load tests');
    console.log('   • npm run test:stress      - Jest stress tests');
    console.log('   • npm run perf:load        - Artillery load test');
    console.log('   • npm run perf:stress      - Artillery stress test');
    console.log('   • npm run perf:spike       - Artillery spike test');
    console.log('   • npm run benchmark        - Quick performance check');
    console.log('   • npm run benchmark:full   - Complete benchmark suite');
  }

  generateRecommendations() {
    const jestResults = this.results.filter(r => r.type === 'jest');
    const artilleryResults = this.results.filter(r => r.type === 'artillery');
    
    const jestPassed = jestResults.filter(r => r.success).length;
    const artilleryPassed = artilleryResults.filter(r => r.success).length;

    if (jestPassed === jestResults.length) {
      console.log('   ✅ Jest tests are performing well - keep monitoring');
    } else {
      console.log('   ⚠️  Some Jest tests failed - review test logic and endpoints');
    }

    if (artilleryPassed === artilleryResults.length) {
      console.log('   ✅ Artillery tests passed - system handles load well');
    } else {
      console.log('   ⚠️  Artillery tests failed - consider performance optimization');
    }

    // Analizar tiempos de ejecución
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length;
    
    if (avgDuration > 60000) { // Más de 1 minuto
      console.log('   🐌 Tests are running slowly - consider optimizing test setup');
    } else if (avgDuration < 30000) { // Menos de 30 segundos
      console.log('   🚀 Tests are running efficiently - good job!');
    }

    // Recomendaciones específicas
    const stressTest = this.results.find(r => r.name.includes('Stress'));
    if (stressTest && !stressTest.success) {
      console.log('   🔥 Stress test failed - review error handling and resource limits');
    }

    const loadTest = this.results.find(r => r.name.includes('Load'));
    if (loadTest && !loadTest.success) {
      console.log('   📊 Load test failed - check database connections and memory usage');
    }
  }

  async saveResults() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `performance-test-results-${timestamp}.json`;
    
    const summary = {
      timestamp: new Date().toISOString(),
      totalDuration: Date.now() - this.startTime,
      results: this.results,
      summary: {
        total: this.results.length,
        passed: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length,
        successRate: (this.results.filter(r => r.success).length / this.results.length) * 100
      }
    };

    try {
      const fs = await import('fs/promises');
      const reportsDir = path.join(__dirname, 'reports');
      await fs.mkdir(reportsDir, { recursive: true });
      
      const filepath = path.join(reportsDir, filename);
      await fs.writeFile(filepath, JSON.stringify(summary, null, 2));
      
      console.log(`\n💾 Results saved to: ${filepath}`);
    } catch (error) {
      console.error('Error saving results:', error);
    }
  }
}

// Ejecutar tests si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new PerformanceTestRunner();
  
  runner.runAllTests()
    .then(() => runner.saveResults())
    .catch(error => {
      console.error('Error running performance tests:', error);
      process.exit(1);
    });
}

export default PerformanceTestRunner;