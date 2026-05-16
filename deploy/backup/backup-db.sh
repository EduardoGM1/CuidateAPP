#!/usr/bin/env bash
# Respaldo MySQL CuidaTeApp — ejecutar en el VPS (cron o manual)
set -euo pipefail

ENV_FILE="${BACKUP_ENV_FILE:-/etc/cuidateapp/backup.env}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-medical_db}"
DB_BACKUP_USER="${DB_BACKUP_USER:-}"
DB_BACKUP_PASSWORD="${DB_BACKUP_PASSWORD:-}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/cuidateapp}"
BACKUP_TYPE="${BACKUP_TYPE:-daily}"
BACKUP_DAILY_KEEP="${BACKUP_DAILY_KEEP:-7}"
BACKUP_WEEKLY_KEEP="${BACKUP_WEEKLY_KEEP:-8}"
BACKUP_GPG_PASSPHRASE="${BACKUP_GPG_PASSPHRASE:-}"
API_CLINICA_DIR="${API_CLINICA_DIR:-}"

if [[ -z "$DB_BACKUP_USER" || -z "$DB_BACKUP_PASSWORD" ]]; then
  echo "ERROR: DB_BACKUP_USER y DB_BACKUP_PASSWORD son obligatorios en $ENV_FILE" >&2
  exit 1
fi

SUBDIR="daily"
KEEP="$BACKUP_DAILY_KEEP"
if [[ "$BACKUP_TYPE" == "weekly" ]]; then
  SUBDIR="weekly"
  KEEP="$BACKUP_WEEKLY_KEEP"
fi

mkdir -p "$BACKUP_ROOT/$SUBDIR" "$BACKUP_ROOT/logs"
STAMP="$(date +%Y-%m-%d_%H-%M-%S)"
DATE_TAG="$(date +%F)"
BASE_NAME="medical_${DATE_TAG}"
RAW="$BACKUP_ROOT/$SUBDIR/${BASE_NAME}.sql.gz"
FINAL="$RAW"
LOG="$BACKUP_ROOT/logs/backup_${STAMP}.log"
MANIFEST="$BACKUP_ROOT/manifest.json"

exec > >(tee -a "$LOG") 2>&1
echo "=== Backup CuidaTeApp $STAMP (tipo: $BACKUP_TYPE) ==="

START_SEC=$SECONDS
SUCCESS=false
ERROR_MSG=""
FILE_REL=""

cleanup_raw() {
  [[ -f "$RAW" && "$FINAL" != "$RAW" ]] && rm -f "$RAW"
}

trap cleanup_raw EXIT

mysqldump \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_BACKUP_USER" \
  --password="$DB_BACKUP_PASSWORD" \
  --single-transaction \
  --routines \
  --triggers \
  --databases "$DB_NAME" \
  | gzip -c > "$RAW"

if [[ -n "$BACKUP_GPG_PASSPHRASE" ]]; then
  if ! command -v gpg >/dev/null 2>&1; then
    ERROR_MSG="gpg no instalado"
    SUCCESS=false
    echo "ERROR: $ERROR_MSG" >&2
  else
    FINAL="${RAW}.gpg"
    if echo "$BACKUP_GPG_PASSPHRASE" | gpg --batch --yes --passphrase-fd 0 \
      --symmetric --cipher-algo AES256 -o "$FINAL" "$RAW"; then
      rm -f "$RAW"
      RAW="$FINAL"
    else
      ERROR_MSG="falló cifrado gpg"
      SUCCESS=false
      echo "ERROR: $ERROR_MSG" >&2
    fi
  fi
fi

if [[ -z "$ERROR_MSG" && -f "$FINAL" ]]; then
  SUCCESS=true
  FILE_REL="$SUBDIR/$(basename "$FINAL")"
  SIZE_BYTES=$(stat -c%s "$FINAL" 2>/dev/null || stat -f%z "$FINAL")
  echo "OK: $FINAL ($SIZE_BYTES bytes)"
else
  SIZE_BYTES=0
  [[ -z "$ERROR_MSG" ]] && ERROR_MSG="archivo de respaldo no generado"
fi

DURATION=$(( SECONDS - START_SEC ))

# Rotación
find "$BACKUP_ROOT/$SUBDIR" -type f \( -name '*.sql.gz' -o -name '*.sql.gz.gpg' \) -mtime +"$KEEP" -delete 2>/dev/null || true

# Manifest para la API / panel admin
export BK_SUCCESS="$SUCCESS" BK_TYPE="$BACKUP_TYPE" BK_FILE="$FILE_REL" BK_SIZE="${SIZE_BYTES:-0}"
export BK_DURATION="$DURATION" BK_ERROR="$ERROR_MSG" BK_MANIFEST="$MANIFEST"
if command -v node >/dev/null 2>&1 && [[ -n "$API_CLINICA_DIR" && -f "$API_CLINICA_DIR/scripts/write-backup-manifest.js" ]]; then
  node "$API_CLINICA_DIR/scripts/write-backup-manifest.js"
elif command -v python3 >/dev/null 2>&1; then
  python3 -c "
import json,os
from datetime import datetime, timezone
data={
  'lastRun': datetime.now(timezone.utc).isoformat().replace('+00:00','Z'),
  'success': os.environ.get('BK_SUCCESS')=='true',
  'type': os.environ.get('BK_TYPE','daily'),
  'file': os.environ.get('BK_FILE') or None,
  'sizeBytes': int(os.environ.get('BK_SIZE') or 0),
  'durationSec': int(os.environ.get('BK_DURATION') or 0),
  'error': os.environ.get('BK_ERROR') or None,
}
with open(os.environ['BK_MANIFEST'],'w',encoding='utf-8') as f:
  json.dump(data,f,ensure_ascii=False,indent=2)
"
fi

# Copia externa opcional
if [[ -n "${RCLONE_REMOTE:-}" ]] && command -v rclone >/dev/null 2>&1; then
  rclone copy "$FINAL" "${RCLONE_REMOTE}/${SUBDIR}/" --log-file="$BACKUP_ROOT/logs/rclone_${STAMP}.log" || true
fi

# Notificación por correo (sin adjuntar el dump)
if [[ -n "$API_CLINICA_DIR" && -d "$API_CLINICA_DIR" ]]; then
  (cd "$API_CLINICA_DIR" && node scripts/notify-backup.js) || true
fi

if [[ "$SUCCESS" != true ]]; then
  echo "Backup falló: $ERROR_MSG" >&2
  exit 1
fi

echo "Backup completado en ${DURATION}s"
