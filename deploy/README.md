# Deploy CuidateAPP - LightNode VPS

Archivos de configuración para desplegar la API en un VPS de LightNode.

## Contenido

| Archivo | Descripción |
|---------|-------------|
| `setup-vps.sh` | Script de instalación inicial (Node, MySQL, Nginx, PM2, Certbot) |
| `nginx-cuidateapp.conf` | Configuración Nginx (proxy a la API) |
| `ecosystem.config.cjs` | Configuración PM2 para la API |

## Guía completa

Ver **[docs/GUIA-DEPLOY-LIGHTNODE-VPS.md](../docs/GUIA-DEPLOY-LIGHTNODE-VPS.md)** para el paso a paso detallado.

## Resumen rápido

1. Crear VPS en LightNode (Ubuntu 22.04, Ciudad de México)
2. Conectar por SSH: `ssh root@TU_IP`
3. Copiar y ejecutar: `./deploy/setup-vps.sh`
4. Configurar MySQL, clonar repo, crear `.env`
5. `pm2 start deploy/ecosystem.config.cjs`
6. Configurar Nginx con `deploy/nginx-cuidateapp.conf`
