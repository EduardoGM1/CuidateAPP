# Análisis detallado: pantalla Reportes y Estadísticas

## 1. Ubicación y acceso

- **Pantalla:** `ClinicaMovil/src/screens/admin/ReportesAdmin.js`
- **Ruta en app:** Disponible en el flujo de administrador (tabs o stack), sección "Reportes" / "Reportes y Estadísticas".
- **Acceso:** Solo rol `Admin` / `admin` / `administrador`. Si no, se muestra "Acceso Denegado".

---

## 2. Fuentes de datos

### 2.1 Dashboard administrativo (API)

| Origen | Endpoint / servicio | Uso en pantalla |
|--------|----------------------|------------------|
| `useAdminDashboard()` | `GET /api/dashboard/admin/summary` | `metrics` (totalPacientes, totalDoctores, citasHoy, tasaAsistencia), `chartData` (citas últimos 7 días), `pacientesNuevosData` (pacientes nuevos últimos 7 días) |

- **Backend:** `api-clinica/services/dashboardService.js` → `getAdminSummary()`; `repositories/dashboardRepository.js` (getTotalPacientes, getTotalDoctores, getCitasHoy, getCitasUltimos7Dias, getPacientesNuevosUltimos7Dias, getCitasPorEstado, getDoctoresMasActivos, getTasaAsistencia, getAlertasAdmin).

### 2.2 Gestión (API)

| Origen | Uso en pantalla |
|--------|------------------|
| `usePacientes('todos', 'recent', 'todas')` | Lista de pacientes para estadísticas Fase 1 y comorbilidades. |
| `useDoctores('activos', 'recent')` | Lista de doctores para pacientes por doctor y top doctores activos. |
| `useModulos()` | Filtro por módulo y selector en modal. |
| `gestionService.getAllCitas({ fecha_desde, limit })` | Citas últimos ~6 meses para: citas por estado (último mes), top doctores activos, citas por día de la semana. |
| `gestionService.getComorbilidades()` | Catálogo; la frecuencia se calcula en front con `pacientes` y sus `comorbilidades`. |

### 2.3 Cálculos en frontend (ReportesAdmin)

- **Estadísticas Fase 1** (`calcularEstadisticasFase1`), con `pacientes`, `doctores`, `citas`:
  1. **Distribución de pacientes por doctor:** conteo por `id_doctor` en pacientes.
  2. **Citas por estado (último mes):** citas con `fecha_cita >= ultimoMes`, agrupadas por `estado`.
  3. **Top 5 doctores más activos:** citas con `estado === 'atendida'` (o `asistencia === true`), agrupadas por `id_doctor`, ordenadas y slice(0,5).
  4. **Citas por día de la semana:** todas las citas cargadas, agrupadas por día (Lunes–Domingo).
  5. **Distribución por edad:** pacientes con `fecha_nacimiento`, rangos 0-18, 19-35, 36-50, 51-65, 65+.
  6. **Distribución por género:** pacientes por `genero` o `sexo`.

- **Comorbilidades más frecuentes** (`loadComorbilidades`): cuenta en `pacientes` (opcionalmente filtrados por `id_modulo`) las comorbilidades en `paciente.comorbilidades` y toma top 10.

- **Resumen general** (`loadEstadisticas`): total pacientes, pacientes activos, citas hoy (de `metrics`), total doctores, tasa activos.

---

## 3. Bloques de la pantalla

| Sección | Condición para mostrarse | Datos necesarios |
|---------|---------------------------|------------------|
| Resumen General (4 cards) | Siempre | `metrics` y/o `estadisticas` (totalPacientes, totalDoctores, citasHoy, tasaActivos). |
| Citas últimos 7 días | `chartData.length > 0` | Dashboard: `chartData.citasUltimos7Dias`. |
| Pacientes nuevos últimos 7 días | `pacientesNuevosData.length > 0` | Dashboard: `chartData.pacientesNuevos`. |
| Distribución pacientes por doctor | `estadisticasFase1.pacientesPorDoctor.length > 0` | Pacientes con `id_doctor` (vía DoctorPaciente), doctores. |
| Citas por estado (último mes) | `estadisticasFase1.citasPorEstado` con keys | Citas con `fecha_cita` en último mes y `estado` (ej. pendiente, atendida, cancelada). |
| Top 5 doctores más activos | `estadisticasFase1.topDoctoresActivos.length > 0` | Citas con `estado === 'atendida'` y `id_doctor`. |
| Citas por día de la semana | `estadisticasFase1.citasPorDiaSemana.length > 0` | Citas con `fecha_cita` (cualquier periodo cargado). |
| Distribución por edad | `estadisticasFase1.distribucionEdad.length > 0` | Pacientes con `fecha_nacimiento`. |
| Distribución por género | `estadisticasFase1.distribucionGenero.length > 0` | Pacientes con `genero` o `sexo`. |
| Comorbilidades más frecuentes | `comorbilidadesMasFrecuentes.length > 0` | Pacientes con `comorbilidades` (array) y/o PacienteComorbilidad + catálogo Comorbilidad. |
| Heatmap comorbilidades por periodo | `periodoFiltro && comorbilidadesPorPeriodo?.datos` | **No implementado en admin:** `comorbilidadesPorPeriodo` no se asigna en ReportesAdmin; solo se usa en doctor con `getDoctorSummary(periodo, rangoMeses)`. |

---

## 4. Observaciones y mejoras

1. **Heatmap "Comorbilidades por periodo" (admin):** La pantalla muestra este bloque solo si `periodoFiltro && comorbilidadesPorPeriodo?.datos`, pero `setComorbilidadesPorPeriodo` nunca se llama. Para que el heatmap tenga datos en admin haría falta un endpoint (o reutilizar lógica del dashboard doctor) que devuelva comorbilidades agrupadas por periodo y pasar el resultado a `setComorbilidadesPorPeriodo`.

2. **Colores hardcodeados:** En la pantalla siguen usándose hex (ej. `#4CAF50`, `#2196F3`, `#FF9800`) en `renderStatCard`, `renderChartCard`, `renderPieChart`, `renderHorizontalBarChart`. Conviene usar `COLORES` de `utils/constantes` para mantener el diseño unificado.

3. **Carga de citas:** `loadCitas` pide hasta 500 citas con `fecha_desde` (hace 6 meses). Con muchas citas en BD puede ser lento; ya existe fallback con `limit: 200` sin fecha.

4. **Orden de carga:** Se hace `loadEstadisticas` → `loadComorbilidades` → `loadCitas` con pequeños delays. Las estadísticas Fase 1 se recalculan en `useEffect` cuando cambian `pacientes`, `doctores`, `citas`.

---

## 5. Datos mínimos en BD para ver toda la funcionalidad

Para que **Reportes y Estadísticas** muestre análisis y gráficos con sentido:

| Dato | Cantidad sugerida | Objetivo |
|------|-------------------|----------|
| Módulos | ≥ 2 | Filtro por módulo y gráficos por módulo. |
| Doctores activos | ≥ 2 | Distribución pacientes por doctor, top doctores activos. |
| Pacientes activos | ≥ 10–15 | Edad, género, comorbilidades, asignación a doctores. |
| Asignación doctor–paciente | Todos los pacientes | DoctorPaciente; `id_doctor` en lógica de reportes. |
| PacienteComorbilidad | Varios por paciente | Comorbilidades más frecuentes (Diabetes, Hipertensión, etc.). |
| Citas | ≥ 25–40 | Repartidas en últimos 7 días, último mes y varios días de la semana; varias con `estado: 'atendida'` para top doctores. |
| Citas “hoy” | ≥ 1 | Card “Citas Hoy” en resumen. |
| Pacientes con `fecha_nacimiento` | Todos | Distribución por edad. |
| Pacientes con `sexo`/`genero` | Todos | Distribución por género. |

El script **`api-clinica/scripts/seed-datos-reportes-estadisticas.js`** inserta estos datos de prueba para poder revisar la funcionalidad de análisis y estadísticas de esta pantalla.

---

## 6. Cómo probar después del seed

1. Ejecutar el seed (ver README del script).
2. Iniciar API y app móvil; iniciar sesión como **admin**.
3. Ir a **Reportes y Estadísticas**.
4. Comprobar:
   - Resumen General con números > 0.
   - Gráfico “Citas últimos 7 días” con barras.
   - Gráfico “Pacientes nuevos últimos 7 días” si el backend devuelve datos.
   - Análisis detallado: pacientes por doctor, citas por estado, top 5 doctores, citas por día, edad, género.
   - Comorbilidades más frecuentes (y filtro por módulo).
5. Pull-to-refresh y aplicar filtros (módulo, periodo) para validar filtros y rendimiento.
