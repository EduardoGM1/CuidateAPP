# 📱 Instalación de HMS Push Kit para Dispositivos Huawei

## 🎯 Objetivo

Permitir que dispositivos Huawei **sin Google Play Services** (como Y90) puedan recibir notificaciones push usando **HMS Push Kit** de Huawei.

## 📋 Requisitos Previos

1. **Cuenta de desarrollador Huawei**
   - Crear cuenta en: https://developer.huawei.com/
   - Verificar cuenta y completar perfil

2. **Proyecto en AppGallery Connect**
   - Crear proyecto en: https://developer.huawei.com/consumer/cn/service/josp/agc/index.html
   - Obtener App ID y App Secret

## 🔧 Instalación

### Paso 1: Instalar el SDK de HMS Push Kit

```bash
cd ClinicaMovil
npm install @hmscore/react-native-hms-push
```

### Paso 2: Configurar Android

#### 2.1 Agregar repositorio Maven en `android/build.gradle`:

**IMPORTANTE**: En proyectos React Native modernos, el repositorio debe agregarse en `buildscript.repositories`:

```gradle
buildscript {
    repositories {
        google()
        mavenCentral()
        // Repositorio de Huawei para HMS Push Kit
        maven { url 'https://developer.huawei.com/repo/' }
    }
    // ... resto de la configuración
}
```

**NOTA**: El autolinking de React Native manejará automáticamente el paquete `@hmscore/react-native-hms-push`, pero las dependencias nativas de HMS necesitan el repositorio Maven configurado.

#### 2.2 Agregar dependencia en `android/app/build.gradle`:

```gradle
dependencies {
    // ... otras dependencias ...
    
    // HMS Push Kit
    implementation 'com.huawei.hms:push:6.11.0.301'
}
```

### Paso 3: Configurar AndroidManifest.xml

Agregar permisos y servicios de HMS en `android/app/src/main/AndroidManifest.xml`:

```xml
<!-- Permisos para HMS Push Kit -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="com.huawei.android.launcher.permission.CHANGE_BADGE" />

<application>
    <!-- HMS Push Service -->
    <service
        android:name="com.huawei.hms.push.HmsMessageService"
        android:exported="false">
        <intent-filter>
            <action android:name="com.huawei.push.action.MESSAGING_EVENT" />
        </intent-filter>
    </service>
    
    <!-- Meta-data para HMS App ID -->
    <meta-data
        android:name="com.huawei.hms.client.appid"
        android:value="appid=TU_APP_ID_AQUI" />
</application>
```

### Paso 4: Configurar App ID en el código

El App ID se puede configurar de dos formas:
1. **En AndroidManifest.xml** (como se muestra arriba)
2. **En código JavaScript** (más flexible)

### Paso 5: Recompilar

```bash
cd android
./gradlew clean
cd ..
npm run android
```

## 🔑 Obtener Credenciales de Huawei

### 1. Crear Proyecto en AppGallery Connect

1. Ve a: https://developer.huawei.com/consumer/cn/service/josp/agc/index.html
2. Inicia sesión con tu cuenta de desarrollador
3. Crea un nuevo proyecto o selecciona uno existente
4. Agrega una app Android al proyecto

### 2. Habilitar Push Kit

1. En el proyecto, ve a "Habilitar servicios"
2. Busca "Push Kit" y habilítalo
3. Acepta los términos y condiciones

### 3. Obtener App ID y App Secret

1. Ve a "Mi proyecto" > "Información general"
2. Copia el **App ID**
3. Ve a "Habilitar servicios" > "Push Kit" > "Configuración"
4. Genera y copia el **App Secret**

### 4. Configurar App ID en la App

Edita `android/app/src/main/AndroidManifest.xml` y reemplaza `TU_APP_ID_AQUI` con tu App ID real.

## 📝 Configuración del Backend

El backend debe detectar si el token es de FCM o HMS y enviar notificaciones usando el servicio apropiado:

- **Tokens FCM**: Prefijo `FCM:` → Usar Firebase Admin SDK
- **Tokens HMS**: Prefijo `HMS:` → Usar HMS Push Kit API

## 🧪 Pruebas

1. Instala la app en un dispositivo Huawei sin Google Play Services
2. Inicia sesión
3. Verifica los logs - deberías ver:
   ```
   📱 Dispositivo Huawei sin Google Play Services detectado
   ✅ Token HMS Push Kit obtenido exitosamente
   ```
4. El token se registrará con prefijo `HMS:` para que el backend sepa cómo enviar notificaciones

## 📚 Recursos

- [Documentación oficial de HMS Push Kit](https://developer.huawei.com/consumer/cn/doc/development/HMS-Guides/push-introduction)
- [React Native HMS Push Plugin](https://developer.huawei.com/consumer/cn/doc/development/HMS-Plugin-Guides/react-native-plugin-push-0000001051242043)
- [AppGallery Connect](https://developer.huawei.com/consumer/cn/service/josp/agc/index.html)

## ⚠️ Notas Importantes

1. **HMS Push Kit solo funciona en dispositivos Huawei** con HMS (Huawei Mobile Services)
2. **No funciona en dispositivos con Google Play Services** - usa FCM para esos
3. El sistema detecta automáticamente qué servicio usar
4. Los tokens se prefijan con `FCM:` o `HMS:` para que el backend sepa cómo enviar

