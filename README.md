# CuidateAPP

Monorepo de la plataforma **Cuídate** (clínica / seguimiento de pacientes crónicos).

## Estructura

| Carpeta | Descripción |
|---------|-------------|
| [`api-clinica/`](api-clinica/) | API REST + WebSockets (Node.js, Express, Sequelize) |
| [`cuidate-web/`](cuidate-web/) | Panel web para doctores y administración (React + Vite) |
| [`ClinicaMovil/`](ClinicaMovil/) | App móvil React Native (Android / iOS) |
| [`deploy/`](deploy/) | Scripts de despliegue VPS, Nginx, PM2 y backups |
| [`docs/`](docs/) | Documentación del proyecto y referencias |

## Desarrollo local (Windows)

```bat
start-dev.bat
```

Levanta la API y la web en modo desarrollo. La app móvil se ejecuta desde `ClinicaMovil/` con React Native.

## Despliegue producción

Producción: https://cuidateapp.com.mx

En el VPS:

```bash
cd /var/www/CuidateAPP
bash deploy/actualizar-vps.sh
```

Ver [`deploy/README.md`](deploy/README.md) y [`docs/DESPLIEGUE-VPS-HOSTINGER-KVM2.md`](docs/DESPLIEGUE-VPS-HOSTINGER-KVM2.md).

## Variables de entorno

- API: copiar `api-clinica/.env.example` → `api-clinica/.env`
- Web: copiar `cuidate-web/.env.example` → `cuidate-web/.env`

No commitear archivos `.env` ni binarios (APK, `dist/`, `node_modules/`).

## Tests

```bash
# API
cd api-clinica && npm test

# Web
cd cuidate-web && npm test && npm run build

# Móvil
cd ClinicaMovil && npm test
```
