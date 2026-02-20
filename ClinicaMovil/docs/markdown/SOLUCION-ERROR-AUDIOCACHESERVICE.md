# Solución: AudioCacheService - Error inicializando

**Error:** `AudioCacheService: Error inicializando` (con `cause` en el log)  
**Efecto:** VoicePlayer no puede descargar audio a caché y falla la reproducción desde VPS.

---

## Causa

La ruta del directorio de caché se calculaba **al cargar el módulo**:

```javascript
const getCacheDirectory = () => { ... };
const CACHE_DIR = getCacheDirectory();  // ❌ RNFS puede no estar listo
```

En ese momento `RNFS.CacheDirectoryPath` / `RNFS.CachesDirectoryPath` pueden ser `undefined` (módulo nativo aún no listo), y `CACHE_DIR` queda `"undefined/audio_cache"`. Luego `RNFS.exists(CACHE_DIR)` o `RNFS.mkdir(CACHE_DIR)` fallan y se lanza el error.

Mismo patrón que en [SOLUCION-ERROR-AUDIOSERVICE.md](./SOLUCION-ERROR-AUDIOSERVICE.md): inicialización demasiado pronto.

---

## Corrección aplicada

1. **Ruta de caché en tiempo de ejecución (lazy)**  
   No usar una constante calculada al cargar. Obtener la ruta **dentro de `initialize()`** cuando ya se va a usar (RNFS suele estar listo).

2. **Función `getCacheDirectoryPath()`**  
   - Usa `RNFS.CacheDirectoryPath` / `CachesDirectoryPath` en el momento de la llamada.  
   - Fallback: `DocumentDirectoryPath` si hace falta.  
   - Validación: si la base es `undefined` o no es string, lanzar error claro.

3. **`this._cacheDir`**  
   El servicio guarda la ruta en `this._cacheDir` al inicializar; `_getCachePath()` usa esa propiedad en lugar de una constante global.

4. **Validación extra**  
   Rechazar rutas que contengan `"undefined"` para detectar fallos de RNFS.

---

## Verificación

- Abrir la app y reproducir un mensaje de voz (audio desde VPS).  
- No debe aparecer "AudioCacheService: Error inicializando".  
- Debe verse en log: "AudioCacheService: Inicializado" con `cacheDir` válido.

---

**Referencia:** Mismo enfoque que SOLUCION-ERROR-AUDIOSERVICE.md (inicialización lazy de módulos nativos).
