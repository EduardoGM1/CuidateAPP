# 📋 Análisis Completo de Formularios Frontend->Backend

Este documento analiza cada formulario de la aplicación, sus campos, tipos de datos, validaciones y mapeo entre frontend y backend.

---

## 📊 1. FORMULARIO: SIGNOS VITALES

### Ubicación Frontend
- **Archivo**: `src/screens/paciente/RegistrarSignosVitales.js`
- **Componente**: `SimpleForm` (paso a paso)
- **Endpoint Backend**: `POST /api/pacientes/:id/signos-vitales`

### Campos del Formulario

| Campo Frontend | Tipo Frontend | Transformación | Tipo Backend | Requerido | Nullable | Notas |
|---------------|--------------|----------------|-------------|-----------|----------|-------|
| `peso_kg` | string | `parseFloat()` | `DECIMAL(6,2)` | ✅ Sí | ✅ Sí | Peso en kilogramos |
| `talla_m` | string | `parseFloat()` | `DECIMAL(4,2)` | ✅ Sí | ✅ Sí | Talla en metros |
| `presion_sistolica` | string | `parseInt()` | `SMALLINT` | ✅ Sí | ✅ Sí | Presión sistólica |
| `presion_diastolica` | string | `parseInt()` | `SMALLINT` | ✅ Sí | ✅ Sí | Presión diastólica |
| `glucosa_mg_dl` | string | `parseInt()` | `DECIMAL(6,2)` | ✅ Sí | ✅ Sí | Glucosa en mg/dL |
| `medida_cintura_cm` | string | `parseFloat()` | `DECIMAL(6,2)` | ❌ No | ✅ Sí | Opcional |
| `observaciones` | string | `trim()` | `TEXT` | ❌ No | ✅ Sí | Opcional |
| `imc` | number | Calculado | `DECIMAL(6,2)` | ❌ No | ✅ Sí | Calculado: peso/(talla²) |

### Campos que NO se envían (Backend los crea)

| Campo | Tipo Backend | Creado por Backend | Notas |
|-------|-------------|-------------------|-------|
| `registrado_por` | `ENUM('paciente','doctor')` | ✅ Sí | Backend determina por `req.user.rol` |
| `fecha_medicion` | `DATE` | ✅ Sí | Backend usa `new Date()` |
| `fecha_creacion` | `DATE` | ✅ Sí | Backend usa `new Date()` |
| `id_paciente` | `INTEGER` | ✅ Sí | Backend obtiene de `req.params.id` |
| `id_cita` | `INTEGER` | ⚠️ Opcional | Se envía si existe, pero backend lo maneja |

### Validaciones Frontend
- ✅ Todos los campos numéricos se validan con `validarNumero()`
- ✅ Se calcula IMC automáticamente si hay peso y talla
- ✅ Campos opcionales solo se envían si tienen valor

### Validaciones Backend
- ✅ Requiere al menos un signo vital (peso, talla, medida_cintura, presion_sistolica, o glucosa)
- ✅ Calcula IMC si hay peso y talla
- ✅ Verifica que el paciente existe y está activo
- ✅ Verifica autorización (paciente solo puede acceder a sus propios datos)

### ⚠️ Problemas Identificados
1. **Frontend envía campos que backend crea**: El frontend previamente enviaba `fecha_medicion` y `registrado_por`, pero estos deben ser eliminados (✅ CORREGIDO)
2. **Tipos de datos**: Frontend envía strings que se convierten a números, backend espera números

---

## 📅 2. FORMULARIO: CITAS MÉDICAS

### Ubicación Frontend
- **Archivo**: `src/screens/admin/DetallePaciente.js`
- **Componente**: Modal de agregar cita
- **Endpoint Backend**: `POST /api/citas`

### Campos del Formulario

| Campo Frontend | Tipo Frontend | Tipo Backend | Requerido | Nullable | Notas |
|---------------|--------------|-------------|-----------|----------|-------|
| `id_paciente` | number | `INTEGER` | ✅ Sí | ❌ No | ID del paciente |
| `id_doctor` | number | `INTEGER` | ✅ Sí | ❌ No | ID del doctor |
| `fecha_cita` | Date/string | `DATETIME` | ✅ Sí | ❌ No | Fecha y hora de la cita |
| `motivo` | string | `VARCHAR(255)` | ✅ Sí | ❌ No | Motivo de la cita |
| `observaciones` | string | `TEXT` | ❌ No | ✅ Sí | Observaciones opcionales |
| `es_primera_consulta` | boolean | `BOOLEAN` | ❌ No | ✅ Sí | Si es primera consulta |

### Campos que NO se envían (Backend los crea)

| Campo | Tipo Backend | Creado por Backend | Notas |
|-------|-------------|-------------------|-------|
| `id_cita` | `INTEGER` | ✅ Sí | Auto-increment |
| `fecha_registro` | `DATE` | ✅ Sí | Backend usa `new Date()` |
| `asistencia` | `TINYINT` | ✅ Sí | Default: 0 (Pendiente) |
| `activo` | `BOOLEAN` | ✅ Sí | Default: true |

### Validaciones Frontend
- ✅ Validación de fecha (no puede ser en el pasado)
- ✅ Validación de motivo (no vacío)

### Validaciones Backend
- ✅ Verifica que paciente y doctor existen
- ✅ Verifica autorización (solo Admin/Doctor pueden crear)
- ✅ Valida formato de fecha

---

## 🩺 3. FORMULARIO: DIAGNÓSTICOS

### Ubicación Frontend
- **Archivo**: `src/screens/admin/DetallePaciente.js`
- **Componente**: Modal de agregar diagnóstico
- **Endpoint Backend**: `POST /api/pacientes/:id/diagnosticos`

### Campos del Formulario

| Campo Frontend | Tipo Frontend | Tipo Backend | Requerido | Nullable | Notas |
|---------------|--------------|-------------|-----------|----------|-------|
| `id_cita` | number | `INTEGER` | ❌ No | ✅ Sí | ID de cita relacionada (opcional) |
| `descripcion` | string | `TEXT` | ✅ Sí | ❌ No | Descripción del diagnóstico |

### Campos que NO se envían (Backend los crea)

| Campo | Tipo Backend | Creado por Backend | Notas |
|-------|-------------|-------------------|-------|
| `id_diagnostico` | `INTEGER` | ✅ Sí | Auto-increment |
| `id_paciente` | `INTEGER` | ✅ Sí | Backend obtiene de `req.params.id` |
| `id_doctor` | `INTEGER` | ✅ Sí | Backend obtiene de `req.user.id` |
| `fecha_registro` | `DATE` | ✅ Sí | Backend usa `new Date()` |

### Validaciones Frontend
- ✅ Validación de longitud mínima de descripción
- ✅ Validación de que no esté vacío

### Validaciones Backend
- ✅ Verifica que el paciente existe y está activo
- ✅ Verifica autorización (Doctor solo puede acceder a sus pacientes asignados)

---

## 💊 4. FORMULARIO: PLAN DE MEDICACIÓN

### Ubicación Frontend
- **Archivo**: `src/screens/admin/DetallePaciente.js`
- **Componente**: Modal de agregar plan de medicación
- **Endpoint Backend**: `POST /api/pacientes/:id/planes-medicacion`

### Campos del Formulario

| Campo Frontend | Tipo Frontend | Tipo Backend | Requerido | Nullable | Notas |
|---------------|--------------|-------------|-----------|----------|-------|
| `id_cita` | number | `INTEGER` | ❌ No | ✅ Sí | ID de cita relacionada |
| `fecha_inicio` | Date/string | `DATE` | ✅ Sí | ❌ No | Fecha de inicio del plan |
| `fecha_fin` | Date/string | `DATE` | ❌ No | ✅ Sí | Fecha de fin (opcional) |
| `observaciones` | string | `TEXT` | ❌ No | ✅ Sí | Observaciones |
| `medicamentos` | Array | - | ✅ Sí | ❌ No | Array de objetos medicamento |

### Estructura del Array `medicamentos`

| Campo | Tipo Frontend | Tipo Backend | Requerido | Notas |
|-------|--------------|-------------|-----------|-------|
| `id_medicamento` | number | `INTEGER` | ✅ Sí | ID del medicamento del catálogo |
| `dosis` | string | `VARCHAR(100)` | ✅ Sí | Dosis del medicamento |
| `frecuencia` | string | `VARCHAR(100)` | ✅ Sí | Frecuencia de administración |
| `horario` | string | `VARCHAR(255)` | ✅ Sí | Horarios específicos (ej: "08:00, 16:00, 00:00") |

### Campos que NO se envían (Backend los crea)

| Campo | Tipo Backend | Creado por Backend | Notas |
|-------|-------------|-------------------|-------|
| `id_plan` | `INTEGER` | ✅ Sí | Auto-increment |
| `id_paciente` | `INTEGER` | ✅ Sí | Backend obtiene de `req.params.id` |
| `id_doctor` | `INTEGER` | ✅ Sí | Backend obtiene de `req.user.id` |
| `fecha_creacion` | `DATE` | ✅ Sí | Backend usa `new Date()` |
| `activo` | `BOOLEAN` | ✅ Sí | Default: true |

### Validaciones Frontend
- ✅ Validación de que el array `medicamentos` no esté vacío
- ✅ Validación de fecha_inicio (no puede ser en el pasado)
- ✅ Validación de fecha_fin (debe ser después de fecha_inicio)

### Validaciones Backend
- ✅ Verifica que el paciente existe y está activo
- ✅ Verifica que cada medicamento existe en el catálogo
- ✅ Valida estructura del array de medicamentos

---

## 👥 5. FORMULARIO: RED DE APOYO

### Ubicación Frontend
- **Archivo**: `src/screens/admin/DetallePaciente.js`
- **Componente**: Modal de agregar contacto
- **Endpoint Backend**: `POST /api/pacientes/:id/red-apoyo`

### Campos del Formulario

| Campo Frontend | Tipo Frontend | Tipo Backend | Requerido | Nullable | Notas |
|---------------|--------------|-------------|-----------|----------|-------|
| `nombre_contacto` | string | `VARCHAR(100)` | ✅ Sí | ❌ No | Nombre del contacto |
| `relacion` | string | `VARCHAR(50)` | ✅ Sí | ❌ No | Relación con el paciente |
| `numero_celular` | string | `VARCHAR(20)` | ✅ Sí | ❌ No | Número de teléfono |
| `email` | string | `VARCHAR(100)` | ❌ No | ✅ Sí | Email (opcional) |
| `direccion` | string | `TEXT` | ❌ No | ✅ Sí | Dirección (opcional) |

### Campos que NO se envían (Backend los crea)

| Campo | Tipo Backend | Creado por Backend | Notas |
|-------|-------------|-------------------|-------|
| `id_red_apoyo` | `INTEGER` | ✅ Sí | Auto-increment |
| `id_paciente` | `INTEGER` | ✅ Sí | Backend obtiene de `req.params.id` |
| `fecha_creacion` | `DATE` | ✅ Sí | Backend usa `new Date()` |

### Validaciones Frontend
- ✅ Validación de formato de email (si se proporciona)
- ✅ Validación de formato de teléfono (10 dígitos)

### Validaciones Backend
- ✅ Verifica que el paciente existe y está activo
- ✅ Valida formato de email (si se proporciona)
- ✅ Valida formato de teléfono

### ⚠️ Nota de Seguridad
- Los campos `numero_celular`, `email` y `direccion` son encriptados por el middleware `autoEncryptRequest`

---

## 💉 6. FORMULARIO: ESQUEMA DE VACUNACIÓN

### Ubicación Frontend
- **Archivo**: `src/screens/admin/DetallePaciente.js`
- **Componente**: Modal de agregar vacuna
- **Endpoint Backend**: `POST /api/pacientes/:id/esquema-vacunacion`

### Campos del Formulario

| Campo Frontend | Tipo Frontend | Tipo Backend | Requerido | Nullable | Notas |
|---------------|--------------|-------------|-----------|----------|-------|
| `id_vacuna` | number | `INTEGER` | ✅ Sí | ❌ No | ID de la vacuna del catálogo |
| `fecha_aplicacion` | Date/string | `DATE` | ✅ Sí | ❌ No | Fecha de aplicación |
| `lote` | string | `VARCHAR(50)` | ❌ No | ✅ Sí | Lote de la vacuna |
| `lugar_aplicacion` | string | `VARCHAR(100)` | ❌ No | ✅ Sí | Lugar donde se aplicó |
| `observaciones` | string | `TEXT` | ❌ No | ✅ Sí | Observaciones |

### Campos que NO se envían (Backend los crea)

| Campo | Tipo Backend | Creado por Backend | Notas |
|-------|-------------|-------------------|-------|
| `id_esquema` | `INTEGER` | ✅ Sí | Auto-increment |
| `id_paciente` | `INTEGER` | ✅ Sí | Backend obtiene de `req.params.id` |
| `fecha_creacion` | `DATE` | ✅ Sí | Backend usa `new Date()` |

### Validaciones Frontend
- ✅ Validación de que la vacuna existe en el catálogo
- ✅ Validación de fecha_aplicacion (no puede ser en el futuro)

### Validaciones Backend
- ✅ Verifica que el paciente existe y está activo
- ✅ Verifica que la vacuna existe en el catálogo
- ✅ Valida formato de fecha

---

## 🔐 7. CONSIDERACIONES DE SEGURIDAD

### Campos Encriptados
Los siguientes campos se encriptan automáticamente por el middleware `autoEncryptRequest`:

- **Signos Vitales**: `presion_sistolica`, `presion_diastolica`, `glucosa_mg_dl`, `colesterol_mg_dl`, `trigliceridos_mg_dl`, `observaciones`
- **Citas**: `motivo`, `observaciones`
- **Red de Apoyo**: `numero_celular`, `email`, `direccion`
- **Diagnósticos**: `descripcion`
- **Planes de Medicación**: `observaciones`
- **Esquema de Vacunación**: `observaciones`

### Autorización
- **Pacientes**: Solo pueden acceder a sus propios datos
- **Doctores**: Solo pueden acceder a pacientes asignados
- **Admins**: Tienen acceso completo

---

## 📝 RECOMENDACIONES

1. **No enviar campos que el backend crea**: El frontend NO debe enviar `fecha_creacion`, `fecha_medicion`, `registrado_por`, etc.
2. **Validar tipos de datos**: Asegurar que los tipos coincidan entre frontend y backend
3. **Validar campos requeridos**: El frontend debe validar antes de enviar
4. **Manejar errores**: El frontend debe manejar errores de validación del backend
5. **Logging**: Incluir logging detallado para debugging

---

## 🧪 CÓMO EJECUTAR LAS PRUEBAS

```bash
cd ClinicaMovil
node scripts/test-frontend-backend-integration.js
```

**Requisitos**:
- El servidor backend debe estar corriendo
- Ajustar `TEST_PACIENTE_ID`, `TEST_DOCTOR_ID` y credenciales en el script según tu entorno

---

**Última actualización**: 2025-11-05


