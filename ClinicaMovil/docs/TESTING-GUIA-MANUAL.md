# 🧪 GUÍA DE TESTING MANUAL - INTERFAZ DE PACIENTE

**Fecha:** 2 Noviembre 2025  
**Versión:** 1.0  
**Estado:** Testing Requerido

---

## 📋 RESUMEN DE TESTS AUTOMATIZADOS

**Resultados:**
- ✅ 15 tests pasaron
- ❌ 1 test falló (error esperado - módulo nativo no disponible en testing)
- ✅ Todos los servicios, hooks y componentes exportados correctamente

---

## 🔍 CHECKLIST DE TESTING MANUAL

### 1. Testing de Servicios Base

#### 1.1 TTS Service
- [ ] **Inicialización**: Al iniciar la app como paciente, TTS debe inicializarse sin errores
- [ ] **Habla básica**: Ejecutar en consola: `testPacienteInterface()` y verificar que pronuncie "Prueba de texto a voz"
- [ ] **Idioma**: Debe usar español mexicano
- [ ] **Velocidad**: Debe hablar a velocidad adecuada (0.9)

#### 1.2 Haptic Service
- [ ] **Vibración ligera**: Al presionar botones pequeños, debe vibrar suavemente
- [ ] **Vibración media**: Al presionar botones principales, debe vibrar normalmente
- [ ] **Vibración fuerte**: En acciones importantes, debe vibrar fuerte
- [ ] **Disponibilidad**: Verificar que esté disponible en el dispositivo

#### 1.3 Audio Feedback Service
- [ ] **Feedback de éxito**: Al completar acciones, debe sonar "Listo"
- [ ] **Feedback de error**: Al ocurrir errores, debe sonar "Error"
- [ ] **Feedback de tap**: Al presionar botones, debe haber feedback

---

### 2. Testing de Pantallas

#### 2.1 InicioPaciente
- [ ] **Carga correcta**: La pantalla debe cargar sin errores
- [ ] **Saludo con TTS**: Al entrar, debe pronunciar "Bienvenido [Nombre]. ¿Qué necesitas hacer hoy?"
- [ ] **4 botones grandes**: Deben mostrarse 4 botones grandes y accesibles
- [ ] **Colores diferenciados**: Cada botón debe tener color diferente (verde, rojo, azul, naranja)
- [ ] **Feedback al tocar**: Al presionar cualquier botón:
  - [ ] Debe vibrar
  - [ ] Debe pronunciar el texto del botón
  - [ ] Debe navegar a la pantalla correspondiente
- [ ] **Botón cerrar sesión**: Debe funcionar correctamente

#### 2.2 RegistrarSignosVitales
- [ ] **Formulario paso a paso**: Debe mostrar un campo a la vez
- [ ] **Indicador de progreso**: Debe mostrar "Paso X de Y"
- [ ] **TTS de instrucciones**: Cada campo debe pronunciar su instrucción al aparecer
- [ ] **Botón "Escuchar"**: Debe repetir las instrucciones al presionarlo
- [ ] **Validación visual**:
  - [ ] Campo vacío: borde gris
  - [ ] Campo válido: borde verde + "✓ Correcto"
  - [ ] Campo inválido: borde rojo + mensaje de error
- [ ] **Validaciones de campos**:
  - [ ] Peso: 10-300 kg
  - [ ] Talla: 0.5-2.5 m
  - [ ] Presión sistólica: 40-250
  - [ ] Presión diastólica: 40-250
  - [ ] Glucosa: 50-500 mg/dL
- [ ] **Botones de navegación**:
  - [ ] "Atrás" funciona correctamente
  - [ ] "Siguiente" solo habilitado si el campo es válido
  - [ ] "Enviar" en último paso funciona
- [ ] **Envío al backend**: Al enviar, debe guardar correctamente en la base de datos
- [ ] **Mensaje de éxito**: Debe mostrar mensaje y volver a pantalla anterior

---

### 3. Testing de Navegación

#### 3.1 Navegación entre pantallas
- [ ] **Desde InicioPaciente**:
  - [ ] "Mis Citas" → Abre pantalla MisCitas (placeholder)
  - [ ] "Signos Vitales" → Abre RegistrarSignosVitales
  - [ ] "Mis Medicamentos" → Abre pantalla MisMedicamentos (placeholder)
  - [ ] "Mi Historia" → Abre pantalla HistorialMedico (placeholder)

#### 3.2 Navegación de regreso
- [ ] **Botón "Atrás"**: Funciona correctamente desde todas las pantallas
- [ ] **Botón "Cancelar"**: En formularios, cancela y regresa

---

### 4. Testing de Componentes

#### 4.1 BigIconButton
- [ ] **Tamaño mínimo**: Botones deben ser mínimo 200x120px visualmente
- [ ] **Ícono grande**: Ícono debe ser grande (64px)
- [ ] **Texto claro**: Texto principal y secundario legibles
- [ ] **Feedback al tocar**: Vibración + TTS + navegación
- [ ] **Long press**: Mantener presionado pronuncia descripción completa

#### 4.2 ValueCard
- [ ] **Display de valores**: Muestra valor + unidad claramente
- [ ] **Colores por estado**: Normal (verde), Warning (naranja), Critical (rojo)
- [ ] **TTS al tocar**: Pronuncia valor completo

#### 4.3 MedicationCard
- [ ] **Información completa**: Nombre, dosis, horario, frecuencia
- [ ] **Estado visual**: Tomado (verde) / Pendiente (naranja)
- [ ] **Botón "Tomé"**: Funciona correctamente

#### 4.4 SimpleForm
- [ ] **Un campo a la vez**: Solo muestra el campo actual
- [ ] **Progreso**: Indicador de progreso actualizado
- [ ] **Validación**: Validación en tiempo real
- [ ] **TTS**: Instrucciones pronunciadas automáticamente

---

### 5. Testing de Integración con Backend

#### 5.1 Autenticación
- [ ] **Login como paciente**: Funciona correctamente
- [ ] **Datos del paciente**: Se cargan correctamente

#### 5.2 Registro de Signos Vitales
- [ ] **POST /api/pacientes/:id/signos-vitales**: Funciona correctamente
- [ ] **Cálculo de IMC**: Se calcula automáticamente
- [ ] **Campos opcionales**: Se manejan correctamente
- [ ] **Fecha de medición**: Se asigna automáticamente
- [ ] **Registrado por**: Se marca como "paciente"

---

## 🚀 CÓMO EJECUTAR TESTS MANUALES

### Opción 1: Usando función global (Recomendado)

1. Iniciar la app en modo desarrollo:
   ```bash
   cd ClinicaMovil
   npm start
   ```

2. Abrir la app en dispositivo/emulador

3. Abrir DevTools (shake device o Cmd+M / Ctrl+M)

4. Ejecutar en consola:
   ```javascript
   testPacienteInterface()
   ```

### Opción 2: Tests individuales

En consola de React Native, puedes probar servicios individualmente:

```javascript
// Test TTS
const ttsService = require('./src/services/ttsService').default;
await ttsService.speak('Prueba de texto a voz');

// Test Haptic
const hapticService = require('./src/services/hapticService').default;
hapticService.medium();

// Test Audio Feedback
const audioService = require('./src/services/audioFeedbackService').default;
audioService.playSuccess();
```

---

## 📊 CRITERIOS DE ACEPTACIÓN

### Funcionalidad Básica
- ✅ Todos los servicios se inicializan sin errores
- ✅ TTS pronuncia correctamente en español
- ✅ Haptic funciona en todas las interacciones
- ✅ Navegación entre pantallas funciona

### Accesibilidad
- ✅ Botones grandes y visibles (mínimo 80x80px visual)
- ✅ TTS disponible en todas las interacciones
- ✅ Feedback háptico en todas las acciones
- ✅ Máximo 4 opciones por pantalla en inicio

### UX
- ✅ Formulario paso a paso funciona correctamente
- ✅ Validación visual clara (verde/rojo)
- ✅ Mensajes de error comprensibles
- ✅ Confirmaciones de éxito

### Integración
- ✅ Backend responde correctamente
- ✅ Datos se guardan en BD
- ✅ Errores se manejan apropiadamente

---

## ⚠️ PROBLEMAS CONOCIDOS

1. **Módulo nativo en tests**: Error esperado en tests unitarios - RNGestureHandlerModule no disponible. No afecta la app en dispositivo.

2. **TTS puede requerir permisos**: En Android, puede requerir permisos de audio. Verificar en configuración del dispositivo.

3. **Haptic puede no funcionar en emulador**: Probar en dispositivo físico para verificar vibración.

---

## ✅ CHECKLIST FINAL

Antes de marcar como completado, verificar:

- [ ] Todos los servicios funcionan
- [ ] Todas las pantallas cargan sin errores
- [ ] Navegación funciona correctamente
- [ ] TTS pronuncia en todas las interacciones
- [ ] Haptic vibra en todas las acciones
- [ ] Formulario paso a paso funciona
- [ ] Integración con backend funciona
- [ ] No hay errores en consola (excepto warnings conocidos)
- [ ] La app es fluida y responsiva

---

**✅ Si todos los items están marcados, la implementación está lista para uso.**




