# 🚀 Tests de Performance y Carga - API Clínica

## 📋 Descripción

Esta documentación describe la suite completa de tests de performance y carga implementada para la API Clínica. Incluye tests nativos con Jest y tests avanzados con Artillery.

---

## 🧪 **TESTS NATIVOS (Jest)**

### 📊 **Performance Tests** (`__tests__/performance.test.js`)

Tests de rendimiento básico para verificar tiempos de respuesta y comportamiento bajo carga ligera.

#### **Características:**
- ✅ **Response Time Tests**: Verificación de tiempos de respuesta por endpoint
- ✅ **Concurrent Request Tests**: Manejo de requests simultáneos
- ✅ **Memory Tests**: Verificación de uso de memoria
- ✅ **Large Payload Tests**: Manejo de payloads grandes

#### **Benchmarks:**
| Endpoint | Tiempo Máximo | Casos de Uso |
|----------|---------------|--------------|
| Health Check | 100ms | Monitoreo básico |
| Auth Registration | 500ms | Registro de usuarios |
| Auth Login | 300ms | Autenticación |
| Get Pacientes | 400ms | Consultas CRUD |
| Create Paciente | 600ms | Creación de datos |

#### **Ejecutar:**
```bash
npm run test:performance
```

---

### 📈 **Load Tests** (`__tests__/load.test.js`)

Tests de carga para verificar comportamiento bajo diferentes niveles de tráfico.

#### **Niveles de Carga:**
1. **Light Load**: 20 requests concurrentes
2. **Medium Load**: 50 requests concurrentes  
3. **Heavy Load**: 100 requests concurrentes
4. **Burst Traffic**: 50 requests en 1 segundo

#### **Benchmarks:**
| Nivel | Success Rate | Avg Response Time | Min RPS |
|-------|--------------|-------------------|---------|
| Light | > 95% | < 200ms | > 10 |
| Medium | > 85% | < 1500ms | > 15 |
| Heavy | > 70% | < 3000ms | > 20 |
| Burst | > 80% | < 500ms | > 40 |

#### **Ejecutar:**
```bash
npm run test:load
```

---

### 🔥 **Stress Tests** (`__tests__/stress.test.js`)

Tests de estrés para endpoints críticos bajo carga extrema.

#### **Tests de Estrés:**
- ✅ **Auth Endpoints**: 100 requests concurrentes
- ✅ **CRUD Operations**: 75 requests concurrentes
- ✅ **Health Endpoint**: 150 requests concurrentes
- ✅ **Burst Tests**: 50 requests en 1 segundo
- ✅ **Mixed Burst**: 30 auth + 20 CRUD operations
- ✅ **Sustained Load**: 200 requests en 30 segundos

#### **Benchmarks Críticos:**
| Test | Success Rate | Avg Response Time | P95 Response Time |
|------|--------------|-------------------|-------------------|
| Auth (100 req) | > 80% | < 5000ms | < 8000ms |
| CRUD (75 req) | > 75% | < 6000ms | < 10000ms |
| Health (150 req) | > 95% | < 1000ms | < 2000ms |
| Burst (50 req) | > 90% | < 2000ms | - |

#### **Ejecutar:**
```bash
npm run test:stress
```

---

## 🎯 **TESTS AVANZADOS (Artillery)**

### 📊 **Load Test** (`performance/load-test.yml`)

Test de carga sostenida con múltiples fases y escenarios realistas.

#### **Fases:**
1. **Warm up**: 2 minutos, 5 req/s
2. **Normal load**: 5 minutos, 10 req/s
3. **Heavy load**: 3 minutos, 20 req/s
4. **Cool down**: 1 minuto, 5 req/s

#### **Escenarios:**
- **Health Checks** (40% del tráfico)
- **Authentication** (30% del tráfico)
- **CRUD Operations** (20% del tráfico)
- **Patient Creation** (10% del tráfico)

#### **Ejecutar:**
```bash
npm run perf:load
```

---

### 🔥 **Stress Test** (`performance/stress-test.yml`)

Test de estrés gradual para encontrar el límite del sistema.

#### **Fases:**
1. **Gradual warm up**: 1 minuto, 5 req/s
2. **Gradual ramp up**: 3 minutos, 10-50 req/s
3. **Sustained high load**: 5 minutos, 50 req/s
4. **Peak load spike**: 2 minutos, 100 req/s
5. **Recovery phase**: 2 minutos, 10 req/s

#### **Escenarios:**
- **Massive Health Checks** (50% del tráfico)
- **Massive Login Attempts** (25% del tráfico)
- **Massive Read Operations** (15% del tráfico)
- **Massive Creation Operations** (10% del tráfico)

#### **Ejecutar:**
```bash
npm run perf:stress
```

---

### ⚡ **Spike Test** (`performance/spike-test.yml`)

Test de picos de tráfico súbitos para verificar recuperación del sistema.

#### **Fases:**
1. **Normal load**: 2 minutos, 10 req/s
2. **Sudden spike**: 30 segundos, 100 req/s
3. **Return to normal**: 2 minutos, 10 req/s
4. **Second spike**: 30 segundos, 150 req/s
5. **Cool down**: 1 minuto, 5 req/s

#### **Escenarios:**
- **Health Check Spikes** (60% del tráfico)
- **Authentication Spikes** (25% del tráfico)
- **CRUD Spikes** (15% del tráfico)

#### **Ejecutar:**
```bash
npm run perf:spike
```

---

## 🛠️ **UTILIDADES DE PERFORMANCE**

### 📊 **Performance Monitor** (`utils/performanceMonitor.js`)

Monitor en tiempo real del rendimiento del sistema.

#### **Características:**
- ✅ **CPU Monitoring**: Uso de CPU en tiempo real
- ✅ **Memory Monitoring**: Uso de memoria del proceso y sistema
- ✅ **Request Tracking**: Métricas de requests y tiempos de respuesta
- ✅ **Error Tracking**: Seguimiento de errores por tipo
- ✅ **Load Average**: Monitoreo de carga del sistema

#### **Uso:**
```javascript
import performanceMonitor from './utils/performanceMonitor.js';

// Iniciar monitoreo
performanceMonitor.startMonitoring(5000); // Cada 5 segundos

// Obtener estadísticas
const stats = performanceMonitor.getCurrentStats();

// Generar reporte
performanceMonitor.generateReport();
```

---

### 🏆 **Benchmark Utils** (`utils/benchmarkUtils.js`)

Utilidades para benchmarking y comparación de rendimiento.

#### **Características:**
- ✅ **Benchmark Tracking**: Seguimiento de benchmarks individuales
- ✅ **Performance Comparison**: Comparación entre benchmarks
- ✅ **Report Generation**: Generación de reportes HTML y JSON
- ✅ **Result Storage**: Almacenamiento persistente de resultados

#### **Uso:**
```javascript
import benchmarkUtils from './utils/benchmarkUtils.js';

// Iniciar benchmark
benchmarkUtils.startBenchmark('API Test', 'Testing API endpoints');

// Registrar métricas
benchmarkUtils.recordRequest(responseTime, success);

// Finalizar benchmark
const result = benchmarkUtils.endBenchmark();

// Comparar benchmarks
benchmarkUtils.compareBenchmarks('Test 1', 'Test 2');
```

---

## 📋 **COMANDOS DISPONIBLES**

### 🧪 **Tests Individuales:**
```bash
# Tests nativos con Jest
npm run test:performance    # Tests de performance básicos
npm run test:load          # Tests de carga
npm run test:stress        # Tests de estrés

# Tests con Artillery
npm run perf:load          # Load test con Artillery
npm run perf:stress        # Stress test con Artillery
npm run perf:spike         # Spike test con Artillery
```

### 🚀 **Suite Completa:**
```bash
# Todos los tests nativos
npm run test:all

# Todos los tests con Artillery
npm run perf:all

# Benchmark completo
npm run benchmark:full

# Tests + Artillery
npm run benchmark
```

### 📊 **Reportes:**
```bash
# Generar reporte de Artillery
npm run perf:report

# Ejecutar suite completa con reportes
node performance/run-tests.js
```

---

## 📈 **MÉTRICAS Y BENCHMARKS**

### 🎯 **Objetivos de Performance:**

#### **Tiempos de Respuesta:**
- **Health Check**: < 100ms
- **Auth Operations**: < 500ms
- **CRUD Operations**: < 600ms
- **Complex Queries**: < 1000ms

#### **Throughput:**
- **Normal Load**: > 20 req/s
- **Heavy Load**: > 50 req/s
- **Peak Load**: > 100 req/s

#### **Success Rate:**
- **Normal Operations**: > 99%
- **Heavy Load**: > 95%
- **Stress Conditions**: > 80%

#### **System Resources:**
- **CPU Usage**: < 80%
- **Memory Usage**: < 1GB
- **Load Average**: < 4.0

---

## 🔧 **CONFIGURACIÓN**

### 📁 **Estructura de Archivos:**
```
api-clinica/
├── __tests__/
│   ├── performance.test.js    # Tests de performance nativos
│   ├── load.test.js          # Tests de carga nativos
│   └── stress.test.js        # Tests de estrés nativos
├── performance/
│   ├── load-test.yml         # Configuración Artillery Load Test
│   ├── stress-test.yml       # Configuración Artillery Stress Test
│   ├── spike-test.yml        # Configuración Artillery Spike Test
│   ├── load-processors.js    # Procesadores para Load Test
│   ├── stress-processors.js  # Procesadores para Stress Test
│   ├── spike-processors.js   # Procesadores para Spike Test
│   ├── run-tests.js          # Ejecutor de suite completa
│   └── reports/              # Directorio de reportes
├── utils/
│   ├── performanceMonitor.js # Monitor de rendimiento
│   └── benchmarkUtils.js     # Utilidades de benchmark
└── package.json              # Scripts de npm actualizados
```

### ⚙️ **Variables de Entorno:**
```env
# Para tests
NODE_ENV=test
JWT_SECRET=test-secret-key
DB_NAME=test_db

# Para Artillery
ARTILLERY_TARGET=http://localhost:3000
```

---

## 🚨 **SOLUCIÓN DE PROBLEMAS**

### ❌ **Tests Fallando:**

1. **Verificar servidor activo:**
   ```bash
   npm run dev
   ```

2. **Verificar base de datos:**
   ```bash
   npm run test:performance
   ```

3. **Verificar memoria:**
   ```bash
   # Limpiar cache de Node
   npm cache clean --force
   ```

### 🔧 **Optimizaciones Comunes:**

1. **Aumentar timeout de Jest:**
   ```javascript
   // jest.config.js
   export default {
     testTimeout: 60000 // 60 segundos
   };
   ```

2. **Ajustar límites de Artillery:**
   ```yaml
   # performance/load-test.yml
   config:
     http:
       timeout: 60
   ```

3. **Monitorear recursos:**
   ```bash
   # Durante tests
   npm run test:performance
   ```

---

## 📊 **INTERPRETACIÓN DE RESULTADOS**

### ✅ **Resultados Buenos:**
- Success Rate > 95%
- Response Time < 1000ms
- CPU Usage < 70%
- Memory Usage estable

### ⚠️ **Resultados Regulares:**
- Success Rate 80-95%
- Response Time 1000-3000ms
- CPU Usage 70-90%
- Memory Usage creciente

### ❌ **Resultados Malos:**
- Success Rate < 80%
- Response Time > 3000ms
- CPU Usage > 90%
- Memory Usage con leaks

---

## 🎯 **PRÓXIMOS PASOS**

1. **Ejecutar tests regularmente** durante desarrollo
2. **Monitorear métricas** en producción
3. **Optimizar endpoints lentos** basado en resultados
4. **Escalar infraestructura** según necesidades
5. **Implementar alertas** para degradación de performance

---

## 📞 **SOPORTE**

Para preguntas sobre los tests de performance:
- 📧 Email: desarrollo@clinica.com
- 📱 Slack: #performance-testing
- 📖 Wiki: [Performance Testing Wiki](./wiki/performance.md)

---

*Documentación actualizada: ${new Date().toISOString()}*
*Versión: 1.0.0*
