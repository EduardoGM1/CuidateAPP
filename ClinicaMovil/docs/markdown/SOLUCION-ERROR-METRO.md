# 🔧 Solución: Error Metro "Cannot read properties of undefined (reading 'get')"

## ❌ Error
```
Metro has encountered an error: Cannot read properties of undefined (reading 'get')
C:\Users\eduar\Desktop\Backend\ClinicaMovil\node_modules\metro\src\node-haste\DependencyGraph.js (28:20)
```

## ✅ Solución Aplicada

### 1. Limpieza de Caché
- ✅ Caché de npm limpiado
- ✅ Caché de Metro limpiado
- ✅ package-lock.json eliminado

### 2. Pasos para Resolver Completamente

#### Opción A: Reiniciar Metro con caché limpio
```bash
cd ClinicaMovil
npm run start:reset
```

#### Opción B: Limpieza completa (si el error persiste)
```bash
cd ClinicaMovil

# 1. Limpiar caché de Metro
rm -rf node_modules/.cache
# O en Windows PowerShell:
Remove-Item -Recurse -Force node_modules\.cache

# 2. Limpiar watchman (si está instalado)
watchman watch-del-all

# 3. Limpiar caché de npm
npm cache clean --force

# 4. Reinstalar dependencias
rm -rf node_modules
rm package-lock.json
npm install

# 5. Iniciar Metro con caché limpio
npm run start:reset
```

#### Opción C: Limpieza de Android (si el error persiste)
```bash
cd ClinicaMovil/android

# Limpiar build de Android
./gradlew clean
# O en Windows:
gradlew.bat clean

# Volver al directorio raíz
cd ..

# Iniciar Metro
npm run start:reset
```

## 🔍 Causas Comunes

1. **Caché corrupto de Metro**: El bundler tiene información corrupta
2. **Dependencias desactualizadas**: Versiones incompatibles
3. **Archivos bloqueados**: Procesos que mantienen archivos abiertos
4. **Problemas con watchman**: Sistema de observación de archivos

## 📝 Notas

- El error ocurre en `DependencyGraph.js` cuando Metro intenta acceder a un mapa que es `undefined`
- Esto generalmente se resuelve limpiando el caché y reiniciando Metro
- Si el problema persiste, puede ser necesario actualizar React Native o Metro

## 🚀 Verificación

Después de aplicar la solución, verifica que:
1. Metro inicia sin errores
2. El bundle se genera correctamente
3. La app se conecta al servidor de desarrollo

