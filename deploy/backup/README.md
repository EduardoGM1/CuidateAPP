# Respaldo de base de datos (VPS)

## 1. Usuario MySQL de solo respaldo

```sql
CREATE USER 'backup_user'@'localhost' IDENTIFIED BY 'password_seguro';
GRANT SELECT, SHOW VIEW, TRIGGER, EVENT, LOCK TABLES ON medical_db.* TO 'backup_user'@'localhost';
FLUSH PRIVILEGES;
```

## 2. Configuración

```bash
sudo mkdir -p /etc/cuidateapp /var/backups/cuidateapp/{daily,weekly,logs}
sudo cp deploy/backup/env.example /etc/cuidateapp/backup.env
sudo chmod 600 /etc/cuidateapp/backup.env
sudo chown root:root /etc/cuidateapp/backup.env
# Editar valores reales
sudo chmod +x deploy/backup/backup-db.sh
```

Variables en `.env` de la API (opcional):

- `BACKUP_ROOT=/var/backups/cuidateapp`
- `BACKUP_ALLOW_API_TRIGGER=true` — permite “Ejecutar respaldo” desde Operaciones
- `BACKUP_NOTIFY_EMAILS=admin@ejemplo.com`

## 3. Prueba manual

```bash
BACKUP_ENV_FILE=/etc/cuidateapp/backup.env BACKUP_TYPE=daily ./deploy/backup/backup-db.sh
cat /var/backups/cuidateapp/manifest.json
```

## 4. Cron

Ver `crontab.example`.

## 5. Copia externa (recomendado)

Configurar `rclone` y definir `RCLONE_REMOTE` en `backup.env`.

## Seguridad

- No enviar el dump por correo (solo aviso).
- `chmod 700` en `/var/backups/cuidateapp`.
- MySQL solo en `127.0.0.1`.
- Probar restauración trimestral en entorno de prueba.
