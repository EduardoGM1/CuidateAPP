# 📋 Resumen Rápido - Pruebas por Rol

**Fecha:** 17 de noviembre de 2025

---

## 👨‍⚕️ ADMIN/DOCTOR

### **Pantallas donde probar:**
- Dashboard Admin / Dashboard Doctor
- Detalle Paciente

### **Funcionalidades a probar:**

| # | Funcionalidad | Dónde Probar | Qué Verificar |
|---|--------------|--------------|---------------|
| 1 | **Rangos Personalizados - Diabetes** | Detalle Paciente → Agregar Signos Vitales | Glucosa 140 mg/dL → Alerta MODERADA (rango 80-130) |
| 2 | **Rangos Personalizados - Hipertensión** | Detalle Paciente → Agregar Signos Vitales | Presión 135/90 → Alerta MODERADA (rango 90-130/60-85) |
| 3 | **Rangos Personalizados - Obesidad** | Detalle Paciente → Agregar Signos Vitales | IMC 34.6 → Alerta (rango 18.5-29.9) |
| 4 | **Rangos Normales (sin comorbilidades)** | Detalle Paciente → Agregar Signos Vitales | Glucosa 140 → Alerta (rango 70-126) |
| 5 | **Múltiples Comorbilidades** | Detalle Paciente → Agregar Signos Vitales | Diabetes + Hipertensión → Rangos combinados |
| 6 | **Verificación en Backend** | Logs / Base de datos | "Rangos personalizados aplicados" en logs |

---

## 👤 PACIENTE

### **Pantallas donde probar:**
- Inicio Paciente
- Registrar Signos Vitales
- Mis Medicamentos
- Configuración

### **Funcionalidades a probar:**

| # | Funcionalidad | Dónde Probar | Qué Verificar |
|---|--------------|--------------|---------------|
| 1 | **Registrar Signos Vitales Offline** | Inicio → Registrar Signos Vitales | Modo avión → Guardar → "📱 Guardado Offline" |
| 2 | **Múltiples Signos Vitales Offline** | Inicio → Registrar Signos Vitales | 3 registros → Banner muestra "3 operaciones pendientes" |
| 3 | **Confirmar Medicamento Offline** | Inicio → Mis Medicamentos | Modo avión → Confirmar → "Registrado... Se guardará cuando haya conexión" |
| 4 | **Múltiples Medicamentos Offline** | Inicio → Mis Medicamentos | 2-3 medicamentos → Contador actualizado |
| 5 | **Sincronización Automática** | Cualquier pantalla | Reconectar → Datos se sincronizan automáticamente |
| 6 | **Mezcla de Operaciones** | Varias pantallas | Signos vitales + Medicamentos → Todos se sincronizan |
| 7 | **Manejo de Errores** | Varias pantallas | Backend caído → Operaciones permanecen en cola |
| 8 | **Control Volumen TTS** | Inicio → Configuración | Bajo/Medio/Alto → Volumen cambia inmediatamente |
| 9 | **Volumen Persistente** | Configuración | Cambiar volumen → Salir → Volver → Volumen se mantiene |
| 10 | **Debug Offline (Dev)** | Configuración → Botón Debug | Ver estado de cola, operaciones pendientes |

---

## 🔄 COMPARTIDAS

### **Funcionalidades que se prueban en ambas interfaces:**

| # | Funcionalidad | Admin/Doctor | Paciente |
|---|--------------|--------------|----------|
| 1 | **Datos Sincronizados** | Verificar en Detalle Paciente | Verificar en Historial Médico |
| 2 | **Notificaciones de Alertas** | Recibir cuando paciente tiene valores críticos | Recibir cuando propios valores están fuera de rango |

---

## ✅ CHECKLIST RÁPIDO

### **Admin/Doctor:**
- [ ] Diabetes → Rangos 80-130 mg/dL
- [ ] Hipertensión → Rangos 90-130/60-85 mmHg
- [ ] Obesidad → IMC 18.5-29.9
- [ ] Sin comorbilidades → Rangos normales
- [ ] Múltiples comorbilidades → Combinación correcta
- [ ] Logs backend muestran rangos aplicados

### **Paciente:**
- [ ] Banner offline aparece
- [ ] Signos vitales se guardan offline
- [ ] Medicamentos se confirman offline
- [ ] Sincronización automática funciona
- [ ] Volumen TTS funciona y persiste
- [ ] Debug muestra información correcta

---

## 🚀 INICIO RÁPIDO

### **Para Admin/Doctor:**
1. Iniciar sesión como Admin/Doctor
2. Ir a Detalle Paciente (con comorbilidades)
3. Agregar Signos Vitales con valores fuera de rango
4. Verificar alertas y rangos aplicados

### **Para Paciente:**
1. Iniciar sesión como Paciente
2. Activar modo avión
3. Registrar signos vitales o confirmar medicamentos
4. Verificar banner y mensajes offline
5. Reconectar y verificar sincronización

---

**📖 Guía completa:** Ver `GUIA-PRUEBAS-POR-ROL-2025-11-17.md`



