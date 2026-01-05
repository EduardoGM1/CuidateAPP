// Procesadores para Stress Testing con Artillery
import jwt from 'jsonwebtoken';

// Generar token de autenticación para stress tests
export function generateAuthToken(context, events, done) {
  try {
    const token = jwt.sign(
      { 
        id: Math.floor(Math.random() * 1000), 
        email: `stresstest.${Date.now()}@test.com`, 
        rol: 'Admin' 
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
    
    context.vars.token = token;
    done();
  } catch (error) {
    console.error('Error generating stress test auth token:', error);
    done(error);
  }
}

// Generar datos de paciente para stress tests
export function generatePatientData(context, events, done) {
  const timestamp = Date.now();
  const randomId = Math.floor(Math.random() * 100000);
  
  const pacienteData = {
    nombre: `StressTest${randomId}`,
    apellido_paterno: 'User',
    apellido_materno: 'Stress',
    fecha_nacimiento: '1990-01-01',
    curp: `STTT${String(randomId).padStart(4, '0')}0101HDFRRN01`,
    sexo: Math.random() > 0.5 ? 'Hombre' : 'Mujer',
    numero_celular: `555${String(randomId).padStart(7, '0')}`,
    direccion: `Calle Stress Test ${randomId}`,
    localidad: 'Ciudad Stress',
    institucion_salud: ['IMSS', 'Bienestar', 'ISSSTE', 'Particular'][Math.floor(Math.random() * 4)]
  };
  
  context.vars.pacienteData = pacienteData;
  done();
}

// Función para generar strings aleatorios
export function generateRandomString(context, events, done) {
  const length = Math.floor(Math.random() * 20) + 5;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  context.vars.randomString = result;
  done();
}

// Función para simular condiciones de estrés
export function simulateStressConditions(context, events, done) {
  // Aumentar probabilidad de errores bajo estrés
  const errorProbability = Math.random();
  
  if (errorProbability < 0.1) { // 10% de probabilidad de simular error
    context.vars.simulateError = true;
  } else {
    context.vars.simulateError = false;
  }
  
  // Simular latencia variable bajo estrés
  context.vars.stressLatency = Math.random() * 5000; // 0-5 segundos
  
  done();
}

// Función para monitorear degradación de performance
export function monitorPerformanceDegradation(requestParams, response, context, events, done) {
  const responseTime = response.timings.response;
  
  // Clasificar respuesta por tiempo
  if (responseTime < 1000) {
    events.emit('counter', 'performance.excellent', 1);
  } else if (responseTime < 3000) {
    events.emit('counter', 'performance.good', 1);
  } else if (responseTime < 5000) {
    events.emit('counter', 'performance.poor', 1);
  } else {
    events.emit('counter', 'performance.critical', 1);
  }
  
  // Monitorear errores bajo estrés
  if (response.statusCode >= 500) {
    events.emit('counter', 'stress.server_error', 1);
  } else if (response.statusCode === 429) {
    events.emit('counter', 'stress.rate_limited', 1);
  } else if (response.statusCode >= 400) {
    events.emit('counter', 'stress.client_error', 1);
  }
  
  done();
}

// Función para simular recuperación después de estrés
export function simulateRecovery(context, events, done) {
  const currentTime = Date.now();
  const testStartTime = context.vars.testStartTime || currentTime;
  const elapsedTime = currentTime - testStartTime;
  
  // Durante la fase de recuperación (últimos 2 minutos)
  if (elapsedTime > 600000) { // 10 minutos
    // Reducir probabilidad de errores
    context.vars.recoveryMode = true;
    context.vars.errorProbability = 0.02; // 2% en recuperación
  } else {
    context.vars.recoveryMode = false;
    context.vars.errorProbability = 0.1; // 10% bajo estrés
  }
  
  done();
}

// Función para generar carga extrema
export function generateExtremeLoad(context, events, done) {
  // Generar múltiples requests simultáneos
  const concurrentRequests = Math.floor(Math.random() * 5) + 1;
  context.vars.concurrentRequests = concurrentRequests;
  
  // Generar payload grande ocasionalmente
  if (Math.random() < 0.2) { // 20% de probabilidad
    const largePayload = 'A'.repeat(10000); // 10KB
    context.vars.largePayload = largePayload;
  }
  
  done();
}

// Función para simular fallos de red
export function simulateNetworkFailures(context, events, done) {
  const failureTypes = ['timeout', 'connection_refused', 'dns_error'];
  const randomFailure = failureTypes[Math.floor(Math.random() * failureTypes.length)];
  
  if (Math.random() < 0.05) { // 5% de probabilidad de fallo de red
    context.vars.networkFailure = randomFailure;
  } else {
    context.vars.networkFailure = null;
  }
  
  done();
}

// Función para monitorear uso de memoria
export function monitorMemoryUsage(context, events, done) {
  const memUsage = process.memoryUsage();
  
  // Emitir métricas de memoria
  events.emit('histogram', 'memory.heapUsed', memUsage.heapUsed);
  events.emit('histogram', 'memory.heapTotal', memUsage.heapTotal);
  events.emit('histogram', 'memory.external', memUsage.external);
  events.emit('histogram', 'memory.rss', memUsage.rss);
  
  // Alertar si el uso de memoria es alto
  if (memUsage.heapUsed > 100 * 1024 * 1024) { // 100MB
    events.emit('counter', 'memory.high_usage', 1);
  }
  
  done();
}

// Función para simular usuarios concurrentes reales
export function simulateConcurrentUsers(context, events, done) {
  const userId = Math.floor(Math.random() * 1000);
  context.vars.userId = userId;
  
  // Simular comportamiento específico por usuario
  if (userId % 10 === 0) {
    context.vars.userType = 'heavy_user';
    context.vars.requestFrequency = 'high';
  } else if (userId % 5 === 0) {
    context.vars.userType = 'moderate_user';
    context.vars.requestFrequency = 'medium';
  } else {
    context.vars.userType = 'light_user';
    context.vars.requestFrequency = 'low';
  }
  
  done();
}
