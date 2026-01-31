# Comandos PowerShell - ClinicaMovil

Para evitar el error **"PlatformConstants could not be found"** (TurboModuleRegistry) se ha hecho lo siguiente:

1. **newArchEnabled=false** en `android/gradle.properties`
2. **newArchEnabled=false** forzado en `android/build.gradle` (ext)
3. **Eliminado** el bundle pregenerado `android/app/src/main/assets/index.android.bundle` (evita cargar JS antiguo con TurboModules)
4. La app **debe recompilarse e instalarse de nuevo**; si no, el APK instalado sigue usando la Nueva Arquitectura.

---

## Opción A: Todo en uno (recompilar + instalar + Metro)

Desde PowerShell, en la carpeta **ClinicaMovil**:

```powershell
Set-Location "C:\Users\eduar\OneDrive\Escritorio\CuidateApp\CuidateAPP\ClinicaMovil"
.\iniciar-app.ps1
```

Esto compila e instala la app desde la ruta corta y luego arranca Metro. La primera vez puede tardar varios minutos.

---

## Opción B: Paso a paso

### 1. Recompilar e instalar la app (obligatorio si ves el error de PlatformConstants)

```powershell
Set-Location "C:\Users\eduar\OneDrive\Escritorio\CuidateApp\CuidateAPP\ClinicaMovil"
cmd /c "compilar-desde-copia-ruta-corta.bat"
```

### 2. Arrancar Metro

En la **misma** o en **otra** ventana de PowerShell:

```powershell
Set-Location "C:\Users\eduar\OneDrive\Escritorio\CuidateApp\CuidateAPP\ClinicaMovil"
npx react-native start
```

Si quieres limpiar la caché de Metro (recomendado la primera vez después del cambio):

```powershell
npx react-native start --reset-cache
```

---

## Solo Metro (si la app ya está compilada correctamente)

Si **ya** compilaste e instalaste con `newArchEnabled=false` y solo quieres levantar el bundler:

```powershell
cd "C:\Users\eduar\OneDrive\Escritorio\CuidateApp\CuidateAPP\ClinicaMovil"
npx react-native start
```

---

## Resumen

| Qué quieres hacer        | Comando |
|--------------------------|--------|
| Recompilar + instalar + Metro | `.\iniciar-app.ps1` |
| Solo recompilar e instalar    | `cmd /c "compilar-desde-copia-ruta-corta.bat"` |
| Solo Metro                    | `npx react-native start` |
| Metro con caché limpia         | `npx react-native start --reset-cache` |

**Importante:** El error de PlatformConstants solo desaparece cuando la app instalada en el teléfono se ha generado con `newArchEnabled=false`. Hasta que no ejecutes la compilación (paso 1 u Opción A) de nuevo, el fallo seguirá apareciendo aunque Metro esté bien.
