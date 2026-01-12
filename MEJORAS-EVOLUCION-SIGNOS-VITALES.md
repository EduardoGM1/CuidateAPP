# 📈 MEJORAS: Evaluación Evolutiva de Signos Vitales

**Fecha:** 2025-01-27  
**Objetivo:** Mejorar la evaluación y visualización evolutiva de signos vitales basándose en la funcionalidad actual

---

## 🔍 ANÁLISIS DE LA FUNCIONALIDAD ACTUAL

### **Lo que YA existe:**

1. ✅ **Gráficas de línea** (VictoryLine, VictoryArea)
   - Presión, Glucosa, Peso, IMC
   - Visualización temporal básica

2. ✅ **Comparación simple** (último vs anterior)
   - Diferencia numérica
   - Porcentaje de cambio
   - Estado: Mejoró/Aumentó/Estable

3. ✅ **Rangos normales** definidos
   - Presión: 90-140 mmHg
   - Glucosa: 70-100 mg/dL
   - IMC: 18.5-24.9

4. ✅ **Filtrado temporal**
   - Últimos 6 meses
   - Máximo 12 registros

---

## 🎯 MEJORAS PROPUESTAS (Basadas en lo existente)

### **1. ANÁLISIS DE TENDENCIA A LARGO PLAZO** 📊

**Problema actual:** Solo compara último vs anterior (2 puntos)

**Mejora:** Calcular tendencia usando todos los datos disponibles

#### **Implementación:**

```javascript
/**
 * Calcula la tendencia de un signo vital a lo largo del tiempo
 * @param {Array} datos - Array de signos vitales ordenados por fecha
 * @param {String} campo - Campo a analizar (ej: 'glucosa_mg_dl')
 * @returns {Object} Análisis de tendencia
 */
const calcularTendencia = (datos, campo) => {
  if (!datos || datos.length < 3) {
    return {
      tendencia: 'insuficiente',
      mensaje: 'Se necesitan al menos 3 registros para calcular tendencia',
      pendiente: null,
      cambioPromedio: null
    };
  }

  // Filtrar datos válidos
  const valoresValidos = datos
    .filter(signo => signo[campo] !== null && signo[campo] !== undefined)
    .map((signo, index) => ({
      x: index, // Posición temporal
      y: parseFloat(signo[campo]),
      fecha: new Date(signo.fecha_medicion || signo.fecha_registro)
    }));

  if (valoresValidos.length < 3) {
    return {
      tendencia: 'insuficiente',
      mensaje: 'Datos insuficientes',
      pendiente: null,
      cambioPromedio: null
    };
  }

  // Calcular pendiente usando regresión lineal simple
  const n = valoresValidos.length;
  const sumX = valoresValidos.reduce((sum, p) => sum + p.x, 0);
  const sumY = valoresValidos.reduce((sum, p) => sum + p.y, 0);
  const sumXY = valoresValidos.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumX2 = valoresValidos.reduce((sum, p) => sum + p.x * p.x, 0);

  const pendiente = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  // Calcular cambio promedio
  const primerValor = valoresValidos[0].y;
  const ultimoValor = valoresValidos[valoresValidos.length - 1].y;
  const cambioTotal = ultimoValor - primerValor;
  const cambioPromedio = cambioTotal / (valoresValidos.length - 1);

  // Determinar tipo de tendencia
  let tendencia = 'estable';
  let mensaje = 'Estable';
  let color = '#FF9800'; // Naranja
  let icono = '➡️';

  // Umbrales para determinar tendencia (ajustables según signo vital)
  const umbralSignificativo = getUmbralSignificativo(campo);
  
  if (Math.abs(pendiente) < umbralSignificativo) {
    tendencia = 'estable';
    mensaje = 'Estable';
    color = '#FF9800';
    icono = '➡️';
  } else if (pendiente > 0) {
    // Tendencia creciente
    if (esMejorValorMayor(campo)) {
      // Para valores donde mayor es mejor (ej: saturación)
      tendencia = 'mejorando';
      mensaje = 'Mejorando';
      color = '#4CAF50';
      icono = '📈';
    } else {
      // Para valores donde menor es mejor (ej: glucosa, presión)
      tendencia = 'empeorando';
      mensaje = 'Aumentando';
      color = '#F44336';
      icono = '📈';
    }
  } else {
    // Tendencia decreciente
    if (esMejorValorMayor(campo)) {
      tendencia = 'empeorando';
      mensaje = 'Disminuyendo';
      color = '#F44336';
      icono = '📉';
    } else {
      tendencia = 'mejorando';
      mensaje = 'Mejorando';
      color = '#4CAF50';
      icono = '📉';
    }
  }

  return {
    tendencia,
    mensaje,
    pendiente,
    cambioPromedio: cambioPromedio.toFixed(2),
    cambioTotal: cambioTotal.toFixed(2),
    primerValor: primerValor.toFixed(2),
    ultimoValor: ultimoValor.toFixed(2),
    color,
    icono,
    puntosAnalizados: valoresValidos.length
  };
};

/**
 * Determina si un valor mayor es mejor para un campo específico
 */
const esMejorValorMayor = (campo) => {
  // Por ahora, todos los signos vitales actuales tienen menor = mejor
  // Excepto saturación (que no está en el modelo actual)
  return false;
};

/**
 * Obtiene el umbral significativo para determinar tendencia
 */
const getUmbralSignificativo = (campo) => {
  const umbrales = {
    'presion_sistolica': 0.5, // mmHg por punto
    'presion_diastolica': 0.5,
    'glucosa_mg_dl': 1.0, // mg/dL por punto
    'peso_kg': 0.2, // kg por punto
    'imc': 0.1, // IMC por punto
  };
  return umbrales[campo] || 1.0;
};
```

#### **Visualización en la Gráfica:**

```
┌─────────────────────────────────────┐
│  Glucosa - Evolución                 │
│  ─────────────────────────────────  │
│                                     │
│  Tendencia: 📉 Mejorando            │
│  Cambio: -12.5 mg/dL (promedio)    │
│  Período: 6 meses                   │
│                                     │
│  [Gráfica con línea de tendencia]  │
│                                     │
│  Primer valor: 145 mg/dL           │
│  Último valor: 110 mg/dL           │
└─────────────────────────────────────┘
```

---

### **2. LÍNEA DE TENDENCIA EN LA GRÁFICA** 📉

**Problema actual:** Solo muestra puntos y línea conectada, no tendencia general

**Mejora:** Agregar línea de regresión lineal superpuesta

#### **Implementación:**

```javascript
// En prepararDatos, agregar cálculo de línea de tendencia
const prepararDatosConTendencia = (tipo) => {
  const datos = prepararDatos(tipo); // Función existente
  
  if (datos.length < 3) return { datos, tendencia: null };
  
  // Calcular línea de tendencia
  const n = datos.length;
  const sumX = datos.reduce((sum, p) => sum + p.x, 0);
  const sumY = datos.reduce((sum, p) => sum + p.y, 0);
  const sumXY = datos.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumX2 = datos.reduce((sum, p) => sum + p.x * p.x, 0);
  
  const pendiente = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercepto = (sumY - pendiente * sumX) / n;
  
  // Generar puntos de la línea de tendencia
  const tendencia = datos.map(p => ({
    x: p.x,
    y: pendiente * p.x + intercepto
  }));
  
  return { datos, tendencia };
};
```

#### **Visualización:**

```javascript
// En VictoryChart, agregar línea de tendencia
<VictoryChart>
  {/* Línea de datos actual */}
  <VictoryLine data={datos} />
  
  {/* Línea de tendencia (punteada) */}
  <VictoryLine 
    data={tendencia} 
    style={{
      data: {
        stroke: '#999',
        strokeWidth: 2,
        strokeDasharray: '5,5' // Línea punteada
      }
    }}
  />
</VictoryChart>
```

---

### **3. ESTADÍSTICAS RESUMEN** 📊

**Problema actual:** Solo muestra valores individuales, no estadísticas

**Mejora:** Mostrar promedio, mínimo, máximo, variabilidad

#### **Implementación:**

```javascript
/**
 * Calcula estadísticas descriptivas de un signo vital
 */
const calcularEstadisticas = (datos, campo) => {
  const valores = datos
    .map(s => parseFloat(s[campo]))
    .filter(v => !isNaN(v));
  
  if (valores.length === 0) return null;
  
  const suma = valores.reduce((a, b) => a + b, 0);
  const promedio = suma / valores.length;
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  
  // Calcular desviación estándar
  const varianza = valores.reduce((sum, v) => sum + Math.pow(v - promedio, 2), 0) / valores.length;
  const desviacion = Math.sqrt(varianza);
  
  // Calcular coeficiente de variación (variabilidad relativa)
  const coeficienteVariacion = (desviacion / promedio) * 100;
  
  // Determinar estabilidad
  let estabilidad = 'estable';
  let colorEstabilidad = '#4CAF50';
  
  if (coeficienteVariacion > 20) {
    estabilidad = 'variable';
    colorEstabilidad = '#F44336';
  } else if (coeficienteVariacion > 10) {
    estabilidad = 'moderada';
    colorEstabilidad = '#FF9800';
  }
  
  return {
    promedio: promedio.toFixed(2),
    minimo: minimo.toFixed(2),
    maximo: maximo.toFixed(2),
    desviacion: desviacion.toFixed(2),
    coeficienteVariacion: coeficienteVariacion.toFixed(1),
    estabilidad,
    colorEstabilidad,
    totalRegistros: valores.length
  };
};
```

#### **Visualización:**

```
┌─────────────────────────────────────┐
│  Estadísticas (Últimos 6 meses)    │
│  ─────────────────────────────────  │
│                                     │
│  Promedio: 125.5 mg/dL              │
│  Mínimo: 98 mg/dL                   │
│  Máximo: 165 mg/dL                  │
│  Variabilidad: Moderada (12.3%)    │
│                                     │
│  Estabilidad: ✅ Estable            │
└─────────────────────────────────────┘
```

---

### **4. ZONAS DE RANGO NORMAL EN LA GRÁFICA** 🎯

**Problema actual:** Rangos normales solo en texto, no visualizados

**Mejora:** Mostrar zona sombreada en la gráfica

#### **Implementación:**

```javascript
// Agregar zona de rango normal usando VictoryArea
const getRangoNormal = (tipo) => {
  // Función existente, pero retornar también datos para gráfica
  const rangos = {
    presion: { min: 90, max: 140, unidad: 'mmHg' },
    glucosa: { min: 70, max: 100, unidad: 'mg/dL' },
    imc: { min: 18.5, max: 24.9, unidad: '' },
  };
  
  return rangos[tipo] || { min: null, max: null, unidad: '' };
};

// Generar datos para zona de rango normal
const generarZonaRango = (rango, numPuntos) => {
  if (!rango.min || !rango.max) return null;
  
  return Array.from({ length: numPuntos }, (_, i) => ({
    x: i + 1,
    y: rango.min,
    y0: rango.max
  }));
};
```

#### **Visualización en VictoryChart:**

```javascript
<VictoryChart>
  {/* Zona de rango normal (sombreada) */}
  {rango.min && rango.max && (
    <VictoryArea
      data={zonaRango}
      style={{
        data: {
          fill: '#E8F5E9',
          fillOpacity: 0.3
        }
      }}
    />
  )}
  
  {/* Línea de datos */}
  <VictoryLine data={datos} />
  
  {/* Líneas de referencia (min y max) */}
  <VictoryLine
    data={[{ x: 0, y: rango.min }, { x: datos.length, y: rango.min }]}
    style={{ data: { stroke: '#4CAF50', strokeDasharray: '3,3' } }}
  />
  <VictoryLine
    data={[{ x: 0, y: rango.max }, { x: datos.length, y: rango.max }]}
    style={{ data: { stroke: '#F44336', strokeDasharray: '3,3' } }}
  />
</VictoryChart>
```

---

### **5. COMPARACIÓN CON PERÍODOS ANTERIORES** 📅

**Problema actual:** Solo compara último vs anterior (2 puntos)

**Mejora:** Comparar períodos (ej: último mes vs mes anterior)

#### **Implementación:**

```javascript
/**
 * Compara el promedio de un período con el período anterior
 */
const compararPeriodos = (datos, campo, diasPeriodo = 30) => {
  const ahora = new Date();
  const fechaLimiteActual = new Date(ahora.getTime() - diasPeriodo * 24 * 60 * 60 * 1000);
  const fechaLimiteAnterior = new Date(ahora.getTime() - (diasPeriodo * 2) * 24 * 60 * 60 * 1000);
  
  // Período actual (últimos N días)
  const periodoActual = datos.filter(signo => {
    const fecha = new Date(signo.fecha_medicion || signo.fecha_registro);
    return fecha >= fechaLimiteActual;
  });
  
  // Período anterior (N días antes de eso)
  const periodoAnterior = datos.filter(signo => {
    const fecha = new Date(signo.fecha_medicion || signo.fecha_registro);
    return fecha >= fechaLimiteAnterior && fecha < fechaLimiteActual;
  });
  
  if (periodoActual.length === 0 || periodoAnterior.length === 0) {
    return null;
  }
  
  const promedioActual = periodoActual.reduce((sum, s) => sum + parseFloat(s[campo] || 0), 0) / periodoActual.length;
  const promedioAnterior = periodoAnterior.reduce((sum, s) => sum + parseFloat(s[campo] || 0), 0) / periodoAnterior.length;
  
  const diferencia = promedioActual - promedioAnterior;
  const porcentaje = ((diferencia / promedioAnterior) * 100).toFixed(1);
  
  let estado = 'igual';
  let mensaje = '';
  let color = '#666';
  
  if (Math.abs(diferencia) < 2) {
    estado = 'igual';
    mensaje = 'Estable';
    color = '#FF9800';
  } else if (diferencia < 0 && !esMejorValorMayor(campo)) {
    estado = 'mejoro';
    mensaje = 'Mejoró';
    color = '#4CAF50';
  } else if (diferencia > 0 && !esMejorValorMayor(campo)) {
    estado = 'empeoro';
    mensaje = 'Aumentó';
    color = '#F44336';
  }
  
  return {
    periodoActual: {
      promedio: promedioActual.toFixed(2),
      registros: periodoActual.length
    },
    periodoAnterior: {
      promedio: promedioAnterior.toFixed(2),
      registros: periodoAnterior.length
    },
    diferencia: diferencia.toFixed(2),
    porcentaje,
    estado,
    mensaje,
    color
  };
};
```

#### **Visualización:**

```
┌─────────────────────────────────────┐
│  Comparación de Períodos            │
│  ─────────────────────────────────  │
│                                     │
│  Último mes: 125.5 mg/dL (8 reg.)  │
│  Mes anterior: 138.2 mg/dL (6 reg.) │
│                                     │
│  Cambio: -12.7 mg/dL (-9.2%)        │
│  Estado: ✅ Mejoró                   │
└─────────────────────────────────────┘
```

---

### **6. INDICADORES VISUALES MEJORADOS** 🎨

**Problema actual:** Solo muestra valores, no contexto visual claro

**Mejora:** Agregar indicadores visuales de estado

#### **Implementación:**

```javascript
// Componente de indicador de estado
const IndicadorEstado = ({ valor, rango, tipo }) => {
  const { min, max } = rango;
  const porcentaje = ((valor - min) / (max - min)) * 100;
  
  let color = '#4CAF50'; // Verde
  let estado = 'Normal';
  
  if (valor < min) {
    color = '#2196F3'; // Azul (bajo)
    estado = 'Bajo';
  } else if (valor > max) {
    color = '#F44336'; // Rojo (alto)
    estado = 'Alto';
  }
  
  return (
    <View style={styles.indicadorContainer}>
      <View style={[styles.barraProgreso, { width: `${Math.min(100, Math.max(0, porcentaje))}%`, backgroundColor: color }]} />
      <Text style={[styles.estadoTexto, { color }]}>{estado}</Text>
    </View>
  );
};
```

---

### **7. RESUMEN EVOLUTIVO CON TTS** 🔊

**Problema actual:** TTS solo lee valores individuales

**Mejora:** Resumen evolutivo completo con TTS

#### **Implementación:**

```javascript
const generarResumenEvolutivo = (datos, campo, tipo) => {
  const tendencia = calcularTendencia(datos, campo);
  const estadisticas = calcularEstadisticas(datos, campo);
  const comparacion = compararPeriodos(datos, campo);
  const rango = getRangoNormal(tipo);
  
  let mensaje = `Resumen de ${getNombreSignoVital(tipo)}. `;
  
  if (tendencia.tendencia !== 'insuficiente') {
    mensaje += `Tendencia: ${tendencia.mensaje}. `;
    mensaje += `Cambio promedio: ${tendencia.cambioPromedio} ${rango.unidad}. `;
  }
  
  if (estadisticas) {
    mensaje += `Promedio: ${estadisticas.promedio} ${rango.unidad}. `;
    mensaje += `Rango: de ${estadisticas.minimo} a ${estadisticas.maximo} ${rango.unidad}. `;
    mensaje += `Estabilidad: ${estadisticas.estabilidad}. `;
  }
  
  if (comparacion) {
    mensaje += `Comparado con el mes anterior: ${comparacion.mensaje}. `;
    mensaje += `Diferencia: ${comparacion.diferencia} ${rango.unidad}. `;
  }
  
  const ultimoValor = datos[0]?.[campo];
  if (ultimoValor) {
    mensaje += `Último valor: ${ultimoValor.toFixed(2)} ${rango.unidad}. `;
    if (rango.min && rango.max) {
      if (ultimoValor < rango.min) {
        mensaje += 'Valor bajo del rango normal.';
      } else if (ultimoValor > rango.max) {
        mensaje += 'Valor alto del rango normal.';
      } else {
        mensaje += 'Valor dentro del rango normal.';
      }
    }
  }
  
  return mensaje;
};
```

---

## 📱 CÓMO MOSTRARLO

### **Para PACIENTES (Interfaz Simplificada):**

#### **1. Card de Resumen Evolutivo:**

```
┌─────────────────────────────────────┐
│  Evolución: Glucosa                 │
│  ─────────────────────────────────  │
│                                     │
│  Tendencia: 📉 Mejorando            │
│  Último mes: 125.5 mg/dL            │
│  Mes anterior: 138.2 mg/dL           │
│  Cambio: -12.7 mg/dL (-9.2%)        │
│                                     │
│  [Barra de progreso visual]        │
│  ████████████░░░░░░░░ 60%          │
│                                     │
│  [🔊 Escuchar Resumen]              │
│  [Ver Gráfica Detallada]            │
└─────────────────────────────────────┘
```

#### **2. Mejoras en la Gráfica Existente:**

- ✅ Agregar línea de tendencia (punteada)
- ✅ Zona sombreada de rango normal
- ✅ Líneas de referencia (min/max)
- ✅ Estadísticas debajo de la gráfica

#### **3. Sección de Estadísticas:**

```
┌─────────────────────────────────────┐
│  Estadísticas (6 meses)             │
│  ─────────────────────────────────  │
│                                     │
│  Promedio: 125.5 mg/dL              │
│  Mínimo: 98 mg/dL                   │
│  Máximo: 165 mg/dL                  │
│  Estabilidad: ✅ Estable             │
└─────────────────────────────────────┘
```

---

### **Para ADMIN/DOCTORES (Interfaz Completa):**

#### **1. Dashboard Evolutivo:**

```
┌─────────────────────────────────────────┐
│  Análisis Evolutivo                     │
│  ─────────────────────────────────────  │
│                                         │
│  [Selector de Signo Vital]             │
│  [Selector de Período: 1m, 3m, 6m, 1a] │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │ Gráfica con:                     │  │
│  │ - Línea de datos                 │  │
│  │ - Línea de tendencia              │  │
│  │ - Zona de rango normal            │  │
│  │ - Líneas de referencia            │  │
│  └─────────────────────────────────┘  │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │ Tendencia: Mejorando              │  │
│  │ Pendiente: -0.85 mg/dL/día        │  │
│  │ R²: 0.72 (correlación moderada)  │  │
│  └─────────────────────────────────┘  │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │ Estadísticas                     │  │
│  │ Promedio | Mín | Máx | Desv. Est │  │
│  │ 125.5    | 98  | 165 | 18.3      │  │
│  └─────────────────────────────────┘  │
│                                         │
│  ┌─────────────────────────────────┐  │
│  │ Comparación de Períodos          │  │
│  │ Último mes vs Mes anterior       │  │
│  └─────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 🔧 IMPLEMENTACIÓN PRÁCTICA

### **Archivo: `utils/vitalSignsAnalysis.js`**

```javascript
// Funciones de análisis evolutivo
export const calcularTendencia = (datos, campo) => { /* ... */ };
export const calcularEstadisticas = (datos, campo) => { /* ... */ };
export const compararPeriodos = (datos, campo, dias) => { /* ... */ };
export const generarZonaRango = (rango, numPuntos) => { /* ... */ };
export const generarResumenEvolutivo = (datos, campo, tipo) => { /* ... */ };
```

### **Modificar: `GraficosEvolucion.js` (Paciente y Admin)**

```javascript
// Agregar importaciones
import { calcularTendencia, calcularEstadisticas, compararPeriodos, generarZonaRango } from '../../utils/vitalSignsAnalysis';

// Modificar prepararDatos para incluir tendencia
const { datos, tendencia } = prepararDatosConTendencia(selectedChart);

// Agregar estadísticas
const estadisticas = calcularEstadisticas(signosVitales, getCampoSignoVital(selectedChart));

// Agregar comparación de períodos
const comparacion = compararPeriodos(signosVitales, getCampoSignoVital(selectedChart));

// Modificar VictoryChart para incluir zona de rango y línea de tendencia
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### **Fase 1: Funciones de Análisis**
- [ ] Crear `utils/vitalSignsAnalysis.js`
- [ ] Implementar `calcularTendencia()`
- [ ] Implementar `calcularEstadisticas()`
- [ ] Implementar `compararPeriodos()`
- [ ] Implementar `generarZonaRango()`
- [ ] Implementar `generarResumenEvolutivo()`

### **Fase 2: Mejoras en Gráficas**
- [ ] Agregar línea de tendencia en VictoryChart
- [ ] Agregar zona de rango normal (sombreada)
- [ ] Agregar líneas de referencia (min/max)
- [ ] Mejorar formato de fechas en eje X

### **Fase 3: Componentes de Visualización**
- [ ] Crear componente `IndicadorEstado`
- [ ] Crear componente `EstadisticasCard` (para pacientes)
- [ ] Crear componente `TendenciaCard` (para pacientes)
- [ ] Crear componente `ComparacionPeriodosCard`

### **Fase 4: Integración**
- [ ] Modificar `GraficosEvolucion.js` (Paciente)
- [ ] Modificar `GraficosEvolucion.js` (Admin/Doctor)
- [ ] Agregar sección de estadísticas
- [ ] Agregar sección de comparación de períodos
- [ ] Integrar TTS con resumen evolutivo

### **Fase 5: Testing**
- [ ] Probar con datos reales (3+ registros)
- [ ] Probar con datos insuficientes (< 3 registros)
- [ ] Probar TTS con resumen evolutivo
- [ ] Verificar visualización en diferentes tamaños de pantalla

---

## 🎯 PRIORIDADES

### **Alta Prioridad:**
1. ✅ Línea de tendencia en gráficas
2. ✅ Zona de rango normal visual
3. ✅ Estadísticas básicas (promedio, min, max)

### **Media Prioridad:**
4. ✅ Comparación de períodos
5. ✅ Indicadores visuales mejorados
6. ✅ Resumen evolutivo con TTS

### **Baja Prioridad:**
7. ⚠️ Coeficiente de correlación (R²)
8. ⚠️ Análisis de variabilidad avanzado
9. ⚠️ Predicción de tendencias futuras

---

## 📝 NOTAS IMPORTANTES

1. **Compatibilidad:** Todas las mejoras son compatibles con la funcionalidad actual
2. **Datos mínimos:** Manejar casos con < 3 registros (mostrar mensaje apropiado)
3. **TTS:** Mantener resúmenes simples y claros para pacientes rurales
4. **Rendimiento:** Las funciones de análisis son ligeras y no afectan el rendimiento
5. **Visualización:** Mantener diseño simple para pacientes, completo para médicos

---

**Conclusión:** Estas mejoras mejoran significativamente la evaluación evolutiva sin cambiar la estructura actual, solo agregando análisis más profundos y visualizaciones más informativas.
