// Middleware específico para configuración de tests
export const testModeHandler = (req, res, next) => {
  // Detectar modo de test
  if (process.env.NODE_ENV === 'test' || req.get('X-Test-Mode') === 'true') {
    // Configurar headers específicos para tests
    res.set({
      'X-Test-Environment': 'true',
      'X-Rate-Limit-Skip': 'true',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });
    
    // Marcar request como test para otros middlewares
    req.isTestMode = true;
  }
  
  next();
};

// Middleware para health check
export const healthCheck = (req, res, next) => {
  if (req.path === '/health' || req.path === '/api/health') {
    return res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    });
  }
  next();
};

// Middleware para configurar headers de seguridad específicos por endpoint
export const endpointSecurityHeaders = (options = {}) => {
  return (req, res, next) => {
    // Headers base de seguridad médica
    const baseHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Medical-API': 'v1.0',
      'X-HIPAA-Compliant': 'true'
    };
    
    // Headers específicos por tipo de endpoint
    if (req.path.includes('/auth')) {
      baseHeaders['X-Auth-Required'] = 'true';
      baseHeaders['X-Rate-Limit-Strict'] = 'true';
    }
    
    if (req.path.includes('/pacientes') || req.path.includes('/doctores')) {
      baseHeaders['X-PHI-Protected'] = 'true';
      baseHeaders['X-Audit-Required'] = 'true';
    }
    
    // Aplicar headers personalizados
    Object.assign(baseHeaders, options.customHeaders || {});
    
    res.set(baseHeaders);
    next();
  };
};

// Middleware para logging de seguridad mejorado
export const securityLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log de request entrante
  if (process.env.NODE_ENV !== 'test') {
    console.log(`🔒 [${new Date().toISOString()}] ${req.method} ${req.path} - IP: ${req.ip} - User: ${req.user?.id || 'anonymous'}`);
  }
  
  // Override del res.json para logging de respuestas
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - startTime;
    
    if (process.env.NODE_ENV !== 'test' && res.statusCode >= 400) {
      console.warn(`⚠️  [${new Date().toISOString()}] Response ${res.statusCode} - ${req.method} ${req.path} - ${duration}ms`);
    }
    
    return originalJson.call(this, data);
  };
  
  next();
};