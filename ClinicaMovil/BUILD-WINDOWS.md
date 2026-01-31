# Compilar ClinicaMovil en Windows

## Error "PlatformConstants could not be found" (pantalla roja al abrir la app)

En React Native 0.82+, la **Nueva Arquitectura es obligatoria**. Si compilaste con `newArchEnabled=false`, el binario nativo no registra TurboModules y el JS espera `PlatformConstants` → pantalla roja.

**Solución:** El proyecto ya tiene `newArchEnabled=true` en `android/gradle.properties`. Vuelve a compilar e instalar desde ruta corta (ver abajo) para generar un binario con TurboModules. No ejecutes `npx react-native run-android` desde la ruta larga del proyecto.

## Error "Filename longer than 260 characters"

En Windows, las rutas muy largas (por ejemplo en `OneDrive\Escritorio\CuidateApp\...\ClinicaMovil`) pueden provocar fallos en la compilación Android (CMake/Ninja).

### Solución 1: Habilitar rutas largas (recomendado, una sola vez)

1. **Ejecutar como Administrador** el script:
   - Abre PowerShell **como Administrador** (clic derecho → "Ejecutar como administrador").
   - Navega a la carpeta del proyecto y ejecuta:
   ```powershell
   cd "C:\Users\eduar\OneDrive\Escritorio\CuidateApp\CuidateAPP\ClinicaMovil\scripts"
   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
   .\habilitar-rutas-largas-windows.ps1
   ```
   O bien aplica el archivo `.reg` (doble clic en `habilitar-rutas-largas-windows.reg` y acepta la elevación).
2. **Reinicia el PC** para que el cambio tenga efecto.
3. Después del reinicio puedes usar `npx react-native run-android` o el botón Run de Android Studio desde cualquier ruta.

### Solución 2: Compilar siempre desde ruta corta (sin reiniciar)

- **No ejecutes** `npx react-native run-android` directamente desde la carpeta del proyecto.
- Usa uno de estos métodos:
  - `npm run android:install` — compila e instala desde una copia en `C:\CuidateAPP\ClinicaMovil`.
  - `.\iniciar-app.ps1` — compila, instala y arranca Metro.
  - `compilar-desde-copia-ruta-corta.bat` — solo compilar e instalar desde ruta corta.

Resumen: o bien **habilitas rutas largas** (script + reinicio) y compilas como siempre, o bien **siempre compilas** con `npm run android:install` o `iniciar-app.ps1`.

### Solución 3: Mapear la carpeta a una unidad corta (rápido, sin copiar)
Si prefieres no copiar el proyecto cada vez, puedes mapear tu carpeta del proyecto a una letra de unidad corta usando `subst` y compilar desde allí. Esto evita errores de ruta larga sin necesidad de reiniciar ni de privilegios de administrador.

Ejemplo (PowerShell):
```powershell
# Mapea S: a la carpeta del proyecto y compila desde S:\
cd "C:\Users\eduar\OneDrive\Escritorio\CuidateApp\CuidateAPP\ClinicaMovil\scripts"
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\build-on-subst.ps1       # usa S: por defecto
# Si quieres mantener la unidad mapeada entre builds: .\build-on-subst.ps1 -KeepMapping
```

---

### Notas y consejos rápidos adicionales (ADB / Metro)
- Si la instalación falla con "ShellCommandUnresponsiveException", verifica que el dispositivo aparezca en `adb devices` y acepta cualquier diálogo de confirmación en el móvil.
- Si la instalación se queda colgada, prueba a ejecutar:
  ```powershell
  adb uninstall com.tu.paquete.app  # opcional, quita la app instalada
  adb install -r "C:\CuidateAPP\ClinicaMovil\android\app\build\outputs\apk\debug\app-debug.apk"
  ```
- Para el error `EADDRINUSE: address already in use :::8081` cierra cualquier Metro previo (Ctrl+C) o usa `Get-NetTCPConnection -LocalPort 8081 | Stop-Process -Force` antes de iniciar Metro.

---

Si quieres, puedo añadir un alias en `package.json` (scripts) para ejecutar `build-on-subst.ps1` desde npm para que el equipo use siempre esa ruta corta de manera sencilla.
