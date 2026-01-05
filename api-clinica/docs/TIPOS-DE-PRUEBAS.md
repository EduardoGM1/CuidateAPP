# Tipos de Pruebas para Verificar Funciones, Métodos y Endpoints

## 📋 Índice

1. [Pruebas Unitarias](#1-pruebas-unitarias)
2. [Pruebas de Integración](#2-pruebas-de-integración)
3. [Pruebas de Endpoints (API Testing)](#3-pruebas-de-endpoints-api-testing)
4. [Pruebas de Validación de Datos](#4-pruebas-de-validación-de-datos)
5. [Pruebas de Contrato (Contract Testing)](#5-pruebas-de-contrato-contract-testing)
6. [Pruebas de Flujo Completo (E2E)](#6-pruebas-de-flujo-completo-e2e)
7. [Pruebas de Rendimiento](#7-pruebas-de-rendimiento)
8. [Pruebas de Seguridad](#8-pruebas-de-seguridad)

---

## 1. Pruebas Unitarias

**Objetivo**: Verificar que funciones y métodos individuales funcionen correctamente en aislamiento.

### Características:
- Prueban una función/método específico
- No dependen de servicios externos
- Rápidas de ejecutar
- Usan mocks para dependencias

### Ejemplo:

```javascript
// __tests__/services/exampleService.test.js
import { calculateAge, formatDate } from '../../services/exampleService.js';

describe('calculateAge', () => {
  test('debe calcular la edad correctamente', () => {
    const birthDate = '1990-01-01';
    const age = calculateAge(birthDate);
    expect(age).toBeGreaterThan(30);
    expect(typeof age).toBe('number');
  });

  test('debe manejar fechas inválidas', () => {
    expect(() => calculateAge('invalid')).toThrow();
  });
});
```

### Qué verificar:
- ✅ Lógica de negocio
- ✅ Validaciones
- ✅ Transformaciones de datos
- ✅ Manejo de errores
- ✅ Casos límite

---

## 2. Pruebas de Integración

**Objetivo**: Verificar que múltiples componentes trabajen juntos correctamente.

### Características:
- Prueban la interacción entre componentes
- Pueden usar base de datos real o en memoria
- Más lentas que las unitarias
- Verifican flujos completos

### Ejemplo:

```javascript
// __tests__/integration/paciente-service.test.js
import { Paciente, Cita } from '../../models/associations.js';
import pacienteService from '../../services/pacienteService.js';

describe('Integración: Paciente Service', () => {
  test('debe crear paciente y asociar cita', async () => {
    const paciente = await Paciente.create({
      nombre: 'Test',
      apellido_paterno: 'Integration',
      fecha_nacimiento: '1990-01-01'
    });

    const cita = await Cita.create({
      id_paciente: paciente.id_paciente,
      fecha_cita: '2025-12-01',
      motivo: 'Consulta'
    });

    const pacienteConCitas = await pacienteService.getPacienteWithCitas(paciente.id_paciente);
    
    expect(pacienteConCitas.citas).toHaveLength(1);
    expect(pacienteConCitas.citas[0].id_cita).toBe(cita.id_cita);
  });
});
```

### Qué verificar:
- ✅ Interacción entre servicios
- ✅ Operaciones de base de datos
- ✅ Transacciones
- ✅ Relaciones entre modelos

---

## 3. Pruebas de Endpoints (API Testing)

**Objetivo**: Verificar que los endpoints HTTP funcionen correctamente y reciban datos del frontend.

### Características:
- Prueban endpoints completos
- Simulan requests HTTP reales
- Verifican respuestas HTTP
- Validan formatos de datos

### Ejemplo:

```javascript
// __tests__/api/paciente-endpoints.test.js
import request from 'supertest';
import { app } from '../../index.js';

describe('API: Endpoints de Paciente', () => {
  let token;
  let pacienteId;

  beforeAll(async () => {
    // Login y obtener token
    const login = await request(app)
      .post('/api/auth-unified/login-doctor-admin')
      .send({ email: 'doctor@test.com', password: 'Test123!' });
    token = login.body.token;
  });

  describe('POST /api/pacientes/:id/signos-vitales', () => {
    test('debe aceptar datos del frontend y guardarlos correctamente', async () => {
      // Datos como los envía el frontend (pueden ser strings o números)
      const datosFrontend = {
        presion_sistolica: '120',  // String desde frontend
        presion_diastolica: 80,     // Número desde frontend
        frecuencia_cardiaca: '75',  // String
        temperatura: 36.5,          // Número
        peso: '70',                 // String
        talla: 170                  // Número
      };

      const response = await request(app)
        .post(`/api/pacientes/${pacienteId}/signos-vitales`)
        .set('Authorization', `Bearer ${token}`)
        .send(datosFrontend);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id_signo_vital');
      
      // Verificar que los datos se guardaron correctamente (convertidos a números)
      expect(typeof response.body.data.presion_sistolica).toBe('number');
      expect(response.body.data.presion_sistolica).toBe(120);
      expect(response.body.data.presion_diastolica).toBe(80);
    });

    test('debe rechazar datos inválidos', async () => {
      const datosInvalidos = {
        presion_sistolica: 'no-es-un-numero',
        presion_diastolica: -10
      };

      const response = await request(app)
        .post(`/api/pacientes/${pacienteId}/signos-vitales`)
        .set('Authorization', `Bearer ${token}`)
        .send(datosInvalidos);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });
});
```

### Qué verificar:
- ✅ Status codes correctos (200, 201, 400, 401, 404, 500)
- ✅ Estructura de respuesta
- ✅ Tipos de datos (conversión string → number)
- ✅ Validaciones de entrada
- ✅ Autenticación y autorización
- ✅ Manejo de errores

---

## 4. Pruebas de Validación de Datos

**Objetivo**: Verificar que los datos del frontend sean validados y transformados correctamente.

### Características:
- Prueban validaciones específicas
- Verifican transformaciones de datos
- Validan formatos y tipos
- Prueban casos límite

### Ejemplo:

```javascript
// __tests__/validation/data-validation.test.js
import { validateSignosVitales, normalizeSignosVitales } from '../../utils/validators.js';

describe('Validación de Datos del Frontend', () => {
  describe('normalizeSignosVitales', () => {
    test('debe convertir strings a números', () => {
      const datosFrontend = {
        presion_sistolica: '120',
        presion_diastolica: '80',
        frecuencia_cardiaca: '75'
      };

      const normalizados = normalizeSignosVitales(datosFrontend);
      
      expect(typeof normalizados.presion_sistolica).toBe('number');
      expect(normalizados.presion_sistolica).toBe(120);
      expect(typeof normalizados.presion_diastolica).toBe('number');
    });

    test('debe mantener números como números', () => {
      const datosFrontend = {
        presion_sistolica: 120,
        presion_diastolica: 80
      };

      const normalizados = normalizeSignosVitales(datosFrontend);
      
      expect(typeof normalizados.presion_sistolica).toBe('number');
      expect(normalizados.presion_sistolica).toBe(120);
    });

    test('debe rechazar valores inválidos', () => {
      const datosInvalidos = {
        presion_sistolica: 'abc',
        presion_diastolica: -10
      };

      expect(() => validateSignosVitales(datosInvalidos)).toThrow();
    });
  });
});
```

### Qué verificar:
- ✅ Conversión de tipos (string → number, etc.)
- ✅ Validación de rangos
- ✅ Validación de formatos (fechas, emails, etc.)
- ✅ Campos requeridos
- ✅ Valores nulos/undefined
- ✅ Sanitización de datos

---

## 5. Pruebas de Contrato (Contract Testing)

**Objetivo**: Verificar que el contrato entre frontend y backend se mantenga.

### Características:
- Verifican estructura de request/response
- Validan esquemas JSON
- Aseguran compatibilidad entre versiones
- Previenen breaking changes

### Ejemplo:

```javascript
// __tests__/contract/api-contract.test.js
import Ajv from 'ajv';

const signosVitalesSchema = {
  type: 'object',
  required: ['presion_sistolica', 'presion_diastolica'],
  properties: {
    presion_sistolica: { type: 'number', minimum: 50, maximum: 250 },
    presion_diastolica: { type: 'number', minimum: 30, maximum: 150 },
    frecuencia_cardiaca: { type: 'number', minimum: 40, maximum: 200 },
    temperatura: { type: 'number', minimum: 35, maximum: 42 }
  }
};

describe('Contrato API: Signos Vitales', () => {
  const ajv = new Ajv();
  const validate = ajv.compile(signosVitalesSchema);

  test('la respuesta debe cumplir con el esquema', async () => {
    const response = await request(app)
      .get(`/api/pacientes/${pacienteId}/signos-vitales`)
      .set('Authorization', `Bearer ${token}`);

    const isValid = validate(response.body.data[0]);
    expect(isValid).toBe(true);
    if (!isValid) {
      console.log('Errores de validación:', validate.errors);
    }
  });
});
```

### Qué verificar:
- ✅ Esquemas JSON (JSON Schema)
- ✅ Estructura de objetos
- ✅ Tipos de campos
- ✅ Campos requeridos vs opcionales
- ✅ Valores por defecto

---

## 6. Pruebas de Flujo Completo (E2E)

**Objetivo**: Verificar flujos completos desde frontend hasta backend.

### Características:
- Simulan flujos de usuario completos
- Prueban múltiples endpoints en secuencia
- Verifican estado de la base de datos
- Más lentas pero más realistas

### Ejemplo:

```javascript
// __tests__/e2e/paciente-flow.test.js
describe('Flujo Completo: Paciente registra signos vitales', () => {
  test('debe completar el flujo completo', async () => {
    // 1. Login
    const login = await request(app)
      .post('/api/auth-unified/login-paciente')
      .send({ pin: '2580', pacienteId: 1 });
    const token = login.body.token;

    // 2. Obtener datos del paciente
    const paciente = await request(app)
      .get('/api/pacientes/1')
      .set('Authorization', `Bearer ${token}`);
    expect(paciente.status).toBe(200);

    // 3. Registrar signos vitales
    const signosVitales = await request(app)
      .post('/api/pacientes/1/signos-vitales')
      .set('Authorization', `Bearer ${token}`)
      .send({
        presion_sistolica: 120,
        presion_diastolica: 80,
        frecuencia_cardiaca: 75
      });
    expect(signosVitales.status).toBe(201);
    const signoId = signosVitales.body.data.id_signo_vital;

    // 4. Verificar que se guardó
    const signosGuardados = await request(app)
      .get('/api/pacientes/1/signos-vitales')
      .set('Authorization', `Bearer ${token}`);
    expect(signosGuardados.body.data).toContainEqual(
      expect.objectContaining({ id_signo_vital: signoId })
    );

    // 5. Actualizar signos vitales
    const actualizado = await request(app)
      .put(`/api/pacientes/1/signos-vitales/${signoId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ presion_sistolica: 130 });
    expect(actualizado.status).toBe(200);
    expect(actualizado.body.data.presion_sistolica).toBe(130);
  });
});
```

### Qué verificar:
- ✅ Flujos completos de usuario
- ✅ Secuencia de operaciones
- ✅ Estado persistente
- ✅ Integración entre endpoints
- ✅ Manejo de errores en flujos

---

## 7. Pruebas de Rendimiento

**Objetivo**: Verificar que los endpoints respondan en tiempos aceptables.

### Características:
- Miden tiempos de respuesta
- Prueban carga concurrente
- Identifican cuellos de botella
- Validan límites de rendimiento

### Ejemplo:

```javascript
// __tests__/performance/api-performance.test.js
import { performance } from 'perf_hooks';

describe('Rendimiento: Endpoints', () => {
  test('GET /api/pacientes/:id debe responder en menos de 200ms', async () => {
    const start = performance.now();
    
    await request(app)
      .get(`/api/pacientes/${pacienteId}`)
      .set('Authorization', `Bearer ${token}`);
    
    const end = performance.now();
    const duration = end - start;
    
    expect(duration).toBeLessThan(200);
  });

  test('debe manejar 100 requests concurrentes', async () => {
    const requests = Array(100).fill(null).map(() =>
      request(app)
        .get(`/api/pacientes/${pacienteId}/signos-vitales`)
        .set('Authorization', `Bearer ${token}`)
    );

    const start = performance.now();
    const responses = await Promise.all(requests);
    const end = performance.now();

    expect(responses.every(r => r.status === 200)).toBe(true);
    expect(end - start).toBeLessThan(5000); // 5 segundos para 100 requests
  });
});
```

### Qué verificar:
- ✅ Tiempos de respuesta
- ✅ Throughput (requests/segundo)
- ✅ Uso de memoria
- ✅ Escalabilidad
- ✅ Límites de carga

---

## 8. Pruebas de Seguridad

**Objetivo**: Verificar que los endpoints sean seguros.

### Características:
- Prueban autenticación
- Verifican autorización
- Validan sanitización
- Detectan vulnerabilidades

### Ejemplo:

```javascript
// __tests__/security/api-security.test.js
describe('Seguridad: Endpoints', () => {
  test('debe rechazar requests sin token', async () => {
    const response = await request(app)
      .get(`/api/pacientes/${pacienteId}`);
    
    expect(response.status).toBe(401);
  });

  test('debe rechazar tokens inválidos', async () => {
    const response = await request(app)
      .get(`/api/pacientes/${pacienteId}`)
      .set('Authorization', 'Bearer invalid-token');
    
    expect(response.status).toBe(401);
  });

  test('debe sanitizar datos para prevenir XSS', async () => {
    const maliciousData = {
      observaciones: '<script>alert("XSS")</script>',
      presion_sistolica: 120
    };

    const response = await request(app)
      .post(`/api/pacientes/${pacienteId}/signos-vitales`)
      .set('Authorization', `Bearer ${token}`)
      .send(maliciousData);

    // Verificar que el script fue sanitizado
    expect(response.body.data.observaciones).not.toContain('<script>');
  });

  test('debe prevenir SQL injection', async () => {
    const maliciousId = "1'; DROP TABLE pacientes; --";
    
    const response = await request(app)
      .get(`/api/pacientes/${maliciousId}`)
      .set('Authorization', `Bearer ${token}`);
    
    // Debe rechazar o sanitizar, no ejecutar SQL
    expect([400, 404]).toContain(response.status);
  });
});
```

### Qué verificar:
- ✅ Autenticación
- ✅ Autorización
- ✅ Sanitización de inputs
- ✅ Prevención de SQL injection
- ✅ Prevención de XSS
- ✅ Rate limiting
- ✅ Validación de permisos

---

## 🎯 Matriz de Pruebas Recomendada

| Tipo de Prueba | Cobertura | Velocidad | Complejidad | Prioridad |
|----------------|-----------|-----------|-------------|-----------|
| Unitarias | Funciones individuales | ⚡⚡⚡ Muy rápida | 🟢 Baja | 🔴 Alta |
| Integración | Componentes juntos | ⚡⚡ Media | 🟡 Media | 🟠 Media |
| API Endpoints | Endpoints HTTP | ⚡⚡ Media | 🟡 Media | 🔴 Alta |
| Validación Datos | Transformaciones | ⚡⚡⚡ Muy rápida | 🟢 Baja | 🔴 Alta |
| Contrato | Esquemas | ⚡⚡ Media | 🟡 Media | 🟠 Media |
| E2E | Flujos completos | ⚡ Lenta | 🔴 Alta | 🟠 Media |
| Rendimiento | Tiempos | ⚡ Lenta | 🔴 Alta | 🟢 Baja |
| Seguridad | Vulnerabilidades | ⚡⚡ Media | 🟡 Media | 🔴 Alta |

---

## 📝 Checklist de Implementación

### Para cada endpoint:

- [ ] **Prueba unitaria** de la función del controlador
- [ ] **Prueba de integración** con base de datos
- [ ] **Prueba de endpoint** con supertest
- [ ] **Prueba de validación** de datos del frontend
- [ ] **Prueba de contrato** (esquema JSON)
- [ ] **Prueba de seguridad** (autenticación, sanitización)
- [ ] **Prueba de error** (casos inválidos)

### Para datos del frontend:

- [ ] Conversión de tipos (string → number)
- [ ] Validación de rangos
- [ ] Campos requeridos vs opcionales
- [ ] Valores nulos/undefined
- [ ] Sanitización de strings
- [ ] Formato de fechas
- [ ] Estructura de objetos anidados

---

## 🚀 Ejecutar Pruebas

```bash
# Todas las pruebas
npm test

# Pruebas unitarias
npm test -- __tests__/unit

# Pruebas de integración
npm test -- __tests__/integration

# Pruebas de endpoints
npm test -- __tests__/api

# Pruebas de validación
npm test -- __tests__/validation

# Con cobertura
npm test -- --coverage

# Modo watch
npm test -- --watch
```

---

## 📚 Recursos Adicionales

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)


