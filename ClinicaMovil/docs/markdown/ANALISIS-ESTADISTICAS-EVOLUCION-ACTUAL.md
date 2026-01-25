# Análisis: Estadísticas y Métricas de Evolución del Paciente

## 📊 Estadísticas Actualmente Mostradas

### 1. **Estadísticas Descriptivas** (Sección "Estadísticas")

Se calculan usando la función `calcularEstadisticas()` y se muestran en una grilla:

#### Métricas Calculadas:

1. **Promedio (Media Aritmética)**
   - **Cálculo**: `suma de valores / número de valores`
   - **Fórmula**: `Σ(valores) / n`
   - **Mostrado como**: `{promedio} {unidad}` (ej: "125.5 mmHg")

2. **Mínimo**
   - **Cálculo**: `Math.min(...valores)`
   - **Mostrado como**: `{minimo} {unidad}` (ej: "110.0 mmHg")

3. **Máximo**
   - **Cálculo**: `Math.max(...valores)`
   - **Mostrado como**: `{maximo} {unidad}` (ej: "140.0 mmHg")

4. **Desviación Estándar**
   - **Cálculo**: 
     - Varianza: `Σ(valor - promedio)² / n`
     - Desviación: `√(varianza)`
   - **Mostrado como**: `{desviacion} {unidad}` (ej: "8.5 mmHg")
   - **Interpretación**: Mide la dispersión de los datos

5. **Coeficiente de Variación**
   - **Cálculo**: `(desviación / promedio) × 100`
   - **Mostrado como**: `{coeficienteVariacion}%` (ej: "6.8%")
   - **Interpretación**: Variabilidad relativa (normalizada por el promedio)

6. **Estabilidad**
   - **Cálculo basado en Coeficiente de Variación**:
     - **Estable**: CV ≤ 10% (verde)
     - **Moderadamente variable**: 10% < CV ≤ 20% (naranja)
     - **Variable**: CV > 20% (rojo)
   - **Mostrado como**: Texto con color según estabilidad

7. **Total de Registros**
   - **Cálculo**: Número de valores válidos analizados
   - **Mostrado como**: "Total de registros: {totalRegistros}"

#### Visualización:
```
┌─────────────────────────────────┐
│ Estadísticas                    │
├─────────────────────────────────┤
│ Promedio    │ Mínimo  │ Máximo  │
│ 125.5 mmHg │ 110.0   │ 140.0   │
├─────────────────────────────────┤
│ Desv. Est. │ Coef.Var│ Estab.  │
│ 8.5 mmHg   │ 6.8%    │ Estable │
├─────────────────────────────────┤
│ Total de registros: 25          │
└─────────────────────────────────┘
```

### 2. **Tendencia** (Indicador de Tendencia)

Se calcula usando la función `calcularTendencia()` y se muestra como un banner:

#### Métricas Calculadas:

1. **Pendiente (Slope)**
   - **Cálculo**: Regresión lineal usando mínimos cuadrados
   - **Fórmula**: `(n × Σ(xy) - Σ(x) × Σ(y)) / (n × Σ(x²) - (Σ(x))²)`
   - **Interpretación**: 
     - Positiva: Valores aumentan con el tiempo
     - Negativa: Valores disminuyen con el tiempo
     - Cerca de 0: Valores estables

2. **Cambio Total**
   - **Cálculo**: `último valor - primer valor`
   - **Mostrado como**: `{cambioTotal} {unidad}` (ej: "+5.2 mmHg")

3. **Cambio Promedio**
   - **Cálculo**: `cambio total / número de puntos`
   - **Mostrado como**: `{cambioPromedio} {unidad}/punto`

4. **Primer Valor**
   - **Cálculo**: Primer valor válido en la serie temporal
   - **Mostrado como**: `{primerValor} {unidad}`

5. **Último Valor**
   - **Cálculo**: Último valor válido en la serie temporal
   - **Mostrado como**: `{ultimoValor} {unidad}`

6. **Días Transcurridos**
   - **Cálculo**: Diferencia en días entre primer y último registro
   - **Mostrado como**: `({diasTranscurridos} días)`

7. **Estado de Tendencia**
   - **Cálculo basado en pendiente y tipo de signo vital**:
     - **Mejorando** (verde): Pendiente negativa para valores donde menor es mejor
     - **Empeorando** (rojo): Pendiente positiva para valores donde menor es mejor
     - **Estable** (naranja): Pendiente cercana a cero
   - **Mostrado como**: Icono + mensaje con color

#### Visualización:
```
┌─────────────────────────────────┐
│ 📈 Tendencia: Mejorando (30 días)│
│ Cambio total: -5.2 mmHg        │
│ Pendiente: -0.1734 mmHg/punto  │
└─────────────────────────────────┘
```

### 3. **Comparación de Períodos** (Sección "Comparación de Períodos")

Se calcula usando la función `compararPeriodos()` y compara el último mes vs. el mes anterior:

#### Métricas Calculadas:

1. **Período Actual (Último mes)**
   - **Cálculo**: Promedio de valores en los últimos 30 días
   - **Mostrado como**: `{promedio} {unidad} ({registros} registros)`

2. **Período Anterior (Mes anterior)**
   - **Cálculo**: Promedio de valores en los 30 días anteriores
   - **Mostrado como**: `{promedio} {unidad} ({registros} registros)`

3. **Diferencia**
   - **Cálculo**: `promedio actual - promedio anterior`
   - **Mostrado como**: `{diferencia} {unidad}` (ej: "+2.5 mmHg")

4. **Porcentaje de Cambio**
   - **Cálculo**: `((diferencia / promedio anterior) × 100)`
   - **Mostrado como**: `{porcentaje}%` (ej: "2.1%")

5. **Estado de Comparación**
   - **Cálculo basado en diferencia y umbral significativo**:
     - **Mejoró** (verde): Diferencia negativa significativa para valores donde menor es mejor
     - **Aumentó** (rojo): Diferencia positiva significativa para valores donde menor es mejor
     - **Estable** (naranja): Diferencia dentro del umbral
   - **Mostrado como**: Mensaje con color

#### Visualización:
```
┌─────────────────────────────────┐
│ Comparación de Períodos         │
│ (Último mes vs Mes anterior)    │
├─────────────────────────────────┤
│ Último mes: 125.5 mmHg (8 reg.) │
│ Mes anterior: 128.0 mmHg (7 reg.)│
├─────────────────────────────────┤
│ Mejoró: -2.5 mmHg (2.0%)       │
└─────────────────────────────────┘
```

## 🔢 Cálculos Detallados

### Función: `calcularEstadisticas(datos, campo)`

**Ubicación**: `ClinicaMovil/src/utils/vitalSignsAnalysis.js`

**Proceso**:
1. **Filtrado de valores válidos**:
   ```javascript
   const valores = datos
     .map(s => parseFloat(s[campo]))
     .filter(v => v !== null && !isNaN(v));
   ```

2. **Cálculo de promedio**:
   ```javascript
   const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
   ```

3. **Cálculo de mínimo y máximo**:
   ```javascript
   const minimo = Math.min(...valores);
   const maximo = Math.max(...valores);
   ```

4. **Cálculo de desviación estándar**:
   ```javascript
   const varianza = valores.reduce((sum, v) => 
     sum + Math.pow(v - promedio, 2), 0) / valores.length;
   const desviacion = Math.sqrt(varianza);
   ```

5. **Cálculo de coeficiente de variación**:
   ```javascript
   const coeficienteVariacion = (desviacion / promedio) * 100;
   ```

6. **Determinación de estabilidad**:
   ```javascript
   if (coeficienteVariacion > 20) {
     estabilidad = 'variable'; // Rojo
   } else if (coeficienteVariacion > 10) {
     estabilidad = 'moderada'; // Naranja
   } else {
     estabilidad = 'estable'; // Verde
   }
   ```

### Función: `calcularTendencia(datos, campo)`

**Ubicación**: `ClinicaMovil/src/utils/vitalSignsAnalysis.js`

**Proceso**:
1. **Filtrado y ordenamiento**:
   ```javascript
   const valoresValidos = datos
     .filter(s => valor válido)
     .sort((a, b) => a.fecha - b.fecha); // Más antiguo primero
   ```

2. **Regresión lineal (mínimos cuadrados)**:
   ```javascript
   const n = valoresValidos.length;
   const sumX = valoresValidos.reduce((sum, v, i) => sum + i, 0);
   const sumY = valoresValidos.reduce((sum, v) => sum + v.valor, 0);
   const sumXY = valoresValidos.reduce((sum, v, i) => sum + i * v.valor, 0);
   const sumX2 = valoresValidos.reduce((sum, v, i) => sum + i * i, 0);
   
   const pendiente = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
   const intercepto = (sumY - pendiente * sumX) / n;
   ```

3. **Cálculo de cambios**:
   ```javascript
   const cambioTotal = ultimoValor - primerValor;
   const cambioPromedio = cambioTotal / n;
   ```

4. **Determinación de tendencia**:
   ```javascript
   if (pendiente > umbral) {
     tendencia = 'empeorando'; // Para valores donde menor es mejor
   } else if (pendiente < -umbral) {
     tendencia = 'mejorando';
   } else {
     tendencia = 'estable';
   }
   ```

### Función: `compararPeriodos(datos, campo, diasPeriodo = 30)`

**Ubicación**: `ClinicaMovil/src/utils/vitalSignsAnalysis.js`

**Proceso**:
1. **División en períodos**:
   ```javascript
   const ahora = new Date();
   const fechaLimiteActual = new Date(ahora - 30 días);
   const fechaLimiteAnterior = new Date(ahora - 60 días);
   
   const periodoActual = datos.filter(s => fecha >= fechaLimiteActual);
   const periodoAnterior = datos.filter(s => 
     fecha >= fechaLimiteAnterior && fecha < fechaLimiteActual);
   ```

2. **Cálculo de promedios**:
   ```javascript
   const promedioActual = periodoActual.reduce((sum, v) => sum + v, 0) / periodoActual.length;
   const promedioAnterior = periodoAnterior.reduce((sum, v) => sum + v, 0) / periodoAnterior.length;
   ```

3. **Cálculo de diferencia y porcentaje**:
   ```javascript
   const diferencia = promedioActual - promedioAnterior;
   const porcentaje = (diferencia / promedioAnterior) * 100;
   ```

4. **Determinación de estado**:
   ```javascript
   const umbralAbsoluto = getUmbralSignificativo(campo) * 5;
   if (Math.abs(diferencia) < umbralAbsoluto) {
     estado = 'igual'; // Estable
   } else if (diferencia < 0 && !esMejorValorMayor(campo)) {
     estado = 'mejoro'; // Mejoró
   } else {
     estado = 'empeoro'; // Empeoró
   }
   ```

## 📍 Dónde se Muestran

### Pantalla Admin/Doctor (`GraficosEvolucion.js`)

**Sección 1: Indicador de Tendencia** (Banner superior)
- Icono + mensaje de tendencia
- Días transcurridos
- Cambio total y pendiente

**Sección 2: Gráfico**
- Línea de datos
- Área sombreada
- Zona de rango normal
- Líneas de referencia (min/max)
- Línea de tendencia (punteada)

**Sección 3: Estadísticas** (Grid de 6 métricas)
- Promedio
- Mínimo
- Máximo
- Desviación Estándar
- Coeficiente de Variación
- Estabilidad
- Total de registros

**Sección 4: Comparación de Períodos**
- Promedio último mes
- Promedio mes anterior
- Diferencia y porcentaje
- Estado (Mejoró/Aumentó/Estable)

### Pantalla Paciente (`GraficosEvolucion.js`)

**Sección 1: Indicador de Tendencia** (Banner superior)
- Similar a admin pero más simplificado

**Sección 2: Gráfico**
- Similar a admin

**Sección 3: Estadísticas** (Grid de 4 métricas - simplificado)
- Promedio
- Mínimo
- Máximo
- Estabilidad
- (No muestra Desv. Est. ni Coef. Var.)

**Sección 4: Comparación de Períodos**
- Similar a admin

## 📊 Datos Utilizados

### Fuente de Datos
- **Hook**: `usePacienteSignosVitales(pacienteId, { getAll: true })`
- **Endpoint**: `GET /pacientes/${pacienteId}/signos-vitales`
- **Incluye**: 
  - Signos vitales de consultas (con `id_cita`)
  - Signos vitales de monitoreo continuo (sin `id_cita`)
- **Ordenamiento**: Cronológico (ASC para evolución completa)

### Campos Analizados por Tipo de Gráfico

1. **Presión**: `presion_sistolica`
2. **Glucosa**: `glucosa_mg_dl`
3. **Peso**: `peso_kg`
4. **IMC**: `imc` (calculado o del registro)

## 🎯 Umbrales y Criterios

### Umbrales de Estabilidad (Coeficiente de Variación)
- **Estable**: ≤ 10%
- **Moderadamente variable**: 10% - 20%
- **Variable**: > 20%

### Umbrales de Tendencia
- **Presión**: 0.5 mmHg por punto
- **Glucosa**: 1.0 mg/dL por punto
- **Peso**: 0.2 kg por punto
- **IMC**: 0.1 IMC por punto

### Umbrales de Comparación de Períodos
- **Umbral absoluto**: 5 × umbral de tendencia
- Si la diferencia es menor al umbral, se considera "Estable"

## 🔍 Limitaciones Actuales

1. **No hay correlaciones entre signos vitales**
   - No se analiza la relación entre diferentes signos vitales
   - Ejemplo: No se muestra si presión alta correlaciona con glucosa alta

2. **No hay análisis de síndrome metabólico**
   - No se evalúa como conjunto de condiciones
   - No se muestra riesgo combinado

3. **Estadísticas básicas**
   - No hay percentiles (25, 50, 75, 90)
   - No hay moda
   - No hay análisis de outliers

4. **Comparación limitada**
   - Solo compara último mes vs. mes anterior
   - No hay comparación con períodos personalizados
   - No hay comparación con valores objetivo

5. **Tendencia simple**
   - Solo regresión lineal
   - No detecta cambios de tendencia (puntos de inflexión)
   - No analiza estacionalidad

## 📈 Visualización Actual

### Layout Admin/Doctor:
```
┌─────────────────────────────────────┐
│ [Selector: Presión/Glucosa/Peso/IMC]│
├─────────────────────────────────────┤
│ 📈 Tendencia: Mejorando (30 días)   │
│ Cambio: -5.2 mmHg | Pendiente: -0.17│
├─────────────────────────────────────┤
│ [Gráfico con línea, área, tendencia]│
├─────────────────────────────────────┤
│ Estadísticas:                       │
│ Promedio | Mínimo | Máximo          │
│ Desv.Est | Coef.Var | Estabilidad   │
│ Total: 25 registros                 │
├─────────────────────────────────────┤
│ Comparación de Períodos:            │
│ Último mes: 125.5 (8 reg.)          │
│ Mes anterior: 128.0 (7 reg.)       │
│ Mejoró: -2.5 mmHg (2.0%)            │
└─────────────────────────────────────┘
```

### Layout Paciente (Simplificado):
```
┌─────────────────────────────────────┐
│ [Selector: Presión/Glucosa/Peso/IMC]│
├─────────────────────────────────────┤
│ 📈 Tendencia: Mejorando             │
├─────────────────────────────────────┤
│ [Gráfico simplificado]              │
├─────────────────────────────────────┤
│ Estadísticas:                       │
│ Promedio | Mínimo | Máximo          │
│ Estabilidad                         │
├─────────────────────────────────────┤
│ Comparación: Último mes vs Anterior │
└─────────────────────────────────────┘
```

## Estado Actual
✅ **Implementado y Funcionando**:
- Estadísticas descriptivas básicas
- Cálculo de tendencia con regresión lineal
- Comparación de períodos (último mes vs anterior)
- Visualización en cards organizados
- Diferenciación Admin/Paciente
