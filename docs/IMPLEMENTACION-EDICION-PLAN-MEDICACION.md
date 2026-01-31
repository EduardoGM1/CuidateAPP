# Pasos de implementación: Edición de planes de medicación

Objetivo: permitir editar/modificar los medicamentos recetados a un paciente, siguiendo buenas prácticas y reutilizando código, funciones y componentes existentes.

---

## Resumen de lo que ya existe (reutilizar)

| Capa | Qué hay | Qué falta |
|------|---------|-----------|
| **API** | POST crear plan, DELETE eliminar plan, validación y creación de detalles en `createPacientePlanMedicacion` | Ruta PUT y controlador `updatePacientePlanMedicacion` |
| **Frontend** | `handleEditMedicamento`, modal "Agregar medicamento", `useSaveHandler` con lógica create/update, `gestionService.updatePacientePlanMedicacion` (llama PUT que no existe) | Botón/acción "Editar" que llame a `handleEditMedicamento` |

---

## Fase 1: API (Backend)

### Paso 1.1 – Controlador `updatePacientePlanMedicacion`

**Archivo:** `api-clinica/controllers/pacienteMedicalData.js`

**Patrón a seguir:** Mismo flujo que `createPacientePlanMedicacion` y `deletePacientePlanMedicacion` (validación de paciente, acceso, luego operación).

1. **Validar params:** `id`, `planId` (numéricos).
2. **Verificar acceso:** Reutilizar `verificarAccesoPaciente(req, pacienteId)` (igual que en delete y en otros updates del mismo controlador).
3. **Buscar plan:** `PlanMedicacion.findOne({ where: { id_plan: planId, id_paciente: pacienteId } })`. Si no existe → 404.
4. **Validar body:** Misma validación de `medicamentos` que en create (array no vacío, cada ítem con `id_medicamento` válido y existente en catálogo). Opcional: `id_cita`, `fecha_inicio`, `fecha_fin`, `observaciones`.
5. **Actualizar cabecera del plan:** Asignar `id_cita`, `fecha_inicio`, `fecha_fin`, `observaciones` (solo si vienen en body). `plan.save()`.
6. **Reemplazar detalles:**  
   - `PlanDetalle.destroy({ where: { id_plan: planId } })`.  
   - Bucle de creación de detalles: reutilizar la misma lógica que en `createPacientePlanMedicacion` (procesar `horarios`/`horario`, crear cada `PlanDetalle` con `id_plan`, `id_medicamento`, `dosis`, `frecuencia`, `horario`, `horarios`, `via_administracion`, `observaciones`).  
   Opción recomendable: extraer una función interna `crearDetallesPlanMedicacion(planId, medicamentos)` y usarla tanto en create como en update para no duplicar código.
7. **Sincronizar tratamiento:** Llamar al mismo `sincronizarTratamientoFarmacologico(pacienteId)` que después de create/delete.
8. **Respuesta:** Obtener plan actualizado con `PlanDetalle` e `include` de `Medicamento`, y formatear igual que en create (mismo DTO). Responder `res.json({ success: true, message: '...', data: planFormateado })`.
9. **Manejo de errores:** `try/catch`, logger, `res.status(500)` con mensaje genérico (y detalle solo en desarrollo).

**Reutilización:**  
- `verificarAccesoPaciente`.  
- Validación de `medicamentos` y existencia en catálogo (misma que create).  
- Lógica de construcción de cada detalle (horarios, etc.).  
- Formato de respuesta del plan con detalles.  
- Servicio de sincronización de tratamiento farmacológico.

### Paso 1.2 – Ruta PUT

**Archivo:** `api-clinica/routes/pacienteMedicalData.js`

1. Añadir **PUT** `/:id/planes-medicacion/:planId` entre POST y DELETE (o junto al resto de rutas de planes-medicación).
2. Middlewares (reutilizar el mismo patrón que otras rutas de actualización del mismo archivo):  
   - `authorizeRoles(['Admin', 'Doctor'])`  
   - `authorizePatientAccess`  
   - `writeRateLimit`  
   - `autoEncryptRequest('planes_medicacion')` (si aplica en otros endpoints de este recurso)  
   - `updatePacientePlanMedicacion`  
   - `autoDecryptResponse('planes_medicacion')` (si aplica)
3. Documentar en comentario: body (id_cita, fecha_inicio, fecha_fin, observaciones, medicamentos[]) y respuesta.

### Paso 1.3 – Pruebas API

- Probar PUT con un `planId` existente: actualizar fechas/observaciones y/o lista de medicamentos.  
- Comprobar que los detalles viejos se eliminan y se crean los nuevos.  
- Probar 404 (plan no existe), 403 (sin acceso), 400 (medicamentos inválidos).  
- Opcional: test automatizado en `api-clinica/__tests__` para PUT planes-medicacion (reutilizando helpers de otros tests de pacienteMedicalData).

---

## Fase 2: Frontend (App móvil)

### Paso 2.1 – Botón "Editar" en el modal "Medicamentos Completos"

**Archivo:** `ClinicaMovil/src/screens/admin/DetallePaciente.js`

**Patrón:** Mismo diseño que el modal "Esquema de Vacunación Completo" (fila de botones debajo de cada ítem: Editar + Eliminar).

1. En el `HistoryModal` de "Medicamentos Completos" (`showAllMedicamentos`), dentro de `renderItem`, añadir la **fila de botones de acción** después del contenido del medicamento (y antes del cierre de `Card.Content`):
   - Mismo `View` contenedor que en Esquema de Vacunación:  
     `flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0'`.
   - **Botón Editar:** `TouchableOpacity` con `flex: 1`, `backgroundColor: '#2196F3'`, `padding: 8`, `borderRadius: 6`, texto "✏️ Editar".  
     `onPress`: cerrar modal (`setShowAllMedicamentos(false)`) y llamar `handleEditMedicamento(medicamento)` (ya existe).
   - **Botón Eliminar:** Mantener el que ya existe (mismo estilo rojo, `handleDeleteMedicamento`), con la misma condición de rol (Admin/Doctor) que en Esquema de Vacunación.
2. No hace falta nuevo estado ni nuevo modal: se reutiliza el modal "Agregar medicamento" (`showAddMedicamentos`) y `handleEditMedicamento` ya lo abre con el plan cargado.

**Reutilización:**  
- `handleEditMedicamento`.  
- Modal y formulario de medicamentos existentes.  
- `useSaveHandler` y `handleSaveMedicamentos` (ya distinguen create vs update por `editingMedicamento`).  
- Estilos de botones ya usados en Esquema de Vacunación / Comorbilidades.

### Paso 2.2 – (Opcional) Editar desde la card "Medicamentos"

Si se desea poder editar también desde la card (sin abrir "Ver todos"):

1. En la lista de la card (acordeón Medicamentos), cada ítem es un `View` con datos. Añadir una fila de botones igual que en el modal "Medicamentos Completos" (Editar + Eliminar), con el mismo estilo y las mismas llamadas a `handleEditMedicamento` y `handleDeleteMedicamento`.  
2. O bien un solo botón/icono "Editar" que llame a `handleEditMedicamento(medicamento)` para no recargar la card con muchos botones.  
Reutilizar exactamente el mismo patrón de botones que en el modal para mantener consistencia.

---

## Fase 3: Buenas prácticas y reutilización

### Código compartido backend

- **Validación de `medicamentos`:** Si la validación (array, id_medicamento, existencia en catálogo) está duplicada entre create y update, extraer a una función `validarMedicamentosPlan(medicamentos)` y usarla en ambos.
- **Creación de detalles:** Extraer `crearDetallesPlanMedicacion(planId, medicamentos)` y usar en create y en update (update hace antes `PlanDetalle.destroy`).
- **Formato de respuesta del plan:** Una función `formatearPlanMedicacionRespuesta(planCompleto)` usada en create y update para devolver el mismo DTO.

### Código compartido frontend

- No añadir nuevos modales: el mismo modal "Agregar medicamento" sirve para crear y editar (ya lo hace con `editingMedicamento`).
- No duplicar lógica de guardado: `handleSaveMedicamentos` y `gestionService.updatePacientePlanMedicacion` ya están preparados; solo falta que la API responda al PUT.
- Mantener el mismo diseño de botones (Editar azul, Eliminar rojo, misma fila y estilos) que Esquema de Vacunación y Comorbilidades.

### Orden recomendado

1. Implementar **Paso 1.1** y **1.2** (controlador + ruta PUT) y probar con Postman/curl.
2. Implementar **Paso 2.1** (botón Editar en modal Medicamentos Completos) y probar flujo completo en la app.
3. Si se desea, **Paso 2.2** (Editar desde la card).
4. Opcional: refactor de validación/detalles/formato en backend (Paso 3) para dejar el código más limpio.

---

## Checklist final

- [x] API: `updatePacientePlanMedicacion` en `pacienteMedicalData.js`.
- [x] API: Ruta PUT `/:id/planes-medicacion/:planId` con middlewares.
- [x] API: Verificación con `node scripts/verificar-put-planes-medicacion.js`.
- [x] Frontend: Botón "Editar" en modal "Medicamentos Completos" que llame a `handleEditMedicamento`.
- [x] Frontend: Mismo diseño de botones que Esquema de Vacunación.
- [ ] (Opcional) Frontend: Acción Editar en la card Medicamentos.
- [ ] (Opcional) Backend: Refactor de validación/creación de detalles/formato para reutilizar entre create y update.
