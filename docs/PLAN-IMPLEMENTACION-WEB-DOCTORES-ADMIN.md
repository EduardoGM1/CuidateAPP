# Plan de implementación – Web Doctores/Administradores (Cuidate Web)

Aplicación web solo para **doctores y administradores**, que consume la API existente (`api-clinica`) y usa la **paleta de colores IMSS Bienestar** (COLORES de ClinicaMovil).

---

## 1. Objetivos

- Interfaz de escritorio para profesionales y admins (gestión de pacientes, citas, reportes, configuración).
- Consumir **solo** la API ya desplegada (sin backend nuevo).
- Diseño consistente con la app móvil: **paleta COLORES** (verde #006657, canela #BC955C, fondos y textos definidos en `ClinicaMovil/src/utils/constantes.js`).
- Roles: **Doctor** y **Admin** (login con email/password vía `POST /api/auth/login`).

---

## 2. Stack técnico recomendado

| Área | Tecnología | Motivo |
|------|------------|--------|
| **Framework** | React 18+ | Alineado con ecosistema actual, buena documentación y rendimiento. |
| **Build** | Vite | Build rápido, HMR, fácil configuración de env y proxy. |
| **Routing** | React Router v6 | SPA con rutas protegidas por rol. |
| **Estado global** | Zustand o React Context + hooks | Auth y usuario actual; estado por pantalla local cuando baste. |
| **HTTP** | Axios o fetch + wrapper | BaseURL desde env, interceptor para token y errores 401. |
| **UI / diseño** | CSS Modules o Tailwind + tokens | Aplicar paleta COLORES; componentes reutilizables (botones, cards, inputs). |
| **Formularios** | React Hook Form + validación (Zod/Yup) | Formularios de login, filtros, altas/ediciones. |
| **Tablas/listados** | Tablas HTML semánticas o lib ligera (ej. TanStack Table) | Listados de pacientes, citas, reportes con orden y filtros. |
| **Gráficos** (si aplica) | Recharts o Chart.js | Dashboards y reportes (alineado con lo que hace la app móvil). |

Alternativa: **Next.js** si se prefiere SSR o rutas por archivo; para una SPA de área interna, Vite + React es suficiente.

---

## 3. Paleta de colores (diseño)

Usar la misma definición que la app móvil. Exportar en la web como **tokens CSS** (variables) y/o objeto JS.

**Referencia (desde `ClinicaMovil/src/utils/constantes.js`):**

```js
// Resumen para la web
const COLORES = {
  PRIMARIO: '#006657',
  PRIMARIO_LIGHT: '#0A7D6B',
  PRIMARIO_DARK: '#10312B',
  SECUNDARIO: '#BC955C',
  SECUNDARIO_LIGHT: '#DDC9A3',
  SECUNDARIO_DARK: '#9B7B4A',
  FONDO: '#F5F2ED',
  FONDO_SECUNDARIO: '#FAF8F5',
  FONDO_CARD: '#FFFFFF',
  TEXTO_PRIMARIO: '#212121',
  TEXTO_SECUNDARIO: '#5C5346',
  TEXTO_EN_PRIMARIO: '#FFFFFF',
  EXITO: '#006657',
  ADVERTENCIA: '#BC955C',
  ERROR: '#9F2241',
  BORDE_CLARO: '#DDC9A3',
  FONDO_VERDE_SUAVE: '#E8F0EE',
  NAV_PRIMARIO: '#006657',
};
```

En la web: definir variables CSS en `:root` (ej. `--color-primario: #006657;`) y usarlas en hojas globales y por componente.

---

## 4. Autenticación y API

- **Login:** `POST /api/auth/login` con `{ email, password }`. Respuesta con token JWT (y refresh si la API lo expone).
- **Cliente HTTP:** Base URL desde variable de entorno (ej. `VITE_API_BASE_URL`). Header `Authorization: Bearer <token>` en todas las peticiones autenticadas.
- **Interceptor 401:** Cerrar sesión y redirigir a `/login` cuando el servidor responda no autorizado.
- **Almacenamiento del token:** `localStorage` o `sessionStorage`; si hay refresh token, guardarlo de forma segura y renovar antes de que expire.
- **Rutas protegidas:** Componente o wrapper que compruebe “hay token y rol Doctor o Admin”; si no, redirigir a login. Diferenciar vistas según rol (Admin ve más menús que Doctor).

---

## 5. Estructura de carpetas (propuesta)

```
cuidate-web/
├── public/
├── src/
│   ├── api/
│   │   ├── client.js        # Axios/fetch con baseURL e interceptor
│   │   ├── auth.js          # login, logout, refresh
│   │   ├── pacientes.js
│   │   ├── citas.js
│   │   ├── reportes.js
│   │   └── ...
│   ├── theme/
│   │   ├── colors.js        # COLORES (mismo que móvil)
│   │   └── globals.css      # variables CSS y estilos base
│   ├── components/
│   │   ├── ui/              # Button, Card, Input, Table, Modal
│   │   ├── layout/          # Header, Sidebar, MainLayout
│   │   └── shared/          # componentes compartidos por páginas
│   ├── layouts/
│   │   └── DashboardLayout.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx    # resumen según rol
│   │   ├── pacientes/       # listado, detalle, crear, editar
│   │   ├── citas/           # listado, calendario o agenda
│   │   ├── reportes/        # reportes y exportaciones
│   │   ├── doctores/        # solo Admin: listado, crear, editar
│   │   ├── auditoria/       # solo Admin
│   │   └── configuracion/   # perfil, cambio contraseña
│   ├── stores/
│   │   └── authStore.js     # usuario, token, login, logout
│   ├── router/
│   │   └── index.jsx        # rutas y protección por rol
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── vite.config.js
├── package.json
└── .env.example             # VITE_API_BASE_URL=https://api.tudominio.com
```

---

## 6. Fases de implementación

### Fase 1 – Base (sprint 1)

- Crear proyecto Vite + React en `cuidate-web/`.
- Configurar `VITE_API_BASE_URL` y cliente HTTP con interceptor de token y 401.
- Definir tema: `theme/colors.js` + variables CSS con paleta COLORES.
- Layout básico: header (logo, usuario, cerrar sesión) y contenedor principal.
- **Login:** página `/login`, formulario email/password, llamada a `POST /api/auth/login`, guardar token y rol, redirección a `/` o `/dashboard`.
- **Router:** rutas públicas (login) y protegidas (dashboard y resto); componente de ruta protegida que compruebe token y rol.
- **Dashboard:** página inicial post-login con mensaje de bienvenida y tarjetas resumen (ej. “Mis pacientes”, “Citas hoy”) usando datos mock o un endpoint simple si existe.

### Fase 2 – Pacientes y citas (sprint 2)

- **Pacientes:** listado con búsqueda/filtros, paginación si la API lo soporta; enlace a detalle; detalle con datos que exponga la API (datos básicos, citas recientes, signos vitales recientes).
- **Citas:** listado de citas (por día/semana o filtro); filtros por estado, doctor (si Admin); enlace a detalle de cita si la API lo permite.
- Reutilizar componentes UI (Card, Table, Button, Input) con estilos basados en COLORES.

### Fase 3 – Reportes y exportaciones (sprint 3)

- **Reportes:** página que consuma endpoints de reportes (ej. `/api/reportes/estadisticas/html` o los que ya use la app móvil); visualización en web (HTML o si la API devuelve datos JSON, gráficos con Recharts/Chart.js).
- **Expediente médico:** botón o enlace que llame al endpoint de expediente (ej. abrir en nueva pestaña o descargar PDF si la API lo genera); mismo criterio que en la app.

### Fase 4 – Admin y ajustes (sprint 4)

- **Doctores (Admin):** listado, alta y edición de doctores usando endpoints de `api-clinica`.
- **Módulos / catálogos (Admin):** si la API expone gestión de módulos, comorbilidades, medicamentos, etc., pantallas CRUD básicas.
- **Auditoría (Admin):** listado de eventos de auditoría si existe endpoint en la API.
- Ajustes de accesibilidad (contraste, focos) y revisión responsive (tablets/escritorio).

---

## 7. CORS y despliegue

- En producción, la API debe tener en `ALLOWED_ORIGINS` el dominio de la web (ej. `https://app.tudominio.com` o `https://cuidate.tudominio.com`).
- La web se despliega como SPA estática (Vite build → `dist/`) en Nginx u otro host; no requiere Node en el servidor de la web.
- Opcional: en desarrollo, proxy en Vite hacia la API para evitar problemas de CORS (`proxy` en `vite.config.js`).

---

## 8. Criterios de aceptación mínimos

- [ ] Login con email/password; redirección por rol (Doctor vs Admin).
- [ ] Todas las pantallas usan la paleta COLORES (verde, canela, fondos, texto).
- [ ] Cliente HTTP único con baseURL por env, token en cabecera y manejo de 401.
- [ ] Al menos: Dashboard, listado de pacientes, detalle de paciente, listado de citas.
- [ ] Admin: al menos una pantalla exclusiva (ej. listado de doctores o auditoría).
- [ ] Build de producción sin errores y documentación mínima de cómo configurar `VITE_API_BASE_URL`.

---

## 9. Documentos y referencias

- **Paleta y constantes:** `ClinicaMovil/src/utils/constantes.js`
- **API (auth):** `POST /api/auth/login`; rutas en `api-clinica/index.js` y `api-clinica/routes/`
- **Guía API:** `api-clinica/docs/API-REFERENCE.md` o equivalente
- **Deploy backend:** `docs/PLAN-PRODUCCION-VPS-LIGHTNODE.md`
- **Carpeta del proyecto web:** `cuidate-web/` (este plan se implementará ahí)
- **Plan Fase 2 (Pacientes y Citas):** `docs/PLAN-IMPLEMENTACION-WEB-FASE2-PACIENTES-CITAS.md` — siguiente paso con listados, detalle de paciente, citas, componentes reutilizables y seguridad.

---

*Plan creado para la aplicación web de área doctores/administradores (Cuidate Web). Implementación por fases en la carpeta `cuidate-web` de la raíz del proyecto.*
