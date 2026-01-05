# 🎯 PLAN DE IMPLEMENTACIÓN: INTERFAZ DE PACIENTE

## 📊 RESUMEN DEL ANÁLISIS

**Estado Actual:**
- ✅ Backend completo (85%)
- ✅ Interfaz Admin/Doctor completa (90%)
- ❌ **Interfaz Paciente NO EXISTE** (5%)

**Gap Crítico:** La aplicación móvil actual solo tiene interfaz para Administradores y Doctores. **NO existe interfaz funcional para pacientes.**

---

## 🚨 PROBLEMA IDENTIFICADO

El archivo `ClinicaMovil/src/screens/DashboardPaciente.js` actualmente solo tiene:

```javascript
// Solo 68 líneas - BÁSICAMENTE VACÍO
const DashboardPaciente = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <Text>👤 Dashboard Paciente</Text>
      <Button onPress={handleLogout}>Cerrar Sesión</Button>
    </SafeAreaView>
  );
};
```

**Esto NO cumple con NINGUNO de los requerimientos del paciente.**

---

## 🎯 REQUERIMIENTOS DEL CLIENTE VS LO QUE FALTA

### Datos Requeridos del Paciente:
| Requerimiento | Estado Backend | Estado Frontend | Estado App Paciente |
|---------------|----------------|-----------------|---------------------|
| Nombre, CURP, fecha de nacimiento | ✅ Completo | ✅ Admin puede ver | ❌ Paciente NO puede ver |
| Dirección, localidad | ✅ Completo | ✅ Admin puede ver | ❌ NO implementado |
| Número de celular | ✅ Completo | ✅ Admin puede ver | ❌ NO implementado |
| **Red de apoyo (tutor)** | ✅ Modelo existe | ⚠️ Solo lectura | ❌ NO implementado |
| **Dx enfermedades crónicas** | ✅ Modelo Comorbilidad | ✅ Admin puede ver | ❌ NO implementado |
| **Años con padecimiento** | ✅ Modelo existe | ✅ Admin puede ver | ❌ NO implementado |
| **Recibe tratamiento** | ✅ Modelo existe | ✅ Admin puede ver | ❌ NO implementado |
| **Esquema de vacunación** | ✅ Modelo existe | ⚠️ Solo lectura | ❌ NO implementado |
| **Puntos de chequeo** | ✅ Modelo existe | ⚠️ NO implementado | ❌ NO implementado |
| **Antropometría (peso, talla, IMC)** | ✅ Modelo existe | ✅ Admin puede agregar | ❌ NO implementado |
| **Presión arterial** | ✅ Modelo existe | ✅ Admin puede agregar | ❌ NO implementado |
| **Glucosa, colesterol, triglicéridos** | ✅ Modelo existe | ✅ Admin puede agregar | ❌ NO implementado |

---

## 💻 IMPLEMENTACIÓN: ESTRUCTURA DE ARCHIVOS NECESARIA

### 1. Crear Estructura Base para Pacientes

```
ClinicaMovil/src/
├── screens/
│   ├── paciente/                          ← CREAR ESTA CARPETA
│   │   ├── InicioPaciente.js             ← Pantalla principal
│   │   ├── MisDatos.js                   ← Datos personales
│   │   ├── RegistrarSignosVitales.js      ← Formulario ULTRA-SIMPLE
│   │   ├── MisMedicamentos.js            ← Lista de medicamentos
│   │   ├── MisCitas.js                   ← Próximas citas
│   │   ├── HistorialMedico.js            ← Historial completo
│   │   ├── ChatDoctor.js                 ← Comunicación
│   │   └── Configuracion.js              ← Configuración
│   └── auth/
│       ├── LoginPaciente.js              ← Ya existe ⚠️ MEJORAR
│       └── LoginPIN.js                    ← Ya existe ✅
```

### 2. Crear Servicios Necesarios

```
ClinicaMovil/src/
├── services/
│   ├── notificationService.js             ← Notificaciones locales
│   ├── alertService.js                   ← Sistema de alertas
│   └── ttsService.js                      ← Texto a voz (NUEVO)
```

### 3. Crear Componentes Especializados

```
ClinicaMovil/src/
├── components/
│   ├── paciente/                         ← CREAR ESTA CARPETA
│   │   ├── BigIconButton.js             ← Botones grandes
│   │   ├── ValueCard.js                  ← Tarjetas de valores
│   │   ├── MedicationCard.js             ← Cards de medicamentos
│   │   ├── SimpleForm.js                 ← Formularios simples
│   │   └── AlertBanner.js                ← Alertas visuales
│   └── common/
│       └── BotonAudio.js                 ← Ya existe ✅
```

---

## 🎨 DISEÑO: PRINCIPIOS PARA USUARIOS RURALES

### Características Obligatorias:

#### 1. **Íconos Grandes**
```javascript
// Mínimo 80x80px para iconos táctiles
// Colores sólidos y contrastantes
// Sin degradados ni efectos sutiles
```

#### 2. **Texto Mínimo**
```javascript
// Máximo 3-4 opciones por pantalla
// Frases de máximo 4 palabras
// Sin texto largo ni explicaciones complejas
```

#### 3. **Colores Fuertes**
```javascript
// Verde: OK, Saludable
// Amarillo: Precaución
// Rojo: Peligro, Importante
// Azul: Información
// Blanco/Fondo: Neutral
```

#### 4. **TTS (Text-to-Speech)**
```javascript
// Instalar: npm install react-native-tts
// Leer TODO el contenido en voz alta
// Botón 🔊 visible siempre
```

#### 5. **Feedback Visual y Auditivo**
```javascript
// Vibración en cada toque
// Sonido de confirmación
// Animaciones simples
// Colores que cambian según acción
```

---

## 📱 IMPLEMENTACIÓN: PANTALLAS PRINCIPALES

### Pantalla 1: InicioPaciente.js

**Funcionalidades:**
- Mostrar bienvenida con nombre del paciente
- Card grande de "Próxima Cita"
- Botones principales (4 máximo):
  - 📊 Registrar Signos Vitales
  - 💊 Mis Medicamentos
  - 📅 Mis Citas
  - 📋 Historial Médico

```javascript
const InicioPaciente = ({ navigation }) => {
  const [proximaCita, setProximaCita] = useState(null);
  const [medicamentosHoy, setMedicamentosHoy] = useState(0);

  useEffect(() => {
    loadPacienteData();
  }, []);

  const handleRegistrarSignos = () => {
    // Vibrar
    Vibration.vibrate(50);
    // Leer en voz alta
    ttsService.speak('Registrar signos vitales');
    // Navegar
    navigation.navigate('RegistrarSignosVitales');
  };

  // Botones grandes con íconos
  return (
    <View style={styles.container}>
      <Text style={styles.title}>👋 ¡Hola, {nombre}!</Text>
      
      {/* Card de próxima cita */}
      <Card style={styles.citaCard}>
        <Text style={styles.citaTitle}>📅 Próxima Cita</Text>
        <Text style={styles.citaFecha}>{proximaCita?.fecha}</Text>
      </Card>

      {/* Grid de 2x2 con botones grandes */}
      <View style={styles.buttonGrid}>
        <BigIconButton 
          icon="📊" 
          text="Registrar Signos" 
          color="#4CAF50"
          onPress={handleRegistrarSignos}
        />
        <BigIconButton 
          icon="💊" 
          text="Mis Medicamentos" 
          color="#2196F3"
          onPress={() => navigation.navigate('MisMedicamentos')}
        />
        <BigIconButton 
          icon="📅" 
          text="Mis Citas" 
          color="#FF9800"
          onPress={() => navigation.navigate('MisCitas')}
        />
        <BigIconButton 
          icon="📋" 
          text="Historial" 
          color="#9C27B0"
          onPress={() => navigation.navigate('HistorialMedico')}
        />
      </View>
    </View>
  );
};
```

---

### Pantalla 2: RegistrarSignosVitales.js (CRÍTICO)

**Diseño ULTRA-SIMPLE:**

```javascript
const RegistrarSignosVitales = () => {
  const [paso, setPaso] = useState(1); // 1: Peso, 2: Presión, 3: Glucosa
  const [values, setValues] = useState({});

  // Cálculo automático de IMC
  const calcularIMC = (peso, talla) => {
    if (!peso || !talla) return null;
    return (peso / (talla * talla)).toFixed(1);
  };

  // Mostrar UN valor a la vez
  return (
    <View style={styles.container}>
      {/* Indicador de paso */}
      <View style={styles.steps}>
        {[1, 2, 3].map((i) => (
          <View 
            key={i} 
            style={[styles.step, i === paso && styles.activeStep]} 
          />
        ))}
      </View>

      {/* Instrucción con ícono gigante */}
      {paso === 1 && (
        <>
          <Text style={styles.emojiBig}>⚖️</Text>
          <Text style={styles.instruction}>
            ¿Cuánto pesas hoy?
          </Text>
          
          {/* Input grande con botones +/- */}
          <View style={styles.inputContainer}>
            <TouchableOpacity 
              onPress={() => ajustarValor(-0.5)}
              style={styles.adjustButton}
            >
              <Text style={styles.adjustText}>−</Text>
            </TouchableOpacity>
            
            <Text style={styles.valueDisplay}>
              {values.peso || 0} kg
            </Text>
            
            <TouchableOpacity 
              onPress={() => ajustarValor(0.5)}
              style={styles.adjustButton}
            >
              <Text style={styles.adjustText}>+</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Botón de audio */}
      <TouchableOpacity 
        onPress={() => ttsService.speak('¿Cuánto pesas hoy?')}
        style={styles.audioButton}
      >
        <Text style={styles.audioEmoji}>🔊</Text>
      </TouchableOpacity>

      {/* Botones de navegación */}
      <View style={styles.buttons}>
        {paso > 1 && (
          <Button onPress={() => setPaso(paso - 1)}>
            ← Atrás
          </Button>
        )}
        {paso < 3 && (
          <Button onPress={() => setPaso(paso + 1)}>
            Siguiente →
          </Button>
        )}
        {paso === 3 && (
          <Button onPress={handleSubmit} color="#4CAF50">
            ✅ Enviar
          </Button>
        )}
      </View>
    </View>
  );
};
```

---

### Pantalla 3: MisMedicamentos.js

```javascript
const MisMedicamentos = () => {
  const [medicamentos, setMedicamentos] = useState([]);
  const [horaActual, setHoraActual] = useState(new Date());

  useEffect(() => {
    cargarMedicamentos();
  }, []);

  const medicamentosAhora = medicamentos.filter(m => {
    const horaMedicamento = new Date(m.horario);
    return horaMedicamento.getHours() === horaActual.getHours();
  });

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>💊 Mis Medicamentos</Text>

      {/* ALERTA: Medicamentos pendientes */}
      {medicamentosAhora.length > 0 && (
        <View style={styles.alert}>
          <Text style={styles.alertText}>
            🔔 Tienes {medicamentosAhora.length} medicamento(s) para tomar AHORA
          </Text>
        </View>
      )}

      {/* Lista de medicamentos */}
      {medicamentos.map((med) => (
        <MedicationCard 
          key={med.id}
          nombre={med.nombre}
          dosis={med.dosis}
          horario={med.horario}
          tomado={med.tomado}
          onPress={() => marcarComoTomado(med.id)}
        />
      ))}
    </ScrollView>
  );
};
```

---

## 🔔 IMPLEMENTACIÓN: SISTEMA DE ALERTAS

### 1. Backend: alertService.js (NUEVO)

```javascript
// api-clinica/services/alertService.js
import nodeCron from 'node-cron';
import pushNotificationService from './pushNotificationService.js';

class AlertService {
  constructor() {
    this.cronJobs = [];
  }

  // Alerta automática si glucosa fuera de rango
  verificarGlucosa(pacienteId, glucosa) {
    if (glucosa < 70 || glucosa > 180) {
      const mensaje = glucosa < 70 
        ? `⚠️ Tu glucosa está muy baja: ${glucosa} mg/dL. Toma azúcar inmediatamente.`
        : `⚠️ Tu glucosa está alta: ${glucosa} mg/dL. Contacta a tu doctor.`;
      
      return pushNotificationService.sendPushNotification(pacienteId, {
        title: '⚠️ Alerta de Glucosa',
        body: mensaje,
        priority: 'high'
      });
    }
  }

  // Recordatorio de medicamentos
  programarRecordatorioMedicamento(pacienteId, medicamentoId, horario) {
    const [hora, minuto] = horario.split(':');
    
    nodeCron.schedule(`${minuto} ${hora} * * *`, () => {
      // Enviar recordatorio
      pushNotificationService.sendPushNotification(pacienteId, {
        title: '💊 Hora de tomar tu medicamento',
        body: `Es hora de tomar tu medicamento`,
        sound: 'default',
        priority: 'high'
      });
    });
  }

  // Recordatorio de cita (1 día antes)
  programarRecordatorioCita(pacienteId, fechaCita) {
    const unDiaAntes = new Date(fechaCita);
    unDiaAntes.setDate(unDiaAntes.getDate() - 1);
    
    nodeCron.schedule('0 9 * * *', () => {
      // Verificar si hay citas mañana
      // Enviar notificación
    });
  }
}

export default new AlertService();
```

---

### 2. Frontend: localNotificationService.js (NUEVO)

```javascript
// ClinicaMovil/src/services/localNotificationService.js
import PushNotification from 'react-native-push-notification';

class LocalNotificationService {
  constructor() {
    this.configure();
  }

  configure() {
    PushNotification.configure({
      onRegister: function (token) {
        console.log('TOKEN:', token);
      },
      onNotification: function (notification) {
        console.log('NOTIFICATION:', notification);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: true,
    });
  }

  // Recordatorio de medicamento
  programarRecordatorioMedicamento(medicamento, hora) {
    PushNotification.localNotificationSchedule({
      message: `💊 Hora de tomar: ${medicamento}`,
      date: hora,
      repeatType: 'day',
      sound: 'default',
      vibrate: true,
      priority: 'high',
    });
  }

  // Alerta de valor fuera de rango
  alertarValorFueraRango(valor, tipo) {
    const mensaje = `⚠️ Tu ${tipo} está fuera del rango normal`;
    
    PushNotification.localNotification({
      title: '⚠️ Alerta Médica',
      message: mensaje,
      priority: 'high',
      vibrate: true,
      sound: 'default',
      actions: ['Continuar', 'Llamar Doctor'],
    });
  }
}

export default new LocalNotificationService();
```

---

## 📊 IMPLEMENTACIÓN: GRÁFICOS DE EVOLUCIÓN

### Usar Victory Native (Ya Instalado)

```javascript
// ClinicaMovil/src/screens/paciente/GraficosEvolucion.js
import { VictoryChart, VictoryLine, VictoryAxis } from 'victory-native';

const GraficosEvolucion = () => {
  const [datosGlucosa, setDatosGlucosa] = useState([]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📊 Evolución de Glucosa</Text>
      
      <VictoryChart
        width={350}
        height={250}
        theme={{ colors: { scale: ['#FF6B6B'] } }}
      >
        <VictoryAxis 
          label="Fecha" 
          style={{ axisLabel: { padding: 35 } }}
        />
        <VictoryAxis 
          dependentAxis 
          label="Glucosa (mg/dL)"
          style={{ axisLabel: { padding: 40 } }}
        />
        <VictoryLine
          data={datosGlucosa}
          style={{ data: { stroke: '#FF6B6B', strokeWidth: 2 } }}
        />
      </VictoryChart>

      {/* Leyenda de rangos */}
      <View style={styles.legend}>
        <View style={[styles.legendItem, { backgroundColor: '#4CAF50' }]}>
          <Text>Normal (70-100)</Text>
        </View>
        <View style={[styles.legendItem, { backgroundColor: '#FF9800' }]}>
          <Text>Pre-diabetes (100-125)</Text>
        </View>
        <View style={[styles.legendItem, { backgroundColor: '#F44336' }]}>
          <Text>Diabetes (>125)</Text>
        </View>
      </View>
    </View>
  );
};
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### FASE 1: Estructura Base (Semanas 1-2)
- [ ] Crear carpeta `src/screens/paciente/`
- [ ] Implementar `InicioPaciente.js` con diseño ultra-simple
- [ ] Implementar `RegistrarSignosVitales.js` con TTS
- [ ] Implementar `MisMedicamentos.js` con recordatorios
- [ ] Crear componentes `BigIconButton`, `ValueCard`, etc.
- [ ] Instalar `react-native-tts` para texto a voz
- [ ] Instalar `react-native-push-notification` para notificaciones locales

### FASE 2: Sistema de Alertas (Semanas 3-4)
- [ ] Crear `api-clinica/services/alertService.js`
- [ ] Crear `api-clinica/services/reminderService.js`
- [ ] Implementar `ClinicaMovil/src/services/localNotificationService.js`
- [ ] Configurar recordatorios de medicamentos
- [ ] Configurar alertas por valores fuera de rango
- [ ] Programar notificaciones de citas (1 día, 3 horas antes)

### FASE 3: Modo Offline (Semanas 5-6)
- [ ] Implementar `ClinicaMovil/src/services/offlineSyncService.js`
- [ ] Instalar `@react-native-community/netinfo`
- [ ] Crear cola de acciones offline
- [ ] Implementar sincronización automática
- [ ] Agregar indicador de conectividad

### FASE 4: Reportes y Gráficos (Semanas 7-8)
- [ ] Implementar `GraficosEvolucion.js` con Victory Native
- [ ] Crear backend para generación de PDF
- [ ] Implementar exportación a CSV
- [ ] Agregar botón de exportar en historial

### FASE 5: Chat (Semanas 9-10)
- [ ] Implementar endpoints de chat en backend
- [ ] Crear `ChatDoctor.js` en frontend
- [ ] Implementar notificaciones en tiempo real
- [ ] Agregar historial de mensajes

### FASE 6: Mejoras Finales (Semanas 11-12)
- [ ] Integración Bluetooth (opcional)
- [ ] Autenticación biométrica (opcional)
- [ ] Mejoras de accesibilidad
- [ ] Testing y optimizaciones

---

## 🎯 CONCLUSIÓN

**El proyecto tiene una base excelente, pero falta la interfaz completa de paciente. Esta es la implementación MÁS CRÍTICA para cumplir con los requerimientos.**

**Prioridad 1:** Crear estructura completa de pantallas para paciente con diseño ultra-simplificado.

**Prioridad 2:** Implementar sistema de alertas automáticas y recordatorios.

**Prioridad 3:** Agregar modo offline y sincronización.

---

**Autor:** AI Assistant  
**Fecha:** 27/10/2025  
**Versión:** 1.0

