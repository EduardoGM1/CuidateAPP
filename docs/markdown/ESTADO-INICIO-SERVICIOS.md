# 🚀 ESTADO DE INICIO DE SERVICIOS

**Fecha:** 28/11/2025  
**Hora:** Ahora

---

## ✅ SERVICIOS INICIADOS

### 1. Backend API

**Estado:** 🟢 **INICIANDO**

**Ubicación:** `api-clinica/`

**Puerto:** 3000

**Comando ejecutado:**
```powershell
cd api-clinica
npm start
```

**Verificación:**
- Abre una nueva terminal y ejecuta:
  ```powershell
  Test-NetConnection -ComputerName localhost -Port 3000
  ```
- O abre en el navegador: `http://localhost:3000/api/mobile/config`

**Si no responde:**
- Espera 10-15 segundos (el backend tarda en iniciar)
- Verifica que no haya errores en la terminal del backend
- Verifica que el puerto 3000 no esté en uso por otro proceso

---

### 2. ADB Reverse

**Estado:** ⚠️ **PENDIENTE** (requiere dispositivo conectado)

**Configuración automática:**
- Se configurará automáticamente cuando detecte un dispositivo conectado

**Comandos ejecutados (cuando hay dispositivo):**
```powershell
adb reverse tcp:3000 tcp:3000
adb reverse tcp:8081 tcp:8081
```

**Para verificar:**
```powershell
adb reverse --list
```

**Debe mostrar:**
```
tcp:3000 tcp:3000
tcp:8081 tcp:8081
```

---

## 📋 CHECKLIST DE VERIFICACIÓN

### Backend:
- [ ] Terminal del backend abierta y mostrando "Server running on port 3000"
- [ ] `http://localhost:3000/api/mobile/config` responde con JSON
- [ ] No hay errores en la consola del backend

### Dispositivo:
- [ ] Dispositivo conectado por USB
- [ ] Depuración USB activada
- [ ] `adb devices` muestra el dispositivo
- [ ] ADB reverse configurado (`adb reverse --list`)

### App:
- [ ] App cerrada completamente
- [ ] App reiniciada después de configurar ADB reverse
- [ ] App intenta conectar con la API

---

## 🔧 COMANDOS ÚTILES

### Verificar estado del backend:
```powershell
Test-NetConnection -ComputerName localhost -Port 3000
```

### Verificar dispositivos:
```powershell
adb devices
```

### Verificar ADB reverse:
```powershell
adb reverse --list
```

### Probar conexión API:
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/mobile/config"
```

### Ver logs del backend:
- Revisa la terminal donde se inició el backend
- Busca errores en rojo
- Verifica que diga "Database connected" y "Server running"

---

## ⚠️ PROBLEMAS COMUNES

### Backend no inicia:
1. Verifica que no haya otro proceso usando el puerto 3000
2. Verifica que la base de datos esté corriendo
3. Revisa los logs de error en la terminal

### Dispositivo no se conecta:
1. Activa "Depuración USB" en el dispositivo
2. Acepta el diálogo "Permitir depuración USB"
3. Prueba con otro cable USB
4. Reinicia el servicio ADB: `adb kill-server && adb start-server`

### ADB reverse no funciona:
1. Verifica que el dispositivo esté conectado: `adb devices`
2. Reinicia ADB: `adb kill-server && adb start-server`
3. Vuelve a configurar: `adb reverse tcp:3000 tcp:3000`

---

## 🎯 PRÓXIMOS PASOS

1. **Espera 10-15 segundos** para que el backend termine de iniciar
2. **Conecta tu dispositivo** si no está conectado
3. **Verifica que todo esté funcionando** con los comandos de arriba
4. **Reinicia la app** en el dispositivo
5. **Prueba hacer login** o cualquier acción que requiera API

---

**Última actualización:** 28/11/2025

