# Cómo editar las variables de entorno (.env) al completo

El archivo `.env` de **api-clinica** contiene toda la configuración (base de datos, seguridad, servidor, Firebase, email, etc.). Nunca se sube a Git.

---

## 1. En tu PC (desarrollo local)

1. Abre la carpeta del proyecto y el archivo:
   - Ruta: `api-clinica/.env`
   - Si no existe: copia la plantilla  
     `cp api-clinica/.env.example api-clinica/.env`
2. Edita con tu editor (VS Code, Cursor, Notepad++, etc.).
3. Guarda. Los cambios se usan al reiniciar la API (`npm run dev` o `node index.js`).

---

## 2. En la VPS (producción)

### Opción A: Editar con nano (recomendado)

```bash
cd /var/www/CuidateAPP/api-clinica
nano .env
```

- Navega con las flechas.
- Modifica las líneas (ej.: `JWT_SECRET=...`, `DB_PASSWORD=...`).
- Guardar: **Ctrl+O**, Enter.
- Salir: **Ctrl+X**.

Después reinicia la API:

```bash
pm2 restart api-clinica
```

### Opción B: Editar con vi

```bash
cd /var/www/CuidateAPP/api-clinica
vi .env
```

- Modo edición: tecla **i**.
- Salir del modo: **Esc**.
- Guardar y salir: **:wq** + Enter.

### Opción C: Copiar .env desde tu PC (SCP)

Si tienes el `.env` ya configurado en tu PC (con cuidado de no subir secretos reales a ningún repo):

```powershell
scp "C:\ruta\a\tu\api-clinica\.env" root@187.77.14.148:/var/www/CuidateAPP/api-clinica/.env
```

Luego en la VPS ajusta si hace falta (por ejemplo `DB_HOST=localhost`, `ALLOWED_ORIGINS`, `FRONTEND_URL`, `FORCE_HTTPS=false`) y reinicia:

```bash
pm2 restart api-clinica
```

---

## 3. Partes del .env que debes revisar

| Bloque | Variables clave | Qué poner |
|--------|-----------------|-----------|
| **Base de datos** | `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` | Valores de tu MySQL en la VPS |
| **Seguridad** | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `CSRF_SECRET`, `SESSION_SECRET` | Generar con `node scripts/generate-keys.js` y pegar |
| **Servidor** | `PORT`, `NODE_ENV`, `ALLOWED_ORIGINS`, `FRONTEND_URL` | En VPS por IP: `ALLOWED_ORIGINS=http://TU_IP`, `FRONTEND_URL=http://TU_IP`, `FORCE_HTTPS=false` |
| **Email** | `RESEND_API_KEY` | Clave de https://resend.com (para recuperar contraseña, etc.) |
| **Firebase** | `FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_KEY`, etc. | Solo si usas push; si no, puedes dejar el placeholder |

---

## 4. Generar claves de seguridad (JWT, ENCRYPTION_KEY, etc.)

En la carpeta **api-clinica** (PC o VPS):

```bash
cd api-clinica
node scripts/generate-keys.js
```

Copia lo que imprima y pégalo en el `.env` en las líneas correspondientes (`JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, etc.).

---

## 5. Plantilla completa

La lista completa de variables está en **`.env.example`**. Para empezar desde cero:

```bash
cd api-clinica
cp .env.example .env
nano .env   # o tu editor
```

Luego sustituye todos los valores `your_*`, `admin`, `localhost`, etc., por los de tu entorno.
