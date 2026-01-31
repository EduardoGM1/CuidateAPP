# Usar la app en un dispositivo físico

## Configuración por defecto

El comando por defecto ya está pensado para dispositivo físico:

```bash
npx react-native start
```

O desde npm (equivalente):

```bash
npm start
```

Metro se inicia con `--host 0.0.0.0`, así que escucha en todas las interfaces y el móvil puede conectarse por la IP de tu PC.

---

## Pasos para usar en dispositivo físico

1. **Misma red WiFi**  
   El PC y el móvil deben estar en la misma red.

2. **Iniciar Metro** (en la carpeta del proyecto):
   ```bash
   npx react-native start
   ```
   o
   ```bash
   npm start
   ```

3. **Conectar el dispositivo por USB**  
   - Activa **Opciones de desarrollador** y **Depuración USB**.  
   - Conecta el cable y acepta “Permitir depuración USB” en el móvil.

4. **Instalar la app en el dispositivo** (solo la primera vez o tras cambios nativos):
   ```bash
   npm run android
   ```
   (Compila desde ruta corta e instala en el dispositivo conectado.)

5. **Abrir la app en el móvil**  
   Abre “CuidateApp” / “ClinicaMovil”. Debería cargar el bundle desde Metro.

6. **Si la app no conecta con Metro**  
   - En el móvil: menú de desarrollo (agitar o `adb shell input keyevent 82`).  
   - **Settings** → **Debug server host & port for device**.  
   - Pon: `IP_DE_TU_PC:8081` (ej: `192.168.1.100:8081`).  
   - Para ver la IP del PC: `ipconfig` (Windows) y usa la IPv4 de la red WiFi.

---

## Comandos útiles

| Comando | Uso |
|--------|-----|
| `npx react-native start` o `npm start` | Metro para dispositivo físico (y emulador) |
| `npm run start:local` | Metro solo en localhost (emulador con adb reverse) |
| `npm run android` | Compilar e instalar en el dispositivo conectado |
| `npm run start:reset` | Metro con `--reset-cache` y `--host 0.0.0.0` |

---

## Resumen

- **Por defecto** ya usas `npx react-native start` para dispositivo físico (Metro en `0.0.0.0`).  
- Misma WiFi, USB con depuración, `npm run android` para instalar y abrir la app en el móvil.
