// Utilidades para monitoreo de rendimiento
import os from 'os';
import process from 'process';

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      cpu: [],
      memory: [],
      requests: [],
      responseTimes: [],
      errors: [],
      startTime: Date.now()
    };
    this.isMonitoring = false;
    this.monitoringInterval = null;
  }

  // Iniciar monitoreo continuo
  startMonitoring(intervalMs = 5000) {
    if (this.isMonitoring) {
      console.warn('Performance monitoring already started');
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, intervalMs);

    console.log(`🔍 Performance monitoring started (interval: ${intervalMs}ms)`);
  }

  // Detener monitoreo
  stopMonitoring() {
    if (!this.isMonitoring) {
      console.warn('Performance monitoring not started');
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('🛑 Performance monitoring stopped');
  }

  // Recolectar métricas del sistema
  collectMetrics() {
    const timestamp = Date.now();
    
    // Métricas de CPU
    const cpuUsage = process.cpuUsage();
    const cpuPercent = this.calculateCPUUsage(cpuUsage);
    
    // Métricas de memoria
    const memUsage = process.memoryUsage();
    const systemMem = {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem()
    };

    // Métricas de carga del sistema
    const loadAvg = os.loadavg();

    this.metrics.cpu.push({
      timestamp,
      user: cpuUsage.user,
      system: cpuUsage.system,
      percent: cpuPercent
    });

    this.metrics.memory.push({
      timestamp,
      process: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external,
        arrayBuffers: memUsage.arrayBuffers
      },
      system: systemMem
    });

    this.metrics.loadAverage = {
      timestamp,
      load1min: loadAvg[0],
      load5min: loadAvg[1],
      load15min: loadAvg[2]
    };

    // Mantener solo las últimas 100 mediciones
    if (this.metrics.cpu.length > 100) {
      this.metrics.cpu.shift();
    }
    if (this.metrics.memory.length > 100) {
      this.metrics.memory.shift();
    }
  }

  // Calcular uso de CPU
  calculateCPUUsage(cpuUsage) {
    const totalTime = cpuUsage.user + cpuUsage.system;
    const elapsedTime = Date.now() - (this.lastCPUTime || Date.now());
    const cpuPercent = (totalTime / elapsedTime) * 100;
    
    this.lastCPUTime = Date.now();
    return Math.min(cpuPercent, 100);
  }

  // Registrar request
  recordRequest(responseTime, statusCode, endpoint = 'unknown') {
    const request = {
      timestamp: Date.now(),
      responseTime,
      statusCode,
      endpoint
    };

    this.metrics.requests.push(request);
    this.metrics.responseTimes.push(responseTime);

    // Mantener solo las últimas 1000 requests
    if (this.metrics.requests.length > 1000) {
      this.metrics.requests.shift();
    }
    if (this.metrics.responseTimes.length > 1000) {
      this.metrics.responseTimes.shift();
    }

    // Clasificar por estado
    if (statusCode >= 500) {
      this.recordError('server_error', endpoint);
    } else if (statusCode >= 400) {
      this.recordError('client_error', endpoint);
    } else if (statusCode >= 200 && statusCode < 300) {
      this.recordSuccess(endpoint);
    }
  }

  // Registrar error
  recordError(type, endpoint = 'unknown') {
    this.metrics.errors.push({
      timestamp: Date.now(),
      type,
      endpoint
    });

    // Mantener solo los últimos 500 errores
    if (this.metrics.errors.length > 500) {
      this.metrics.errors.shift();
    }
  }

  // Registrar éxito
  recordSuccess(endpoint = 'unknown') {
    // Esta función puede extenderse para trackear éxitos específicos
  }

  // Obtener estadísticas actuales
  getCurrentStats() {
    const now = Date.now();
    const uptime = now - this.metrics.startTime;

    return {
      uptime: {
        total: uptime,
        formatted: this.formatUptime(uptime)
      },
      cpu: this.getCPUStats(),
      memory: this.getMemoryStats(),
      requests: this.getRequestStats(),
      errors: this.getErrorStats(),
      loadAverage: this.metrics.loadAverage
    };
  }

  // Estadísticas de CPU
  getCPUStats() {
    if (this.metrics.cpu.length === 0) return null;

    const latest = this.metrics.cpu[this.metrics.cpu.length - 1];
    const avg = this.metrics.cpu.reduce((sum, cpu) => sum + cpu.percent, 0) / this.metrics.cpu.length;
    const max = Math.max(...this.metrics.cpu.map(cpu => cpu.percent));

    return {
      current: latest.percent,
      average: avg,
      maximum: max,
      cores: os.cpus().length
    };
  }

  // Estadísticas de memoria
  getMemoryStats() {
    if (this.metrics.memory.length === 0) return null;

    const latest = this.metrics.memory[this.metrics.memory.length - 1];
    const heapUsedMB = latest.process.heapUsed / 1024 / 1024;
    const heapTotalMB = latest.process.heapTotal / 1024 / 1024;
    const systemUsedMB = latest.system.used / 1024 / 1024;
    const systemTotalMB = latest.system.total / 1024 / 1024;

    return {
      process: {
        heapUsed: heapUsedMB,
        heapTotal: heapTotalMB,
        heapPercent: (heapUsedMB / heapTotalMB) * 100,
        rss: latest.process.rss / 1024 / 1024
      },
      system: {
        used: systemUsedMB,
        total: systemTotalMB,
        free: latest.system.free / 1024 / 1024,
        percent: (systemUsedMB / systemTotalMB) * 100
      }
    };
  }

  // Estadísticas de requests
  getRequestStats() {
    if (this.metrics.requests.length === 0) return null;

    const now = Date.now();
    const lastMinute = this.metrics.requests.filter(req => now - req.timestamp < 60000);
    const responseTimes = this.metrics.responseTimes;

    return {
      total: this.metrics.requests.length,
      lastMinute: lastMinute.length,
      responseTime: {
        average: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
        median: this.getMedian(responseTimes),
        p95: this.getPercentile(responseTimes, 95),
        p99: this.getPercentile(responseTimes, 99),
        min: Math.min(...responseTimes),
        max: Math.max(...responseTimes)
      },
      statusCodes: this.getStatusCodeStats()
    };
  }

  // Estadísticas de errores
  getErrorStats() {
    if (this.metrics.errors.length === 0) return null;

    const now = Date.now();
    const lastHour = this.metrics.errors.filter(err => now - err.timestamp < 3600000);
    const errorsByType = {};

    this.metrics.errors.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
    });

    return {
      total: this.metrics.errors.length,
      lastHour: lastHour.length,
      byType: errorsByType,
      recent: this.metrics.errors.slice(-10) // Últimos 10 errores
    };
  }

  // Estadísticas de códigos de estado
  getStatusCodeStats() {
    const stats = {};
    this.metrics.requests.forEach(req => {
      const statusClass = Math.floor(req.statusCode / 100) * 100;
      stats[statusClass] = (stats[statusClass] || 0) + 1;
    });
    return stats;
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

  // Formatear tiempo de actividad
  formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  // Generar reporte de rendimiento
  generateReport() {
    const stats = this.getCurrentStats();
    
    console.log('\n📊 PERFORMANCE REPORT');
    console.log('====================');
    
    // Uptime
    console.log(`⏱️  Uptime: ${stats.uptime.formatted}`);
    
    // CPU
    if (stats.cpu) {
      console.log(`🖥️  CPU Usage: ${stats.cpu.current.toFixed(1)}% (avg: ${stats.cpu.average.toFixed(1)}%, max: ${stats.cpu.maximum.toFixed(1)}%)`);
      console.log(`🔧 CPU Cores: ${stats.cpu.cores}`);
    }
    
    // Memory
    if (stats.memory) {
      console.log(`💾 Memory - Process: ${stats.memory.process.heapUsed.toFixed(1)}MB/${stats.memory.process.heapTotal.toFixed(1)}MB (${stats.memory.process.heapPercent.toFixed(1)}%)`);
      console.log(`💾 Memory - System: ${stats.memory.system.used.toFixed(1)}MB/${stats.memory.system.total.toFixed(1)}MB (${stats.memory.system.percent.toFixed(1)}%)`);
    }
    
    // Requests
    if (stats.requests) {
      console.log(`📡 Requests: ${stats.requests.total} total, ${stats.requests.lastMinute} last minute`);
      console.log(`⚡ Response Time: avg ${stats.requests.responseTime.average.toFixed(1)}ms, p95 ${stats.requests.responseTime.p95}ms`);
      console.log(`📈 Status Codes:`, stats.requests.statusCodes);
    }
    
    // Errors
    if (stats.errors) {
      console.log(`❌ Errors: ${stats.errors.total} total, ${stats.errors.lastHour} last hour`);
      if (Object.keys(stats.errors.byType).length > 0) {
        console.log(`🔍 Error Types:`, stats.errors.byType);
      }
    }
    
    // Load Average
    if (stats.loadAverage) {
      console.log(`⚖️  Load Average: ${stats.loadAverage.load1min.toFixed(2)} (1min), ${stats.loadAverage.load5min.toFixed(2)} (5min), ${stats.loadAverage.load15min.toFixed(2)} (15min)`);
    }
    
    console.log('====================\n');
    
    return stats;
  }

  // Limpiar métricas antiguas
  cleanup(olderThanMs = 3600000) { // 1 hora por defecto
    const cutoff = Date.now() - olderThanMs;
    
    this.metrics.requests = this.metrics.requests.filter(req => req.timestamp > cutoff);
    this.metrics.errors = this.metrics.errors.filter(err => err.timestamp > cutoff);
    this.metrics.cpu = this.metrics.cpu.filter(cpu => cpu.timestamp > cutoff);
    this.metrics.memory = this.metrics.memory.filter(mem => mem.timestamp > cutoff);
  }
}

// Instancia singleton
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;

// Función helper para middleware de Express
export function performanceMiddleware(req, res, next) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    performanceMonitor.recordRequest(responseTime, res.statusCode, req.path);
  });
  
  next();
}
