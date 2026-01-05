# 🚀 Guía de Medición de Performance

## 📊 Métodos de Medición

### 1. **Performance Overlay (Tiempo Real)**
Activa el overlay de performance presionando 3 veces rápidamente en cualquier parte de la pantalla.

**Métricas mostradas:**
- **FPS**: Frames por segundo (objetivo: 60 FPS)
- **Frame Time**: Tiempo por frame en ms (objetivo: <16.67ms)
- **Last Render**: Tiempo del último render (objetivo: <10ms)
- **Memory**: Uso de memoria en MB
- **Renders**: Contador de re-renders

### 2. **React DevTools Profiler**
```bash
# Instalar React DevTools
npm install -g react-devtools

# Ejecutar
react-devtools
```

**Cómo usar:**
1. Conecta el dispositivo/emulador
2. Abre React DevTools
3. Ve a la pestaña "Profiler"
4. Presiona "Record"
5. Interactúa con la app
6. Detén la grabación
7. Analiza los resultados

### 3. **Chrome DevTools (Solo Android)**
```bash
# En el navegador Chrome
chrome://inspect
```

**Métricas disponibles:**
- JavaScript Heap
- Memory Timeline
- Performance Timeline

### 4. **Benchmark Utils**
```javascript
import benchmarkUtils from '../utils/benchmarkUtils';

// Medir operación única
benchmarkUtils.measureSync('Filtrar lista', () => {
  // Tu código aquí
});

// Medir múltiples ejecuciones
benchmarkUtils.measureMultiple('Render lista', () => {
  // Tu código aquí
}, 10);

// Comparar dos implementaciones
benchmarkUtils.compare(
  'Implementación A',
  () => { /* código A */ },
  'Implementación B',
  () => { /* código B */ },
  10
);

// Generar reporte
benchmarkUtils.generateReport();
```

## 🎯 Métricas Objetivo

### Rendimiento General
- **FPS**: ≥ 55 (excelente), ≥ 45 (bueno), ≥ 30 (aceptable)
- **Frame Time**: ≤ 16.67ms (60 FPS)
- **Tiempo de Render**: ≤ 10ms por componente
- **Memory**: < 200MB en dispositivos Android de gama media

### Listas (FlatList)
- **Scroll FPS**: ≥ 50 durante scroll rápido
- **Tiempo de render inicial**: < 100ms para 20 items
- **Tiempo de agregar item**: < 50ms

### Búsquedas
- **Tiempo de filtrado**: < 50ms para 100 items
- **Con debounce**: Debe reducir ejecuciones en 70-80%

### Operaciones de Red
- **Tiempo de carga inicial**: < 500ms
- **Tiempo de refresh**: < 300ms

## 📈 Pruebas de Rendimiento

### Test 1: Scroll Performance
1. Abre GestionAdmin con 50+ items
2. Haz scroll rápido arriba/abajo
3. Verifica FPS (debe mantenerse ≥ 50)

### Test 2: Búsqueda
1. Abre cualquier pantalla de gestión
2. Escribe rápidamente en el buscador
3. Verifica que el filtrado es fluido
4. Revisa console para ver cuántas ejecuciones hay (debe ser menor con debounce)

### Test 3: Memory Leaks
1. Navega entre pantallas 10 veces
2. Verifica que la memoria no aumenta constantemente
3. Usa Performance Overlay para monitorear

### Test 4: Render Count
1. Abre DetallePaciente
2. Observa el contador de renders en Performance Overlay
3. Interactúa con la pantalla
4. Verifica que no hay re-renders innecesarios

## 🛠️ Herramientas Adicionales

### Android Studio Profiler
1. Abre Android Studio
2. Tools → Profiler
3. Selecciona tu app
4. Ve a "CPU" y "Memory"

### Flipper (Opcional)
```bash
npm install --save-dev flipper-plugin-react-native-performance
```

## 📝 Checklist de Optimización

- [ ] FlatList implementado en todas las listas
- [ ] Funciones memoizadas con useCallback
- [ ] Componentes memoizados con React.memo
- [ ] Cálculos costosos en useMemo
- [ ] Debounce en búsquedas (300ms)
- [ ] getItemLayout configurado en FlatList
- [ ] removeClippedSubviews activado
- [ ] FPS ≥ 55 en scroll rápido
- [ ] Sin memory leaks
- [ ] Tiempo de render < 10ms

## 🔍 Identificar Problemas

### FPS Bajo (< 45)
- Revisa componentes pesados sin memoizar
- Verifica operaciones costosas en render
- Usa Profiler para encontrar cuellos de botella

### Memory Creciente
- Busca event listeners sin cleanup
- Verifica que los timers se limpian
- Revisa closures en callbacks

### Render Count Alto
- Usa React DevTools Profiler
- Verifica props que cambian innecesariamente
- Implementa React.memo donde sea necesario

### Scroll Lag
- Verifica getItemLayout en FlatList
- Aumenta removeClippedSubviews
- Reduce complejidad de renderItem

