// Tests de Estrés para endpoints críticos de la API Clínica
import request from 'supertest';
import express from 'express';
import authRoutes from '../routes/auth.js';
import pacienteRoutes from '../routes/paciente.js';
import doctorRoutes from '../routes/doctor.js';
import { globalErrorHandler } from '../middlewares/errorHandler.js';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/pacientes', pacienteRoutes);
app.use('/api/doctores', doctorRoutes);
app.use(globalErrorHandler);

// Monitor de estrés
class StressMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      successes: 0,
      errors: 0,
      timeouts: 0,
      responseTimes: [],
      errorsByType: {},
      peakResponseTime: 0,
      startTime: null,
      endTime: null
    };
  }

  start() {
    this.metrics.startTime = Date.now();
  }

  end() {
    this.metrics.endTime = Date.now();
  }

  recordRequest(success, responseTime, errorType = null) {
    this.metrics.requests++;
    this.metrics.responseTimes.push(responseTime);
    
    if (success) {
      this.metrics.successes++;
    } else {
      this.metrics.errors++;
      if (errorType) {
        this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1;
      }
    }
    
    if (responseTime > this.metrics.peakResponseTime) {
      this.metrics.peakResponseTime = responseTime;
    }
  }

  getStats() {
    const totalTime = this.metrics.endTime - this.metrics.startTime;
    const avgResponseTime = this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length;
    const successRate = (this.metrics.successes / this.metrics.requests) * 100;
    const requestsPerSecond = this.metrics.requests / (totalTime / 1000);

    return {
      ...this.metrics,
      totalTime,
      avgResponseTime,
      successRate,
      requestsPerSecond,
      medianResponseTime: this.getMedianResponseTime(),
      p95ResponseTime: this.getPercentileResponseTime(95),
      p99ResponseTime: this.getPercentileResponseTime(99)
    };
  }

  getMedianResponseTime() {
    const sorted = [...this.metrics.responseTimes].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  getPercentileResponseTime(percentile) {
    const sorted = [...this.metrics.responseTimes].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }
}

// Datos de prueba para estrés
const STRESS_TEST_DATA = {
  validUser: {
    email: 'stresstest.admin@test.com',
    password: 'StressTest123',
    rol: 'Admin'
  },
  pacienteTemplate: {
    nombre: 'StressTest',
    apellido_paterno: 'User',
    apellido_materno: 'Test',
    fecha_nacimiento: '1990-01-01',
    sexo: 'Hombre',
    numero_celular: '5551234567',
    direccion: 'Calle Stress Test 123',
    localidad: 'Ciudad Test'
  }
};

describe('🔥 STRESS TESTS', () => {
  let monitor;
  let adminToken;

  beforeAll(async () => {
    monitor = new StressMonitor();
    
    // Crear usuario admin para tests de estrés
    const adminResponse = await request(app)
      .post('/api/auth/register')
      .set('X-Test-Mode', 'true')
      .send(STRESS_TEST_DATA.validUser);
    
    adminToken = adminResponse.body.token;
  });

  beforeEach(() => {
    monitor = new StressMonitor();
  });

  describe('⚡ CRITICAL ENDPOINT STRESS TESTS', () => {
    test('Auth endpoints under extreme stress (100 requests)', async () => {
      monitor.start();
      
      const promises = Array.from({ length: 100 }, async (_, i) => {
        const startTime = Date.now();
        try {
          const response = await request(app)
            .post('/api/auth/login')
            .set('X-Test-Mode', 'true')
            .send({
              email: STRESS_TEST_DATA.validUser.email,
              password: STRESS_TEST_DATA.validUser.password
            });
          
          const responseTime = Date.now() - startTime;
          const success = response.status >= 200 && response.status < 400;
          
          monitor.recordRequest(success, responseTime, success ? null : 'auth_error');
          return response;
        } catch (error) {
          const responseTime = Date.now() - startTime;
          monitor.recordRequest(false, responseTime, 'network_error');
          throw error;
        }
      });

      await Promise.allSettled(promises);
      monitor.end();

      const stats = monitor.getStats();
      
      // Bajo estrés extremo, esperamos al menos 80% de éxito
      expect(stats.successRate).toBeGreaterThanOrEqual(80);
      expect(stats.avgResponseTime).toBeLessThan(5000); // 5 segundos máximo
      expect(stats.p95ResponseTime).toBeLessThan(8000); // 95% bajo 8 segundos
      
      console.log('🔥 Auth Stress Test Results:');
      console.log(`✅ Success Rate: ${stats.successRate.toFixed(2)}%`);
      console.log(`✅ Avg Response Time: ${stats.avgResponseTime.toFixed(2)}ms`);
      console.log(`✅ P95 Response Time: ${stats.p95ResponseTime}ms`);
      console.log(`✅ Peak Response Time: ${stats.peakResponseTime}ms`);
      console.log(`✅ Requests/Second: ${stats.requestsPerSecond.toFixed(2)}`);
      console.log(`✅ Errors by Type:`, stats.errorsByType);
    });

    test('Patient CRUD under extreme stress (75 requests)', async () => {
      monitor.start();
      
      const operations = [
        // 40% GET requests
        ...Array.from({ length: 30 }, () => ({
          type: 'get',
          request: () => request(app).get('/api/pacientes').set('X-Test-Mode', 'true').set('Authorization', `Bearer ${adminToken}`)
        })),
        // 30% POST requests
        ...Array.from({ length: 22 }, (_, i) => ({
          type: 'post',
          request: () => request(app).post('/api/pacientes').set('X-Test-Mode', 'true').set('Authorization', `Bearer ${adminToken}`).send({
            ...STRESS_TEST_DATA.pacienteTemplate,
            nombre: `StressTest${i}`,
            curp: `STTT${String(i).padStart(4, '0')}0101HDFRRN01`
          })
        })),
        // 30% GET doctores
        ...Array.from({ length: 23 }, () => ({
          type: 'get_doctors',
          request: () => request(app).get('/api/doctores').set('X-Test-Mode', 'true').set('Authorization', `Bearer ${adminToken}`)
        }))
      ];

      const promises = operations.map(async (operation, i) => {
        const startTime = Date.now();
        try {
          const response = await operation.request();
          const responseTime = Date.now() - startTime;
          const success = response.status >= 200 && response.status < 400;
          
          monitor.recordRequest(success, responseTime, success ? null : `${operation.type}_error`);
          return response;
        } catch (error) {
          const responseTime = Date.now() - startTime;
          monitor.recordRequest(false, responseTime, 'network_error');
          throw error;
        }
      });

      await Promise.allSettled(promises);
      monitor.end();

      const stats = monitor.getStats();
      
      // Bajo estrés extremo en CRUD, esperamos al menos 75% de éxito
      expect(stats.successRate).toBeGreaterThanOrEqual(75);
      expect(stats.avgResponseTime).toBeLessThan(6000); // 6 segundos máximo
      expect(stats.p95ResponseTime).toBeLessThan(10000); // 95% bajo 10 segundos
      
      console.log('🔥 CRUD Stress Test Results:');
      console.log(`✅ Success Rate: ${stats.successRate.toFixed(2)}%`);
      console.log(`✅ Avg Response Time: ${stats.avgResponseTime.toFixed(2)}ms`);
      console.log(`✅ P95 Response Time: ${stats.p95ResponseTime}ms`);
      console.log(`✅ Median Response Time: ${stats.medianResponseTime}ms`);
      console.log(`✅ Requests/Second: ${stats.requestsPerSecond.toFixed(2)}`);
      console.log(`✅ Errors by Type:`, stats.errorsByType);
    });

    test('Health endpoint under extreme stress (150 requests)', async () => {
      monitor.start();
      
      const promises = Array.from({ length: 150 }, async (_, i) => {
        const startTime = Date.now();
        try {
          const response = await request(app)
            .get('/api/auth/usuarios')
            .set('X-Test-Mode', 'true')
            .set('Authorization', `Bearer ${adminToken}`);
          
          const responseTime = Date.now() - startTime;
          const success = response.status >= 200 && response.status < 400;
          
          monitor.recordRequest(success, responseTime, success ? null : 'health_error');
          return response;
        } catch (error) {
          const responseTime = Date.now() - startTime;
          monitor.recordRequest(false, responseTime, 'network_error');
          throw error;
        }
      });

      await Promise.allSettled(promises);
      monitor.end();

      const stats = monitor.getStats();
      
      // Health endpoint debe ser muy resistente al estrés
      expect(stats.successRate).toBeGreaterThanOrEqual(95);
      expect(stats.avgResponseTime).toBeLessThan(1000); // 1 segundo máximo
      expect(stats.p99ResponseTime).toBeLessThan(2000); // 99% bajo 2 segundos
      
      console.log('🔥 Health Stress Test Results:');
      console.log(`✅ Success Rate: ${stats.successRate.toFixed(2)}%`);
      console.log(`✅ Avg Response Time: ${stats.avgResponseTime.toFixed(2)}ms`);
      console.log(`✅ P99 Response Time: ${stats.p99ResponseTime}ms`);
      console.log(`✅ Requests/Second: ${stats.requestsPerSecond.toFixed(2)}`);
      console.log(`✅ Total Time: ${(stats.totalTime / 1000).toFixed(2)}s`);
    });
  });

  describe('💥 BURST STRESS TESTS', () => {
    test('Sudden burst of 50 requests in 1 second', async () => {
      monitor.start();
      
      // Crear todas las promesas primero
      const promises = Array.from({ length: 50 }, async (_, i) => {
        const startTime = Date.now();
        try {
          const response = await request(app)
            .get('/api/auth/usuarios')
            .set('X-Test-Mode', 'true')
            .set('Authorization', `Bearer ${adminToken}`);
          
          const responseTime = Date.now() - startTime;
          const success = response.status >= 200 && response.status < 400;
          
          monitor.recordRequest(success, responseTime, success ? null : 'burst_error');
          return response;
        } catch (error) {
          const responseTime = Date.now() - startTime;
          monitor.recordRequest(false, responseTime, 'network_error');
          throw error;
        }
      });

      // Ejecutar todas simultáneamente (burst)
      await Promise.allSettled(promises);
      monitor.end();

      const stats = monitor.getStats();
      
      // Durante burst, esperamos al menos 90% de éxito
      expect(stats.successRate).toBeGreaterThanOrEqual(90);
      expect(stats.avgResponseTime).toBeLessThan(2000); // 2 segundos máximo
      expect(stats.requestsPerSecond).toBeGreaterThan(25); // Mínimo 25 RPS
      
      console.log('💥 Burst Stress Test Results:');
      console.log(`✅ Success Rate: ${stats.successRate.toFixed(2)}%`);
      console.log(`✅ Avg Response Time: ${stats.avgResponseTime.toFixed(2)}ms`);
      console.log(`✅ Peak Response Time: ${stats.peakResponseTime}ms`);
      console.log(`✅ Requests/Second: ${stats.requestsPerSecond.toFixed(2)}`);
      console.log(`✅ Total Time: ${(stats.totalTime / 1000).toFixed(2)}s`);
    });

    test('Mixed burst: 30 auth + 20 CRUD operations', async () => {
      monitor.start();
      
      const authPromises = Array.from({ length: 30 }, async (_, i) => {
        const startTime = Date.now();
        try {
          const response = await request(app)
            .post('/api/auth/login')
            .set('X-Test-Mode', 'true')
            .send({
              email: STRESS_TEST_DATA.validUser.email,
              password: STRESS_TEST_DATA.validUser.password
            });
          
          const responseTime = Date.now() - startTime;
          const success = response.status >= 200 && response.status < 400;
          
          monitor.recordRequest(success, responseTime, success ? null : 'auth_burst_error');
          return response;
        } catch (error) {
          const responseTime = Date.now() - startTime;
          monitor.recordRequest(false, responseTime, 'network_error');
          throw error;
        }
      });

      const crudPromises = Array.from({ length: 20 }, async (_, i) => {
        const startTime = Date.now();
        try {
          const response = await request(app)
            .get('/api/pacientes')
            .set('X-Test-Mode', 'true')
            .set('Authorization', `Bearer ${adminToken}`);
          
          const responseTime = Date.now() - startTime;
          const success = response.status >= 200 && response.status < 400;
          
          monitor.recordRequest(success, responseTime, success ? null : 'crud_burst_error');
          return response;
        } catch (error) {
          const responseTime = Date.now() - startTime;
          monitor.recordRequest(false, responseTime, 'network_error');
          throw error;
        }
      });

      // Ejecutar ambos tipos de requests simultáneamente
      await Promise.allSettled([...authPromises, ...crudPromises]);
      monitor.end();

      const stats = monitor.getStats();
      
      // Mixed burst debe mantener al menos 85% de éxito
      expect(stats.successRate).toBeGreaterThanOrEqual(85);
      expect(stats.avgResponseTime).toBeLessThan(3000); // 3 segundos máximo
      
      console.log('💥 Mixed Burst Stress Test Results:');
      console.log(`✅ Success Rate: ${stats.successRate.toFixed(2)}%`);
      console.log(`✅ Avg Response Time: ${stats.avgResponseTime.toFixed(2)}ms`);
      console.log(`✅ Requests/Second: ${stats.requestsPerSecond.toFixed(2)}`);
      console.log(`✅ Errors by Type:`, stats.errorsByType);
    });
  });

  describe('🔄 SUSTAINED STRESS TESTS', () => {
    test('Sustained load: 200 requests over 30 seconds', async () => {
      monitor.start();
      
      const requestInterval = 150; // 150ms entre requests = ~6.7 RPS
      const totalRequests = 200;
      
      const promises = Array.from({ length: totalRequests }, async (_, i) => {
        // Espaciar requests en el tiempo
        await new Promise(resolve => setTimeout(resolve, i * requestInterval));
        
        const startTime = Date.now();
        try {
          const response = await request(app)
            .get('/api/auth/usuarios')
            .set('X-Test-Mode', 'true')
            .set('Authorization', `Bearer ${adminToken}`);
          
          const responseTime = Date.now() - startTime;
          const success = response.status >= 200 && response.status < 400;
          
          monitor.recordRequest(success, responseTime, success ? null : 'sustained_error');
          return response;
        } catch (error) {
          const responseTime = Date.now() - startTime;
          monitor.recordRequest(false, responseTime, 'network_error');
          throw error;
        }
      });

      await Promise.allSettled(promises);
      monitor.end();

      const stats = monitor.getStats();
      
      // Carga sostenida debe mantener alta estabilidad
      expect(stats.successRate).toBeGreaterThanOrEqual(95);
      expect(stats.avgResponseTime).toBeLessThan(1000); // 1 segundo máximo
      expect(stats.p95ResponseTime).toBeLessThan(1500); // 95% bajo 1.5 segundos
      
      console.log('🔄 Sustained Stress Test Results:');
      console.log(`✅ Success Rate: ${stats.successRate.toFixed(2)}%`);
      console.log(`✅ Avg Response Time: ${stats.avgResponseTime.toFixed(2)}ms`);
      console.log(`✅ P95 Response Time: ${stats.p95ResponseTime}ms`);
      console.log(`✅ Requests/Second: ${stats.requestsPerSecond.toFixed(2)}`);
      console.log(`✅ Total Time: ${(stats.totalTime / 1000).toFixed(2)}s`);
    });
  });

  describe('📊 STRESS TEST BENCHMARKS', () => {
    test('Stress test benchmarks summary', () => {
      const benchmarks = {
        'Auth Endpoints (100 requests)': {
          minSuccessRate: 80,
          maxAvgResponseTime: 5000,
          maxP95ResponseTime: 8000
        },
        'CRUD Operations (75 requests)': {
          minSuccessRate: 75,
          maxAvgResponseTime: 6000,
          maxP95ResponseTime: 10000
        },
        'Health Endpoint (150 requests)': {
          minSuccessRate: 95,
          maxAvgResponseTime: 1000,
          maxP99ResponseTime: 2000
        },
        'Burst Traffic (50 requests/1s)': {
          minSuccessRate: 90,
          maxAvgResponseTime: 2000,
          minRPS: 25
        },
        'Mixed Burst (50 requests)': {
          minSuccessRate: 85,
          maxAvgResponseTime: 3000
        },
        'Sustained Load (200 requests/30s)': {
          minSuccessRate: 95,
          maxAvgResponseTime: 1000,
          maxP95ResponseTime: 1500
        }
      };

      console.log('\n📊 STRESS TEST BENCHMARKS:');
      Object.entries(benchmarks).forEach(([test, metrics]) => {
        console.log(`🔥 ${test}:`);
        Object.entries(metrics).forEach(([metric, value]) => {
          console.log(`   - ${metric}: ${metric.includes('max') ? '<' : '>'} ${value}${metric.includes('RPS') ? ' RPS' : metric.includes('Rate') ? '%' : 'ms'}`);
        });
      });
      
      expect(true).toBe(true); // Test siempre pasa, es informativo
    });
  });
});
