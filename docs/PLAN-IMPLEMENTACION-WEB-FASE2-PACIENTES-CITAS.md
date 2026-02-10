# Plan de implementación – Fase 2: Pacientes y Citas (Cuidate Web)

Plan detallado del **siguiente paso** de la web de doctores/administradores: listados de pacientes y citas, detalle de paciente y navegación. Se mantienen **buenas prácticas**, **reutilización de código** y **componentes y funciones reutilizables**.

---

## 1. Objetivos de la Fase 2

- **Listado de pacientes**: tabla con búsqueda y filtros (nombre, estado activo), paginación si la API lo soporta, enlace a detalle.
- **Detalle de paciente**: vista de un paciente por ID (datos básicos, resumen médico o datos que exponga la API).
- **Listado de citas**: tabla de citas con filtros (fecha, estado, paciente/doctor según rol), enlace a detalle si aplica.
- Reutilizar al máximo: **api client**, **auth store**, **componentes UI** (Button, Input, Card), **theme** (COLORES), **utilidades** (sanitize, constants).
- Seguridad: sanitización de parámetros de búsqueda, escape de datos al mostrar en UI, validación de IDs en rutas.

---

## 2. Reutilización explícita (ya existente)

| Recurso | Dónde está | Uso en Fase 2 |
|--------|------------|----------------|
| **api/client.js** | `src/api/client.js` | Todas las peticiones a pacientes y citas (mismo cliente, mismo interceptor 401). |
| **api/auth.js** | `src/api/auth.js` | Patrón a seguir: módulos `pacientes.js` y `citas.js` con funciones que usan `client` y devuelven `data`. |
| **utils/sanitize.js** | `src/utils/sanitize.js` | Búsqueda/filtros: `normalizeString` para términos de búsqueda; `escapeHtml` o `sanitizeForDisplay` para mostrar nombres/textos en UI. |
| **utils/constants.js** | `src/utils/constants.js` | Añadir rutas API usadas (ej. `PACIENTES`, `PACIENTES_BY_ID`, `CITAS`, `CITAS_BY_PACIENTE`) y reutilizar `ROLES`, `API_PATHS`. |
| **theme/colors.js** y **globals.css** | `src/theme/` | Todos los nuevos componentes y páginas: mismos tokens CSS y objeto COLORES. |
| **components/ui (Button, Input, Card)** | `src/components/ui/` | Botones de acción, filtros (Input), tarjetas de resumen y contenedores. |
| **components/layout (Header, MainLayout)** | `src/components/layout/` | Incluir enlaces a “Pacientes” y “Citas” en el header o en una barra de navegación. |
| **components/auth/ProtectedRoute** | `src/components/auth/ProtectedRoute.jsx` | Envolver las nuevas rutas (pacientes, citas, detalle) dentro del layout protegido. |
| **stores/authStore** | `src/stores/authStore.js` | Para `isAdmin()` / `isDoctor()` si se muestran columnas o acciones distintas por rol. |
| **router** | `src/router/index.jsx` | Añadir rutas: `/pacientes`, `/pacientes/:id`, `/citas` como hijos del layout protegido. |

---

## 3. Nuevos módulos y componentes reutilizables

### 3.1 Capa API (reutilizando patrón de `auth.js`)

- **`src/api/pacientes.js`**
  - `getPacientes(params)` → `GET /api/pacientes` con `params` (page, limit, search, activo) sanitizados.
  - `getPacienteById(id)` → `GET /api/pacientes/:id` (validar que `id` sea numérico antes de llamar).
- **`src/api/citas.js`**
  - `getCitas(params)` → `GET /api/citas` con query (page, limit, fechaDesde, fechaHasta, estado, id_paciente o id_doctor según rol).
  - `getCitaById(id)` → `GET /api/citas/:id` (validar id numérico).

Regla: todas las funciones reciben parámetros ya validados/sanitizados; dentro del módulo se puede volver a sanitizar términos de búsqueda con `normalizeString` y límites de longitud.

### 3.2 Utilidades compartidas

- **`src/utils/params.js`** (nuevo)
  - `buildQueryString(obj)` → convierte objeto a query string escapando valores (evitar inyección en URL).
  - `parsePositiveInt(value, defaultVal)` → para page, limit, id desde URL o query (evitar NaN o negativos).
- **`src/utils/format.js`** (nuevo)
  - `formatDate(date)` → fecha en formato legible (ej. `dd/mm/yyyy` o locale).
  - `formatDateTime(date)` → fecha y hora.
  - Reutilizable en listados, detalle y futuros reportes.

### 3.3 Componentes UI reutilizables

- **`src/components/ui/Table.jsx`**
  - Props: `columns` (array de `{ key, label, render? }`), `data`, `emptyMessage`, `loading`.
  - Estilos con variables CSS (bordes, cabecera con color primario). Accesible (thead, tbody, th/td).
- **`src/components/ui/LoadingSpinner.jsx`**
  - Indicador de carga (círculo o skeleton) con color primario. Usado en listados y detalle.
- **`src/components/ui/EmptyState.jsx`**
  - Mensaje e icono cuando no hay datos (ej. “No hay pacientes” / “No hay citas”). Reutilizable en cualquier listado.
- **`src/components/ui/Badge.jsx`** (opcional)
  - Etiqueta de estado (activo/inactivo, estado de cita) con colores de la paleta (éxito, advertencia, error).

Todos los componentes reciben `className` y `style` opcionales para no duplicar estilos y mantener consistencia.

### 3.4 Componentes de dominio reutilizables

- **`src/components/shared/PageHeader.jsx`**
  - Título de página + breadcrumb o botón “Volver” (según si hay navegación previa). Reutilizable en listados y detalle.
- **`src/components/shared/SearchFilterBar.jsx`**
  - Input de búsqueda + selects de filtro (ej. estado) + botón “Buscar” o filtrado al escribir (con debounce). Usa `Input` y `Button`; emite `onSearch(params)` con parámetros ya normalizados.
- **`src/components/shared/DataCard.jsx`**
  - Card que muestra una etiqueta y un valor (o lista de ítems). Reutilizable en detalle de paciente (datos personales, resumen).

---

## 4. Seguridad y buenas prácticas

- **IDs en URL**: validar con `parsePositiveInt` o schema Zod antes de llamar al API; si no es válido, mostrar 404 o redirigir.
- **Parámetros de búsqueda**: limitar longitud y caracteres con `normalizeString`; construir query con `buildQueryString` sin concatenar strings crudos.
- **Datos en pantalla**: para nombres, observaciones y cualquier texto que venga del servidor, usar `sanitizeForDisplay` o al menos no usar `dangerouslySetInnerHTML` con contenido de usuario.
- **Paginación**: `page` y `limit` siempre enteros positivos con tope máximo (ej. limit ≤ 100).
- **Manejo de errores**: componente o hook reutilizable para mostrar error de red/API (mensaje genérico, sin exponer detalles internos); en desarrollo se puede loguear más detalle.

---

## 5. Estructura de archivos a añadir/actualizar

```
cuidate-web/src/
├── api/
│   ├── client.js          (existente)
│   ├── auth.js            (existente)
│   ├── pacientes.js       (nuevo)
│   └── citas.js           (nuevo)
├── utils/
│   ├── sanitize.js        (existente)
│   ├── constants.js       (actualizar: añadir paths y límites de paginación)
│   ├── params.js          (nuevo)
│   └── format.js          (nuevo)
├── components/
│   ├── ui/
│   │   ├── Button.jsx     (existente)
│   │   ├── Input.jsx      (existente)
│   │   ├── Card.jsx       (existente)
│   │   ├── Table.jsx      (nuevo)
│   │   ├── LoadingSpinner.jsx (nuevo)
│   │   ├── EmptyState.jsx (nuevo)
│   │   └── Badge.jsx      (nuevo, opcional)
│   ├── layout/
│   │   ├── Header.jsx     (actualizar: enlaces Pacientes, Citas)
│   │   └── MainLayout.jsx (existente)
│   └── shared/
│       ├── PageHeader.jsx (nuevo)
│       ├── SearchFilterBar.jsx (nuevo)
│       └── DataCard.jsx   (nuevo)
├── pages/
│   ├── Login.jsx          (existente)
│   ├── Dashboard.jsx      (existente)
│   ├── pacientes/
│   │   ├── PacientesList.jsx  (nuevo)
│   │   └── PacienteDetail.jsx (nuevo)
│   └── citas/
│       └── CitasList.jsx  (nuevo)
└── router/
    └── index.jsx          (actualizar: rutas /pacientes, /pacientes/:id, /citas)
```

---

## 6. Fases de implementación (tareas concretas)

### Fase 2.1 – Base compartida (utilidades y UI)

1. **`utils/params.js`**: implementar `buildQueryString` y `parsePositiveInt`; usarlos en todos los módulos que construyan query o lean IDs.
2. **`utils/format.js`**: implementar `formatDate` y `formatDateTime` con `Intl` o formato fijo; usarlos en tablas y detalle.
3. **`utils/constants.js`**: añadir `API_PATHS` necesarios (ej. `PACIENTES`, `PACIENTES_BY_ID`, `CITAS`, `CITAS_BY_ID`) y constantes como `PAGE_SIZE_DEFAULT`, `PAGE_SIZE_MAX`.
4. **`components/ui/Table.jsx`**: tabla genérica con `columns`, `data`, `emptyMessage`, `loading`; estilos con variables CSS.
5. **`components/ui/LoadingSpinner.jsx`**: spinner reutilizable.
6. **`components/ui/EmptyState.jsx`**: mensaje + opcionalmente botón de acción (ej. “Volver”).
7. **`components/ui/Badge.jsx`** (opcional): variantes por tipo (activo, inactivo, pendiente, atendida, etc.) con colores de la paleta.
8. **`components/ui/index.js`**: exportar Table, LoadingSpinner, EmptyState, Badge.

### Fase 2.2 – API de pacientes y citas

9. **`api/pacientes.js`**: `getPacientes(params)`, `getPacienteById(id)`; sanitizar búsqueda; validar `id` antes de GET por ID.
10. **`api/citas.js`**: `getCitas(params)`, `getCitaById(id)`; params según documentación del backend (filtros por doctor/paciente según rol).

### Fase 2.3 – Componentes compartidos de páginas

11. **`components/shared/PageHeader.jsx`**: título + “Volver” o breadcrumb; reutilizar en listados y detalle.
12. **`components/shared/SearchFilterBar.jsx`**: búsqueda (con debounce si se desea) + filtros; callback `onSearch(params)` con params normalizados.
13. **`components/shared/DataCard.jsx`**: Card con label(s) y valor(es) para bloques de datos en detalle.

### Fase 2.4 – Páginas y rutas

14. **Navegación**: en `Header.jsx` añadir enlaces a “Pacientes” y “Citas” (y opcionalmente “Dashboard”); estilo consistente con el resto.
15. **`pages/pacientes/PacientesList.jsx`**: estado (lista, loading, error, params de búsqueda); `SearchFilterBar` + `Table` + `LoadingSpinner` + `EmptyState`; al hacer clic en fila navegar a `/pacientes/:id`; usar `getPacientes` y sanitizar params.
16. **`pages/pacientes/PacienteDetail.jsx`**: leer `id` de la ruta; validar con `parsePositiveInt`; si no válido, mostrar “No encontrado”; si válido, `getPacienteById(id)` y mostrar datos en `DataCard`(s); botón “Volver” a listado; no usar `dangerouslySetInnerHTML` con datos del paciente.
17. **`pages/citas/CitasList.jsx`**: mismo patrón que PacientesList (SearchFilterBar, Table, LoadingSpinner, EmptyState); filtros según API (fecha, estado, y según rol paciente/doctor); usar `formatDate`/`formatDateTime` en columnas de fecha.
18. **Router**: en `router/index.jsx` añadir rutas hijas: `pacientes` (PacientesList), `pacientes/:id` (PacienteDetail), `citas` (CitasList); todas dentro del layout protegido.

### Fase 2.5 – Ajustes y criterios de aceptación

19. **Manejo de errores**: en cada página, si la petición falla (red o 4xx/5xx), mostrar mensaje amigable (ej. “No se pudo cargar la información”) y opción de reintentar; no mostrar stack ni mensaje crudo del servidor al usuario.
20. **Responsive**: comprobar que listados y detalle sean usables en tablet/escritorio (tabla con scroll horizontal si hace falta).
21. **Criterios de aceptación**:
    - [ ] Listado de pacientes con búsqueda (y filtro activo si la API lo permite) y tabla con columnas útiles (nombre, contacto, estado).
    - [ ] Detalle de paciente muestra datos básicos (y resumen si el API lo expone) con escape seguro.
    - [ ] Listado de citas con filtros y columnas (fecha, paciente/doctor, estado) y fechas formateadas.
    - [ ] Navegación entre Dashboard, Pacientes y Citas sin perder sesión; 401 redirige a login.
    - [ ] Reutilización: Table, LoadingSpinner, EmptyState, PageHeader, DataCard, format y params usados en al menos dos sitios.

---

## 7. Endpoints API de referencia (api-clinica)

- **Pacientes**
  - `GET /api/pacientes` — listado (query: page, limit, búsqueda según backend).
  - `GET /api/pacientes/:id` — detalle.
- **Citas**
  - `GET /api/citas` — listado (query según backend).
  - `GET /api/citas/paciente/:pacienteId` — por paciente.
  - `GET /api/citas/doctor/:doctorId` — por doctor.
  - `GET /api/citas/:id` — detalle.

Ajustar nombres de parámetros y respuestas según la documentación real del backend (ej. si usa `offset`/`limit` o `page`/`pageSize`).

---

## 8. Documentos relacionados

- **Plan general:** `docs/PLAN-IMPLEMENTACION-WEB-DOCTORES-ADMIN.md`
- **Fase 1 (base):** Login, layout, dashboard, tema, api client, auth store.
- **Código existente:** `cuidate-web/src/` (api, components/ui, utils, stores, router).

---

*Plan Fase 2 – Pacientes y Citas. Siguiente paso tras la Fase 1; mismo nivel de detalle y criterios de reutilización y seguridad.*
