# 📊 FUNCIONAMIENTO ACTUAL: Análisis de Evolución de Pacientes

**Fecha:** 2025-01-27
**Estado:** Implementado y funcional

---

## 🎯 RESUMEN EJECUTIVO

La aplicación actualmente tiene **3 pantallas principales** para visualizar la evolución de pacientes basándose en signos vitales:

1. **GraficosEvolucion.js** (Pacientes)
2. **GraficosEvolucion.js** (Admin/Doctores)
3. **HistorialMedico.js** (Pacientes)

---

## 📱 PANTALLA 1: Gráficos de Evolución (Pacientes)

**Archivo:** `ClinicaMovil/src/screens/paciente/GraficosEvolucion.js`

### **Funcionalidades:**

#### **1. Tipos de Gráficos Disponibles:**
- ✅ **Presión Arterial** (sistólica)
- ✅ **Glucosa** (mg/dL)
- ✅ **Peso** (kg)
- ✅ **IMC** (Índice de Masa Corporal)

#### **2. Visualización:**
- **Librería:** Victory Native (VictoryLine, VictoryArea, VictoryChart)
- **Tipo de gráfica:** Línea con área sombreada
- **Animaciones:** Sí (800ms de duración)
- **Colores por tipo:**
  - Presión: Rojo (#D32F2F)
  - Glucosa: Azul (#1976D2)
  - Peso: Verde (#388E3C)
  - IMC: Naranja (#F57C00)

#### **3. Preparación de Datos:**
```javascript
// Filtra signos vitales según el tipo seleccionado
// Mapea a formato { x: índice, y: valor, fecha: string, valor: number }
// Ordena: más reciente primero
```

#### **4. Rangos Normales:**
- **Presión:** 90-140 mmHg
- **Glucosa:** 70-100 mg/dL
- **Peso:** Sin rango específico
- **IMC:** 18.5-24.9

#### **5. Características Especiales:**
- ✅ **TTS (Text-to-Speech):** Anuncia el gráfico al entrar
- ✅ **Caché:** 5 minutos de duración para optimizar rendimiento
- ✅ **Exportación:** Permite exportar gráficos como imágenes
- ✅ **Últimos valores:** Muestra los 5 valores más recientes con estado (Normal/Bajo/Alto)
- ✅ **Pull to refresh:** Actualiza datos manualmente
- ✅ **Responsive:** Se adapta al ancho de pantalla

#### **6. Métricas Mostradas:**
- Valor actual
- Fecha de cada medición
- Estado (Normal/Bajo/Alto) basado en rangos
- Lista de últimos 5 valores

---

## 📱 PANTALLA 2: Gráficos de Evolución (Admin/Doctores)

**Archivo:** `ClinicaMovil/src/screens/admin/GraficosEvolucion.js`

### **Funcionalidades:**

#### **1. Tipos de Gráficos:**
- ✅ Presión Arterial
- ✅ Glucosa
- ✅ Peso
- ✅ IMC

#### **2. Visualización:**
- **Librería:** Victory Native
- **Tipo:** Línea con área sombreada
- **Color:** Azul (#2196F3) para todos los tipos

#### **3. Preparación de Datos:**
- Similar a la versión de pacientes
- Carga hasta 100 registros de signos vitales
- Filtra según tipo seleccionado

#### **4. Diferencias con versión de pacientes:**
- ❌ No tiene TTS
- ❌ No tiene exportación
- ❌ No muestra últimos valores
- ❌ No tiene caché
- ✅ Interfaz más simple y profesional

---

## 📱 PANTALLA 3: Historial Médico (Pacientes)

**Archivo:** `ClinicaMovil/src/screens/paciente/HistorialMedico.js`

### **Funcionalidades Avanzadas:**

#### **1. Comparación de Signos Vitales:**
```javascript
calcularComparacion(campo)
```
- Compara **último valor vs. valor anterior**
- Calcula:
  - Diferencia absoluta
  - Porcentaje de cambio
  - Estado: "Mejoró", "Aumentó", "Estable"
  - Color según estado (Verde/Amarillo/Rojo)

#### **2. Criterios de Comparación:**

**Presión Arterial:**
- Mejoró: diferencia < -5
- Aumentó: diferencia > 5
- Estable: diferencia entre -5 y 5

**Glucosa:**
- Mejoró: diferencia < -5
- Aumentó: diferencia > 5
- Estable: diferencia entre -5 y 5

**Peso:**
- Mejoró: diferencia < -5
- Aumentó: diferencia > 5
- Estable: diferencia entre -5 y 5

**Saturación de Oxígeno:**
- Mejoró: diferencia > 2
- Disminuyó: diferencia < -2
- Estable: diferencia entre -2 y 2

#### **3. Gráfico Evolutivo (Índice de Salud):**

**Características:**
- Muestra evolución de **últimos 6 meses**
- Máximo **12 registros** mostrados
- Calcula un **"Índice de Salud" (0-100)** basado en múltiples signos vitales

**Cálculo del Índice de Salud:**
```javascript
// Normaliza cada signo vital a escala 0-100:
// - Peso: 50-100kg = 0-100
// - Presión sistólica: 120 = 100, 180 = 0
// - Glucosa: 100 = 100, 200 = 0
// - Saturación: 90 = 0, 100 = 100
// Promedio de todos los signos vitales disponibles
```

#### **4. Signos Vitales Incluidos en el Índice:**
- Peso (kg)
- Presión sistólica (mmHg)
- Presión diastólica (mmHg)
- Glucosa (mg/dL)
- Saturación de oxígeno (%)
- Frecuencia cardíaca (bpm)
- Temperatura (°C)

#### **5. Visualización del Gráfico:**
- Gráfico de línea horizontal scrolleable
- Muestra índice de salud por fecha
- Etiquetas de fecha en formato corto
- Ancho mínimo por punto: 60px
- Altura: 220px

---

## 📊 MÉTRICAS Y ANÁLISIS ACTUALES

### **Métricas Implementadas:**

#### **1. Valores Individuales:**
- ✅ Valor actual de cada signo vital
- ✅ Fecha de medición
- ✅ Estado (Normal/Bajo/Alto) basado en rangos

#### **2. Comparaciones:**
- ✅ Último vs. Anterior (diferencia y porcentaje)
- ✅ Estado de cambio (Mejoró/Aumentó/Estable)
- ✅ Color indicativo del estado

#### **3. Tendencias:**
- ✅ Visualización temporal (gráficas de línea)
- ✅ Filtrado por últimos 6 meses
- ✅ Máximo 12 puntos de datos

#### **4. Índice Compuesto:**
- ✅ Índice de Salud (0-100)
- ✅ Basado en múltiples signos vitales
- ✅ Normalización de valores

---

## 🔍 ANÁLISIS DE COMORBILIDADES ACTUAL

### **Lo que SÍ hace:**
- ✅ Muestra evolución de signos vitales individuales
- ✅ Compara valores actuales vs. anteriores
- ✅ Calcula índice de salud general
- ✅ Visualiza tendencias temporales

### **Lo que NO hace (Oportunidades de mejora):**
- ❌ **No analiza comorbilidades específicas** (diabetes, hipertensión, etc.)
- ❌ **No calcula Time in Range (TIR)** para glucosa o presión
- ❌ **No muestra correlaciones** entre signos vitales
- ❌ **No calcula scores de riesgo** (cardiovascular, metabólico)
- ❌ **No analiza patrones temporales** (hora del día, día de la semana)
- ❌ **No muestra rangos objetivos clínicos** personalizados
- ❌ **No calcula variabilidad** (desviación estándar, CV)
- ❌ **No analiza síndrome metabólico** como conjunto
- ❌ **No muestra HbA1c** en gráficos (solo glucosa puntual)
- ❌ **No analiza perfil lipídico** (colesterol, triglicéridos) en evolución

---

## 📈 TIPOS DE GRÁFICAS ACTUALES

### **1. Gráficas de Línea con Área:**
- ✅ Presión arterial
- ✅ Glucosa
- ✅ Peso
- ✅ IMC
- ✅ Índice de salud (en HistorialMedico)

### **2. Visualización de Valores:**
- ✅ Lista de últimos valores
- ✅ Estado por valor (Normal/Bajo/Alto)
- ✅ Fechas de medición

---

## 🎨 CARACTERÍSTICAS DE INTERFAZ

### **Pacientes:**
- ✅ Diseño accesible con TTS
- ✅ Colores diferenciados por tipo de gráfico
- ✅ Exportación de gráficos
- ✅ Caché para optimización
- ✅ Feedback háptico y auditivo

### **Admin/Doctores:**
- ✅ Interfaz profesional y limpia
- ✅ Visualización simple y directa
- ✅ Carga de datos desde API

---

## 🔄 FLUJO DE DATOS

### **1. Carga de Datos:**
```
API → gestionService.getSignosVitalesByPaciente()
  → Filtrado por tipo de gráfico
  → Mapeo a formato de gráfico
  → Ordenamiento temporal
  → Visualización
```

### **2. Procesamiento:**
- Filtrado de signos vitales según tipo
- Normalización de fechas
- Cálculo de índices y comparaciones
- Preparación para visualización

### **3. Visualización:**
- Victory Native para gráficos
- Componentes React Native para listas
- Estilos personalizados por tipo

---

## 📝 LIMITACIONES ACTUALES

### **1. Análisis de Comorbilidades:**
- ❌ No hay análisis específico por comorbilidad
- ❌ No se consideran múltiples signos vitales simultáneamente para diagnóstico
- ❌ No hay alertas basadas en comorbilidades

### **2. Métricas Avanzadas:**
- ❌ No se calcula Time in Range (TIR)
- ❌ No se calcula variabilidad
- ❌ No se calculan scores de riesgo
- ❌ No se analizan correlaciones

### **3. Visualizaciones:**
- ❌ No hay gráficas de dispersión
- ❌ No hay heatmaps
- ❌ No hay gráficas de radar
- ❌ No hay comparación de múltiples parámetros en un gráfico

### **4. Personalización:**
- ❌ No hay objetivos clínicos personalizados
- ❌ No hay filtros de período de tiempo
- ❌ No hay comparación con valores de referencia

---

## ✅ FORTALEZAS ACTUALES

1. **Visualización clara:** Gráficas fáciles de entender
2. **Comparaciones básicas:** Último vs. anterior funciona bien
3. **Índice de salud:** Concepto innovador para resumir estado general
4. **Accesibilidad:** TTS para pacientes rurales
5. **Rendimiento:** Caché implementado
6. **Exportación:** Permite compartir gráficos

---

## 🎯 RESUMEN

**Estado Actual:**
- ✅ Funcionalidad básica de evolución implementada
- ✅ Visualización de tendencias temporales
- ✅ Comparaciones simples (último vs. anterior)
- ✅ Índice de salud compuesto
- ⚠️ Falta análisis avanzado de comorbilidades
- ⚠️ Falta métricas profesionales (TIR, variabilidad, scores)
- ⚠️ Falta visualizaciones avanzadas (heatmaps, dispersión, radar)

**Próximos Pasos Recomendados:**
1. Implementar análisis específico por comorbilidad
2. Agregar métricas profesionales (TIR, variabilidad)
3. Implementar visualizaciones avanzadas
4. Agregar análisis de correlaciones
5. Calcular scores de riesgo
