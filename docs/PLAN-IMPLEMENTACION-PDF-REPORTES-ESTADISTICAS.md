# Plan de implementación: PDF del reporte de Reportes y Estadísticas

Objetivo: permitir generar y descargar un archivo PDF con el contenido del reporte de la pantalla **Reportes y Estadísticas** (admin y, opcionalmente, doctor), siguiendo buenas prácticas y reutilizando código y componentes existentes.

---

## 1. Principios y reutilización

| Principio | Aplicación |
|-----------|------------|
| **No duplicar lógica** | Reutilizar agregaciones del backend (dashboard/admin) para el reporte. |
| **Mismo patrón que expediente** | Generar HTML en backend → app descarga HTML → convertir a PDF en cliente con `react-native-html-to-pdf`. |
| **Una capa por responsabilidad** | Servicio (datos + HTML), controlador (HTTP), util (descarga/PDF), pantalla (UI). |
| **Código compartido** | Un solo flujo de “exportar reporte a PDF” (hook o función) para admin y doctor. |
| **API coherente** | Nuevo endpoint bajo `/api/reportes/` con mismo estilo de autenticación y roles. |

---

## 2. Arquitectura actual relevante

- **Backend**
  - `reportRoutes.js`: rutas por paciente (signos-vitales, citas, diagnosticos CSV/PDF; expediente HTML/PDF).
  - `reportController.js`: delega en `reportService`.
  - `reportService.js`: genera CSV y HTML (ej. `generateExpedienteHTML`), usa datos de BD.
  - `dashboardService.js` (vía `dashboardController`): ya expone métricas y gráficos para admin (y doctor).
- **Cliente**
  - `fileDownloader.js`: `downloadFile`, `downloadPDF` (descarga por URL con token).
  - `gestionService.js`: `exportarPDF`, `exportarExpedienteCompleto` (devuelve URL o HTML).
  - `DetallePaciente.js`: flujo “Exportar expediente” = obtener HTML → `react-native-html-to-pdf` → guardar → abrir con FileViewer.

Se reutiliza: patrón “HTML desde backend + PDF en app”, `downloadFile`/`downloadPDF`, `reportService` y estilo de rutas/controladores.

---

## 3. Plan por capas

### 3.1 Backend (api-clinica)

#### 3.1.1 Servicio: `reportService.js`

- **Nuevo método:** `generateReporteEstadisticasHTML(rol, opciones)`.
  - **rol:** `'admin' | 'doctor'`.
  - **opciones:** `{ idDoctor?, fechaDesde?, fechaHasta?, moduloId? }` (opcional; para filtrar como en la pantalla).
  - **Implementación:**
    - Reutilizar lógica de agregación existente:
      - Admin: mismo tipo de datos que usa el dashboard admin (resumen, métricas, gráficos: pacientes por doctor, citas por estado/día, top doctores, distribución edad/género, comorbilidades). Si ya existe en `dashboardService`, llamar a ese servicio en lugar de duplicar consultas.
      - Doctor: mismo tipo de datos que dashboard doctor (métricas y gráficos solo de sus pacientes).
    - Construir **una plantilla HTML** (estilo `generateExpedienteHTML`): mismo patrón de `escapeHtml`, estilos inline para PDF, tablas para tabulares y texto para resúmenes/gráficos (los “gráficos” en PDF pueden ser tablas o listas).
  - **Salida:** string HTML completo (documento listo para convertir a PDF).

- **Buena práctica:** No duplicar consultas. Si `dashboardService` ya expone `getAdminSummary`, `getAdminMetrics`, `getAdminCharts`, etc., `reportService` debe usar esos métodos (o una función compartida que ellos también usen) para obtener los datos y solo encargarse de formatearlos a HTML.

#### 3.1.2 Controlador: `reportController.js`

- **Nueva función:** `getReporteEstadisticasHTML(req, res)`.
  - Lee rol del usuario (`req.user.rol`) y, si es doctor, `req.user.id_doctor` (o id obtenido desde `Usuario`/`Doctor`).
  - Parámetros opcionales de query: `fechaDesde`, `fechaHasta`, `moduloId`.
  - Llama a `reportService.generateReporteEstadisticasHTML(rol, { idDoctor, fechaDesde, fechaHasta, moduloId })`.
  - Responde con `Content-Type: text/html; charset=utf-8` y el cuerpo en HTML.
  - Manejo de errores igual que el resto del controlador (try/catch, `res.status(500).json(...)`).

#### 3.1.3 Rutas: `reportRoutes.js`

- **Nueva ruta:**  
  `GET /estadisticas/html`  
  - Middlewares: `authenticateToken`, `authorizeRoles('Admin', 'Doctor')`, `searchRateLimit`.
  - Handler: `reportController.getReporteEstadisticasHTML`.
- **Autorización:** Doctor solo puede recibir datos de su ámbito (ya aplicado en el controlador usando `idDoctor`).

La URL final será algo como:  
`/api/reportes/estadisticas/html?fechaDesde=...&fechaHasta=...&moduloId=...`

---

### 3.2 Cliente (ClinicaMovil)

#### 3.2.1 API: `gestionService.js`

- **Nuevo método:** `getReporteEstadisticasHTML(params?)`.
  - **params:** `{ fechaDesde?, fechaHasta?, moduloId? }` (opcional).
  - Construye la URL: `/reportes/estadisticas/html` + query string según `params`.
  - Usa el cliente HTTP ya configurado (con token) y devuelve la respuesta HTML (string) o lanza si hay error.
  - Reutiliza el mismo patrón que otras llamadas a reportes (mismo cliente, headers, manejo de errores).

#### 3.2.2 Reutilización del flujo “HTML → PDF”

- El flujo ya existe en `DetallePaciente.js`: obtener HTML → `react-native-html-to-pdf` → guardar → (opcional) abrir con FileViewer.
- **Opción A (recomendada):** Extraer ese flujo a una **función o hook reutilizable** en un solo lugar, por ejemplo:
  - **Util:** `utils/exportReportToPdf.js` (o dentro de `fileDownloader.js`):
    - `exportReportToPdf({ getHtmlAsync, filename })`
    - `getHtmlAsync`: función que devuelve `Promise<string>` (HTML).
    - Descarga/obtiene el HTML, llama a `react-native-html-to-pdf`, guarda el PDF, opcionalmente abre con FileViewer, devuelve `{ success, filePath, error }`.
  - Así tanto “Expediente completo” como “Reporte de estadísticas” usan la misma función, pasando cada uno su `getHtmlAsync` y `filename`.
- **Opción B (mínima):** Sin extraer aún, implementar en `ReportesAdmin` un flujo paralelo al de expediente (misma secuencia: fetch HTML → generatePDF → save → open). Después se puede refactorizar a la util común.

#### 3.2.3 Pantalla: `ReportesAdmin.js`

- Añadir un botón “Exportar PDF” (o “Descargar reporte PDF”) en la cabecera o junto al título “Reportes y Estadísticas”.
- Al pulsar:
  1. (Opcional) Mostrar filtros actuales (fecha, módulo) en el diálogo de confirmación.
  2. Llamar a `gestionService.getReporteEstadisticasHTML(...)` con los filtros que la pantalla ya use (si se desea que el PDF refleje el mismo contexto).
  3. Con el HTML recibido, llamar a la función reutilizable de “HTML → PDF” (o al flujo inline) con un nombre de archivo tipo `reporte-estadisticas-YYYY-MM-DD.pdf`.
  4. Mostrar feedback (loading, “PDF generado”, “Error al generar”) y, si hay éxito, opción de abrir el archivo (igual que en expediente).
- No duplicar lógica de negocio: solo orquestar “obtener HTML” + “convertir a PDF y guardar/abrir”.

#### 3.2.4 (Opcional) Pantalla: `ReportesDoctor.js`

- Si se desea el mismo comportamiento para el doctor:
  - Reutilizar el **mismo** botón y flujo: mismo `gestionService.getReporteEstadisticasHTML()` (el backend ya diferencia por rol/idDoctor).
  - Mismo util/hook de “HTML → PDF” y mismo nombre de archivo o uno tipo `reporte-estadisticas-doctor-YYYY-MM-DD.pdf`.

#### 3.2.5 Componente reutilizable (opcional pero recomendable)

- **Componente:** `components/reports/ExportReportPdfButton.js` (o nombre similar).
  - Props: `getHtmlAsync`, `filename`, `title` (ej. “Exportar PDF”), `disabled` (ej. mientras cargan datos).
  - Encapsula: botón, estado de loading/éxito/error, llamada a la util de exportación, Alert de resultado.
  - Uso en `ReportesAdmin` (y `ReportesDoctor`): pasar `getHtmlAsync={() => gestionService.getReporteEstadisticasHTML(...)}` y `filename`.
  - Beneficio: un solo lugar para el texto del botón, mensajes y comportamiento; fácil de usar en otras pantallas de reportes en el futuro.

---

## 4. Orden sugerido de implementación

1. **Backend**
   - En `reportService.js`: implementar `generateReporteEstadisticasHTML(rol, opciones)` usando datos de `dashboardService` (o lógica compartida) y plantilla HTML.
   - En `reportController.js`: implementar `getReporteEstadisticasHTML`.
   - En `reportRoutes.js`: registrar `GET /estadisticas/html`.
   - Probar con Postman o similar (token de admin y de doctor) que el HTML se devuelve correctamente.

2. **Cliente – API**
   - En `gestionService.js`: implementar `getReporteEstadisticasHTML(params?)`.

3. **Cliente – Exportación a PDF**
   - Opción A: Crear `utils/exportReportToPdf.js` (o añadir en `fileDownloader.js`) con la función que recibe `getHtmlAsync` y `filename`, y refactorizar el flujo de expediente en `DetallePaciente.js` para usarla.
   - Opción B: Implementar solo en `ReportesAdmin` el flujo “fetch HTML → html-to-pdf → save → open” sin extraer aún.

4. **Cliente – UI**
   - En `ReportesAdmin.js`: botón “Exportar PDF” que usa `getReporteEstadisticasHTML` y la función de exportación a PDF.
   - (Opcional) Componente `ExportReportPdfButton` y sustituir el botón por ese componente.
   - (Opcional) Repetir en `ReportesDoctor.js` con el mismo patrón.

5. **Ajustes**
   - Actualizar el texto informativo “Puedes exportar estos datos…” para indicar que ya pueden descargar el reporte en PDF.
   - Revisar permisos y que solo Admin/Doctor accedan al endpoint y al botón.

---

## 5. Resumen de reutilización

| Elemento | Dónde existe | Uso en esta funcionalidad |
|----------|----------------|----------------------------|
| Agregaciones dashboard | `dashboardService` / `dashboardController` | `reportService` los usa para datos del reporte (no reimplementar). |
| Patrón HTML → PDF en app | `DetallePaciente.js` (expediente) | Misma secuencia; extraer a util/hook y usar para estadísticas. |
| Descarga autenticada | `fileDownloader.js` | No hace falta para HTML (se usa fetch del apiClient); sí para abrir/guardar el PDF generado localmente. |
| Generación de HTML | `reportService.generateExpedienteHTML` | Nuevo método `generateReporteEstadisticasHTML` con el mismo estilo (escape, estilos, tablas). |
| Rutas y roles | `reportRoutes.js`, `authorizeRoles` | Añadir una ruta más bajo el mismo prefijo y mismos middlewares. |
| Servicio API en app | `gestionService.js` | Añadir un método más, mismo patrón que otros reportes. |

---

## 6. Buenas prácticas aplicadas

- **Single responsibility:** cada capa hace una cosa (servicio = datos + HTML, controlador = HTTP, util = PDF, pantalla = UI y orquestación).
- **DRY:** no duplicar agregaciones (usar dashboard) ni el flujo HTML→PDF (una util, dos pantallas).
- **Naming consistente:** `getReporteEstadisticasHTML`, `generateReporteEstadisticasHTML`, `exportReportToPdf`.
- **Seguridad:** mismo `authenticateToken` y `authorizeRoles` que el resto de reportes; doctor solo ve sus datos.
- **Mantenibilidad:** plantilla HTML en un solo lugar (reportService); si se cambia el diseño del reporte, solo se toca ahí.
- **UX:** loading, mensaje de éxito/error y opción de abrir el PDF igual que en expediente.

Con este plan se implementa la generación de PDF del reporte de Reportes y Estadísticas de forma alineada al resto del proyecto y con reutilización explícita de código, funciones y componentes.
