# Diseño: Adherencia de medicamentos (tomó / no tomó / no registró)

## Problema actual

- Solo se registra cuando el paciente **marca "Tomé"** → se inserta en `medicamento_toma`.
- No existe registro explícito de **"No tomé"**.
- El médico/admin no puede distinguir:
  - **No tomó** (el paciente indicó que no tomó la dosis)
  - **No registró** (no abrió la app o no marcó nada)

---

## Solución recomendada (buenas prácticas)

### Principios

1. **No romper lo existente**: `medicamento_toma` sigue siendo la fuente de verdad de "toma realizada".
2. **Un solo lugar para "estado por slot"**: nueva tabla de adherencia por **slot esperado** (fecha + hora según plan).
3. **Tres estados visibles**: `tomado` | `no_tomado` | `no_registrado` (los dos primeros almacenados; el tercero es ausencia de registro).
4. **Slots esperados** derivados del plan: `PlanDetalle.horario` / `horarios` + rango de fechas.

---

## Modelo de datos propuesto

### Opción A (recomendada): Tabla de adherencia por slot

**Nueva tabla: `adherencia_medicamento`**

| Columna              | Tipo        | Descripción |
|----------------------|-------------|-------------|
| id_registro          | PK INTEGER  | Id del registro |
| id_plan_medicacion   | FK INTEGER  | Plan |
| id_plan_detalle      | FK INTEGER  | Detalle (medicamento + horario) |
| fecha                | DATE        | Día del slot |
| hora_prevista        | TIME/VARCHAR| Hora del slot (ej. 08:00) |
| estado               | ENUM        | `'tomado'` \| `'no_tomado'` |
| id_toma              | FK NULL     | Referencia a `medicamento_toma` cuando estado = tomado |
| confirmado_por        | ENUM        | Paciente, Doctor, Familiar |
| fecha_creacion       | DATETIME    | Cuándo se registró |

- **Regla**: Para un mismo `(id_plan_detalle, fecha, hora_prevista)` solo puede existir un registro (constraint único).
- **tomado**: se crea `MedicamentoToma` (como hoy) y además un registro aquí con `estado='tomado'`, `id_toma` = id de esa toma.
- **no_tomado**: solo se crea registro aquí con `estado='no_tomado'`, `id_toma` NULL.
- **no_registrado**: no hay fila; se infiere al mostrar cuando existe slot esperado y no hay registro.

Ventajas: modelo claro, reportes y UI consistentes, sin duplicar lógica de “¿tomó?” en varios sitios.

---

## Qué se vería afectado

| Área | Cambio |
|------|--------|
| **BD** | Nueva tabla `adherencia_medicamento`, migración, índices (id_plan_detalle, fecha, id_plan_medicacion). |
| **Backend** | Nuevo modelo `AdherenciaMedicamento`, asociaciones; endpoints: POST registro no-toma, GET adherencia por paciente/rango (slots esperados + registros). |
| **App paciente** | En Mis Medicamentos: botón/acción "No tomé" por medicamento/slot; al marcar "Tomé" llamar también al nuevo endpoint de adherencia (o un único endpoint que cree toma + adherencia). |
| **App admin/doctor** | En Detalle paciente, sección "Registro de tomas" → evolucionar a "Adherencia": vista por slots (día/hora/medicamento) con ✅ tomado / ❌ no tomado / ⚪ no registrado. |
| **Datos existentes** | Script de backfill: por cada `medicamento_toma` existente, insertar fila en `adherencia_medicamento` (estado tomado, id_toma, fecha/hora desde la toma). |

---

## Repercusiones y mitigación

| Repercusión | Mitigación |
|-------------|------------|
| **Complejidad** | Un solo flujo de “registro” (tomado/no_tomado) y un solo endpoint de lectura de adherencia; documentar en este doc y en código. |
| **Slots esperados** | Definir regla clara: slots = combinación (fecha, hora) desde `horario`/`horarios` del plan entre fecha_inicio y fecha_fin (o “hoy”). Si en el futuro hay “días de la semana”, añadir después. |
| **Rendimiento** | Índices por plan, paciente (vía plan), fecha. Paginar o limitar rango en GET (ej. máx. 90 días). |
| **Compatibilidad** | Mantener `medicamento_toma` y sus APIs; la nueva tabla es adicional. Backfill para que historial antiguo se vea como "tomado". |
| **Offline (app)** | Si la app guarda "No tomé" offline, incluir `adherencia_medicamento` en la cola de sincronización (igual que hoy con `medicamento_toma`). |

---

## Flujos recomendados

### 1. Paciente marca "Tomé"

- **Actual**: POST `/api/medicamentos-toma` → crea `MedicamentoToma`.
- **Nuevo**: Mismo POST (o un único “registro de adherencia”):
  - Crear `MedicamentoToma` (igual que ahora).
  - Crear `AdherenciaMedicamento`: estado `tomado`, `id_toma` = id de la toma, misma fecha/hora.

### 2. Paciente marca "No tomé"

- **Nuevo**: POST `/api/adherencia-medicamento` (o POST `/api/medicamentos-toma/no`) con `id_plan_detalle`, `fecha`, `hora_prevista`, `estado: 'no_tomado'`.
- No se crea `MedicamentoToma`.

### 3. Doctor/Admin consulta adherencia

- **Nuevo**: GET `/api/adherencia-medicamento/paciente/:idPaciente?fechaInicio=&fechaFin=`
- Backend:
  - Obtiene planes activos del paciente y sus `PlanDetalle` (con horarios).
  - Genera slots esperados (fecha + hora) en el rango.
  - Para cada slot, busca en `adherencia_medicamento` y/o `medicamento_toma` (por backfill o por id_toma).
  - Devuelve lista de slots con estado: `tomado` | `no_tomado` | `no_registrado`.

---

## Resumen

- **Mejor solución**: tabla `adherencia_medicamento` por slot (tomado/no_tomado), slots esperados derivados del plan, y en UI tres estados (tomado / no tomado / no registrado).
- **Afecta**: BD (nueva tabla + backfill), backend (modelo + 2 endpoints), app paciente (botón "No tomé" + posible ajuste de "Tomé"), app admin/doctor (vista de adherencia por slot).
- **Repercusiones**: controladas con índices, backfill, y mantener `medicamento_toma` sin cambios de contrato; offline manejable con la misma estrategia que las tomas.

Si quieres, el siguiente paso puede ser: migración SQL de `adherencia_medicamento`, modelo en Sequelize y esqueleto de rutas/controlador.
