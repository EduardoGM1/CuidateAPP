# 🚀 INSTRUCCIONES PARA EJECUTAR TODOS LOS TESTS DE RENDIMIENTO

## 📱 Método 1: Performance Overlay (Visual - Recomendado)

### Paso 1: Ejecutar la app
```bash
cd ClinicaMovil
npm start
# En otra terminal
npm run android  # o npm run ios
```

### Paso 2: Activar Performance Overlay
1. En la app, **presiona 3 veces rápidamente** en cualquier parte de la pantalla
2. Se abrirá un overlay con métricas en tiempo real

### Paso 3: Realizar pruebas
- **Scroll Test**: Abre GestionAdmin con 50+ items, haz scroll rápido → FPS debe ≥ 50
- **Search Test**: Escribe rápido en cualquier buscador → debe ser fluido
- **Navigation Test**: Navega entre pantallas → observa contador de renders
- **Memory Test**: Deja la app abierta varios minutos → memoria debe estabilizarse

## 💻 Método 2: Tests Automáticos (Consola)

### Opción A: Desde React Native Debugger
1. Abre React Native Debugger (o Chrome DevTools)
2. Ve a la consola
3. Ejecuta:

```javascript
// Ejecutar TODOS los tests
executeAllPerformanceTests()

// O tests individuales
performanceTest.runAll()
```

### Opción B: Desde el código
Agrega esto temporalmente en cualquier pantalla (ej: DashboardAdmin):

```javascript
import { useEffect } from 'react';
import executeAllTests from '../utils/executeAllTests';

// En el componente
useEffect(() => {
  if (__DEV__) {
    // Ejecutar tests después de 3 segundos
    setTimeout(() => {
      executeAllTests();
    }, 3000);
  }
}, []);
```

## 🛠️ Método 3: React DevTools Profiler

```bash
# Instalar React DevTools
npm install -g react-devtools

# Ejecutar
react-devtools
```

**Cómo usar:**
1. Conecta tu dispositivo/emulador
2. Abre React DevTools
3. Pestaña "Profiler"
4. Presiona "Record" (círculo rojo)
5. Interactúa con la app (navega, busca, hace scroll)
6. Detén la grabación
7. Analiza qué componentes tardan más en renderizar

## 📊 Método 4: Android Studio Profiler (Solo Android)

1. Abre Android Studio
2. Tools → Profiler
3. Selecciona tu app
4. Ve a "CPU" y "Memory"
5. Realiza acciones en la app y observa las gráficas

## 🎯 Tests Específicos a Realizar

### ✅ Test 1: Scroll Performance
- Abre: GestionAdmin, GestionVacunas, GestionMedicamentos
- Acción: Scroll rápido arriba/abajo
- Métrica: FPS debe mantenerse ≥ 50
- Objetivo: Sin lag, scroll fluido

### ✅ Test 2: Búsqueda con Debounce
- Abre: Cualquier pantalla con buscador
- Acción: Escribe rápidamente "paciente test"
- Métrica: Debe filtrar sin lag
- Verificación: Revisa console - debe haber menos logs con debounce

### ✅ Test 3: Memory Leaks
- Acción: Navega entre pantallas 10 veces
- Métrica: Memoria no debe aumentar constantemente
- Objetivo: Memoria se mantiene o reduce después de GC

### ✅ Test 4: Render Count
- Abre: DetallePaciente
- Acción: Interactúa (abre modales, cambia tabs)
- Métrica: Contador de renders debe ser bajo
- Objetivo: < 20 renders para interacciones simples

### ✅ Test 5: Lista Larga
- Abre: GestionAdmin con 100+ items
- Acción: Scroll hasta el final
- Métrica: Tiempo de scroll y FPS
- Objetivo: Scroll fluido, sin pausas

### ✅ Test 6: Búsqueda en Lista Grande
- Abre: GestionAdmin con 100+ items
- Acción: Busca algo que no existe (ej: "xyz123")
- Métrica: Tiempo de respuesta
- Objetivo: < 100ms para mostrar "No hay resultados"

## 📈 Interpretación de Resultados

### FPS (Frames Per Second)
- **60 FPS**: Perfecto ✅
- **55-59 FPS**: Excelente ✅
- **45-54 FPS**: Bueno ⚠️
- **30-44 FPS**: Aceptable ⚠️
- **< 30 FPS**: Necesita optimización ❌

### Frame Time
- **< 16.67ms**: Perfecto (60 FPS) ✅
- **16.67-33ms**: Bueno (30-60 FPS) ✅
- **33-50ms**: Aceptable ⚠️
- **> 50ms**: Lento ❌

### Memory
- **< 150MB**: Excelente ✅
- **150-200MB**: Bueno ✅
- **200-300MB**: Aceptable ⚠️
- **> 300MB**: Alto uso ❌

### Render Time
- **< 5ms**: Excelente ✅
- **5-10ms**: Bueno ✅
- **10-20ms**: Aceptable ⚠️
- **> 20ms**: Lento ❌

## 🔍 Qué Buscar en los Resultados

### Señales de Problemas ❌
- FPS cae durante scroll
- Memory aumenta constantemente
- Render count muy alto
- Frame time > 33ms frecuentemente
- Lag visible al escribir

### Señales de Optimización Exitosa ✅
- FPS estable durante scroll
- Memory se mantiene estable
- Render count bajo
- Frame time consistente < 20ms
- Búsquedas fluidas

## 💡 Comandos Útiles

```javascript
// En la consola del debugger

// Ejecutar todos los tests
executeAllPerformanceTests()

// Tests individuales
performanceTest.runAll()
performanceTest.testMemoryUsage()
performanceTest.testScrollPerformance()

// Benchmark de operaciones específicas
benchmarkUtils.measureMultiple('Mi operación', () => {
  // tu código aquí
}, 10)

benchmarkUtils.generateReport()
```

## 📝 Checklist Final

Antes de considerar las optimizaciones completas:

- [ ] FPS ≥ 55 durante scroll normal
- [ ] FPS ≥ 50 durante scroll rápido
- [ ] Frame time ≤ 16.67ms consistentemente
- [ ] Memory < 200MB en uso normal
- [ ] Render count bajo (< 20 para interacciones simples)
- [ ] Búsquedas sin lag
- [ ] Sin memory leaks (memory estable)
- [ ] Tiempo de carga inicial < 500ms
- [ ] Navegación entre pantallas fluida

## 🎉 Listo para Probar!

Ejecuta la app y:
1. **Toca 3 veces rápido** para activar Performance Overlay
2. **Haz scroll rápido** en cualquier lista
3. **Escribe en búsquedas** y observa fluidez
4. **Navega entre pantallas** y cuenta los renders

¡Todos los tests están listos para ejecutarse!

