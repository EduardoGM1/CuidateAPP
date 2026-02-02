# Formato del PDF del Expediente Médico

El expediente médico se genera como **HTML** en el backend (`api-clinica/services/reportService.js`) y la app lo convierte a **PDF** en el dispositivo con `react-native-html-to-pdf`.

---

## 1. Estructura general del documento

| Orden | Sección | Contenido |
|-------|---------|-----------|
| 1 | **Encabezado** | Título "Expediente Médico", datos de la clínica, fecha de generación |
| 2 | **Historial de Consultas** | Listado de consultas (citas) con detalle por cada una |
| 3 | **Medicamentos Activos** | Lista de medicamentos en planes activos |
| 4 | **Monitoreo Continuo** | Tabla de signos vitales sin cita |
| 5 | **Pie de página** | Aviso de protección de datos |

---

## 2. Encabezado

- **Título:** `Expediente Médico`
- **Datos de la clínica** (actualmente valores fijos en código):
  - Nombre: "Clínica Salud Integral"
  - Dirección: "Dirección de la Clínica"
  - Teléfono: "Teléfono de la Clínica"
  - Correo: "correo@clinica.com"
- **Fecha de generación:** Fecha actual en formato largo (ej. "28 de enero de 2026")

---

## 3. Historial de Consultas

Solo se muestra si hay **citas** para el paciente (opcionalmente filtradas por `fechaInicio` / `fechaFin`).

Por cada consulta se incluye:

- **Número de consulta** (ej. "Consulta 1", "Consulta 2"… orden descendente por fecha)
- **Fecha:** Fecha y hora de la cita (formato largo español)
- **Estado:** Estado de la cita (pendiente, atendida, etc.)
- **Doctor:** Nombre completo del doctor (si existe)
- **Motivo:** Motivo de la consulta (si existe)
- **Observaciones:** Observaciones (si existen)
- **Tabla de signos vitales de la cita** (si la cita tiene signos vitales):
  - Columnas: Signo Vital | Valor
  - Filas según datos: Peso (kg), Talla (m), IMC, Presión arterial (mmHg), Glucosa (mg/dL), Colesterol (mg/dL)
- **Medicamentos prescritos en la cita** (si hay planes de medicación asociados):
  - Lista con: nombre del medicamento, dosis, frecuencia

---

## 4. Medicamentos Activos

Solo se muestra si hay **planes de medicación activos**.

- Lista en viñetas.
- Por cada medicamento:
  - Nombre del medicamento
  - Dosis, frecuencia, vía de administración (si existen)
  - Texto "Prescrito por Dr. [nombre]" si hay doctor asociado al plan

---

## 5. Monitoreo Continuo

Solo se muestra si hay **signos vitales sin cita** (registros con `id_cita` nulo).

Tabla con columnas:

| Fecha | Peso | Talla | IMC | Presión | Glucosa | Colesterol | Triglicéridos |
|-------|------|-------|-----|---------|---------|------------|---------------|
| …     | …    | …     | …   | …       | …       | …          | …             |

- Fechas en formato largo (ej. "28 de enero de 2026").
- Unidades: kg, m, mmHg, mg/dL según corresponda.
- Se muestran hasta **50** registros más recientes.

---

## 6. Pie de página

- Texto: *"Este documento contiene información sensible y está protegido por la Ley de Protección de Datos Personales."*

---

## 7. Estilos (apariencia del PDF)

- **Fuente:** Arial, 12px, color de texto #333.
- **Título principal (h1):** Azul #1976D2, 24px.
- **Títulos de sección (h2):** Azul #1976D2, 18px, borde inferior azul.
- **Subtítulos (h3):** Gris #333, 16px.
- **Tablas:**
  - Encabezados: fondo #1976D2, texto blanco.
  - Bordes 1px #ddd.
  - Filas pares: fondo #f9f9f9.
- **Ancho máximo del contenido:** 800px, centrado.
- **Pie:** 10px, color #666, cursiva, centrado.

---

## 8. Datos que se cargan en el backend

Para generar el HTML (y por tanto el PDF) se obtienen:

- **Paciente** (con Doctor asignado y Comorbilidades si aplica).
- **Citas** del paciente (con Doctor, SignosVitales, Diagnosticos, PlanMedicacion → PlanDetalle → Medicamento).
- **Signos vitales sin cita** (monitoreo continuo), hasta 50.
- **Planes de medicación activos** (con PlanDetalle, Medicamento, Doctor).
- **Red de apoyo** y **Esquema de vacunación** (se cargan pero **no se incluyen actualmente en el HTML**; se podrían añadir en una futura versión).

---

## 9. Filtros opcionales

- **fechaInicio** y **fechaFin:** Si se envían en la petición (`GET /api/reportes/expediente/:idPaciente/html?fechaInicio=...&fechaFin=...`), se filtran:
  - Las citas por `fecha_cita`.
  - Los signos vitales de monitoreo continuo por `fecha_medicion`.

---

## 10. Archivo de implementación

- **Backend (HTML):** `api-clinica/services/reportService.js`
  - Método que arma el HTML: `generateExpedienteHTML(...)`
  - Método que carga datos y llama al anterior: `generateExpedienteCompletoHTML(pacienteId, fechaInicio, fechaFin)`
- **Ruta API:** `GET /api/reportes/expediente/:idPaciente/html`
- **Cliente (PDF):** La app obtiene el HTML por URL, lo pasa a `react-native-html-to-pdf` y guarda/abre el PDF (ver `DetallePaciente.js` → `handleExportarExpedienteCompleto`).
