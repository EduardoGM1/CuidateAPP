// Procesadores para Spike Testing con Artillery
import jwt from 'jsonwebtoken';

// Generar token de autenticación para spike tests
export function generateAuthToken(context, events, done) {
  try {
    const token = jwt.sign(
      { 
        id: Math.floor(Math.random() * 100), 
        email: `spiketest.${Date.now()}@test.com`, 
        rol: 'Admin' 
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '30m' }
    );
    
    context.vars.token = token;
    done();
  } catch (error) {
    console.error('Error generating spike test auth token:', error);
    done(error);
  }
}

// Función para detectar inicio de spike
export function detectSpikeStart(context, events, done) {
  const currentTime = Date.now();
  const testStartTime = context.vars.testStartTime || currentTime;
  const elapsedTime = currentTime - testStartTime;
  
  // Detectar si estamos en fase de spike (2-2.5 minutos desde inicio)
  if (elapsedTime >= 120000 && elapsedTime <= 150000) {
    context.vars.inSpikePhase = true;
    context.vars.spikeIntensity = 'high';
  } else if (elapsedTime >= 240000 && elapsedTime <= 270000) {
    context.vars.inSpikePhase = true;
    context.vars.spikeIntensity = 'extreme';
  } else {
    context.vars.inSpikePhase = false;
    context.vars.spikeIntensity = 'normal';
  }
  
  done();
}

// Función para ajustar comportamiento durante spike
export function adjustBehaviorForSpike(context, events, done) {
  if (context.vars.inSpikePhase) {
    // Durante spike, reducir tiempo de espera
    context.vars.thinkTime = Math.random() * 0.2; // 0-0.2 segundos
    
    // Aumentar probabilidad de requests simples
    if (Math.random() < 0.8) {
      context.vars.requestType = 'simple'; // Health checks
    } else {
      context.vars.requestType = 'complex'; // CRUD operations
    }
  } else {
    // Fuera de spike, comportamiento normal
    context.vars.thinkTime = Math.random() * 2 + 1; // 1-3 segundos
    context.vars.requestType = 'normal';
  }
  
  done();
}

// Función para monitorear comportamiento durante spike
export function monitorSpikeBehavior(requestParams, response, context, events, done) {
  const responseTime = response.timings.response;
  
  if (context.vars.inSpikePhase) {
    // Métricas específicas para spike
    events.emit('counter', 'spike.request', 1);
    events.emit('histogram', 'spike.response_time', responseTime);
    
    if (response.statusCode >= 400) {
      events.emit('counter', 'spike.error', 1);
      
      // Clasificar tipo de error durante spike
      if (response.statusCode === 429) {
        events.emit('counter', 'spike.rate_limited', 1);
      } else if (response.statusCode >= 500) {
        events.emit('counter', 'spike.server_error', 1);
      }
    } else {
      events.emit('counter', 'spike.success', 1);
    }
    
    // Medir degradación durante spike
    if (responseTime > 1000) {
      events.emit('counter', 'spike.slow_response', 1);
    }
  } else {
    // Métricas normales
    events.emit('counter', 'normal.request', 1);
    events.emit('histogram', 'normal.response_time', responseTime);
  }
  
  done();
}

// Función para simular recuperación después de spike
export function simulateSpikeRecovery(context, events, done) {
  const currentTime = Date.now();
  const testStartTime = context.vars.testStartTime || currentTime;
  const elapsedTime = currentTime - testStartTime;
  
  // Fase de recuperación (2.5-4.5 minutos)
  if (elapsedTime >= 150000 && elapsedTime <= 270000) {
    context.vars.inRecoveryPhase = true;
    
    // Simular recuperación gradual
    const recoveryProgress = (elapsedTime - 150000) / 120000; // 0-1
    
    if (recoveryProgress < 0.5) {
      context.vars.recoveryStage = 'early'; // Recuperación temprana
      context.vars.errorRate = 0.15; // 15% error rate
    } else {
      context.vars.recoveryStage = 'late'; // Recuperación tardía
      context.vars.errorRate = 0.05; // 5% error rate
    }
  } else {
    context.vars.inRecoveryPhase = false;
    context.vars.errorRate = 0.02; // 2% error rate normal
  }
  
  done();
}

// Función para generar carga variable
export function generateVariableLoad(context, events, done) {
  const baseLoad = 10;
  const timeVariation = Math.sin(Date.now() / 10000) * 5; // Variación sinusoidal
  const randomVariation = (Math.random() - 0.5) * 10; // Variación aleatoria
  
  context.vars.loadVariation = baseLoad + timeVariation + randomVariation;
  
  // Ajustar comportamiento basado en variación de carga
  if (context.vars.loadVariation > 15) {
    context.vars.loadLevel = 'high';
    context.vars.requestComplexity = 'simple';
  } else if (context.vars.loadVariation > 10) {
    context.vars.loadLevel = 'medium';
    context.vars.requestComplexity = 'mixed';
  } else {
    context.vars.loadLevel = 'low';
    context.vars.requestComplexity = 'complex';
  }
  
  done();
}

// Función para monitorear estabilidad del sistema
export function monitorSystemStability(requestParams, response, context, events, done) {
  const responseTime = response.timings.response;
  const statusCode = response.statusCode;
  
  // Métricas de estabilidad
  if (responseTime < 500) {
    events.emit('counter', 'stability.excellent', 1);
  } else if (responseTime < 1000) {
    events.emit('counter', 'stability.good', 1);
  } else if (responseTime < 2000) {
    events.emit('counter', 'stability.degraded', 1);
  } else {
    events.emit('counter', 'stability.poor', 1);
  }
  
  // Monitorear consistencia de respuestas
  if (statusCode >= 200 && statusCode < 300) {
    events.emit('counter', 'consistency.successful', 1);
  } else {
    events.emit('counter', 'consistency.failed', 1);
  }
  
  // Detectar patrones de fallo
  const currentTime = Date.now();
  const lastRequestTime = context.vars.lastRequestTime || currentTime;
  const timeBetweenRequests = currentTime - lastRequestTime;
  
  context.vars.lastRequestTime = currentTime;
  events.emit('histogram', 'request_interval', timeBetweenRequests);
  
  done();
}

// Función para simular diferentes tipos de spikes
export function simulateSpikeTypes(context, events, done) {
  const spikeTypes = ['gradual', 'sudden', 'sustained', 'burst'];
  const currentTime = Date.now();
  const testStartTime = context.vars.testStartTime || currentTime;
  const elapsedTime = currentTime - testStartTime;
  
  // Determinar tipo de spike basado en tiempo
  if (elapsedTime >= 120000 && elapsedTime <= 150000) {
    context.vars.spikeType = 'sudden';
    context.vars.spikeIntensity = 100;
  } else if (elapsedTime >= 240000 && elapsedTime <= 270000) {
    context.vars.spikeType = 'burst';
    context.vars.spikeIntensity = 150;
  } else {
    context.vars.spikeType = 'normal';
    context.vars.spikeIntensity = 10;
  }
  
  done();
}
