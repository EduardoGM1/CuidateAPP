# 📱 Guía: Acceso a AppGallery Connect para HMS Push Kit

## 🎯 ¿Qué Opción Elegir en Huawei Developers?

Al acceder a https://developer.huawei.com/, verás varias opciones:

### ✅ **OPCIÓN CORRECTA: Consumer (Consumo/Consumidor)**

**Elige: Consumer** para desarrollo de aplicaciones móviles

Esta opción es para:
- ✅ Desarrollo de aplicaciones Android/iOS
- ✅ AppGallery Connect (plataforma de apps)
- ✅ HMS Core Services (Push Kit, Analytics, etc.)
- ✅ Publicación en AppGallery

### ❌ Otras Opciones (NO son las correctas para tu caso):

- **Huawei Cloud**: Servicios en la nube (IaaS, PaaS, servidores virtuales)
- **Kunpeng**: Servidores y chips Kunpeng
- **Ascend**: Servidores y chips Ascend

## 🚀 Pasos Detallados

### Paso 1: Acceder a Huawei Developers

1. Ve a: **https://developer.huawei.com/**
2. Haz clic en **"Consumer"** o **"Consumo"** (dependiendo del idioma)

### Paso 2: Crear Cuenta de Desarrollador

1. Si no tienes cuenta, haz clic en **"Registrarse"** o **"Sign Up"**
2. Completa el formulario de registro
3. Verifica tu email
4. Completa la información del perfil de desarrollador

### Paso 3: Acceder a AppGallery Connect

Una vez que tengas cuenta:

1. Opción A: Desde el menú de Consumer, busca **"AppGallery Connect"**
2. Opción B: Accede directamente a: **https://developer.huawei.com/consumer/cn/service/josp/agc/index.html**

### Paso 4: Crear Proyecto

1. Inicia sesión en AppGallery Connect
2. Haz clic en **"Crear proyecto"** o **"Create Project"**
3. Completa:
   - **Nombre del proyecto**: Ej: "Clínica Móvil"
   - **País/Región**: Selecciona tu país
4. Haz clic en **"Aceptar"** o **"OK"**

### Paso 5: Agregar Aplicación Android

1. En tu proyecto, haz clic en **"Agregar aplicación"** o **"Add App"**
2. Selecciona **"Android"**
3. Completa:
   - **Nombre de la aplicación**: Ej: "Clínica Móvil"
   - **Nombre del paquete**: `com.clinicamovil` (debe coincidir con tu `applicationId`)
   - **Categoría**: Selecciona la categoría apropiada
4. Haz clic en **"Aceptar"**

### Paso 6: Habilitar Push Kit

1. En tu aplicación, ve a **"Habilitar servicios"** o **"App Services"**
2. Busca **"Push Kit"** en la lista de servicios
3. Haz clic en **"Habilitar"** o **"Enable"**
4. Acepta los términos y condiciones
5. Espera a que se habilite (puede tardar unos minutos)

### Paso 7: Obtener App ID

1. Ve a **"Mi proyecto"** > **"Información general"** o **"Project Settings"** > **"App Information"**
2. Busca el **"App ID"** (es un número largo, ejemplo: `123456789`)
3. **Copia el App ID** - lo necesitarás para configurar la app

### Paso 8: Obtener App Secret (Opcional, para Backend)

1. Ve a **"Habilitar servicios"** > **"Push Kit"** > **"Configuración"**
2. Busca **"App Secret"**
3. Si no existe, haz clic en **"Generar"** o **"Generate"**
4. **Copia el App Secret** - lo necesitarás en el backend para enviar notificaciones

### Paso 9: Configurar App ID en la App

1. Abre `ClinicaMovil/android/app/src/main/AndroidManifest.xml`
2. Busca la línea:
   ```xml
   <meta-data
       android:name="com.huawei.hms.client.appid"
       android:value="appid=TU_APP_ID_AQUI"
       tools:replace="android:value" />
   ```
3. Reemplaza `TU_APP_ID_AQUI` con tu App ID real:
   ```xml
   <meta-data
       android:name="com.huawei.hms.client.appid"
       android:value="appid=123456789"
       tools:replace="android:value" />
   ```

### Paso 10: Descargar agconnect-services.json (Opcional pero Recomendado)

1. En AppGallery Connect, ve a tu aplicación
2. Ve a **"Configuración del proyecto"** o **"Project Settings"**
3. Descarga el archivo **"agconnect-services.json"**
4. Colócalo en: `ClinicaMovil/android/app/`
5. **IMPORTANTE**: Este archivo es similar a `google-services.json` de Firebase

## 📋 Resumen de Opciones

| Opción | ¿Para qué sirve? | ¿Lo necesitas? |
|--------|------------------|----------------|
| **Consumer** | Apps móviles, AppGallery Connect | ✅ **SÍ - Esta es la correcta** |
| Huawei Cloud | Servicios en la nube (IaaS, PaaS) | ❌ No |
| Kunpeng | Servidores Kunpeng | ❌ No |
| Ascend | Servidores Ascend | ❌ No |

## 🔗 Enlaces Directos

- **Huawei Developers (Consumer)**: https://developer.huawei.com/consumer/en/
- **AppGallery Connect**: https://developer.huawei.com/consumer/cn/service/josp/agc/index.html
- **Push Kit Documentation**: https://developer.huawei.com/consumer/en/hms/huawei-pushkit

## ⚠️ Notas Importantes

1. **El proceso de registro puede tardar 1-2 días** en ser aprobado
2. **Necesitas verificar tu identidad** como desarrollador
3. **El App ID es único** por aplicación
4. **El App Secret se usa solo en el backend** para enviar notificaciones
5. **El package name debe coincidir exactamente** con tu `applicationId` en `build.gradle`

## 🎯 Preguntas Frecuentes

**P: ¿Puedo usar Huawei Cloud en lugar de Consumer?**  
R: No, Huawei Cloud es para servicios de infraestructura en la nube, no para aplicaciones móviles.

**P: ¿Cuánto tarda la aprobación de la cuenta?**  
R: Generalmente 1-2 días hábiles después de completar la verificación.

**P: ¿Puedo probar Push Kit sin tener un dispositivo Huawei físico?**  
R: No, HMS Push Kit solo funciona en dispositivos Huawei reales con HMS instalado.

**P: ¿Necesito el App Secret para que la app funcione?**  
R: No, el App Secret solo se usa en el backend para enviar notificaciones. La app solo necesita el App ID.



