# Cuidate Web – Área Doctores / Administradores

Aplicación web enfocada **solo para doctores y administradores**. Consume la API de `api-clinica` y utiliza la **paleta de colores IMSS Bienestar** (misma que ClinicaMovil).

## Objetivo

- Dar a profesionales y admins una interfaz de escritorio para gestionar pacientes, citas, reportes y configuración.
- No reemplaza la app móvil: la complementa (pacientes siguen usando ClinicaMovil).

## Diseño

- **Paleta:** Colores definidos en `ClinicaMovil/src/utils/constantes.js` (COLORES).
- **Referencia rápida:**
  - Primario: `#006657` (verde IMSS)
  - Secundario: `#BC955C` (canela)
  - Fondo: `#F5F2ED`, cards `#FFFFFF`
  - Texto: `#212121` / `#5C5346`
  - Estados: éxito `#006657`, error `#9F2241`, advertencia `#BC955C`

## Plan de implementación

- **Plan general:** [docs/PLAN-IMPLEMENTACION-WEB-DOCTORES-ADMIN.md](../docs/PLAN-IMPLEMENTACION-WEB-DOCTORES-ADMIN.md)
- **Fase 2 – Pacientes y Citas:** [docs/PLAN-IMPLEMENTACION-WEB-FASE2-PACIENTES-CITAS.md](../docs/PLAN-IMPLEMENTACION-WEB-FASE2-PACIENTES-CITAS.md) — listados, detalle de paciente, citas, componentes reutilizables y buenas prácticas.

## Estructura prevista (cuando se implemente)

```
cuidate-web/
├── README.md           (este archivo)
├── package.json
├── vite.config.*
├── index.html
├── public/
├── src/
│   ├── api/            # Cliente HTTP hacia api-clinica
│   ├── theme/          # Paleta COLORES y tokens CSS
│   ├── components/
│   ├── layouts/
│   ├── pages/          # Login, Dashboard, Pacientes, Citas, Reportes, etc.
│   ├── stores/         # Estado (auth, usuario)
│   └── router/
└── ...
```

## API

- Base URL configurable (ej. `https://tu-dominio.com` o `http://localhost:3000`).
- Login: `POST /api/auth/login` (email + password) para Doctor/Admin.
- Resto de endpoints según `api-clinica` (pacientes, citas, reportes, etc.).

---

*Carpeta creada como contenedor del proyecto. El plan detallado está en `docs/PLAN-IMPLEMENTACION-WEB-DOCTORES-ADMIN.md`.*
