# 📱 Guía de Integración Móvil - React Native

## 🎯 **INTRODUCCIÓN**

Esta guía te llevará paso a paso para integrar la API Clínica Médica con tu aplicación React Native, incluyendo autenticación, WebSockets, push notifications y sincronización offline.

---

## 🚀 **CONFIGURACIÓN INICIAL**

### **1. Instalar Dependencias**

```bash
# Dependencias principales
npm install axios socket.io-client
npm install @react-native-async-storage/async-storage
npm install react-native-keychain

# Firebase para push notifications
npm install @react-native-firebase/app @react-native-firebase/messaging

# Para autenticación biométrica
npm install react-native-biometrics
npm install react-native-touch-id

# Para manejo de estado (opcional)
npm install @reduxjs/toolkit react-redux
# o
npm install zustand

# Para navegación (opcional)
npm install @react-navigation/native @react-navigation/stack
```

### **2. Configuración de Firebase**

#### **Android (google-services.json)**
1. Descarga `google-services.json` desde Firebase Console
2. Colócalo en `android/app/`

#### **iOS (GoogleService-Info.plist)**
1. Descarga `GoogleService-Info.plist` desde Firebase Console
2. Colócalo en `ios/YourApp/`

#### **Configurar Firebase**
```javascript
// firebase.config.js
import { initializeApp } from '@react-native-firebase/app';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

export default initializeApp(firebaseConfig);
```

---

## 🔧 **CONFIGURACIÓN DE LA API**

### **1. Configuración Base**

```javascript
// config/api.js
export const API_CONFIG = {
  baseURL: __DEV__ 
    ? 'http://localhost:3000/api' 
    : 'https://your-production-api.com/api',
  wsURL: __DEV__ 
    ? 'ws://localhost:3000' 
    : 'wss://your-production-api.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Type': 'app'
  }
};

export const getDeviceInfo = () => ({
  device_id: getDeviceId(),
  platform: Platform.OS,
  app_version: '1.0.0',
  os_version: Platform.Version.toString()
});
```

### **2. Servicio de API**

```javascript
// services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG, getDeviceInfo } from '../config/api';

class ApiService {
  constructor() {
    this.api = axios.create(API_CONFIG);
    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('auth_token');
        const deviceInfo = getDeviceInfo();
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Headers específicos para móviles
        config.headers['X-Device-ID'] = deviceInfo.device_id;
        config.headers['X-Platform'] = deviceInfo.platform;
        config.headers['X-App-Version'] = deviceInfo.app_version;
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expirado, intentar renovar
          await this.refreshToken();
        }
        return Promise.reject(error);
      }
    );
  }

  // Métodos de autenticación
  async login(email, password) {
    const response = await this.api.post('/mobile/login', {
      email,
      password
    });
    
    const { token, refresh_token, usuario } = response.data;
    
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('refresh_token', refresh_token);
    await AsyncStorage.setItem('user_data', JSON.stringify(usuario));
    
    return response.data;
  }

  async refreshToken() {
    const refresh_token = await AsyncStorage.getItem('refresh_token');
    
    if (!refresh_token) {
      throw new Error('No refresh token available');
    }

    const response = await this.api.post('/mobile/refresh-token', {
      refresh_token
    });

    const { token, refresh_token: new_refresh_token } = response.data;
    
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('refresh_token', new_refresh_token);
    
    return response.data;
  }

  async logout() {
    await AsyncStorage.multiRemove(['auth_token', 'refresh_token', 'user_data']);
  }

  // Métodos de datos
  async getPacientes(page = 1, limit = 10) {
    const response = await this.api.get(`/pacientes?page=${page}&limit=${limit}`);
    return response.data;
  }

  async getCitas(page = 1, limit = 10) {
    const response = await this.api.get(`/citas?page=${page}&limit=${limit}`);
    return response.data;
  }

  async createCita(citaData) {
    const response = await this.api.post('/citas', citaData);
    return response.data;
  }

  // Métodos móviles específicos
  async getMobileConfig() {
    const response = await this.api.get('/mobile/config');
    return response.data;
  }

  async getPatientDashboard() {
    const response = await this.api.get('/mobile/patient/dashboard');
    return response.data;
  }

  async registerDevice(deviceToken) {
    const response = await this.api.post('/mobile/device/register', {
      device_token: deviceToken,
      platform: Platform.OS,
      device_info: getDeviceInfo()
    });
    return response.data;
  }

  async syncOfflineData(data) {
    const response = await this.api.post('/mobile/sync/offline', {
      last_sync: await AsyncStorage.getItem('last_sync'),
      data
    });
    return response.data;
  }
}

export default new ApiService();
```

---

## ⚡ **WEBSOCKETS**

### **1. Servicio de WebSocket**

```javascript
// services/websocket.js
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  async connect() {
    const token = await AsyncStorage.getItem('auth_token');
    const deviceId = await getDeviceId();

    this.socket = io(API_CONFIG.wsURL, {
      auth: {
        token,
        device_id: deviceId
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('WebSocket conectado');
      this.emit('connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket desconectado');
      this.emit('disconnected');
    });

    this.socket.on('push_notification', (data) => {
      this.emit('push_notification', data);
    });

    this.socket.on('appointment_reminder', (data) => {
      this.emit('appointment_reminder', data);
    });

    this.socket.on('medication_reminder', (data) => {
      this.emit('medication_reminder', data);
    });

    this.socket.on('test_result', (data) => {
      this.emit('test_result', data);
    });

    this.socket.on('emergency_alert', (data) => {
      this.emit('emergency_alert', data);
    });
  }

  // Métodos de comunicación
  sendHeartbeat() {
    if (this.socket?.connected) {
      this.socket.emit('ping');
    }
  }

  notifyAppBackground() {
    if (this.socket?.connected) {
      this.socket.emit('app_background');
    }
  }

  notifyAppForeground() {
    if (this.socket?.connected) {
      this.socket.emit('app_foreground');
    }
  }

  requestSyncStatus() {
    if (this.socket?.connected) {
      this.socket.emit('sync_status_request');
    }
  }

  // Sistema de eventos
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export default new WebSocketService();
```

### **2. Hook de WebSocket**

```javascript
// hooks/useWebSocket.js
import { useEffect, useRef } from 'react';
import WebSocketService from '../services/websocket';

export const useWebSocket = () => {
  const wsService = useRef(WebSocketService);

  useEffect(() => {
    wsService.current.connect();

    return () => {
      wsService.current.disconnect();
    };
  }, []);

  return {
    on: wsService.current.on.bind(wsService.current),
    off: wsService.current.off.bind(wsService.current),
    sendHeartbeat: wsService.current.sendHeartbeat.bind(wsService.current),
    notifyAppBackground: wsService.current.notifyAppBackground.bind(wsService.current),
    notifyAppForeground: wsService.current.notifyAppForeground.bind(wsService.current)
  };
};
```

---

## 🔔 **PUSH NOTIFICATIONS**

### **1. Configuración de Firebase Messaging**

```javascript
// services/pushNotifications.js
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from './api';

class PushNotificationService {
  constructor() {
    this.setupFirebaseMessaging();
  }

  async setupFirebaseMessaging() {
    // Solicitar permisos
    const authStatus = await messaging().requestPermission();
    const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                   authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      // Obtener token FCM
      const fcmToken = await messaging().getToken();
      console.log('FCM Token:', fcmToken);
      
      // Registrar token en el servidor
      await this.registerToken(fcmToken);

      // Configurar listeners
      this.setupMessageHandlers();
    }
  }

  async registerToken(token) {
    try {
      await ApiService.registerDevice(token);
      await AsyncStorage.setItem('fcm_token', token);
    } catch (error) {
      console.error('Error registrando token FCM:', error);
    }
  }

  setupMessageHandlers() {
    // Mensaje en primer plano
    messaging().onMessage(async remoteMessage => {
      console.log('Mensaje recibido en primer plano:', remoteMessage);
      this.handleNotification(remoteMessage);
    });

    // Mensaje en segundo plano
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Mensaje recibido en segundo plano:', remoteMessage);
      this.handleNotification(remoteMessage);
    });

    // Token refresh
    messaging().onTokenRefresh(token => {
      console.log('Token FCM renovado:', token);
      this.registerToken(token);
    });
  }

  handleNotification(remoteMessage) {
    const { notification, data } = remoteMessage;
    
    // Mostrar notificación local
    if (notification) {
      // Aquí puedes usar una librería como react-native-push-notification
      // para mostrar notificaciones locales
    }

    // Manejar datos específicos
    if (data) {
      switch (data.type) {
        case 'appointment_reminder':
          this.handleAppointmentReminder(data);
          break;
        case 'medication_reminder':
          this.handleMedicationReminder(data);
          break;
        case 'test_result':
          this.handleTestResult(data);
          break;
        case 'emergency_alert':
          this.handleEmergencyAlert(data);
          break;
      }
    }
  }

  handleAppointmentReminder(data) {
    // Navegar a la pantalla de citas o mostrar modal
    console.log('Recordatorio de cita:', data);
  }

  handleMedicationReminder(data) {
    // Mostrar recordatorio de medicamento
    console.log('Recordatorio de medicamento:', data);
  }

  handleTestResult(data) {
    // Navegar a resultados o mostrar notificación
    console.log('Resultado de examen:', data);
  }

  handleEmergencyAlert(data) {
    // Mostrar alerta urgente
    console.log('Alerta médica:', data);
  }
}

export default new PushNotificationService();
```

### **2. Hook de Push Notifications**

```javascript
// hooks/usePushNotifications.js
import { useEffect } from 'react';
import PushNotificationService from '../services/pushNotifications';

export const usePushNotifications = () => {
  useEffect(() => {
    PushNotificationService.setupFirebaseMessaging();
  }, []);

  return {
    // Métodos para manejar notificaciones
  };
};
```

---

## 🔐 **AUTENTICACIÓN BIOMÉTRICA**

### **1. Servicio de Biometría**

```javascript
// services/biometricAuth.js
import ReactNativeBiometrics from 'react-native-biometrics';
import ApiService from './api';

class BiometricAuthService {
  constructor() {
    this.rnBiometrics = new ReactNativeBiometrics();
  }

  async isBiometricAvailable() {
    try {
      const { available, biometryType } = await this.rnBiometrics.isSensorAvailable();
      return { available, type: biometryType };
    } catch (error) {
      console.error('Error verificando biometría:', error);
      return { available: false, type: null };
    }

  async registerBiometric(pacienteId) {
    try {
      const { available } = await this.isBiometricAvailable();
      if (!available) {
        throw new Error('Biometría no disponible');
      }

      // Crear challenge
      const { success, challenge } = await this.rnBiometrics.createKeys();
      if (!success) {
        throw new Error('Error creando claves biométricas');
      }

      // Registrar en el servidor
      const response = await ApiService.registerBiometric({
        paciente_id: pacienteId,
        biometric_data: challenge,
        biometric_type: 'fingerprint'
      });

      return response;
    } catch (error) {
      console.error('Error registrando biometría:', error);
      throw error;
    }
  }

  async authenticateWithBiometric(curp) {
    try {
      const { available } = await this.isBiometricAvailable();
      if (!available) {
        throw new Error('Biometría no disponible');
      }

      // Autenticar con biometría
      const { success, signature } = await this.rnBiometrics.createSignature({
        promptMessage: 'Autenticación biométrica',
        payload: curp
      });

      if (!success) {
        throw new Error('Autenticación biométrica fallida');
      }

      // Enviar al servidor
      const response = await ApiService.loginBiometric({
        curp,
        biometric_data: signature
      });

      return response;
    } catch (error) {
      console.error('Error en autenticación biométrica:', error);
      throw error;
    }
  }

  async deleteBiometric() {
    try {
      await this.rnBiometrics.deleteKeys();
    } catch (error) {
      console.error('Error eliminando biometría:', error);
    }
  }
}

export default new BiometricAuthService();
```

### **2. Hook de Biometría**

```javascript
// hooks/useBiometricAuth.js
import { useState, useEffect } from 'react';
import BiometricAuthService from '../services/biometricAuth';

export const useBiometricAuth = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState(null);

  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    const { available, type } = await BiometricAuthService.isBiometricAvailable();
    setIsAvailable(available);
    setBiometricType(type);
  };

  const registerBiometric = async (pacienteId) => {
    return await BiometricAuthService.registerBiometric(pacienteId);
  };

  const authenticateWithBiometric = async (curp) => {
    return await BiometricAuthService.authenticateWithBiometric(curp);
  };

  const deleteBiometric = async () => {
    return await BiometricAuthService.deleteBiometric();
  };

  return {
    isAvailable,
    biometricType,
    registerBiometric,
    authenticateWithBiometric,
    deleteBiometric
  };
};
```

---

## 🔄 **SINCRONIZACIÓN OFFLINE**

### **1. Servicio de Sincronización**

```javascript
// services/offlineSync.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import ApiService from './api';

class OfflineSyncService {
  constructor() {
    this.offlineQueue = [];
    this.isOnline = true;
    this.setupNetworkListener();
  }

  setupNetworkListener() {
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected;
      
      if (this.isOnline && this.offlineQueue.length > 0) {
        this.syncOfflineData();
      }
    });
  }

  async addToOfflineQueue(action, data) {
    const offlineAction = {
      id: Date.now().toString(),
      action,
      data,
      timestamp: new Date().toISOString()
    };

    this.offlineQueue.push(offlineAction);
    await AsyncStorage.setItem('offline_queue', JSON.stringify(this.offlineQueue));
  }

  async syncOfflineData() {
    if (!this.isOnline || this.offlineQueue.length === 0) {
      return;
    }

    try {
      const response = await ApiService.syncOfflineData(this.offlineQueue);
      
      // Limpiar cola offline
      this.offlineQueue = [];
      await AsyncStorage.removeItem('offline_queue');
      
      // Actualizar última sincronización
      await AsyncStorage.setItem('last_sync', new Date().toISOString());
      
      return response;
    } catch (error) {
      console.error('Error sincronizando datos offline:', error);
      throw error;
    }
  }

  async getOfflineQueue() {
    const queue = await AsyncStorage.getItem('offline_queue');
    return queue ? JSON.parse(queue) : [];
  }

  async clearOfflineQueue() {
    this.offlineQueue = [];
    await AsyncStorage.removeItem('offline_queue');
  }
}

export default new OfflineSyncService();
```

### **2. Hook de Sincronización**

```javascript
// hooks/useOfflineSync.js
import { useEffect, useState } from 'react';
import OfflineSyncService from '../services/offlineSync';

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);

  useEffect(() => {
    // Verificar estado de red
    NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
    });

    // Cargar cola offline
    loadOfflineQueue();
  }, []);

  const loadOfflineQueue = async () => {
    const queue = await OfflineSyncService.getOfflineQueue();
    setPendingSync(queue.length);
  };

  const addToOfflineQueue = async (action, data) => {
    await OfflineSyncService.addToOfflineQueue(action, data);
    setPendingSync(prev => prev + 1);
  };

  const syncOfflineData = async () => {
    const result = await OfflineSyncService.syncOfflineData();
    setPendingSync(0);
    return result;
  };

  return {
    isOnline,
    pendingSync,
    addToOfflineQueue,
    syncOfflineData
  };
};
```

---

## 📱 **COMPONENTES DE EJEMPLO**

### **1. Pantalla de Login**

```javascript
// screens/LoginScreen.js
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import ApiService from '../services/api';
import { useBiometricAuth } from '../hooks/useBiometricAuth';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { isAvailable, authenticateWithBiometric } = useBiometricAuth();

  const handleLogin = async () => {
    try {
      setLoading(true);
      const response = await ApiService.login(email, password);
      
      // Navegar a dashboard
      navigation.navigate('Dashboard');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const response = await authenticateWithBiometric(email);
      navigation.navigate('Dashboard');
    } catch (error) {
      Alert.alert('Error', 'Autenticación biométrica fallida');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Iniciar Sesión</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Contraseña"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Iniciando...' : 'Iniciar Sesión'}
        </Text>
      </TouchableOpacity>

      {isAvailable && (
        <TouchableOpacity
          style={styles.biometricButton}
          onPress={handleBiometricLogin}
        >
          <Text style={styles.biometricButtonText}>
            Iniciar con Biometría
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default LoginScreen;
```

### **2. Pantalla de Dashboard**

```javascript
// screens/DashboardScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useWebSocket } from '../hooks/useWebSocket';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useOfflineSync } from '../hooks/useOfflineSync';
import ApiService from '../services/api';

const DashboardScreen = () => {
  const [dashboard, setDashboard] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const { isOnline, pendingSync, syncOfflineData } = useOfflineSync();
  
  // Configurar WebSocket
  const ws = useWebSocket();
  
  // Configurar push notifications
  usePushNotifications();

  useEffect(() => {
    loadDashboard();
    setupWebSocketListeners();
  }, []);

  const setupWebSocketListeners = () => {
    ws.on('appointment_reminder', handleAppointmentReminder);
    ws.on('medication_reminder', handleMedicationReminder);
    ws.on('test_result', handleTestResult);
  };

  const loadDashboard = async () => {
    try {
      const data = await ApiService.getPatientDashboard();
      setDashboard(data.dashboard);
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  };

  const handleSync = async () => {
    try {
      await syncOfflineData();
      Alert.alert('Éxito', 'Datos sincronizados');
    } catch (error) {
      Alert.alert('Error', 'Error sincronizando datos');
    }
  };

  const handleAppointmentReminder = (data) => {
    Alert.alert('Recordatorio de Cita', data.message);
  };

  const handleMedicationReminder = (data) => {
    Alert.alert('Recordatorio de Medicamento', data.message);
  };

  const handleTestResult = (data) => {
    Alert.alert('Resultado de Examen', data.message);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
      
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Modo Offline</Text>
        </View>
      )}
      
      {pendingSync > 0 && (
        <TouchableOpacity style={styles.syncButton} onPress={handleSync}>
          <Text style={styles.syncButtonText}>
            Sincronizar ({pendingSync})
          </Text>
        </TouchableOpacity>
      )}
      
      <FlatList
        data={dashboard?.quick_actions || []}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>{item.title}</Text>
          </TouchableOpacity>
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
    </View>
  );
};

export default DashboardScreen;
```

---

## 🧪 **TESTING**

### **1. Tests de Integración**

```javascript
// __tests__/api.test.js
import ApiService from '../services/api';

describe('API Service', () => {
  test('should login successfully', async () => {
    const response = await ApiService.login('test@example.com', 'password');
    expect(response.token).toBeDefined();
    expect(response.usuario).toBeDefined();
  });

  test('should get pacientes', async () => {
    const response = await ApiService.getPacientes();
    expect(response.pacientes).toBeDefined();
    expect(Array.isArray(response.pacientes)).toBe(true);
  });
});
```

### **2. Tests de WebSocket**

```javascript
// __tests__/websocket.test.js
import WebSocketService from '../services/websocket';

describe('WebSocket Service', () => {
  test('should connect to server', async () => {
    await WebSocketService.connect();
    expect(WebSocketService.socket).toBeDefined();
  });

  test('should handle push notifications', () => {
    const callback = jest.fn();
    WebSocketService.on('push_notification', callback);
    
    // Simular evento
    WebSocketService.emit('push_notification', { title: 'Test' });
    
    expect(callback).toHaveBeenCalledWith({ title: 'Test' });
  });
});
```

---

## 🚀 **DESPLIEGUE**

### **1. Configuración de Producción**

```javascript
// config/api.prod.js
export const API_CONFIG = {
  baseURL: 'https://your-production-api.com/api',
  wsURL: 'wss://your-production-api.com',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Type': 'app'
  }
};
```

### **2. Variables de Entorno**

```bash
# .env.production
API_BASE_URL=https://your-production-api.com/api
WS_URL=wss://your-production-api.com
FIREBASE_PROJECT_ID=your-production-project-id
```

### **3. Build de Producción**

```bash
# Android
cd android
./gradlew assembleRelease

# iOS
cd ios
xcodebuild -workspace YourApp.xcworkspace -scheme YourApp -configuration Release
```

---

## 📚 **RECURSOS ADICIONALES**

### **Documentación**
- [React Native Docs](https://reactnative.dev/)
- [Firebase Docs](https://firebase.google.com/docs)
- [Socket.IO Docs](https://socket.io/docs/)

### **Librerías Útiles**
- `react-native-keychain` - Almacenamiento seguro
- `@react-native-community/netinfo` - Estado de red
- `react-native-push-notification` - Notificaciones locales
- `react-native-biometrics` - Autenticación biométrica

### **Herramientas de Desarrollo**
- Flipper - Debugging
- React Native Debugger
- Firebase Console
- Postman - Testing de API

---

## 🆘 **SOLUCIÓN DE PROBLEMAS**

### **Problemas Comunes**

1. **WebSocket no conecta**: Verificar URL y token
2. **Push notifications no llegan**: Verificar configuración de Firebase
3. **Biometría no funciona**: Verificar permisos y configuración
4. **Sincronización offline falla**: Verificar estado de red

### **Debugging**

```javascript
// Habilitar logs de debug
console.log('API Response:', response);
console.log('WebSocket Status:', socket.connected);
console.log('FCM Token:', fcmToken);
```

---

**¡Tu app móvil está lista para integrarse con la API Clínica Médica! 🎉**
