# 📱 Funcionalidades y Datos Disponibles - Interfaz Paciente

## 🎯 Pantallas Disponibles

### 1. **InicioPaciente** (Pantalla Principal)
**Ubicación:** `src/screens/paciente/InicioPaciente.js`

#### Funcionalidades:
- ✅ Saludo personalizado con nombre del paciente
- ✅ Botón de audio para escuchar el saludo
- ✅ Navegación a 4 opciones principales:
  - 📅 Mis Citas
  - 💓 Signos Vitales
  - 💊 Mis Medicamentos
  - 📋 Mi Historia
- ✅ Botón de cerrar sesión
- ✅ Text-to-Speech (TTS) integrado
- ✅ Feedback háptico

#### Datos Mostrados:
- Nombre del paciente (extraído de `paciente.nombre` o `userData.nombre`)
- Datos básicos del paciente desde `usePacienteData()`

---

### 2. **MisCitas** (Gestión de Citas)
**Ubicación:** `src/screens/paciente/MisCitas.js`

#### Funcionalidades:
- ✅ Lista de citas médicas del paciente
- ✅ Filtrado de citas futuras y recientes (últimas 24h)
- ✅ Ordenamiento por fecha (próximas primero)
- ✅ Pull-to-refresh para actualizar datos
- ✅ Formato de fecha amigable (Hoy, Mañana, Fecha específica)
- ✅ TTS para cada cita
- ✅ Indicadores visuales de estado

#### Datos Obtenidos:
- **Endpoint:** `GET /api/paciente/:id/citas`
- **Datos mostrados:**
  - Fecha de la cita (`fecha_cita`)
  - Hora de la cita
  - Doctor asignado (`doctor.nombre`, `doctor.apellido_paterno`)
  - Motivo de la cita (`motivo`)
  - Estado de asistencia (`asistencia`)
  - Primera consulta (`es_primera_consulta`)
  - Observaciones (`observaciones`)

#### Límites:
- Máximo 20 citas mostradas
- Solo citas futuras o de las últimas 24 horas

---

### 3. **RegistrarSignosVitales** (Registro de Datos de Salud)
**Ubicación:** `src/screens/paciente/RegistrarSignosVitales.js`

#### Funcionalidades:
- ✅ Formulario paso a paso (un campo a la vez)
- ✅ Validación de rangos para cada campo
- ✅ Text-to-Speech para instrucciones
- ✅ Feedback visual y háptico
- ✅ Validación antes de enviar

#### Campos del Formulario:
1. **Peso** (`peso_kg`)
   - Rango: 10-300 kg
   - Tipo: Número decimal

2. **Talla** (`talla_m`)
   - Rango: 0.5-2.5 metros
   - Tipo: Número decimal

3. **Presión Arterial Sistólica** (`presion_sistolica`)
   - Rango: 40-250 mmHg
   - Tipo: Número entero

4. **Presión Arterial Diastólica** (`presion_diastolica`)
   - Rango: 40-250 mmHg
   - Tipo: Número entero

5. **Glucosa** (`glucosa_mg_dl`)
   - Rango: 50-500 mg/dL
   - Tipo: Número decimal

6. **Colesterol** (`colesterol_mg_dl`)
   - Rango: 100-400 mg/dL
   - Tipo: Número decimal

7. **Triglicéridos** (`trigliceridos_mg_dl`)
   - Rango: 50-500 mg/dL
   - Tipo: Número decimal

8. **Medida de Cintura** (`medida_cintura_cm`)
   - Rango: 50-200 cm
   - Tipo: Número decimal

9. **Observaciones** (`observaciones`)
   - Tipo: Texto libre

#### Datos Enviados:
- **Endpoint:** `POST /api/signos-vitales`
- **Payload:**
  ```json
  {
    "id_paciente": number,
    "peso_kg": number,
    "talla_m": number,
    "presion_sistolica": number,
    "presion_diastolica": number,
    "glucosa_mg_dl": number,
    "colesterol_mg_dl": number,
    "trigliceridos_mg_dl": number,
    "medida_cintura_cm": number,
    "observaciones": string,
    "registrado_por": "paciente"
  }
  ```

#### Cálculos Automáticos:
- IMC (Índice de Masa Corporal) = peso / (talla²)

---

### 4. **MisMedicamentos** (Medicamentos y Horarios)
**Ubicación:** `src/screens/paciente/MisMedicamentos.js`

#### Funcionalidades:
- ✅ Lista de medicamentos del paciente
- ✅ Información de dosis y horarios
- ✅ Ordenamiento por horario
- ✅ Pull-to-refresh
- ✅ Tarjetas visuales para cada medicamento
- ✅ TTS para cada medicamento

#### Datos Obtenidos:
- **Endpoint:** `GET /api/paciente/:id/medicamentos`
- **Datos mostrados:**
  - Nombre del medicamento (`medicamento.nombre_medicamento`)
  - Dosis (`plan_detalle.dosis`)
  - Frecuencia (`plan_detalle.frecuencia`)
  - Horario (`plan_detalle.horario`)
  - Vía de administración (`plan_detalle.via_administracion`)
  - Duración del tratamiento
  - Observaciones

#### Procesamiento:
- Extrae información de `planes_medicacion` y `plan_detalle`
- Máximo 50 medicamentos mostrados
- Ordenados por horario (hora más temprana primero)

---

### 5. **HistorialMedico** (Historial Completo)
**Ubicación:** `src/screens/paciente/HistorialMedico.js`

#### Funcionalidades:
- ✅ Vista de resumen médico
- ✅ Tabs de navegación:
  - Resumen
  - Signos Vitales
  - Diagnósticos
  - Citas
- ✅ Pull-to-refresh
- ✅ Vista detallada de cada tipo de dato
- ✅ TTS integrado

#### Datos Obtenidos:

##### Resumen (`resumen`):
- **Endpoint:** `GET /api/paciente/:id/resumen`
- Totales de cada tipo de registro
- Últimos valores registrados

##### Signos Vitales (`signosVitales`):
- **Endpoint:** `GET /api/paciente/:id/signos-vitales`
- **Datos mostrados:**
  - Fecha de medición (`fecha_medicion`)
  - Peso (`peso_kg`)
  - Talla (`talla_m`)
  - IMC (`imc`)
  - Presión arterial (`presion_sistolica`/`presion_diastolica`)
  - Glucosa (`glucosa_mg_dl`)
  - Colesterol (`colesterol_mg_dl`)
  - Triglicéridos (`trigliceridos_mg_dl`)
  - Medida de cintura (`medida_cintura_cm`)
  - Observaciones

##### Diagnósticos (`diagnosticos`):
- **Endpoint:** `GET /api/paciente/:id/diagnosticos`
- **Datos mostrados:**
  - Fecha de registro (`fecha_registro`)
  - Fecha de cita asociada
  - Descripción (`descripcion`)
  - Información de la cita relacionada

##### Citas (`citas`):
- Mismas funcionalidades que la pantalla "Mis Citas"

#### Límites:
- Máximo 5-10 registros por tipo de dato (configurable)
- Ordenados por fecha más reciente primero

---

## 🔧 Hooks y Servicios Utilizados

### `usePacienteData()`
**Ubicación:** `src/hooks/usePacienteData.js`

#### Retorna:
```javascript
{
  paciente: {
    id_paciente,
    nombre,
    apellido_paterno,
    apellido_materno,
    nombre_completo,
    fecha_nacimiento,
    sexo,
    curp,
    direccion,
    localidad,
    numero_celular,
    institucion_salud,
    activo
  },
  loading,
  error,
  refresh,
  // Datos médicos
  citas,
  signosVitales,
  diagnosticos,
  medicamentos,
  resumen,
  // Totales
  totalCitas,
  totalSignosVitales,
  totalDiagnosticos,
  totalMedicamentos
}
```

### `usePacienteMedicalData()`
**Ubicación:** `src/hooks/usePacienteMedicalData.js`

#### Hooks individuales disponibles:
- `usePacienteCitas(pacienteId, options)`
- `usePacienteSignosVitales(pacienteId, options)`
- `usePacienteDiagnosticos(pacienteId, options)`
- `usePacienteMedicamentos(pacienteId, options)`
- `usePacienteResumenMedico(pacienteId, options)`
- `usePacienteRedApoyo(pacienteId, options)`
- `usePacienteEsquemaVacunacion(pacienteId, options)`

#### Características:
- ✅ Cache con TTL de 5 minutos
- ✅ Paginación (limit, offset)
- ✅ Ordenamiento (sort)
- ✅ Refresh manual
- ✅ Auto-fetch opcional
- ✅ Manejo de errores robusto

---

## 📡 Endpoints del Backend Utilizados

### Gestión de Pacientes:
- `GET /api/paciente/:id` - Obtener datos del paciente
- `GET /api/paciente/:id/citas` - Obtener citas del paciente
- `GET /api/paciente/:id/signos-vitales` - Obtener signos vitales
- `GET /api/paciente/:id/diagnosticos` - Obtener diagnósticos
- `GET /api/paciente/:id/medicamentos` - Obtener medicamentos
- `GET /api/paciente/:id/resumen` - Obtener resumen médico
- `GET /api/paciente/:id/red-apoyo` - Obtener red de apoyo
- `GET /api/paciente/:id/esquema-vacunacion` - Obtener esquema de vacunación

### Registro de Datos:
- `POST /api/signos-vitales` - Registrar nuevos signos vitales

---

## 🎨 Características de UX/UI

### Diseño Ultra-Simplificado:
- ✅ Máximo 4 opciones por pantalla
- ✅ Botones grandes y coloridos
- ✅ Iconos descriptivos
- ✅ Texto mínimo, imágenes y colores
- ✅ Feedback visual constante

### Accesibilidad:
- ✅ Text-to-Speech (TTS) en todas las pantallas
- ✅ Feedback háptico en interacciones
- ✅ Instrucciones de audio claras
- ✅ Navegación simplificada
- ✅ Validación de formularios con mensajes claros

### Servicios de Apoyo:
- `hapticService` - Vibración táctil
- `audioFeedbackService` - Sonidos de confirmación/error
- `useTTS` - Text-to-Speech
- `alertService` - Alertas visuales

---

## 📊 Estado Actual de Datos

### Según la consulta realizada:
- **Beatriz (ID: 3):**
  - ✅ 1 signo vital registrado
  - ✅ 1 plan de medicación (sin medicamentos asignados)
  - ✅ 1 cita registrada
  - ✅ 1 diagnóstico
  - ✅ 1 comorbilidad (Tuberculosis)
  - ✅ 2 contactos de red de apoyo

- **José (ID: 4):**
  - ✅ 1 signo vital registrado
  - ✅ 1 plan de medicación (sin medicamentos asignados)
  - ✅ 1 cita registrada
  - ✅ 1 diagnóstico
  - ✅ 3 comorbilidades (Tabaquismo, Hipertensión, Dislipidemia)
  - ✅ 2 contactos de red de apoyo

---

## ⚠️ Limitaciones Conocidas

1. **Planes de Medicación:**
   - Los planes existen pero no tienen medicamentos asignados en `plan_detalle`
   - La pantalla "Mis Medicamentos" puede aparecer vacía

2. **Red de Apoyo:**
   - Los contactos no tienen nombres completos (solo parentesco)
   - No se muestra en las pantallas principales del paciente

3. **Esquema de Vacunación:**
   - Disponible en hooks pero no se muestra en pantallas del paciente

4. **Información General:**
   - Tabla `informacion_general` no existe en la base de datos

---

## ✅ Funcionalidades Completamente Implementadas

1. ✅ Login con PIN (4 dígitos)
2. ✅ Login con biometría (huella/facial)
3. ✅ Pantalla de inicio con navegación
4. ✅ Ver citas médicas
5. ✅ Registrar signos vitales
6. ✅ Ver medicamentos (si están asignados)
7. ✅ Ver historial médico completo
8. ✅ Cerrar sesión
9. ✅ Pull-to-refresh en todas las pantallas
10. ✅ TTS integrado
11. ✅ Feedback háptico
12. ✅ Cache de datos
13. ✅ Manejo de errores

---

## 📝 Notas de Implementación

- El sistema está diseñado para pacientes rurales con baja alfabetización
- Todas las interacciones tienen soporte de audio
- El diseño prioriza la simplicidad sobre la complejidad
- Los datos se cachean automáticamente para mejor rendimiento
- El sistema soporta múltiples dispositivos por paciente (device_id)



