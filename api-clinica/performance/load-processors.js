// Procesadores para Load Testing con Artillery
import jwt from 'jsonwebtoken';

// Generar token de autenticación para tests
export function generateAuthToken(context, events, done) {
  try {
    const token = jwt.sign(
      { 
        id: 1, 
        email: 'loadtest.admin@test.com', 
        rol: 'Admin' 
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
    
    context.vars.token = token;
    done();
  } catch (error) {
    console.error('Error generating auth token:', error);
    done(error);
  }
}

// Generar datos de paciente para tests
export function generatePatientData(context, events, done) {
  const timestamp = Date.now();
  const randomId = Math.floor(Math.random() * 10000);
  
  const pacienteData = {
    nombre: `LoadTest${randomId}`,
    apellido_paterno: 'User',
    apellido_materno: 'Test',
    fecha_nacimiento: '1990-01-01',
    curp: `LUTT${String(randomId).padStart(4, '0')}0101HDFRRN01`,
    sexo: 'Hombre',
    numero_celular: `555${String(randomId).padStart(7, '0')}`,
    direccion: 'Calle Load Test 123',
    localidad: 'Ciudad Test',
    institucion_salud: 'IMSS'
  };
  
  context.vars.pacienteData = pacienteData;
  done();
}

// Procesar respuesta y extraer métricas
export function processResponse(requestParams, response, context, events, done) {
  // Extraer métricas de respuesta
  const responseTime = response.timings.response;
  const statusCode = response.statusCode;
  
  // Registrar métricas personalizadas
  events.emit('counter', 'response.time', responseTime);
  events.emit('counter', 'response.status.' + statusCode, 1);
  
  // Verificar si la respuesta fue exitosa
  if (statusCode >= 200 && statusCode < 400) {
    events.emit('counter', 'response.success', 1);
  } else {
    events.emit('counter', 'response.error', 1);
  }
  
  done();
}

// Función para generar datos de prueba únicos
export function generateUniqueTestData(context, events, done) {
  const timestamp = Date.now();
  const randomId = Math.floor(Math.random() * 100000);
  
  context.vars.timestamp = timestamp;
  context.vars.randomId = randomId;
  context.vars.uniqueEmail = `loadtest.${timestamp}.${randomId}@test.com`;
  context.vars.uniqueCurp = `LUTT${String(randomId).padStart(4, '0')}0101HDFRRN01`;
  context.vars.uniquePhone = `555${String(randomId).padStart(7, '0')}`;
  
  done();
}

// Función para simular comportamiento de usuario real
export function simulateUserBehavior(context, events, done) {
  // Tiempo de espera aleatorio entre 1-5 segundos
  const waitTime = Math.random() * 4000 + 1000;
  
  setTimeout(() => {
    done();
  }, waitTime);
}

// Función para manejar errores de carga
export function handleLoadErrors(requestParams, response, context, events, done) {
  if (response.statusCode >= 400) {
    console.log(`Load test error: ${response.statusCode} - ${response.body}`);
    
    // Emitir métrica de error
    events.emit('counter', 'load.error', 1);
    
    // En caso de errores 5xx, intentar reintento
    if (response.statusCode >= 500) {
      events.emit('counter', 'server.error', 1);
    }
  }
  
  done();
}

// Función para medir latencia de red
export function measureNetworkLatency(requestParams, response, context, events, done) {
  const timings = response.timings;
  
  if (timings) {
    events.emit('histogram', 'network.dns', timings.dns);
    events.emit('histogram', 'network.tcp', timings.tcp);
    events.emit('histogram', 'network.tls', timings.tls);
    events.emit('histogram', 'network.firstByte', timings.firstByte);
    events.emit('histogram', 'network.download', timings.download);
    events.emit('histogram', 'network.total', timings.total);
  }
  
  done();
}

// Función para simular diferentes tipos de usuarios
export function simulateUserTypes(context, events, done) {
  const userTypes = ['admin', 'doctor', 'paciente'];
  const selectedType = userTypes[Math.floor(Math.random() * userTypes.length)];
  
  context.vars.userType = selectedType;
  
  // Configurar datos específicos por tipo de usuario
  switch (selectedType) {
    case 'admin':
      context.vars.userEmail = 'admin@loadtest.com';
      context.vars.userRole = 'Admin';
      break;
    case 'doctor':
      context.vars.userEmail = 'doctor@loadtest.com';
      context.vars.userRole = 'Doctor';
      break;
    case 'paciente':
      context.vars.userEmail = 'paciente@loadtest.com';
      context.vars.userRole = 'Paciente';
      break;
  }
  
  done();
}

// Función para generar carga realista
export function generateRealisticLoad(context, events, done) {
  // Simular patrones de uso reales
  const hour = new Date().getHours();
  
  // Más carga durante horas de trabajo (9-17)
  if (hour >= 9 && hour <= 17) {
    context.vars.loadMultiplier = 1.5;
  } else {
    context.vars.loadMultiplier = 0.7;
  }
  
  // Más carga los lunes y viernes
  const day = new Date().getDay();
  if (day === 1 || day === 5) { // Lunes o viernes
    context.vars.loadMultiplier *= 1.2;
  }
  
  done();
}
