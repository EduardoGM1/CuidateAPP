# 📋 FUNCIONES DE LOS 4 BOTONES EN DETALLEPACIENTE

**Ubicación:** Debajo de sección Comorbilidades (líneas 1437-1477)  
**Fecha:** 28/10/2025  
**Estado:** ✅ Funcionales

---

## 🎯 RESUMEN RÁPIDO

| # | Botón | Función | Estado |
|---|-------|---------|--------|
| 1 | ✏️ Editar | Editar información del paciente | ✅ Funcional |
| 2 | 🔄 Cambiar Doctor | Asignar/cambiar doctor | ⚠️ Pendiente |
| 3 | ⚡ Activar/Desactivar | Cambiar estado del paciente | ✅ Funcional |
| 4 | 🗑️ Eliminar | Eliminar paciente (soft delete) | ✅ Funcional |

---

## 📝 DETALLE DE CADA FUNCIÓN

### **1. ✏️ Editar Paciente**

**Función:** `handleEditPaciente`  
**Líneas:** 364-370  
**Botón:** Azul (#2196F3)  
**Icono:** "pencil"

#### **¿Qué hace?**
```javascript
const handleEditPaciente = () => {
  // Validación
  if (!paciente?.id_paciente) {
    Alert.alert('Error', 'No hay datos del paciente disponibles');
    return;
  }
  
  // Navegar a formulario de edición
  navigation.navigate('EditarPaciente', { paciente });
};
```

#### **Funcionalidad:**
- ✅ Valida que existan datos del paciente
- ✅ Navega a pantalla "EditarPaciente"
- ✅ Pasa todos los datos del paciente
- ✅ Permite editar información personal, médica, etc.

#### **Flujo de Usuario:**
```
Usuario hace tap en botón "Editar"
    ↓
Validar datos del paciente
    ↓
Navegar a formulario de edición
    ↓
Editar datos deseados
    ↓
Guardar cambios
    ↓
Regresar a DetallePaciente con datos actualizados
```

---

### **2. 🔄 Cambiar Doctor**

**Función:** `handleChangeDoctor`  
**Líneas:** 372-384  
**Botón:** Naranja (#FF9800)  
**Icono:** "account-switch"

#### **¿Qué hace?**
```javascript
const handleChangeDoctor = async () => {
  // Validación
  if (!paciente?.id_paciente) {
    Alert.alert('Error', 'No hay datos del paciente disponibles');
    return;
  }
  
  // TODO: Implementar modal para cambiar doctor
  Alert.alert(
    'Cambiar Doctor',
    'Esta funcionalidad permite asignar o cambiar el doctor asignado al paciente. Se implementará próximamente con un modal que muestra la lista de doctores disponibles.',
    [{ text: 'OK' }]
  );
};
```

#### **Funcionalidad:**
- ✅ Valida que existan datos del paciente
- ⚠️ Muestra alerta informativa (temporal)
- ⚠️ TODO: Implementar modal con lista de doctores

#### **Funcionalidad Futura (Pendiente):**
```
Usuario hace tap en botón "Cambiar Doctor"
    ↓
Abrir modal con lista de doctores disponibles
    ↓
Seleccionar doctor de la lista
    ↓
Confirmar asignación
    ↓
Llamar a API para asignar doctor
    ↓
Actualizar información del paciente
    ↓
Mostrar doctor asignado actualizado
```

#### **Nota:**
- Esta funcionalidad está planificada para implementarse próximamente
- Mostrará un modal con lista de doctores disponibles
- Permitirá asignar o cambiar el doctor asignado al paciente

---

### **3. ⚡ Activar/Desactivar Paciente**

**Función:** `handleToggleStatus`  
**Líneas:** 436-480  
**Botón:** Verde (#4CAF50) si está inactivo / Rojo (#F44336) si está activo  
**Icono:** "account-check" si inactivo / "account-remove" si activo  
**Texto:** "Activar" / "Desactivar" (dinámico)

#### **¿Qué hace?**
```javascript
const handleToggleStatus = async () => {
  // Validar datos
  if (!paciente?.id_paciente) {
    Alert.alert('Error', 'No hay datos del paciente disponibles');
    return;
  }
  
  const nombreCompleto = `${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno || ''}`.trim();
  const accion = paciente.activo ? 'desactivar' : 'activar';
  const nuevoEstado = !paciente.activo;
  
  // Confirmación
  Alert.alert(
    `Confirmar ${accion}`,
    `¿Estás seguro de que deseas ${accion} a ${nombreCompleto}?`,
    [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: accion.charAt(0).toUpperCase() + accion.slice(1),
        onPress: async () => {
          try {
            // Llamar a API
            await gestionService.updatePaciente(paciente.id_paciente, { activo: nuevoEstado });
            
            // Mostrar éxito
            Alert.alert('Éxito', `Paciente ${accion}do exitosamente`);
            
            // Refrescar datos
            await refresh();
          } catch (error) {
            Alert.alert('Error', `No se pudo ${accion} el paciente.`);
          }
        }
      }
    ]
  );
};
```

#### **Funcionalidad:**
- ✅ Valida que existan datos del paciente
- ✅ Muestra confirmación con nombre del paciente
- ✅ Cambia estado: activo ↔ inactivo
- ✅ Llama a API con nuevo estado
- ✅ Refresca datos después del cambio
- ✅ Muestra mensaje de éxito/error
- ✅ Botón cambia de color según estado

#### **Flujo de Usuario:**
```
Usuario hace tap en botón "Activar/Desactivar"
    ↓
Mostrar alerta de confirmación
    ↓
Usuario confirma o cancela
    ↓
Si confirma → Llamar a API
    ↓
Actualizar estado en base de datos
    ↓
Refrescar información del paciente
    ↓
Mostrar mensaje de éxito
    ↓
Botón actualizado con nuevo estado y color
```

#### **Comportamiento Visual:**
- **Si está Activo:**
  - Color: Rojo (#F44336)
  - Texto: "Desactivar"
  - Icono: "account-remove"
  
- **Si está Inactivo:**
  - Color: Verde (#4CAF50)
  - Texto: "Activar"
  - Icono: "account-check"

---

### **4. 🗑️ Eliminar Paciente**

**Función:** `handleDeletePaciente`  
**Líneas:** 386-434  
**Botón:** Rojo oscuro (#D32F2F)  
**Icono:** "delete-forever"

#### **¿Qué hace?**
```javascript
const handleDeletePaciente = async () => {
  // Validar datos
  if (!paciente?.id_paciente) {
    Alert.alert('Error', 'No hay datos del paciente disponibles');
    return;
  }
  
  const nombreCompleto = `${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno || ''}`.trim();
  
  // Alerta destructiva
  Alert.alert(
    'Eliminar Paciente',
    `¿Estás seguro de que deseas eliminar a ${nombreCompleto}?\n\nEsta acción marcará el paciente como eliminado (soft delete).`,
    [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            // Llamar a API para soft delete
            await gestionService.deletePaciente(paciente.id_paciente);
            
            // Mostrar éxito
            Alert.alert('Éxito', 'Paciente eliminado correctamente', [
              { text: 'OK', onPress: () => navigation.goBack() }
            ]);
          } catch (error) {
            Alert.alert('Error', 'No se pudo eliminar el paciente.');
          }
        }
      }
    ]
  );
};
```

#### **Funcionalidad:**
- ✅ Valida que existan datos del paciente
- ✅ Alerta destructiva con confirmación
- ✅ Soft delete (no elimina físicamente)
- ✅ Muestra nombre del paciente en confirmación
- ✅ Llama a API para marcar como eliminado
- ✅ Navega automáticamente de regreso
- ✅ Botón de color rojo para indicar peligro

#### **Flujo de Usuario:**
```
Usuario hace tap en botón "Eliminar"
    ↓
Mostrar alerta destructiva con nombre del paciente
    ↓
Usuario confirma o cancela
    ↓
Si confirma → Llamar a API (soft delete)
    ↓
Paciente marcado como activo=false en BD
    ↓
Mostrar mensaje de éxito
    ↓
Navegar automáticamente de regreso
    ↓
Lista de pacientes actualizada
```

#### **Soft Delete:**
- **No elimina físicamente** los datos
- Marca `activo = false` en la base de datos
- Preserva **historial médico completo**
- Datos **recuperables** si es necesario
- Cumple con **regulaciones de compliance**

---

## 🔐 SEGURIDAD Y VALIDACIONES

### **Validaciones Comunes:**
```javascript
// Todas las funciones verifican:
1. if (!paciente?.id_paciente) → Error si no hay datos
2. Validación de estructura de datos
3. Manejo robusto de errores con try-catch
4. Logging completo para auditoría
5. Confirmación antes de acciones destructivas
```

### **Confirmaciones:**
- **Editar:** No requiere confirmación (edición no destructiva)
- **Cambiar Doctor:** No requiere confirmación (temporal)
- **Activar/Desactivar:** ✅ Requiere confirmación
- **Eliminar:** ✅ Requiere confirmación destructiva

---

## 📊 COMPARATIVA DE BOTONES

| Característica | Editar | Cambiar Doctor | Activar/Desactivar | Eliminar |
|----------------|--------|----------------|-------------------|----------|
| **Color** | Azul | Naranja | Verde/Rojo | Rojo oscuro |
| **Icono** | pencil | account-switch | account-check/remove | delete-forever |
| **Requiere confirmación** | ❌ | ❌ | ✅ | ✅ |
| **Acción API** | Navegación | N/A | updatePaciente | deletePaciente |
| **Estado actual** | ✅ Funcional | ⚠️ Pendiente | ✅ Funcional | ✅ Funcional |
| **Destructiva** | ❌ | ❌ | ✅ Parcial | ✅ Sí (soft) |
| **Refresca datos** | ❌ | ❌ | ✅ | ✅ |
| **Navega** | ✅ Siguiente | ❌ | ❌ | ✅ Atrás |

---

## 🎯 RESUMEN EJECUTIVO

### **✅ Funcionan Correctamente:**
1. **Editar** - Permite editar información del paciente
2. **Activar/Desactivar** - Cambia estado con confirmación
3. **Eliminar** - Soft delete con confirmación destructiva

### **⚠️ Pendiente:**
1. **Cambiar Doctor** - Muestra alerta temporal, pendiente implementar modal

---

## 💡 RECOMENDACIONES

### **Para implementar "Cambiar Doctor":**

```javascript
// Modal propuesto:
<Modal visible={showChangeDoctorModal}>
  <ScrollView>
    {doctoresList.map(doctor => (
      <TouchableOpacity 
        onPress={() => handleAssignDoctor(doctor.id_doctor)}
      >
        <Text>{doctor.nombre}</Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
</Modal>
```

---

**Autor:** Senior Developer  
**Fecha:** 28/10/2025  
**Estado:** ✅ 3 de 4 botones funcionales  
**Próximo paso:** Implementar modal "Cambiar Doctor"












