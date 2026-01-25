# Componente: Gráfico de Barras Mensual de Signos Vitales

## 📊 Descripción

Componente interactivo que muestra un gráfico de barras donde cada barra representa un mes, ordenado de **peor a mejor resultado** según un score consolidado de salud basado en todos los signos vitales registrados.

## ✨ Características

1. **Agrupación por mes**: Agrupa automáticamente todos los signos vitales por mes
2. **Ordenamiento inteligente**: Ordena las barras de peor a mejor resultado según score consolidado
3. **Score de salud**: Calcula un score (0-100) basado en:
   - Presión arterial sistólica
   - Glucosa
   - IMC
   - Peso
4. **Interactividad**: Al presionar una barra, muestra desglose detallado del mes
5. **Colores indicativos**:
   - 🔴 Rojo: Score ≥ 50 (Estado crítico)
   - 🟠 Naranja: Score 25-49 (Estado regular)
   - 🟢 Verde: Score < 25 (Estado bueno)
6. **Diseño móvil**: Optimizado para pantallas móviles con diseño responsive

## 📦 Instalación

El componente utiliza las siguientes dependencias (ya instaladas):

- `victory-native`: ^36.9.2
- `react-native-svg`: ^15.14.0
- `date-fns`: ^4.1.0

## 🚀 Uso Básico

```jsx
import MonthlyVitalSignsBarChart from '../components/charts/MonthlyVitalSignsBarChart';

// Con datos simulados
const datosSimulados = [
  {
    fecha_medicion: '2024-01-15T10:00:00',
    presion_sistolica: 150,
    presion_diastolica: 95,
    glucosa_mg_dl: 140,
    peso_kg: 85,
    imc: 28.5,
  },
  // ... más registros
];

<MonthlyVitalSignsBarChart 
  signosVitales={datosSimulados}
  loading={false}
/>
```

## 🔌 Integración con API Real

```jsx
import MonthlyVitalSignsBarChart from '../components/charts/MonthlyVitalSignsBarChart';
import { usePacienteSignosVitales } from '../hooks/usePacienteMedicalData';

const MiComponente = () => {
  const { userData } = useAuth();
  const pacienteId = userData?.id_paciente;

  const {
    signosVitales,
    loading,
  } = usePacienteSignosVitales(pacienteId, {
    getAll: true, // Obtener todos los signos vitales
    sort: 'ASC',
    autoFetch: !!pacienteId,
  });

  return (
    <MonthlyVitalSignsBarChart 
      signosVitales={signosVitales || []}
      loading={loading}
    />
  );
};
```

## 📋 Props

| Prop | Tipo | Requerido | Descripción |
|------|------|-----------|-------------|
| `signosVitales` | `Array` | Sí | Array de objetos con signos vitales. Cada objeto debe tener `fecha_medicion`, `fecha_registro` o `fecha_creacion`, y al menos uno de: `presion_sistolica`, `glucosa_mg_dl`, `peso_kg`, `imc` |
| `loading` | `Boolean` | No | Indica si los datos se están cargando. Muestra un spinner mientras carga |

## 📊 Estructura de Datos

Cada objeto en el array `signosVitales` debe tener la siguiente estructura:

```javascript
{
  id: 1, // Opcional
  fecha_medicion: '2024-01-15T10:00:00', // ISO string o Date
  fecha_registro: '2024-01-15T10:00:00', // Alternativa a fecha_medicion
  fecha_creacion: '2024-01-15T10:00:00', // Alternativa a fecha_medicion
  presion_sistolica: 120, // Opcional
  presion_diastolica: 80, // Opcional
  glucosa_mg_dl: 95, // Opcional
  peso_kg: 75, // Opcional
  imc: 25.5, // Opcional
}
```

## 🎯 Cálculo del Score

El score se calcula evaluando cada signo vital registrado en el mes:

### Presión Arterial Sistólica
- **> 140 mmHg**: +25 puntos (Hipertensión)
- **120-140 mmHg**: +10 puntos (Pre-hipertensión)
- **< 90 mmHg**: +20 puntos (Hipotensión)
- **90-120 mmHg**: 0 puntos (Normal)

### Glucosa
- **> 126 mg/dL**: +25 puntos (Diabetes)
- **100-126 mg/dL**: +15 puntos (Pre-diabetes)
- **< 70 mg/dL**: +20 puntos (Hipoglucemia)
- **70-100 mg/dL**: 0 puntos (Normal)

### IMC
- **> 30**: +20 puntos (Obesidad)
- **25-30**: +10 puntos (Sobrepeso)
- **< 18.5**: +15 puntos (Bajo peso)
- **18.5-25**: 0 puntos (Normal)

El score final se normaliza a un rango de 0-100, donde:
- **0-24**: Estado bueno (Verde)
- **25-49**: Estado regular (Naranja)
- **50-100**: Estado crítico (Rojo)

## 🎨 Desglose del Mes

Al presionar una barra, se muestra un modal con:

1. **Resumen del mes**:
   - Total de mediciones
   - Score de salud

2. **Desglose por tipo de signo vital**:
   - 📊 Presión Arterial
   - 🩸 Glucosa
   - ⚖️ Peso
   - 📏 IMC

3. **Lista de registros individuales**:
   - Fecha y hora de cada medición
   - Valor registrado
   - Máximo 10 registros por tipo (con indicador "+X más" si hay más)

## 📱 Diseño Responsive

- El gráfico se adapta automáticamente al ancho de la pantalla
- Ancho del gráfico: `SCREEN_WIDTH - 40px`
- Altura del gráfico: `300px`
- Etiquetas del eje X rotadas -45° para mejor legibilidad

## 🔧 Personalización

### Cambiar colores de las barras

Edita la función `getBarColor` en el componente:

```javascript
const getBarColor = (score) => {
  if (score >= 50) return '#F44336'; // Rojo
  if (score >= 25) return '#FF9800'; // Naranja
  return '#4CAF50'; // Verde
};
```

### Ajustar umbrales del score

Modifica los valores en la función `calcularScoreConsolidado`:

```javascript
// Ejemplo: Cambiar umbral de hipertensión
if (presion > 140) scoreTotal += 25; // Ajustar este valor
```

## 🐛 Solución de Problemas

### El gráfico no muestra datos

1. Verifica que `signosVitales` sea un array válido
2. Asegúrate de que los objetos tengan al menos una fecha válida
3. Verifica que haya al menos un signo vital con valor numérico

### Las barras no son interactivas

1. Verifica que `VictoryBar` esté correctamente importado
2. Asegúrate de usar `onPressIn` en lugar de `onPress` (limitación de Victory Native)

### El modal no se muestra

1. Verifica que el componente `Modal` esté correctamente importado
2. Asegúrate de que `mesSeleccionado` no sea `null` antes de mostrar el modal

## 📝 Ejemplos Completos

Ver archivo: `src/components/charts/EjemploUsoMonthlyBarChart.js`

Incluye:
- Ejemplo con datos simulados
- Ejemplo con datos reales desde API
- Ejemplo para pantalla de detalle de paciente

## 🎯 Mejores Prácticas

1. **Carga de datos**: Usa `loading={true}` mientras se cargan los datos para mostrar un spinner
2. **Manejo de errores**: Implementa manejo de errores en el componente padre
3. **Performance**: El componente usa `useMemo` para optimizar el procesamiento de datos
4. **Accesibilidad**: El componente incluye colores contrastantes y texto legible

## 📚 Referencias

- [Victory Native Documentation](https://formidable.com/open-source/victory/docs/native/)
- [date-fns Documentation](https://date-fns.org/)
- [React Native Modal](https://reactnative.dev/docs/modal)
