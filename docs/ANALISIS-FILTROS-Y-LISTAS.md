# Análisis de filtros y listas – Origen de datos (BD vs hardcoded)

Este documento resume qué listas/filtros de la app **sí** usan datos de la base de datos y cuáles **no** (están hardcodeados). Solo se consideran listas que podrían ser catálogos o filtros; no se incluyen enums de dominio fijos (sexo, estado de cita, etc.) salvo que se quiera unificar criterio.

---

## 1. Listas que SÍ obtienen datos desde la base de datos

| Pantalla / componente | Lista / filtro | Origen | Método / hook |
|------------------------|----------------|--------|----------------|
| **GestionAdmin** | Comorbilidades (dropdown filtro pacientes) | BD | `gestionService.getComorbilidadesCatalogForFilter()` |
| **GestionAdmin** | Módulos (dropdown filtro doctores y pacientes) | BD | `gestionService.getModulosCatalogForFilter()` |
| **GestionAdmin** | Doctores (lista principal) | BD | `useDoctoresInfinite` → `getAllDoctores` |
| **GestionAdmin** | Pacientes (lista principal) | BD | `usePacientesInfinite` → `getAllPacientes` |
| **VerTodasCitas** | Doctores (filtro) | BD | `useDoctores('activos', 'recent')` |
| **VerTodasCitas** | Módulos (filtro) | BD | `useModulos()` → `getModulos` |
| **ReportesAdmin** | Módulos (filtro) | BD | `useModulos()` |
| **ReportesAdmin** | Comorbilidades (datos para gráficos) | BD | `gestionService.getComorbilidades()` + pacientes |
| **DetallePaciente** | Vacunas (selector esquema vacunación) | BD | `gestionService.getVacunas()` |
| **DetallePaciente** | Comorbilidades (selector comorbilidad) | BD | `gestionService.getComorbilidades()` |
| **DetallePaciente** | Medicamentos (planes de medicación) | BD | `gestionService.getMedicamentos()` |
| **AgregarPaciente / EditarPaciente** | Módulos (selector) | BD | `useModulos()` → `getModulos` |
| **AgregarDoctor / EditarDoctor** | Módulos (selector) | BD | `useModulos()` → `getModulos` |
| **GestionModulos** | Lista de módulos | BD | `gestionService.getModulos()` |
| **GestionVacunas** | Lista de vacunas | BD | `gestionService.getVacunas()` |
| **GestionComorbilidades** | Lista de comorbilidades | BD | `gestionService.getComorbilidades()` |
| **MedicamentoSelector** | Medicamentos | BD | `gestionService.getMedicamentos()` |
| **VacunaSelector** | Vacunas | BD | `gestionService.getVacunas()` |

---

## 2. Listas que NO usan datos de la base de datos (hardcoded)

### 2.1 Filtro por comorbilidad – ListaPacientesDoctor

- **Archivo:** `ClinicaMovil/src/screens/doctor/ListaPacientesDoctor.js`
- **Qué es:** Filtro “Filtrar por comorbilidad” en el modal de filtros de la lista de pacientes del doctor.
- **Problema:** Las opciones vienen de un array fijo en código:
  - `comorbilidadesDisponibles = ['todas', 'Diabetes', 'Hipertensión', 'Obesidad', 'Dislipidemia', ...]`
- **Consecuencias:**
  - No se muestran comorbilidades que existan en la BD pero no estén en ese array.
  - El backend de pacientes ya filtra por **id** de comorbilidad; aquí se envían **nombres**. Con el backend actual el filtro por comorbilidad en esta pantalla no aplica correctamente (el backend ignora valores no numéricos).
- **Recomendación:** Cargar el catálogo desde la API (por ejemplo `getComorbilidadesCatalogForFilter`) y mostrar un dropdown por **id** de comorbilidad, igual que en GestionAdmin.

---

### 2.2 Estado y orden en GestionAdmin (aceptable)

- **Archivo:** `ClinicaMovil/src/screens/admin/GestionAdmin.js`
- **Listas:** `ESTADO_OPCIONES` (Activos / Inactivos / Todos) y `ORDEN_FECHA_OPCIONES` (Más recientes / Más antiguos).
- **Origen:** Constantes en código.
- **Conclusión:** Son opciones lógicas del filtro, no catálogos de BD. Es correcto que estén hardcodeadas.

---

### 2.3 Institución de salud – AgregarPaciente

- **Archivo:** `ClinicaMovil/src/screens/admin/AgregarPaciente.js`
- **Qué es:** Selector “Institución de Salud” al agregar paciente.
- **Origen:** Array en línea: `['IMSS', 'Bienestar', 'ISSSTE', 'Particular', 'Otro']`
- **Nota:** En el modelo `Paciente` existe el campo `institucion_salud` pero no hay tabla/catálogo de instituciones en la BD. Si en el futuro se crea un catálogo de instituciones en BD, convendría sustituir este array por una llamada a la API.

---

### 2.4 Sexo – AgregarPaciente

- **Archivo:** `ClinicaMovil/src/screens/admin/AgregarPaciente.js`
- **Origen:** `['Hombre', 'Mujer']`
- **Conclusión:** Dominio fijo; no suele ser catálogo en BD. Aceptable como está.

---

### 2.5 Parentesco – DetallePaciente / Red de apoyo

- **Archivo:** `ClinicaMovil/src/screens/admin/DetallePaciente.js`
- **Qué es:** Opciones del campo “Parentesco” en el formulario de red de apoyo.
- **Origen:** `parentescoOptions` en código (Padre, Madre, Hijo, Esposo, etc.).
- **Nota:** En el modelo `RedApoyo` es un campo texto, no hay tabla de parentescos. Si se define un catálogo en BD en el futuro, se podría cargar desde la API.

---

### 2.6 Tipo de sesión – DetallePaciente / Sesiones educativas

- **Archivo:** `ClinicaMovil/src/screens/admin/DetallePaciente.js`
- **Qué es:** Opciones “Tipo de Sesión” en el formulario de sesiones educativas.
- **Origen:** Array en línea: `nutricional`, `actividad_fisica`, `medico_preventiva`, `trabajo_social`, `psicologica`, `odontologica`
- **Nota:** En el modelo `SesionEducativa` es un ENUM con esos mismos valores. La lista está alineada con el esquema; no hay catálogo en BD. Aceptable como está.

---

### 2.7 Estados de México – EstadoSelector

- **Archivo:** `ClinicaMovil/src/components/forms/EstadoSelector.js`
- **Origen:** `estadosMexico` desde `src/data/estadosMexico.js` (archivo estático).
- **Conclusión:** Lista de entidades federativas; normalmente no es tabla en BD. Aceptable como dato estático.

---

### 2.8 Meses / rango de meses – RangoMesesSelector

- **Archivo:** `ClinicaMovil/src/components/forms/RangoMesesSelector.js`
- **Origen:** `MESES` (Enero–Diciembre) y años calculados en código.
- **Conclusión:** Dominio fijo. Aceptable.

---

## 3. Resumen ejecutivo

- **Única lista de filtro que debería cambiarse por consistencia y por uso real del backend:**  
  **Filtro por comorbilidad en ListaPacientesDoctor.**  
  Hoy no usa la BD y, además, el backend ya no filtra por nombre sino por id, por lo que el filtro no funciona como se espera.

- **Resto de listas hardcodeadas:**  
  O bien son opciones de dominio fijas (estado, orden, sexo, tipo de sesión, meses, estados de México) o bien no existe aún un catálogo en BD (institución de salud, parentesco). En esos casos es aceptable mantenerlas en código hasta que exista un catálogo en BD o se defina otra política.

---

## 4. Acción recomendada

1. **ListaPacientesDoctor – Filtro por comorbilidad**  
   - Cargar opciones desde la API (p. ej. `getComorbilidadesCatalogForFilter()`).  
   - Mostrar un dropdown por **id** de comorbilidad y enviar ese id al hook/API de pacientes (igual que en GestionAdmin), para que el filtro sea coherente con el backend y con el resto de la app.
