# 🎯 PRÓXIMO PASO: Implementar "Eliminar Paciente"

**Fecha:** 28/10/2025  
**Prioridad:** 🟡 MEDIA (Implementar Próximamente)  
**Esfuerzo:** Medio (30 líneas de código)  
**Beneficio:** Gestión completa de estado de pacientes

---

## 📋 LO QUE HEMOS COMPLETADO

✅ **FASE 1 COMPLETA: Ver Detalles del Paciente**
- Función `handleViewPatient` implementada
- Cards clicables funcionando
- Navegación a DetallePaciente operativa
- Estado: ✅ Production Ready

---

## 🎯 SIGUIENTE PASO: Eliminar Paciente (Soft Delete)

### **¿Por qué es importante?**

1. **Gestión completa de datos:** Actualmente solo se puede activar/desactivar
2. **Compliance:** Requerido para cumplir con regulaciones de eliminación de datos
3. **Usabilidad:** Los administradores necesitan eliminar pacientes obsoletos o duplicados
4. **Consistencia:** Ya existe funcionalidad similar en DetalleDoctor

### **Estado actual:**
- ❌ Solo existe `handleToggleStatus` (activar/desactivar)
- ❌ No hay opción de eliminar permanentemente
- ❌ No hay botón de eliminar en las cards

### **Estado deseado:**
- ✅ Función `handleDeletePatient` implementada
- ✅ Botón de eliminar en cards
- ✅ Soft delete con confirmación
- ✅ Refrescar lista después de eliminar

---

## 🔧 IMPLEMENTACIÓN PROPUESTA

### **1. Crear función `handleDeletePatient`:**

```javascript
const handleDeletePatient = (paciente) => {
  // Validación de datos
  if (!paciente) {
    Logger.error('handleDeletePatient: Paciente es null o undefined');
    Alert.alert('Error', 'No se pudo cargar la información del paciente');
    return;
  }

  const pacienteId = paciente.id_paciente || paciente.id;
  const fullName = paciente.nombreCompleto || `${paciente.nombre} ${paciente.apellido_paterno}`.trim();

  if (!pacienteId) {
    Logger.error('handleDeletePatient: Paciente sin ID válido', { paciente });
    Alert.alert('Error', 'No se puede identificar el paciente');
    return;
  }

  // Confirmación con alerta
  Alert.alert(
    'Eliminar Paciente',
    `¿Estás seguro de que deseas eliminar a ${fullName}?\n\nEsta acción marcará el paciente como eliminado (soft delete).`,
    [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Eliminar', 
        style: 'destructive',
        onPress: async () => {
          try {
            Logger.info('Iniciando eliminación de paciente', { 
              pacienteId, 
              nombre: fullName 
            });
            
            // Llamar a API para soft delete
            await gestionService.deletePaciente(pacienteId);
            
            Logger.info('Paciente eliminado correctamente', { 
              pacienteId, 
              nombre: fullName 
            });
            
            // Refrescar lista
            await refreshPacientes();
            
            Alert.alert('Éxito', 'Paciente eliminado correctamente');
          } catch (error) {
            Logger.error('Error eliminando paciente', error);
            Alert.alert('Error', 'No se pudo eliminar el paciente');
          }
        }
      }
    ]
  );
};
```

---

### **2. Agregar botón de eliminar en la card:**

```javascript
const renderPatientCard = (paciente) => (
  <TouchableOpacity 
    key={paciente.id_paciente}
    onPress={() => handleViewPatient(paciente)}
    activeOpacity={0.7}
  >
    <Card style={[styles.card, !paciente.activo && styles.inactiveCard]}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            {/* Título y subtítulo */}
          </View>
          <View style={styles.cardActions}>
            <IconButton
              icon="eye"
              size={20}
              onPress={() => handleViewPatient(paciente)}
              iconColor="#1976D2"
            />
            <IconButton
              icon="pencil"
              size={20}
              onPress={() => handleEditPatient(paciente)}
              iconColor="#1976D2"
            />
            <IconButton
              icon={paciente.activo ? "account-off" : "account-check"}
              size={20}
              onPress={() => handleToggleStatus(paciente, 'paciente')}
              iconColor={paciente.activo ? "#F44336" : "#4CAF50"}
            />
            {/* ✨ NUEVO BOTÓN */}
            <IconButton
              icon="delete"
              size={20}
              onPress={() => handleDeletePatient(paciente)}
              iconColor="#F44336"
            />
          </View>
        </View>
        {/* Resto del contenido */}
      </Card.Content>
    </Card>
  </TouchableOpacity>
);
```

---

### **3. Implementar en `gestionService.js`:**

```javascript
export const deletePaciente = async (pacienteId) => {
  try {
    Logger.info('Eliminando paciente', { pacienteId });
    
    const token = await AsyncStorage.getItem('token');
    const response = await axios.delete(
      `${API_URL}/pacientes/${pacienteId}`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    Logger.info('Paciente eliminado exitosamente', { 
      pacienteId, 
      response: response.data 
    });
    
    return response.data;
  } catch (error) {
    Logger.error('Error eliminando paciente', error);
    throw error;
  }
};
```

---

### **4. Implementar en Backend (`api-clinica/controllers/paciente.js`):**

```javascript
export const deletePaciente = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validar que el paciente existe
    const paciente = await Paciente.findByPk(id);
    if (!paciente) {
      return res.status(404).json({ error: 'Paciente no encontrado' });
    }
    
    // Soft delete (marcar como eliminado)
    await Paciente.update(
      { 
        activo: false,
        deleted_at: new Date() 
      },
      { where: { id_paciente: id } }
    );
    
    logger.info('Paciente eliminado (soft delete)', { pacienteId: id });
    
    res.json({ 
      success: true, 
      message: 'Paciente eliminado correctamente',
      data: { id: id }
    });
  } catch (error) {
    logger.error('Error eliminando paciente', error);
    res.status(500).json({ error: 'Error al eliminar el paciente' });
  }
};
```

---

### **5. Agregar ruta en Backend (`api-clinica/routes/paciente.js`):**

```javascript
router.delete('/:id', deletePaciente);
```

---

## 📊 FLUJO COMPLETO

```
Usuario hace tap en botón "delete"
    ↓
handleDeletePatient(paciente)
    ↓
Validar datos del paciente
    ↓
Mostrar Alert de confirmación
    ↓
Usuario confirma
    ↓
gestionService.deletePaciente(id)
    ↓
API DELETE /pacientes/:id
    ↓
Backend: Soft delete (marcar activo=false)
    ↓
Refrescar lista de pacientes
    ↓
Mostrar mensaje de éxito
```

---

## 🔐 SEGURIDAD

### **Validaciones implementadas:**
1. ✅ Validación de paciente nulo
2. ✅ Validación de ID válido
3. ✅ Confirmación con alerta destructiva
4. ✅ Logging completo
5. ✅ Manejo de errores robusto
6. ✅ Soft delete (no elimina físicamente)

---

## ✅ BENEFICIOS

### **Para Administradores:**
- ✅ Gestión completa de datos (activar/desactivar/eliminar)
- ✅ Eliminar pacientes obsoletos o duplicados
- ✅ Cumplir con regulaciones de eliminación de datos

### **Para el Sistema:**
- ✅ Soft delete preserva historial
- ✅ Datos recuperables si es necesario
- ✅ Auditoría completa de cambios
- ✅ Consistencia con funcionalidad de doctores

---

## 📈 PRIORIDADES

### **🔴 Implementar Ahora:**
1. ✅ Ver Detalles del Paciente (COMPLETADO)

### **🟡 Implementar Próximamente:**
2. **Eliminar Paciente (Soft Delete)** ← **PRÓXIMO PASO**
3. Asignar Doctor

### **🟢 Mejoras Futuras:**
4. Filtro por Doctor
5. Exportar Datos
6. Acciones Masivas

---

## 🎯 CONCLUSIÓN

**Próximo paso recomendado:** Implementar funcionalidad de **"Eliminar Paciente (Soft Delete)"**

**Razones:**
- 🟡 Prioridad media (importante pero no crítico)
- 🟡 Facilita la gestión completa de pacientes
- 🟡 Requerido para cumplir con compliance
- 🟡 Consistencia con funcionalidad de doctores

**Esfuerzo:** Medio (30-40 líneas de código)  
**Impacto:** Alto (gestión completa de datos)

---

¿Quieres que implemente esta funcionalidad ahora?

---

**Autor:** Senior Developer  
**Fecha:** 28/10/2025  
**Próximo paso:** Eliminar Paciente (Soft Delete)












