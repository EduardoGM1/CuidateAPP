# 📋 ENDPOINTS FALTANTES PARA CRUD COMPLETO

## Estado Actual

### ✅ Implementados
- **Comorbilidades**: GET, POST, PUT, DELETE ✅
- **Citas**: GET, POST, PUT (updateCita), PUT (estado), DELETE ✅

### ❌ Faltantes (necesarios para funcionalidad completa)

#### 1. Signos Vitales
- ❌ PUT `/api/pacientes/:id/signos-vitales/:signoId` - Actualizar signos vitales
- ❌ DELETE `/api/pacientes/:id/signos-vitales/:signoId` - Eliminar signos vitales

#### 2. Diagnósticos
- ❌ PUT `/api/pacientes/:id/diagnosticos/:diagnosticoId` - Actualizar diagnóstico
- ❌ DELETE `/api/pacientes/:id/diagnosticos/:diagnosticoId` - Eliminar diagnóstico

#### 3. Red de Apoyo
- ❌ PUT `/api/pacientes/:id/red-apoyo/:contactoId` - Actualizar contacto
- ❌ DELETE `/api/pacientes/:id/red-apoyo/:contactoId` - Eliminar contacto

#### 4. Esquema de Vacunación
- ❌ PUT `/api/pacientes/:id/esquema-vacunacion/:esquemaId` - Actualizar vacuna
- ❌ DELETE `/api/pacientes/:id/esquema-vacunacion/:esquemaId` - Eliminar vacuna

#### 5. Planes de Medicación
- ❌ PUT `/api/pacientes/:id/planes-medicacion/:planId` - Actualizar plan
- ❌ DELETE `/api/pacientes/:id/planes-medicacion/:planId` - Eliminar plan

## Acciones Requeridas

1. Crear controladores UPDATE/DELETE en `api-clinica/controllers/pacienteMedicalData.js`
2. Agregar rutas en `api-clinica/routes/pacienteMedicalData.js`
3. Verificar autorización (solo Admin puede DELETE)
4. Probar endpoints con script de pruebas

