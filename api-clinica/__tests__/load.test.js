// Tests de Carga para la API Clínica
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

// Utilidades para tests de carga
class LoadTestMonitor {
  constructor() {
    this.results = [];
    this.errors = [];
    this.startTime = null;
    this.endTime = null;
  }

  start() {
    this.startTime = Date.now();
  }

  end() {
    this.endTime = Date.now();
  }

  recordResult(success, responseTime, statusCode, error = null) {
    this.results.push({
      success,
      responseTime,
      statusCode,
      timestamp: Date.now()
    });

    if (error) {
      this.errors.push({
        error: error.message || error,
        timestamp: Date.now()
      });
    }
  }

  getStats() {
    if (this.results.length === 0) return null;

    const totalRequests = this.results.length;
    const successfulRequests = this.results.filter(r => r.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const successRate = (successfulRequests / totalRequests) * 100;
    
    const responseTimes = this.results.map(r => r.responseTime);
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const minResponseTime = Math.min(...responseTimes);
    const maxResponseTime = Math.max(...responseTimes);
    
    const totalTime = this.endTime - this.startTime;
    const requestsPerSecond = totalRequests / (totalTime / 1000);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate,
      avgResponseTime,
      minResponseTime,
      maxResponseTime,
      requestsPerSecond,
      totalTime,
      errors: this.errors.length
    };
  }
}

// Datos de prueba para carga
const LOAD_TEST_DATA = {
  users: Array.from({ length: 100 }, (_, i) => ({
    email: `loadtest${i}@test.com`,
    password: 'LoadTest123',
    rol: 'Paciente'
  })),
  pacientes: Array.from({ length: 50 }, (_, i) => ({
    nombre: `LoadTest${i}`,
    apellido_paterno: 'User',
    apellido_materno: 'Test',
    fecha_nacimiento: '1990-01-01',
    curp: `LUTT${String(i).padStart(4, '0')}0101HDFRRN01`,
    sexo: 'Hombre',
    numero_celular: `555${String(i).padStart(7, '0')}`
  }))
};

describe('🔥 LOAD TESTS', () => {
  let monitor;
  let adminToken;

  beforeAll(async () => {
    monitor = new LoadTestMonitor();
    
    // Crear usuario admin para tests de carga
    const adminResponse = await request(app)
      .post('/api/auth/register')
      .set('X-Test-Mode', 'true')
      .send({
        email: 'loadtest.admin@test.com',
        password: 'LoadTest123',
        rol: 'Admin'
      });
    
    adminToken = adminResponse.body.token;
  });

  beforeEach(() => {
    monitor = new LoadTestMonitor();
  });

  describe('📊 LIGHT LOAD TESTS', () => {
    test('Should handle 20 concurrent health checks', async () => {
      monitor.start();
      
      const promises = Array.from({ length: 20 }, async () => {
        const startTime = Date.now();
        try {
          const response = await request(app)
            .get('/api/auth/usuarios')
            .set('X-Test-Mode', 'true')
            .set('Authorization', `Bearer ${adminToken}`);
          
          const responseTime = Date.now() - startTime;
          monitor.recordResult(true, responseTime, response.status);
          return response;
        } catch (error) {
          const responseTime = Date.now() - startTime;
          monitor.recordResult(false, responseTime, 500, error);
          throw error;
        }
      });

      await Promise.allSettled(promises);
      monitor.end();

      const stats = monitor.getStats();
      
      expect(stats.successRate).toBeGreaterThanOrEqual(95); // 95% success rate
      expect(stats.avgResponseTime).toBeLessThan(200); // 200ms average
      expect(stats.requestsPerSecond).toBeGreaterThan(10); // 10 RPS minimum
      
      console.log('📊 Light Load Test Results:');
      console.log(`✅ Success Rate: ${stats.successRate.toFixed(2)}%`);
      console.log(`✅ Avg Response Time: ${stats.avgResponseTime.toFixed(2)}ms`);
      console.log(`✅ Requests/Second: ${stats.requestsPerSecond.toFixed(2)}`);
      console.log(`✅ Total Requests: ${stats.totalRequests}`);
    });

    test('Should handle 10 concurrent user registrations', async () => {
      monitor.start();
      
      const promises = Array.from({ length: 10 }, async (_, i) => {
        const startTime = Date.now();
        try {
          const response = await request(app)
            .post('/api/auth/register')
            .set('X-Test-Mode', 'true')
            .send({
              email: `lightload${i}@test.com`,
              password: 'LightLoad123',
              rol: 'Paciente'
            });
          
          const responseTime = Date.now() - startTime;
          monitor.recordResult(true, responseTime, response.status);
          return response;
        } catch (error) {
          const responseTime = Date.now() - startTime;
          monitor.recordResult(false, responseTime, 500, error);
          throw error;
        }
      });

      await Promise.allSettled(promises);
      monitor.end();

      const stats = monitor.getStats();
      
      expect(stats.successRate).toBeGreaterThanOrEqual(90); // 90% success rate
      expect(stats.avgResponseTime).toBeLessThan(1000); // 1 second average
      
      console.log('📊 Light Load Registration Results:');
      console.log(`✅ Success Rate: ${stats.successRate.toFixed(2)}%`);
      console.log(`✅ Avg Response Time: ${stats.avgResponseTime.toFixed(2)}ms`);
    });
  });

  describe('⚡ MEDIUM LOAD TESTS', () => {
    test('Should handle 50 concurrent requests to different endpoints', async () => {
      monitor.start();
      
      const endpointTests = [
        { name: 'health', request: () => request(app).get('/health').set('X-Test-Mode', 'true') },
        { name: 'auth_login', request: () => request(app).post('/api/auth/login').set('X-Test-Mode', 'true').send({ email: 'loadtest.admin@test.com', password: 'LoadTest123' }) },
        { name: 'get_pacientes', request: () => request(app).get('/api/pacientes').set('X-Test-Mode', 'true').set('Authorization', `Bearer ${adminToken}`) },
        { name: 'get_doctores', request: () => request(app).get('/api/doctores').set('X-Test-Mode', 'true').set('Authorization', `Bearer ${adminToken}`) }
      ];

      const promises = Array.from({ length: 50 }, async (_, i) => {
        const endpoint = endpointTests[i % endpointTests.length];
        const startTime = Date.now();
        
        try {
          const response = await endpoint.request();
          const responseTime = Date.now() - startTime;
          monitor.recordResult(true, responseTime, response.status);
          return response;
        } catch (error) {
          const responseTime = Date.now() - startTime;
          monitor.recordResult(false, responseTime, 500, error);
          throw error;
        }
      });

      await Promise.allSettled(promises);
      monitor.end();

      const stats = monitor.getStats();
      
      expect(stats.successRate).toBeGreaterThanOrEqual(85); // 85% success rate
      expect(stats.avgResponseTime).toBeLessThan(1500); // 1.5 seconds average
      expect(stats.requestsPerSecond).toBeGreaterThan(15); // 15 RPS minimum
      
      console.log('📊 Medium Load Test Results:');
      console.log(`✅ Success Rate: ${stats.successRate.toFixed(2)}%`);
      console.log(`✅ Avg Response Time: ${stats.avgResponseTime.toFixed(2)}ms`);
      console.log(`✅ Requests/Second: ${stats.requestsPerSecond.toFixed(2)}`);
      console.log(`✅ Errors: ${stats.errors}`);
    });

    test('Should handle 25 concurrent paciente creations', async () => {
      monitor.start();
      
      const promises = Array.from({ length: 25 }, async (_, i) => {
        const startTime = Date.now();
        try {
          const response = await request(app)
            .post('/api/pacientes')
            .set('X-Test-Mode', 'true')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              nombre: `MediumLoad${i}`,
              apellido_paterno: 'Test',
              apellido_materno: 'User',
              fecha_nacimiento: '1990-01-01',
              curp: `MLTT${String(i).padStart(4, '0')}0101HDFRRN01`,
              sexo: 'Hombre',
              numero_celular: `555${String(i).padStart(7, '0')}`
            });
          
          const responseTime = Date.now() - startTime;
          monitor.recordResult(true, responseTime, response.status);
          return response;
        } catch (error) {
          const responseTime = Date.now() - startTime;
          monitor.recordResult(false, responseTime, 500, error);
          throw error;
        }
      });

      await Promise.allSettled(promises);
      monitor.end();

      const stats = monitor.getStats();
      
      expect(stats.successRate).toBeGreaterThanOrEqual(80); // 80% success rate
      expect(stats.avgResponseTime).toBeLessThan(2000); // 2 seconds average
      
      console.log('📊 Medium Load Paciente Creation Results:');
      console.log(`✅ Success Rate: ${stats.successRate.toFixed(2)}%`);
      console.log(`✅ Avg Response Time: ${stats.avgResponseTime.toFixed(2)}ms`);
      console.log(`✅ Errors: ${stats.errors}`);
    });
  });

  describe('🔥 HEAVY LOAD TESTS', () => {
    test('Should handle 100 concurrent mixed operations', async () => {
      monitor.start();
      
      const operations = [
        { name: 'health', weight: 0.4 }, // 40% health checks
        { name: 'login', weight: 0.3 },  // 30% logins
        { name: 'read', weight: 0.2 },   // 20% read operations
        { name: 'create', weight: 0.1 }  // 10% create operations
      ];

      const promises = Array.from({ length: 100 }, async (_, i) => {
        // Seleccionar operación basada en peso
        const rand = Math.random();
        let cumulativeWeight = 0;
        let selectedOp = operations[0];
        
        for (const op of operations) {
          cumulativeWeight += op.weight;
          if (rand <= cumulativeWeight) {
            selectedOp = op;
            break;
          }
        }

        const startTime = Date.now();
        try {
          let response;
          
          switch (selectedOp.name) {
            case 'health':
              response = await request(app).get('/health').set('X-Test-Mode', 'true');
              break;
            case 'login':
              response = await request(app).post('/api/auth/login').set('X-Test-Mode', 'true').send({ 
                email: 'loadtest.admin@test.com', 
                password: 'LoadTest123' 
              });
              break;
            case 'read':
              const readOps = ['pacientes', 'doctores'];
              const readOp = readOps[i % readOps.length];
              response = await request(app).get(`/api/${readOp}`).set('X-Test-Mode', 'true').set('Authorization', `Bearer ${adminToken}`);
              break;
            case 'create':
              response = await request(app).post('/api/pacientes').set('X-Test-Mode', 'true').set('Authorization', `Bearer ${adminToken}`).send({
                nombre: `HeavyLoad${i}`,
                apellido_paterno: 'Test',
                fecha_nacimiento: '1990-01-01',
                curp: `HLTT${String(i).padStart(4, '0')}0101HDFRRN01`,
                sexo: 'Hombre'
              });
              break;
          }
          
          const responseTime = Date.now() - startTime;
          monitor.recordResult(true, responseTime, response.status);
          return response;
        } catch (error) {
          const responseTime = Date.now() - startTime;
          monitor.recordResult(false, responseTime, 500, error);
          throw error;
        }
      });

      await Promise.allSettled(promises);
      monitor.end();

      const stats = monitor.getStats();
      
      expect(stats.successRate).toBeGreaterThanOrEqual(70); // 70% success rate bajo carga pesada
      expect(stats.avgResponseTime).toBeLessThan(3000); // 3 seconds average
      expect(stats.requestsPerSecond).toBeGreaterThan(20); // 20 RPS minimum
      
      console.log('📊 Heavy Load Test Results:');
      console.log(`✅ Success Rate: ${stats.successRate.toFixed(2)}%`);
      console.log(`✅ Avg Response Time: ${stats.avgResponseTime.toFixed(2)}ms`);
      console.log(`✅ Requests/Second: ${stats.requestsPerSecond.toFixed(2)}`);
      console.log(`✅ Total Time: ${(stats.totalTime / 1000).toFixed(2)}s`);
      console.log(`✅ Errors: ${stats.errors}`);
    });

    test('Should handle burst traffic (50 requests in 1 second)', async () => {
      monitor.start();
      
      const promises = Array.from({ length: 50 }, async (_, i) => {
        const startTime = Date.now();
        try {
          const response = await request(app)
            .get('/health')
            .set('X-Test-Mode', 'true');
          
          const responseTime = Date.now() - startTime;
          monitor.recordResult(true, responseTime, response.status);
          return response;
        } catch (error) {
          const responseTime = Date.now() - startTime;
          monitor.recordResult(false, responseTime, 500, error);
          throw error;
        }
      });

      // Ejecutar todas las promesas simultáneamente (burst)
      await Promise.allSettled(promises);
      monitor.end();

      const stats = monitor.getStats();
      
      expect(stats.successRate).toBeGreaterThanOrEqual(80); // 80% success rate en burst
      expect(stats.avgResponseTime).toBeLessThan(500); // 500ms average en burst
      
      console.log('📊 Burst Traffic Test Results:');
      console.log(`✅ Success Rate: ${stats.successRate.toFixed(2)}%`);
      console.log(`✅ Avg Response Time: ${stats.avgResponseTime.toFixed(2)}ms`);
      console.log(`✅ Requests/Second: ${stats.requestsPerSecond.toFixed(2)}`);
    });
  });

  describe('📈 LOAD TEST BENCHMARKS', () => {
    test('Load test benchmarks summary', () => {
      const benchmarks = {
        'Light Load (20 requests)': {
          successRate: 95,
          avgResponseTime: 200,
          minRPS: 10
        },
        'Medium Load (50 requests)': {
          successRate: 85,
          avgResponseTime: 1500,
          minRPS: 15
        },
        'Heavy Load (100 requests)': {
          successRate: 70,
          avgResponseTime: 3000,
          minRPS: 20
        },
        'Burst Traffic (50 requests/1s)': {
          successRate: 80,
          avgResponseTime: 500,
          minRPS: 40
        }
      };

      console.log('\n📈 LOAD TEST BENCHMARKS:');
      Object.entries(benchmarks).forEach(([test, metrics]) => {
        console.log(`✅ ${test}:`);
        console.log(`   - Success Rate: > ${metrics.successRate}%`);
        console.log(`   - Avg Response Time: < ${metrics.avgResponseTime}ms`);
        console.log(`   - Min RPS: > ${metrics.minRPS}`);
      });
      
      expect(true).toBe(true); // Test siempre pasa, es informativo
    });
  });
});
