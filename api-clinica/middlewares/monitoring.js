import logger from '../utils/logger.js';

// Métricas del sistema
const metrics = {
  requests: {
    total: 0,
    success: 0,
    errors: 0,
    byEndpoint: new Map()
  },
  performance: {
    avgResponseTime: 0,
    slowQueries: 0,
    memoryUsage: 0
  },
  security: {
    blockedRequests: 0,
    failedLogins: 0,
    suspiciousActivity: 0
  }
};

// Middleware de monitoreo de requests (simplificado)
export const requestMonitoring = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  // Incrementar contador de requests
  metrics.requests.total++;
  
  // Interceptar respuesta
  res.send = function(data) {
    const responseTime = Date.now() - startTime;
    
    // Actualizar métricas básicas
    if (res.statusCode >= 400) {
      metrics.requests.errors++;
    } else {
      metrics.requests.success++;
    }
    
    // Calcular tiempo promedio de respuesta (simplificado)
    metrics.performance.avgResponseTime = 
      (metrics.performance.avgResponseTime + responseTime) / 2;
    
    // Log de requests lentos (solo si es muy lento)
    if (responseTime > 5000) { // Aumentado de 1000ms a 5000ms
      metrics.performance.slowQueries++;
      logger.warn('Very Slow Request Detected', {
        endpoint: req.path,
        responseTime,
        method: req.method
      });
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

// Health check endpoint
export const healthCheck = (req, res, next) => {
  if (req.path === '/health') {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime),
      memory: {
        used: Math.round(memUsage.heapUsed / 1024 / 1024),
        total: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      },
      metrics: {
        totalRequests: metrics.requests.total,
        successRate: Math.round((metrics.requests.success / metrics.requests.total) * 100) || 0,
        avgResponseTime: Math.round(metrics.performance.avgResponseTime),
        blockedRequests: metrics.security.blockedRequests
      }
    };
    
    return res.json(health);
  }
  next();
};

// Monitoreo de memoria (simplificado). Devuelve un middleware que llama a next()
// para no bloquear la cadena de middlewares (solo arranca el setInterval).
export const memoryMonitoring = () => {
  setInterval(() => {
    const memUsage = process.memoryUsage();
    metrics.performance.memoryUsage = memUsage.heapUsed;

    // Alerta solo si el uso de memoria es crítico
    const memoryMB = memUsage.heapUsed / 1024 / 1024;
    if (memoryMB > 1000) { // Aumentado de 500MB a 1000MB
      logger.warn('Critical Memory Usage Detected', {
        memoryUsage: Math.round(memoryMB),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024)
      });
    }
  }, parseInt(process.env.HEALTH_CHECK_INTERVAL) || 60000); // Aumentado de 30s a 60s
  return (req, res, next) => next();
};

// Log de métricas
const logMetrics = () => {
  logger.info('System Metrics', {
    requests: {
      total: metrics.requests.total,
      success: metrics.requests.success,
      errors: metrics.requests.errors,
      successRate: Math.round((metrics.requests.success / metrics.requests.total) * 100)
    },
    performance: {
      avgResponseTime: Math.round(metrics.performance.avgResponseTime),
      slowQueries: metrics.performance.slowQueries,
      memoryMB: Math.round(metrics.performance.memoryUsage / 1024 / 1024)
    },
    security: {
      blockedRequests: metrics.security.blockedRequests,
      failedLogins: metrics.security.failedLogins,
      suspiciousActivity: metrics.security.suspiciousActivity
    }
  });
};

// Incrementar métricas de seguridad
export const incrementSecurityMetric = (type) => {
  if (metrics.security[type] !== undefined) {
    metrics.security[type]++;
  }
};

// Obtener métricas actuales
export const getMetrics = () => ({ ...metrics });

// Resetear métricas
export const resetMetrics = () => {
  metrics.requests = { total: 0, success: 0, errors: 0, byEndpoint: new Map() };
  metrics.performance = { avgResponseTime: 0, slowQueries: 0, memoryUsage: 0 };
  metrics.security = { blockedRequests: 0, failedLogins: 0, suspiciousActivity: 0 };
};