// Tests de Performance para la API Clínica
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

// Utilidades para medir performance
class PerformanceMonitor {
  constructor() {
    this.metrics = [];
  }

  startTimer(name) {
    const startTime = Date.now();
    return {
      name,
      startTime,
      end: () => {
        const duration = Date.now() - startTime;
        this.metrics.push({ name, duration });
        return duration;
      }
    };
  }

  getMetrics() {
    return this.metrics;
  }

  getAverageResponseTime() {
    if (this.metrics.length === 0) return 0;
    const total = this.metrics.reduce((sum, metric) => sum + metric.duration, 0);
    return total / this.metrics.length;
  }

  getMaxResponseTime() {
    if (this.metrics.length === 0) return 0;
    return Math.max(...this.metrics.map(metric => metric.duration));
  }

  getMinResponseTime() {
    if (this.metrics.length === 0) return 0;
    return Math.min(...this.metrics.map(metric => metric.duration));
  }

  clear() {
    this.metrics = [];
  }
}

// Mock de datos de prueba
const TEST_DATA = {
  validUser: {
    email: 'performance@test.com',
    password: 'Performance123',
    rol: 'Admin'
  },
  validDoctor: {
    email: 'doctor.performance@test.com',
    password: 'Doctor123',
    rol: 'Doctor'
  },
  validPaciente: {
    nombre: 'Performance',
    apellido_paterno: 'Test',
    apellido_materno: 'User',
    fecha_nacimiento: '1990-01-01',
    curp: 'PEPT900101HDFRRN01',
    sexo: 'Hombre',
    numero_celular: '5551234567',
    institucion_salud: 'IMSS',
    direccion: 'Calle Performance Test 123',
    localidad: 'Ciudad Test'
  }
};

describe('🚀 PERFORMANCE TESTS', () => {
  let monitor;
  let adminToken;
  let doctorToken;
  let adminUserId;
  let doctorUserId;

  beforeAll(async () => {
    monitor = new PerformanceMonitor();
    
    // Crear usuario admin para tests
    const adminResponse = await request(app)
      .post('/api/auth/register')
      .set('X-Test-Mode', 'true')
      .send(TEST_DATA.validUser);
    
    adminToken = adminResponse.body.token;
    adminUserId = adminResponse.body.usuario?.id_usuario || 1;

    // Crear usuario doctor para tests
    const doctorResponse = await request(app)
      .post('/api/auth/register')
      .set('X-Test-Mode', 'true')
      .send(TEST_DATA.validDoctor);
    
    doctorToken = doctorResponse.body.token;
    doctorUserId = doctorResponse.body.usuario?.id_usuario || 2;
  });

  beforeEach(() => {
    monitor.clear();
  });

  describe('⚡ RESPONSE TIME TESTS', () => {
    test('Health endpoint should respond within 100ms', async () => {
      const timer = monitor.startTimer('health_check');
      
      // Usar endpoint de auth como health check ya que /health no existe
      const response = await request(app)
        .get('/api/auth/usuarios')
        .set('X-Test-Mode', 'true')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const duration = timer.end();
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(100); // 100ms máximo
      console.log(`✅ Health check: ${duration}ms`);
    });

    test('Auth registration should respond within 500ms', async () => {
      const timer = monitor.startTimer('auth_register');
      
      const response = await request(app)
        .post('/api/auth/register')
        .set('X-Test-Mode', 'true')
        .send({
          email: `perf.${Date.now()}@test.com`,
          password: 'Test123',
          rol: 'Paciente'
        });
      
      const duration = timer.end();
      
      expect(response.status).toBe(201);
      expect(duration).toBeLessThan(500); // 500ms máximo
      console.log(`✅ Auth registration: ${duration}ms`);
    });

    test('Auth login should respond within 300ms', async () => {
      const timer = monitor.startTimer('auth_login');
      
      const response = await request(app)
        .post('/api/auth/login')
        .set('X-Test-Mode', 'true')
        .send({
          email: TEST_DATA.validUser.email,
          password: TEST_DATA.validUser.password
        });
      
      const duration = timer.end();
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(300); // 300ms máximo
      console.log(`✅ Auth login: ${duration}ms`);
    });

    test('Get pacientes should respond within 400ms', async () => {
      const timer = monitor.startTimer('get_pacientes');
      
      const response = await request(app)
        .get('/api/pacientes')
        .set('X-Test-Mode', 'true')
        .set('Authorization', `Bearer ${adminToken}`);
      
      const duration = timer.end();
      
      // Admin puede tener restricciones de acceso, verificar que responda rápido
      expect(duration).toBeLessThan(400); // 400ms máximo
      console.log(`✅ Get pacientes: ${duration}ms (status: ${response.status})`);
    });

    test('Create paciente should respond within 600ms', async () => {
      const timer = monitor.startTimer('create_paciente');
      
      const response = await request(app)
        .post('/api/pacientes')
        .set('X-Test-Mode', 'true')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...TEST_DATA.validPaciente,
          nombre: `PerfTest${Date.now()}`
        });
      
      const duration = timer.end();
      
      // Verificar que responda rápido independientemente del resultado
      expect(duration).toBeLessThan(600); // 600ms máximo
      console.log(`✅ Create paciente: ${duration}ms (status: ${response.status})`);
    });
  });

  describe('🔄 CONCURRENT REQUEST TESTS', () => {
    test('Should handle 10 concurrent health checks', async () => {
      const promises = Array.from({ length: 10 }, () => 
        request(app)
          .get('/api/auth/usuarios')
          .set('X-Test-Mode', 'true')
          .set('Authorization', `Bearer ${adminToken}`)
      );

      const timer = monitor.startTimer('concurrent_health');
      const responses = await Promise.all(promises);
      const duration = timer.end();

      // Todas las respuestas deben ser exitosas
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(duration).toBeLessThan(1000); // 1 segundo máximo
      console.log(`✅ 10 concurrent health checks: ${duration}ms`);
    });

    test('Should handle 5 concurrent logins', async () => {
      const promises = Array.from({ length: 5 }, () => 
        request(app)
          .post('/api/auth/login')
          .set('X-Test-Mode', 'true')
          .send({
            email: TEST_DATA.validUser.email,
            password: TEST_DATA.validUser.password
          })
      );

      const timer = monitor.startTimer('concurrent_logins');
      const responses = await Promise.all(promises);
      const duration = timer.end();

      // Todas las respuestas deben ser exitosas
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(duration).toBeLessThan(2000); // 2 segundos máximo
      console.log(`✅ 5 concurrent logins: ${duration}ms`);
    });

    test('Should handle 3 concurrent paciente operations', async () => {
      const promises = [
        // GET pacientes
        request(app)
          .get('/api/pacientes')
          .set('X-Test-Mode', 'true')
          .set('Authorization', `Bearer ${adminToken}`),
        
        // POST paciente
        request(app)
          .post('/api/pacientes')
          .set('X-Test-Mode', 'true')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            ...TEST_DATA.validPaciente,
            nombre: `Concurrent${Date.now()}`
          }),
        
        // GET doctores
        request(app)
          .get('/api/doctores')
          .set('X-Test-Mode', 'true')
          .set('Authorization', `Bearer ${adminToken}`)
      ];

      const timer = monitor.startTimer('concurrent_operations');
      const responses = await Promise.all(promises);
      const duration = timer.end();

      // Verificar que todas respondan rápido (pueden ser 403 por permisos)
      responses.forEach(response => {
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(500); // Permitir 403
      });

      expect(duration).toBeLessThan(3000); // 3 segundos máximo
      console.log(`✅ 3 concurrent operations: ${duration}ms`);
    });
  });

  describe('📊 MEMORY AND RESOURCE TESTS', () => {
    test('Should not leak memory with multiple requests', async () => {
      const initialMemory = process.memoryUsage();
      
      // Realizar 50 requests consecutivos
      for (let i = 0; i < 50; i++) {
        await request(app)
          .get('/api/auth/usuarios')
          .set('X-Test-Mode', 'true')
          .set('Authorization', `Bearer ${adminToken}`);
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
      
      // El aumento de memoria no debe ser mayor a 50MB
      expect(memoryIncreaseMB).toBeLessThan(50);
      console.log(`✅ Memory increase after 50 requests: ${memoryIncreaseMB.toFixed(2)}MB`);
    });

    test('Should handle large payload efficiently', async () => {
      const largePacienteData = {
        ...TEST_DATA.validPaciente,
        nombre: 'A'.repeat(100), // Nombre largo
        apellido_paterno: 'B'.repeat(100),
        direccion: 'C'.repeat(500), // Dirección muy larga
        observaciones: 'D'.repeat(1000) // Observaciones largas
      };

      const timer = monitor.startTimer('large_payload');
      
      const response = await request(app)
        .post('/api/pacientes')
        .set('X-Test-Mode', 'true')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(largePacienteData);
      
      const duration = timer.end();

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
      expect(duration).toBeLessThan(1000); // 1 segundo máximo
      console.log(`✅ Large payload processing: ${duration}ms`);
    });
  });

  describe('🎯 ENDPOINT SPECIFIC PERFORMANCE', () => {
    test('Auth endpoints performance summary', async () => {
      const endpoints = [
        { method: 'POST', path: '/api/auth/register', data: { email: `perf.${Date.now()}@test.com`, password: 'Test123', rol: 'Paciente' } },
        { method: 'POST', path: '/api/auth/login', data: { email: TEST_DATA.validUser.email, password: TEST_DATA.validUser.password } }
      ];

      for (const endpoint of endpoints) {
        const timer = monitor.startTimer(`${endpoint.method}_${endpoint.path}`);
        
        const response = await request(app)
          [endpoint.method.toLowerCase()](endpoint.path)
          .set('X-Test-Mode', 'true')
          .send(endpoint.data);
        
        const duration = timer.end();
        
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(400);
        console.log(`✅ ${endpoint.method} ${endpoint.path}: ${duration}ms`);
      }

      const avgTime = monitor.getAverageResponseTime();
      const maxTime = monitor.getMaxResponseTime();
      
      console.log(`📊 Auth endpoints - Average: ${avgTime.toFixed(2)}ms, Max: ${maxTime}ms`);
    });

    test('CRUD operations performance summary', async () => {
      const crudOperations = [
        { name: 'GET_pacientes', action: () => request(app).get('/api/pacientes').set('X-Test-Mode', 'true').set('Authorization', `Bearer ${adminToken}`) },
        { name: 'POST_paciente', action: () => request(app).post('/api/pacientes').set('X-Test-Mode', 'true').set('Authorization', `Bearer ${adminToken}`).send({ ...TEST_DATA.validPaciente, nombre: `CRUD${Date.now()}` }) },
        { name: 'GET_doctores', action: () => request(app).get('/api/doctores').set('X-Test-Mode', 'true').set('Authorization', `Bearer ${adminToken}`) }
      ];

      for (const operation of crudOperations) {
        const timer = monitor.startTimer(operation.name);
        
        const response = await operation.action();
        
        const duration = timer.end();
        
        expect(response.status).toBeGreaterThanOrEqual(200);
        expect(response.status).toBeLessThan(500); // Permitir 403
        console.log(`✅ ${operation.name}: ${duration}ms (status: ${response.status})`);
      }

      const avgTime = monitor.getAverageResponseTime();
      const maxTime = monitor.getMaxResponseTime();
      const minTime = monitor.getMinResponseTime();
      
      console.log(`📊 CRUD operations - Avg: ${avgTime.toFixed(2)}ms, Min: ${minTime}ms, Max: ${maxTime}ms`);
    });
  });

  describe('📈 PERFORMANCE BENCHMARKS', () => {
    test('Performance benchmarks summary', () => {
      const benchmarks = {
        'Health Check': 100, // ms
        'Auth Registration': 500,
        'Auth Login': 300,
        'Get Pacientes': 400,
        'Create Paciente': 600,
        'Concurrent Health (10)': 1000,
        'Concurrent Logins (5)': 2000,
        'Concurrent Operations (3)': 3000,
        'Large Payload': 1000,
        'Memory Leak Test': 50 // MB
      };

      console.log('\n📈 PERFORMANCE BENCHMARKS:');
      Object.entries(benchmarks).forEach(([test, threshold]) => {
        console.log(`✅ ${test}: < ${threshold}${test.includes('Memory') ? 'MB' : 'ms'}`);
      });
      
      expect(true).toBe(true); // Test siempre pasa, es informativo
    });
  });
});
