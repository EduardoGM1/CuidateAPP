# 🏥 PLAN DE IMPLEMENTACIÓN: Síndrome Metabólico

**Fecha:** 2025-01-27  
**Objetivo:** Analizar e implementar el análisis de síndrome metabólico como conjunto de 3 o más condiciones

---

## 📋 RESUMEN EJECUTIVO

### **Definición:**
El **Síndrome Metabólico** se diagnostica cuando un paciente cumple **3 o más de 5 criterios** relacionados con obesidad, presión arterial, glucosa, triglicéridos y colesterol HDL.

### **Alcance:**
- ✅ **Análisis disponible para:** Pacientes, Doctores y Administradores
- ✅ **Correlaciones:** Solo para Doctores y Administradores (análisis avanzado)
- ✅ **Visualización:** Diferente según el rol (simplificada para pacientes, completa para médicos)

---

## 🔍 ANÁLISIS DE CAMPOS DISPONIBLES

### **Campos en `SignoVital` (Backend):**

| Campo | Tipo | Disponible | Uso en Síndrome Metabólico |
|-------|------|------------|---------------------------|
| `peso_kg` | DECIMAL(6,2) | ✅ | Calcular IMC |
| `talla_m` | DECIMAL(4,2) | ✅ | Calcular IMC |
| `imc` | DECIMAL(6,2) | ✅ | **Criterio 1:** Obesidad |
| `medida_cintura_cm` | DECIMAL(6,2) | ✅ | **Criterio 1:** Obesidad (alternativa) |
| `presion_sistolica` | TEXT (encriptado) | ✅ | **Criterio 2:** Presión arterial |
| `presion_diastolica` | TEXT (encriptado) | ✅ | **Criterio 2:** Presión arterial |
| `glucosa_mg_dl` | TEXT (encriptado) | ✅ | **Criterio 3:** Glucosa |
| `hba1c_porcentaje` | TEXT (encriptado) | ✅ | **Criterio 3:** Glucosa (alternativa) |
| `trigliceridos_mg_dl` | TEXT (encriptado) | ✅ | **Criterio 4:** Triglicéridos |
| `colesterol_hdl` | TEXT (encriptado) | ✅ | **Criterio 5:** HDL bajo |
| `colesterol_mg_dl` | TEXT (encriptado) | ✅ | No usado en criterios (solo referencia) |
| `colesterol_ldl` | TEXT (encriptado) | ✅ | No usado en criterios (solo referencia) |

### **Campos en `Paciente` (Backend):**

| Campo | Tipo | Uso en Síndrome Metabólico |
|-------|------|---------------------------|
| `sexo` | ENUM('Hombre', 'Mujer') | **Criterio 1 y 5:** Valores diferentes según sexo |
| `fecha_nacimiento` | TEXT (encriptado) | Calcular edad (para contexto) |

---

## 🎯 LOS 5 CRITERIOS DEL SÍNDROME METABÓLICO

### **Criterio 1: Obesidad Abdominal** ✅

**Definición:**
- **Hombres:** Circunferencia de cintura ≥ 102 cm (40 pulgadas)
- **Mujeres:** Circunferencia de cintura ≥ 88 cm (35 pulgadas)
- **Alternativa:** IMC ≥ 30

**Lógica de Evaluación:**
```javascript
const evaluarObesidad = (signoVital, paciente) => {
  // Prioridad 1: Usar medida de cintura si está disponible
  if (signoVital.medida_cintura_cm) {
    const umbralCintura = paciente.sexo === 'Hombre' ? 102 : 88;
    return parseFloat(signoVital.medida_cintura_cm) >= umbralCintura;
  }
  
  // Prioridad 2: Usar IMC si está disponible
  if (signoVital.imc) {
    return parseFloat(signoVital.imc) >= 30;
  }
  
  // Prioridad 3: Calcular IMC desde peso y talla
  if (signoVital.peso_kg && signoVital.talla_m) {
    const imc = parseFloat(signoVital.peso_kg) / Math.pow(parseFloat(signoVital.talla_m), 2);
    return imc >= 30;
  }
  
  // Si no hay datos suficientes, retornar null (no se puede evaluar)
  return null;
};
```

**Estado:** ✅ **IMPLEMENTABLE** - Todos los campos necesarios están disponibles

---

### **Criterio 2: Presión Arterial Elevada** ✅

**Definición:**
- **Sistólica:** ≥ 130 mmHg
- **Diastólica:** ≥ 85 mmHg
- **O:** Paciente en tratamiento antihipertensivo (requiere campo adicional en diagnóstico)

**Lógica de Evaluación:**
```javascript
const evaluarPresion = (signoVital) => {
  const sistolica = parseFloat(signoVital.presion_sistolica);
  const diastolica = parseFloat(signoVital.presion_diastolica);
  
  if (!sistolica || !diastolica) return null;
  
  return sistolica >= 130 || diastolica >= 85;
};
```

**Estado:** ✅ **IMPLEMENTABLE** - Campos disponibles

**Nota:** El tratamiento antihipertensivo requeriría consultar diagnósticos o medicamentos, lo cual es más complejo. Por ahora, solo evaluamos valores directos.

---

### **Criterio 3: Glucosa Elevada** ✅

**Definición:**
- **Glucosa en ayunas:** ≥ 100 mg/dL
- **O:** HbA1c ≥ 5.7%
- **O:** Paciente en tratamiento para diabetes (requiere campo adicional)

**Lógica de Evaluación:**
```javascript
const evaluarGlucosa = (signoVital) => {
  // Prioridad 1: Usar glucosa en ayunas
  if (signoVital.glucosa_mg_dl) {
    return parseFloat(signoVital.glucosa_mg_dl) >= 100;
  }
  
  // Prioridad 2: Usar HbA1c
  if (signoVital.hba1c_porcentaje) {
    return parseFloat(signoVital.hba1c_porcentaje) >= 5.7;
  }
  
  return null;
};
```

**Estado:** ✅ **IMPLEMENTABLE** - Campos disponibles

---

### **Criterio 4: Triglicéridos Elevados** ✅

**Definición:**
- **Triglicéridos:** ≥ 150 mg/dL
- **O:** Paciente en tratamiento para triglicéridos (requiere campo adicional)

**Lógica de Evaluación:**
```javascript
const evaluarTrigliceridos = (signoVital) => {
  if (!signoVital.trigliceridos_mg_dl) return null;
  return parseFloat(signoVital.trigliceridos_mg_dl) >= 150;
};
```

**Estado:** ✅ **IMPLEMENTABLE** - Campo disponible

---

### **Criterio 5: Colesterol HDL Bajo** ✅

**Definición:**
- **Hombres:** < 40 mg/dL
- **Mujeres:** < 50 mg/dL
- **O:** Paciente en tratamiento para HDL bajo (requiere campo adicional)

**Lógica de Evaluación:**
```javascript
const evaluarHDL = (signoVital, paciente) => {
  if (!signoVital.colesterol_hdl) return null;
  
  const hdl = parseFloat(signoVital.colesterol_hdl);
  const umbralHDL = paciente.sexo === 'Hombre' ? 40 : 50;
  
  return hdl < umbralHDL;
};
```

**Estado:** ✅ **IMPLEMENTABLE** - Campo disponible

---

## 💻 FUNCIÓN COMPLETA DE CÁLCULO

```javascript
/**
 * Calcula el síndrome metabólico basado en los últimos signos vitales
 * @param {Object} signoVital - Último signo vital del paciente
 * @param {Object} paciente - Datos del paciente (sexo, fecha_nacimiento)
 * @returns {Object} Resultado del análisis
 */
const calcularSindromeMetabolico = (signoVital, paciente) => {
  if (!signoVital || !paciente) {
    return {
      estado: 'No evaluable',
      criteriosCumplidos: 0,
      totalCriterios: 5,
      criterios: {},
      riesgo: 'Desconocido',
      color: '#999999',
      mensaje: 'No hay datos suficientes para evaluar'
    };
  }

  // Evaluar cada criterio
  const criterios = {
    obesidad: evaluarObesidad(signoVital, paciente),
    presion: evaluarPresion(signoVital),
    glucosa: evaluarGlucosa(signoVital),
    trigliceridos: evaluarTrigliceridos(signoVital),
    hdlBajo: evaluarHDL(signoVital, paciente)
  };

  // Contar criterios cumplidos (solo los que se pudieron evaluar)
  const criteriosEvaluables = Object.values(criterios).filter(c => c !== null);
  const criteriosCumplidos = Object.values(criterios).filter(c => c === true).length;
  const criteriosNoEvaluables = Object.values(criterios).filter(c => c === null).length;

  // Determinar estado
  let estado = 'No presente';
  let riesgo = 'Bajo';
  let color = '#4CAF50'; // Verde
  let mensaje = '';

  if (criteriosNoEvaluables === 5) {
    // No se pudo evaluar ningún criterio
    return {
      estado: 'No evaluable',
      criteriosCumplidos: 0,
      totalCriterios: 5,
      criterios,
      riesgo: 'Desconocido',
      color: '#999999',
      mensaje: 'No hay datos suficientes para evaluar el síndrome metabólico'
    };
  }

  if (criteriosCumplidos >= 3) {
    estado = 'Presente';
    if (criteriosCumplidos === 5) {
      riesgo = 'Muy Alto';
      color = '#D32F2F'; // Rojo
      mensaje = 'Tienes síndrome metabólico con todos los criterios presentes. Consulta urgente con tu médico.';
    } else if (criteriosCumplidos === 4) {
      riesgo = 'Alto';
      color = '#F57C00'; // Naranja oscuro
      mensaje = 'Tienes síndrome metabólico con 4 de 5 criterios. Requiere atención médica inmediata.';
    } else {
      riesgo = 'Moderado';
      color = '#FF9800'; // Naranja
      mensaje = 'Tienes síndrome metabólico (3 de 5 criterios). Consulta con tu médico para plan de acción.';
    }
  } else if (criteriosCumplidos === 2) {
    estado = 'Riesgo';
    riesgo = 'Moderado';
    color = '#FFC107'; // Amarillo
    mensaje = 'Tienes 2 de 5 criterios. Estás en riesgo de desarrollar síndrome metabólico. Monitorea tus parámetros.';
  } else if (criteriosCumplidos === 1) {
    estado = 'Riesgo bajo';
    riesgo = 'Bajo';
    color = '#8BC34A'; // Verde claro
    mensaje = 'Tienes 1 de 5 criterios. Mantén hábitos saludables para prevenir el síndrome metabólico.';
  } else {
    estado = 'No presente';
    riesgo = 'Bajo';
    color = '#4CAF50'; // Verde
    mensaje = 'No presentas síndrome metabólico. Mantén tus hábitos saludables.';
  }

  return {
    estado,
    criteriosCumplidos,
    totalCriterios: 5,
    criteriosEvaluables: criteriosEvaluables.length,
    criteriosNoEvaluables,
    criterios,
    riesgo,
    color,
    mensaje,
    recomendacion: generarRecomendacion(criterios, criteriosCumplidos)
  };
};

/**
 * Genera recomendaciones específicas basadas en los criterios cumplidos
 */
const generarRecomendacion = (criterios, criteriosCumplidos) => {
  if (criteriosCumplidos < 3) {
    return 'Mantén hábitos saludables: dieta balanceada, ejercicio regular y controles médicos periódicos.';
  }

  const recomendaciones = [];
  
  if (criterios.obesidad) {
    recomendaciones.push('Bajar de peso mediante dieta y ejercicio');
  }
  if (criterios.presion) {
    recomendaciones.push('Controlar presión arterial con dieta baja en sodio y ejercicio');
  }
  if (criterios.glucosa) {
    recomendaciones.push('Controlar glucosa con dieta y posible medicación');
  }
  if (criterios.trigliceridos) {
    recomendaciones.push('Reducir triglicéridos con dieta baja en grasas y ejercicio');
  }
  if (criterios.hdlBajo) {
    recomendaciones.push('Aumentar HDL con ejercicio y dieta rica en grasas saludables');
  }

  return recomendaciones.join('. ') + '. Consulta con tu médico para un plan de tratamiento integral.';
};
```

---

## 🎨 VISUALIZACIÓN POR ROL

### **1. Para PACIENTES (Interfaz Simplificada)**

**Objetivo:** Mostrar información clara y simple, con TTS y diseño visual.

#### **Componente: `SindromeMetabolicoCard.js` (Paciente)**

```javascript
// Diseño simplificado con:
// - Estado grande y claro (Presente / No presente)
// - Contador visual (3/5 criterios)
// - Colores intuitivos (rojo = malo, verde = bueno)
// - Mensaje simple con TTS
// - Botón para ver detalles completos

┌─────────────────────────────────────┐
│  SÍNDROME METABÓLICO                │
│  ─────────────────────────────────  │
│                                     │
│  Estado: ⚠️ PRESENTE               │
│  Criterios: 3 de 5                  │
│  Riesgo: 🔴 MODERADO                │
│                                     │
│  [Barra de progreso visual]        │
│  ████████░░░░░░░░░░ 60%            │
│                                     │
│  Mensaje:                          │
│  "Tienes síndrome metabólico.      │
│   Consulta con tu médico."         │
│                                     │
│  [🔊 Escuchar] [Ver Detalles]      │
└─────────────────────────────────────┘
```

**Características:**
- ✅ Texto grande y legible
- ✅ Colores contrastantes (rojo/verde)
- ✅ Iconos visuales
- ✅ TTS para todo el contenido
- ✅ Máximo 3-4 opciones por pantalla
- ✅ Sin tablas complejas ni gráficas avanzadas

---

### **2. Para DOCTORES/ADMINISTRADORES (Interfaz Completa)**

**Objetivo:** Mostrar análisis detallado con todos los datos y gráficas.

#### **Componente: `SindromeMetabolicoDashboard.js` (Admin/Doctor)**

```javascript
// Diseño completo con:
// - Tabla detallada de criterios
// - Gráfica de evolución del score
// - Gráfica de radar (spider chart)
// - Comparación histórica
// - Recomendaciones específicas

┌─────────────────────────────────────────────┐
│  SÍNDROME METABÓLICO                        │
│  ─────────────────────────────────────────  │
│                                             │
│  Estado: PRESENTE (3/5 criterios)          │
│  Riesgo: MODERADO                           │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │ Criterio          │ Estado │ Valor   │  │
│  ├─────────────────────────────────────┤  │
│  │ Obesidad          │ ✅     │ IMC: 32 │  │
│  │ Presión           │ ✅     │ 135/88  │  │
│  │ Glucosa           │ ✅     │ 105     │  │
│  │ Triglicéridos     │ ❌     │ 120     │  │
│  │ HDL Bajo          │ ❌     │ 45      │  │
│  └─────────────────────────────────────┘  │
│                                             │
│  [Gráfica de evolución del score]          │
│  [Gráfica de radar con los 5 parámetros]   │
│                                             │
│  Recomendaciones:                          │
│  - Bajar de peso mediante dieta...        │
│  - Controlar presión arterial...           │
│  - Controlar glucosa...                    │
└─────────────────────────────────────────────┘
```

**Características:**
- ✅ Tablas detalladas
- ✅ Gráficas avanzadas (VictoryNative)
- ✅ Análisis histórico
- ✅ Comparación con valores anteriores
- ✅ Exportación de datos
- ✅ Recomendaciones clínicas detalladas

---

## 📊 GRÁFICAS PROPUESTAS

### **1. Gráfica de Evolución del Score**

**Tipo:** Línea temporal  
**Eje X:** Fecha de medición  
**Eje Y:** Número de criterios cumplidos (0-5)

```
Criterios Cumplidos
    ↑
  5 │                    ●
    │              ●
  4 │        ●
    │  ●
  3 │●
    └─────────────────────────→ Tiempo
    Ene  Feb  Mar  Apr  May  Jun

Leyenda:
- 0-2: ✅ Bajo riesgo
- 3: ⚠️ Síndrome metabólico presente
- 4-5: 🔴 Alto riesgo
```

---

### **2. Gráfica de Radar (Spider Chart)**

**Tipo:** Gráfica de radar  
**Ejes:** 5 ejes (uno por criterio)  
**Valores:** Normalizado (0-100%)

```
                    Obesidad
                     ↑
                    / \
                   /   \
                  /     \
                 /       \
                /         \
               /           \
              /             \
             /               \
            /                 \
           /                   \
          /                     \
         /                       \
        /                         \
       /                           \
      /                             \
     /                               \
    /                                 \
   /                                   \
  /                                     \
 └─────────────────────────────────────────┘
Presión ←──────────────────────────→ Glucosa
         Triglicéridos ←→ HDL
```

**Interpretación:**
- **Forma pequeña en el centro:** Todos los valores controlados ✅
- **Forma grande hacia afuera:** Múltiples valores fuera de rango ⚠️
- **Forma asimétrica:** Algunos valores peores que otros

---

### **3. Comparación de Componentes (Bar Chart)**

**Tipo:** Gráfica de barras  
**Eje X:** Componentes (Obesidad, Presión, Glucosa, Triglicéridos, HDL)  
**Eje Y:** Porcentaje de mejora

```
Progreso en Componentes
    ↑
100%│                    ████████
    │              ████████
 80%│        ████████
    │  ████████
 60%│████████
    └─────────────────────────→
     Obes  Pres  Gluc  Trig  HDL
```

---

## 🔧 IMPLEMENTACIÓN TÉCNICA

### **1. Crear Hook: `useSindromeMetabolico.js`**

```javascript
import { useState, useEffect, useCallback } from 'react';
import { usePacienteSignosVitales } from './usePacienteMedicalData';
import gestionService from '../api/gestionService';

export const useSindromeMetabolico = (pacienteId, paciente) => {
  const [analisis, setAnalisis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { signosVitales } = usePacienteSignosVitales(pacienteId);

  useEffect(() => {
    if (pacienteId && paciente && signosVitales?.length > 0) {
      calcularAnalisis();
    }
  }, [pacienteId, paciente, signosVitales]);

  const calcularAnalisis = useCallback(() => {
    try {
      const ultimoSigno = signosVitales[0]; // Más reciente
      const resultado = calcularSindromeMetabolico(ultimoSigno, paciente);
      setAnalisis(resultado);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [signosVitales, paciente]);

  return { analisis, loading, error, recalcular: calcularAnalisis };
};
```

---

### **2. Crear Componente para Pacientes: `SindromeMetabolicoCard.js`**

```javascript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSindromeMetabolico } from '../../hooks/useSindromeMetabolico';
import useTTS from '../../hooks/useTTS';

const SindromeMetabolicoCard = ({ pacienteId, paciente }) => {
  const { analisis, loading } = useSindromeMetabolico(pacienteId, paciente);
  const { speak } = useTTS();

  if (loading || !analisis) return null;

  const handleEscuchar = async () => {
    await speak(analisis.mensaje);
  };

  return (
    <View style={[styles.card, { borderColor: analisis.color }]}>
      <Text style={styles.title}>Síndrome Metabólico</Text>
      
      <View style={styles.estadoContainer}>
        <Text style={[styles.estado, { color: analisis.color }]}>
          {analisis.estado}
        </Text>
        <Text style={styles.criterios}>
          {analisis.criteriosCumplidos} de {analisis.totalCriterios} criterios
        </Text>
      </View>

      {/* Barra de progreso visual */}
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { 
              width: `${(analisis.criteriosCumplidos / analisis.totalCriterios) * 100}%`,
              backgroundColor: analisis.color
            }
          ]} 
        />
      </View>

      <Text style={styles.mensaje}>{analisis.mensaje}</Text>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity style={styles.button} onPress={handleEscuchar}>
          <Text style={styles.buttonText}>🔊 Escuchar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Ver Detalles</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};
```

---

### **3. Crear Componente para Admin/Doctor: `SindromeMetabolicoDashboard.js`**

```javascript
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryArea } from 'victory-native';
import { useSindromeMetabolico } from '../../hooks/useSindromeMetabolico';

const SindromeMetabolicoDashboard = ({ pacienteId, paciente, signosVitales }) => {
  const { analisis, loading } = useSindromeMetabolico(pacienteId, paciente);

  if (loading || !analisis) return null;

  return (
    <ScrollView style={styles.container}>
      {/* Header con estado */}
      <View style={styles.header}>
        <Text style={styles.title}>Síndrome Metabólico</Text>
        <Text style={[styles.estado, { color: analisis.color }]}>
          {analisis.estado} ({analisis.criteriosCumplidos}/{analisis.totalCriterios})
        </Text>
      </View>

      {/* Tabla de criterios */}
      <View style={styles.criteriosTable}>
        {Object.entries(analisis.criterios).map(([key, cumplido]) => (
          <View key={key} style={styles.criterioRow}>
            <Text style={styles.criterioLabel}>{getCriterioLabel(key)}</Text>
            <Text style={[styles.criterioEstado, cumplido ? styles.cumplido : styles.noCumplido]}>
              {cumplido === null ? 'N/A' : cumplido ? '✅' : '❌'}
            </Text>
          </View>
        ))}
      </View>

      {/* Gráfica de evolución */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Evolución del Score</Text>
        <VictoryChart>
          <VictoryAxis />
          <VictoryAxis dependentAxis />
          <VictoryArea data={prepararDatosEvolucion(signosVitales, paciente)} />
          <VictoryLine data={prepararDatosEvolucion(signosVitales, paciente)} />
        </VictoryChart>
      </View>

      {/* Recomendaciones */}
      <View style={styles.recomendacionesContainer}>
        <Text style={styles.recomendacionesTitle}>Recomendaciones</Text>
        <Text style={styles.recomendacionesText}>{analisis.recomendacion}</Text>
      </View>
    </ScrollView>
  );
};
```

---

## 📍 UBICACIÓN EN LA APLICACIÓN

### **Para Pacientes:**

1. **Pantalla:** `HistorialMedico.js`
   - Agregar card `SindromeMetabolicoCard` en la sección "Resumen"
   - Mostrar después de los signos vitales recientes

2. **Pantalla:** `GraficosEvolucion.js` (Paciente)
   - Agregar botón "Síndrome Metabólico" en el selector de gráficos
   - Mostrar gráfica de evolución del score

---

### **Para Admin/Doctores:**

1. **Pantalla:** `DetallePaciente.js`
   - Agregar sección "Síndrome Metabólico" en el dashboard
   - Mostrar `SindromeMetabolicoDashboard` completo

2. **Pantalla:** `GraficosEvolucion.js` (Admin/Doctor)
   - Agregar pestaña "Síndrome Metabólico"
   - Mostrar gráficas avanzadas (radar, evolución, comparación)

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### **Fase 1: Backend/Utils**
- [ ] Crear función `calcularSindromeMetabolico()` en `utils/`
- [ ] Crear función `evaluarObesidad()`
- [ ] Crear función `evaluarPresion()`
- [ ] Crear función `evaluarGlucosa()`
- [ ] Crear función `evaluarTrigliceridos()`
- [ ] Crear función `evaluarHDL()`
- [ ] Crear función `generarRecomendacion()`
- [ ] Probar con datos reales

### **Fase 2: Hooks**
- [ ] Crear hook `useSindromeMetabolico.js`
- [ ] Integrar con `usePacienteSignosVitales`
- [ ] Manejar estados de carga y error

### **Fase 3: Componentes Paciente**
- [ ] Crear `SindromeMetabolicoCard.js` (simplificado)
- [ ] Integrar TTS
- [ ] Agregar a `HistorialMedico.js`
- [ ] Agregar botón a `GraficosEvolucion.js` (paciente)

### **Fase 4: Componentes Admin/Doctor**
- [ ] Crear `SindromeMetabolicoDashboard.js` (completo)
- [ ] Crear gráfica de evolución del score
- [ ] Crear gráfica de radar (opcional, requiere librería adicional)
- [ ] Agregar a `DetallePaciente.js`
- [ ] Agregar pestaña a `GraficosEvolucion.js` (admin/doctor)

### **Fase 5: Testing**
- [ ] Probar con paciente sin síndrome metabólico (0 criterios)
- [ ] Probar con paciente en riesgo (1-2 criterios)
- [ ] Probar con síndrome metabólico presente (3+ criterios)
- [ ] Probar con datos incompletos (algunos criterios no evaluables)
- [ ] Probar TTS en interfaz de paciente
- [ ] Probar gráficas en interfaz de admin/doctor

---

## 🎯 PRIORIDADES

### **Alta Prioridad:**
1. ✅ Función de cálculo del síndrome metabólico
2. ✅ Componente simplificado para pacientes
3. ✅ Integración en `HistorialMedico.js` (paciente)

### **Media Prioridad:**
4. ✅ Componente completo para admin/doctor
5. ✅ Gráfica de evolución del score
6. ✅ Integración en `DetallePaciente.js` (admin/doctor)

### **Baja Prioridad:**
7. ⚠️ Gráfica de radar (requiere librería adicional)
8. ⚠️ Comparación histórica avanzada
9. ⚠️ Exportación de análisis

---

## 📝 NOTAS IMPORTANTES

1. **Datos Encriptados:** Los signos vitales están encriptados. Asegurar que se desencripten antes de calcular.

2. **Valores Nulos:** Manejar casos donde algunos criterios no se pueden evaluar (datos faltantes).

3. **Sexo del Paciente:** Requerido para criterios 1 y 5. Si no está disponible, usar valores conservadores.

4. **Último Signo Vital:** Usar el más reciente para el análisis actual. Para evolución, usar todos los signos vitales históricos.

5. **TTS para Pacientes:** Todo el contenido debe ser accesible por TTS, especialmente el mensaje principal.

---

**Conclusión:** Este plan permite implementar el análisis de síndrome metabólico de forma escalable, con visualizaciones apropiadas para cada rol y manteniendo la simplicidad para pacientes rurales.
