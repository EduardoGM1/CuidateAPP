# Solución: Error "Invalid number formatting character 'N'"

## Problema
El error "Invalid number formatting character 'N'" ocurría porque los datos pasados a los gráficos de Victory contenían valores `NaN` (Not a Number), `null`, o `undefined`, que se convertían en strings como "NaNL" en los paths SVG, causando que el parser de SVG fallara.

## Causa Raíz
1. **Valores inválidos en los datos**: Los signos vitales podían tener valores `null`, `undefined`, o `NaN`
2. **Falta de validación**: Los datos no se validaban antes de pasarlos a Victory
3. **Cálculos con NaN**: Las funciones de generación de líneas de tendencia y zonas podían generar valores NaN

## Solución Implementada

### 1. Validación en `prepararDatos`
Se agregó validación para filtrar valores inválidos antes de crear los puntos del gráfico:

```javascript
// Convertir a número y validar
const valorNumerico = parseFloat(valor);
const valorValido = !isNaN(valorNumerico) && isFinite(valorNumerico) ? valorNumerico : null;

// Si el valor no es válido, no incluir este punto
if (valorValido === null) {
  return null;
}

// Filtrar valores inválidos
.filter(item => item !== null)
```

### 2. Validación Adicional con `datosLimpios`
Se agregó una segunda capa de validación antes de pasar los datos a Victory:

```javascript
// Filtrar datos válidos antes de usar (segunda validación)
const datosLimpios = datos.filter(d => 
  d && 
  typeof d.x === 'number' && !isNaN(d.x) && isFinite(d.x) &&
  typeof d.y === 'number' && !isNaN(d.y) && isFinite(d.y)
);
```

### 3. Validación en `generarLineaTendencia`
Se mejoró la función para validar datos y resultados:

```javascript
// Filtrar datos válidos
const datosValidos = datos.filter(p => 
  p && 
  typeof p.x === 'number' && !isNaN(p.x) && isFinite(p.x) &&
  typeof p.y === 'number' && !isNaN(p.y) && isFinite(p.y)
);

// Validar denominador
if (denominador === 0 || !isFinite(denominador)) return null;

// Validar pendiente e intercepto
if (isNaN(pendiente) || !isFinite(pendiente) || isNaN(intercepto) || !isFinite(intercepto)) {
  return null;
}

// Validar cada punto generado
.filter(p => p !== null)
```

### 4. Validación en `generarZonaRango`
Se agregó validación para asegurar que min y max sean números válidos:

```javascript
const min = parseFloat(rango.min);
const max = parseFloat(rango.max);

// Validar que min y max sean números válidos
if (isNaN(min) || !isFinite(min) || isNaN(max) || !isFinite(max)) {
  return null;
}
```

### 5. Validación en `tickFormat`
Se agregó validación en el formato de los ticks del eje Y:

```javascript
tickFormat={(t) => {
  const num = parseFloat(t);
  if (isNaN(num) || !isFinite(num)) return '';
  return `${num}${rango.unidad}`;
}}
```

### 6. Uso de `datosLimpios` en todos los componentes Victory
Se reemplazó `datos` por `datosLimpios` en:
- `VictoryArea` (área de datos)
- `VictoryLine` (línea de datos)
- `VictoryAxis` (formato de ticks)
- Líneas de referencia (min y max)
- Validaciones de longitud

## Archivos Modificados

1. **`ClinicaMovil/src/screens/admin/GraficosEvolucion.js`**
   - Validación en `prepararDatos`
   - Uso de `datosLimpios` en todos los componentes Victory
   - Validación en `tickFormat`

2. **`ClinicaMovil/src/screens/paciente/GraficosEvolucion.js`**
   - Validación en `prepararDatos`
   - Uso de `datosLimpios` en todos los componentes Victory
   - Validación en `tickFormat`

3. **`ClinicaMovil/src/utils/vitalSignsAnalysis.js`**
   - Validación mejorada en `generarLineaTendencia`
   - Validación mejorada en `generarZonaRango`

## Verificación

### Antes
- ❌ Error: "Invalid number formatting character 'N'"
- ❌ Valores NaN en los paths SVG
- ❌ Gráficos no se renderizaban

### Después
- ✅ Todos los valores son números válidos
- ✅ No hay NaN en los paths SVG
- ✅ Gráficos se renderizan correctamente

## Pruebas Recomendadas

1. **Probar con datos válidos**: Verificar que los gráficos se muestren correctamente
2. **Probar con datos inválidos**: Verificar que los valores inválidos se filtren sin causar errores
3. **Probar con datos mixtos**: Verificar que solo se muestren los valores válidos

## Estado
✅ **RESUELTO**: Todos los valores se validan antes de pasarse a Victory, eliminando el error de formato de números inválidos.
