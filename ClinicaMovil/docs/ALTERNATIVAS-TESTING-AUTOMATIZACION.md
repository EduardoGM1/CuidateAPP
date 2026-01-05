# 🧪 Alternativas y Soluciones de Automatización de Pruebas

**Fecha:** 2025-11-08  
**Proyecto:** Clínica Móvil - React Native  
**Estado:** Análisis y Recomendaciones

---

## 📊 RESUMEN EJECUTIVO

Este documento presenta alternativas y soluciones para mejorar la automatización de pruebas en la aplicación React Native, complementando la configuración actual con React Native Testing Library.

---

## 🎯 SITUACIÓN ACTUAL

### **Herramientas Configuradas:**
- ✅ **Jest** - Framework de testing
- ✅ **React Native Testing Library** - Testing de componentes
- ✅ **@testing-library/jest-native** - Matchers adicionales
- ✅ **Cobertura de código** configurada (70% threshold)

### **Tests Actuales:**
- ✅ 6 tests pasando en `DetallePaciente.test.js`
- ✅ Tests de componentes modales (FormModal, OptionsModal)
- ✅ Tests de formularios y validaciones

---

## 🚀 ALTERNATIVAS Y SOLUCIONES

### **1. TESTING E2E (End-to-End)**

#### **A. Detox (Recomendado para React Native)**
**Descripción:** Framework E2E específico para React Native, desarrollado por Wix.

**Ventajas:**
- ✅ Diseñado específicamente para React Native
- ✅ Ejecuta en dispositivos/simuladores reales
- ✅ Sincronización automática con la UI
- ✅ Soporte para iOS y Android
- ✅ Integración con CI/CD

**Instalación:**
```bash
npm install --save-dev detox
npm install --save-dev jest-circus
```

**Configuración básica:**
```javascript
// .detoxrc.js
module.exports = {
  testRunner: {
    args: {
      '$0': 'jest',
      config: 'e2e/jest.config.js'
    },
    jest: {
      setupTimeout: 120000
    }
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/ClinicaMovil.app',
      build: 'xcodebuild -workspace ios/ClinicaMovil.xcworkspace -scheme ClinicaMovil -configuration Debug -sdk iphonesimulator -derivedDataPath ios/build'
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug'
    }
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 14'
      }
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_4_API_30'
      }
    }
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug'
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug'
    }
  }
};
```

**Ejemplo de test E2E:**
```javascript
// e2e/detallePaciente.e2e.js
describe('DetallePaciente E2E', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('debe abrir modal de agregar cita', async () => {
    await expect(element(by.id('paciente-header'))).toBeVisible();
    await element(by.text('Opciones')).atIndex(0).tap();
    await expect(element(by.text('Agregar Nueva Cita'))).toBeVisible();
  });

  it('debe completar formulario de signos vitales', async () => {
    await element(by.text('Signos Vitales')).tap();
    await element(by.text('Opciones')).atIndex(1).tap();
    await element(by.text('Agregar Signos Vitales')).tap();
    
    await element(by.id('peso-input')).typeText('70');
    await element(by.id('talla-input')).typeText('1.75');
    
    await element(by.text('Guardar')).tap();
    await expect(element(by.text('Signos vitales guardados'))).toBeVisible();
  });
});
```

**Comandos:**
```json
{
  "scripts": {
    "test:e2e": "detox test",
    "test:e2e:ios": "detox test --configuration ios.sim.debug",
    "test:e2e:android": "detox test --configuration android.emu.debug",
    "test:e2e:build:ios": "detox build --configuration ios.sim.debug",
    "test:e2e:build:android": "detox build --configuration android.emu.debug"
  }
}
```

---

#### **B. Appium (Alternativa multiplataforma)**
**Descripción:** Framework de automatización multiplataforma que soporta React Native.

**Ventajas:**
- ✅ Multiplataforma (iOS, Android, Web)
- ✅ Múltiples lenguajes (JavaScript, Python, Java)
- ✅ Comunidad grande
- ⚠️ Más complejo de configurar que Detox

**Instalación:**
```bash
npm install --save-dev appium
npm install --save-dev wd
```

---

### **2. TESTING DE COMPONENTES (Mejoras a la configuración actual)**

#### **A. Storybook + Testing**
**Descripción:** Herramienta para desarrollar y probar componentes de forma aislada.

**Ventajas:**
- ✅ Desarrollo de componentes aislado
- ✅ Visualización de estados
- ✅ Testing visual
- ✅ Documentación interactiva

**Instalación:**
```bash
npx sb init --type react_native
```

**Ejemplo:**
```javascript
// stories/DetallePaciente.stories.js
import DetallePaciente from '../screens/admin/DetallePaciente';

export default {
  title: 'Screens/DetallePaciente',
  component: DetallePaciente,
};

export const Default = {
  args: {
    route: {
      params: {
        paciente: {
          id_paciente: 1,
          nombre: 'María',
          apellido_paterno: 'García'
        }
      }
    }
  }
};
```

---

#### **B. React Native Testing Library - Mejoras**
**Mejoras sugeridas a la configuración actual:**

1. **Custom Render con Providers:**
```javascript
// src/test-utils/render.js
import React from 'react';
import { render } from '@testing-library/react-native';
import { AuthProvider } from '../context/AuthContext';
import { DetallePacienteProvider } from '../context/DetallePacienteContext';

export const renderWithProviders = (ui, options = {}) => {
  const AllTheProviders = ({ children }) => {
    return (
      <AuthProvider>
        <DetallePacienteProvider pacienteId={1}>
          {children}
        </DetallePacienteProvider>
      </AuthProvider>
    );
  };

  return render(ui, { wrapper: AllTheProviders, ...options });
};

export * from '@testing-library/react-native';
export { renderWithProviders as render };
```

2. **Helpers personalizados:**
```javascript
// src/test-utils/helpers.js
export const createMockPaciente = (overrides = {}) => ({
  id_paciente: 1,
  nombre: 'María',
  apellido_paterno: 'García',
  apellido_materno: 'López',
  edad: 45,
  ...overrides
});

export const createMockRoute = (paciente) => ({
  params: { paciente },
  key: 'test-key',
  name: 'DetallePaciente'
});

export const createMockNavigation = () => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn()
});
```

---

### **3. TESTING DE INTEGRACIÓN**

#### **A. MSW (Mock Service Worker)**
**Descripción:** Intercepta peticiones HTTP para testing de integración.

**Ventajas:**
- ✅ Mock de APIs reales
- ✅ Testing de integración sin backend
- ✅ Escenarios de error fáciles de simular

**Instalación:**
```bash
npm install --save-dev msw
```

**Configuración:**
```javascript
// src/mocks/handlers.js
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/pacientes/:id', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        id_paciente: 1,
        nombre: 'María',
        apellido_paterno: 'García'
      })
    );
  }),
  
  rest.post('/api/citas', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({ id_cita: 1, ...req.body })
    );
  })
];
```

```javascript
// src/mocks/server.js
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

```javascript
// jest.setup.js
import { server } from './src/mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

### **4. TESTING DE RENDIMIENTO**

#### **A. React Native Performance Monitor**
**Descripción:** Monitoreo de rendimiento en tests.

**Instalación:**
```bash
npm install --save-dev react-native-performance-monitor
```

**Ejemplo:**
```javascript
import { performanceMonitor } from 'react-native-performance-monitor';

it('debe renderizar DetallePaciente en menos de 500ms', async () => {
  const startTime = performance.now();
  
  render(<DetallePaciente route={mockRoute} navigation={mockNavigation} />);
  
  await waitFor(() => {
    expect(getByText(/Citas Recientes/)).toBeVisible();
  });
  
  const renderTime = performance.now() - startTime;
  expect(renderTime).toBeLessThan(500);
});
```

---

### **5. TESTING VISUAL (Visual Regression Testing)**

#### **A. Chromatic / Percy**
**Descripción:** Testing visual automatizado que detecta cambios en la UI.

**Ventajas:**
- ✅ Detección automática de cambios visuales
- ✅ Comparación de screenshots
- ✅ Integración con CI/CD
- ⚠️ Requiere suscripción (planes gratuitos disponibles)

---

### **6. CI/CD INTEGRACIÓN**

#### **A. GitHub Actions**
**Configuración para ejecutar tests automáticamente:**

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test -- --coverage --watchAll=false
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
```

#### **B. Bitrise / CircleCI**
Para testing E2E en dispositivos reales.

---

### **7. HERRAMIENTAS COMPLEMENTARIAS**

#### **A. Testing Library User Event (Mejora de interacciones)**
```bash
npm install --save-dev @testing-library/user-event
```

**Ejemplo:**
```javascript
import { render, screen } from '@testing-library/react-native';
import userEvent from '@testing-library/user-event';

it('debe manejar interacciones de usuario', async () => {
  const user = userEvent.setup();
  render(<MyComponent />);
  
  await user.press(screen.getByText('Button'));
  await user.type(screen.getByPlaceholderText('Input'), 'text');
});
```

#### **B. Jest Snapshots (Para componentes estables)**
```javascript
it('debe renderizar correctamente', () => {
  const tree = render(<DetallePaciente {...props} />);
  expect(tree).toMatchSnapshot();
});
```

#### **C. Coverage Badges**
```bash
npm install --save-dev jest-coverage-badges
```

---

## 📋 RECOMENDACIONES POR PRIORIDAD

### **🔴 ALTA PRIORIDAD (Implementar primero)**

1. **MSW para mocking de APIs**
   - Facilita testing de integración
   - Reduce dependencia de mocks manuales
   - Mejora mantenibilidad

2. **Custom Render con Providers**
   - Reduce duplicación en tests
   - Facilita mantenimiento
   - Mejora consistencia

3. **Helpers y Utilities de Testing**
   - Crea funciones reutilizables
   - Reduce código repetitivo
   - Mejora legibilidad

### **🟡 MEDIA PRIORIDAD (Implementar después)**

4. **Detox para E2E**
   - Testing en dispositivos reales
   - Validación de flujos completos
   - Mayor confianza en releases

5. **Storybook**
   - Desarrollo de componentes aislado
   - Documentación visual
   - Testing visual

6. **GitHub Actions CI/CD**
   - Tests automáticos en cada PR
   - Prevención de regresiones
   - Reportes automáticos

### **🟢 BAJA PRIORIDAD (Considerar más adelante)**

7. **Testing de Rendimiento**
   - Validación de métricas
   - Detección de regresiones de performance

8. **Visual Regression Testing**
   - Detección de cambios visuales
   - Útil para UI compleja

---

## 🛠️ PLAN DE IMPLEMENTACIÓN SUGERIDO

### **Fase 1: Mejoras Inmediatas (1-2 semanas)**
1. ✅ Implementar MSW para mocking de APIs
2. ✅ Crear custom render con providers
3. ✅ Crear helpers y utilities de testing
4. ✅ Mejorar mocks existentes

### **Fase 2: E2E Testing (2-3 semanas)**
1. ✅ Configurar Detox
2. ✅ Crear tests E2E básicos
3. ✅ Integrar en CI/CD

### **Fase 3: Optimización (1-2 semanas)**
1. ✅ Configurar Storybook
2. ✅ Implementar testing de rendimiento
3. ✅ Optimizar cobertura de tests

---

## 📚 RECURSOS Y DOCUMENTACIÓN

- **Detox:** https://wix.github.io/Detox/
- **MSW:** https://mswjs.io/
- **React Native Testing Library:** https://callstack.github.io/react-native-testing-library/
- **Storybook React Native:** https://storybook.js.org/docs/react-native/get-started/introduction
- **Jest:** https://jestjs.io/

---

## ✅ CONCLUSIÓN

La configuración actual con React Native Testing Library es sólida. Las mejoras sugeridas complementarán el testing existente y proporcionarán:

1. **Mejor cobertura** con E2E testing
2. **Mayor confiabilidad** con mocking de APIs
3. **Mejor mantenibilidad** con helpers y utilities
4. **Automatización completa** con CI/CD

**Recomendación:** Comenzar con las mejoras de alta prioridad (MSW, custom render, helpers) y luego implementar Detox para E2E testing.

