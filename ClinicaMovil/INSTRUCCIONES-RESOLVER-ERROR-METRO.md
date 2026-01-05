# 🚨 INSTRUCCIONES PARA RESOLVER EL ERROR DE METRO

## ✅ Pasos Completados
1. ✅ Caché de npm limpiado
2. ✅ Caché de Metro limpiado
3. ✅ Dependencias reinstaladas

## 🔧 Pasos Finales (Ejecutar Manualmente)

### 1. Detener Metro si está corriendo
Presiona `Ctrl + C` en la terminal donde está corriendo Metro, o cierra la terminal.

### 2. Detener procesos en el puerto 8081 (si es necesario)
```powershell
# En PowerShell (ejecutar como administrador si es necesario)
Get-NetTCPConnection -LocalPort 8081 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

### 3. Iniciar Metro con caché limpio
```bash
cd ClinicaMovil
npm run start:reset
```

O si prefieres iniciar manualmente:
```bash
cd ClinicaMovil
npx react-native start --reset-cache
```

### 4. En otra terminal, ejecutar la app
```bash
cd ClinicaMovil
npm run android
```

## 🔍 Si el Error Persiste

### Opción 1: Limpieza Completa de Android
```bash
cd ClinicaMovil/android
./gradlew clean
# O en Windows:
gradlew.bat clean
cd ..
```

### Opción 2: Limpieza Total
```bash
cd ClinicaMovil

# Eliminar node_modules completamente
Remove-Item -Recurse -Force node_modules

# Eliminar package-lock.json
Remove-Item -Force package-lock.json

# Reinstalar
npm install

# Iniciar con caché limpio
npm run start:reset
```

### Opción 3: Verificar Versiones
```bash
node --version  # Debe ser >= 20
npm --version
npx react-native --version
```

## 📝 Notas Importantes

- **No cierres Metro** mientras la app está corriendo
- Si cambias código, Metro debería recargar automáticamente
- Si ves errores de conexión, verifica que Metro esté en `http://localhost:8081`

## ✅ Verificación

El error debería estar resuelto si:
1. Metro inicia sin errores
2. Ves el mensaje "Metro waiting on..."
3. La app se conecta correctamente
4. No aparece el error "Cannot read properties of undefined"

