# Opciones: Plan de medicación en paso 5 del wizard "Completar Cita"

Objetivo: dar a los doctores la opción de **seleccionar un plan existente** o **añadir medicamentos nuevos** desde el formulario "Completar Cita", en el **paso 5 (Plan Medicación)**.

---

## Estado actual

- **Paso 5** solo tiene: campo de texto "Observaciones del plan".
- El tip dice: *"Para agregar medicamentos específicos, puedes hacerlo después desde el detalle del paciente"*.
- El backend del wizard **ya acepta** `plan_medicacion.medicamentos[]` con `id_medicamento`, `dosis`, `frecuencia`, `horario`/`horarios`, `via_administracion`, `observaciones` y crea/actualiza el plan al completar la cita.
- No hay hoy en el wizard forma de: elegir un plan previo del paciente ni de agregar líneas de medicamento.

---

## Opción 1: Solo “Añadir medicamentos” (nuevo plan desde el wizard)

**Idea:** En el paso 5, además de observaciones, permitir **agregar N medicamentos** (catálogo + dosis, frecuencia, horarios) como en DetallePaciente pero simplificado dentro del wizard.

**Implementación:**

- Mantener observaciones + fecha inicio/fin (opcionales).
- Añadir en el paso 5:
  - Lista de medicamentos agregados (nombre, dosis, frecuencia/horario).
  - Botón “Añadir medicamento” que abre un mini-formulario o modal:
    - Selector de medicamento (catálogo, como `MedicamentoSelector` o lista con búsqueda).
    - Campos: dosis, frecuencia, horario(s), vía de administración (opcional).
  - Posibilidad de quitar un medicamento de la lista antes de enviar.
- Al enviar el wizard, enviar `plan_medicacion.medicamentos[]` con la estructura que ya usa el backend (id_medicamento, dosis, frecuencia, horario/horarios, etc.).

**Ventajas:** Usa solo lo que el backend ya soporta; no requiere “elegir plan”; flujo claro: en esta cita se prescribe esto.  
**Desventajas:** No hay “reutilizar” un plan anterior; si el paciente ya tiene un plan, el doctor tiene que volver a capturar o ir a DetallePaciente.

---

## Opción 2: “Usar plan existente” + “Añadir medicamentos nuevos”

**Idea:** En el paso 5 ofrecer **dos vías**:

1. **Usar un plan existente del paciente**  
   - Se obtienen los planes del paciente (p. ej. agrupando por `id_plan` la respuesta de `getPacienteMedicamentos` o con un futuro `GET /pacientes/:id/planes-medicacion` si se añade).  
   - El doctor elige uno (ej. “Plan de marzo 2025 – Metformina, Losartán”).  
   - Al completar la cita, el backend **crea un nuevo plan** para esta cita **copiando** los medicamentos del plan elegido (mismo id_medicamento, dosis, frecuencia, horarios).  
   - Es decir: “usar plan existente” = prellenar el paso 5 con esos medicamentos; el guardado sigue siendo “nuevo plan asociado a esta cita”.

2. **Añadir medicamentos nuevos**  
   - Igual que en Opción 1: agregar líneas con selector + dosis, frecuencia, horario(s).

En la UI se podría tener:

- Selector/tabs: “Usar plan existente” | “Añadir medicamentos nuevos” (o “Nuevo plan”).
- Si “Usar plan existente”: dropdown o lista de planes del paciente; al elegir uno, se cargan sus medicamentos en la lista del paso 5 (solo lectura o editables, según se decida).
- Si “Añadir medicamentos nuevos” (o si no hay planes): misma UI que Opción 1.
- Opcional: permitir “Usar plan X y añadir un medicamento más” (combinar ambas).

**Ventajas:** El doctor no repite captura cuando quiere seguir el mismo plan; sigue pudiendo prescribir algo nuevo.  
**Desventajas:** Requiere obtener y mostrar planes del paciente (hoy se puede derivar de `getPacienteMedicamentos` agrupando por `id_plan`); si se quiere “solo vincular esta cita a un plan ya existente” sin duplicar plan, haría falta un cambio en backend (ver Opción 3).

---

## Opción 3: “Vincular cita a plan existente” (sin duplicar plan) + “Nuevo plan con medicamentos”

**Idea:** Diferenciar claramente:

1. **Vincular esta cita a un plan ya existente**  
   - El doctor elige un plan del paciente (activo o inactivo).  
   - Backend: actualizar ese plan con `id_cita = cita actual` (y quizá `activo = true` si estaba inactivo).  
   - No se crea otro plan; la cita queda asociada al plan elegido.

2. **Crear nuevo plan en esta cita**  
   - Como hoy: observaciones + lista de medicamentos; el backend crea `PlanMedicacion` + `PlanDetalle` y asocia `id_cita`.

**Implementación:**

- Paso 5: selector “Vincular a plan existente” vs “Crear nuevo plan”.
- Si “Vincular”: lista de planes del paciente → elegir uno → al enviar, llamar a `PUT /pacientes/:id/planes-medicacion/:planId` con `{ id_cita: citaActual }` (y opcionalmente `activo: true`). El backend debe aceptar actualizar solo `id_cita` (y `activo`) sin obligar a reenviar todos los medicamentos.
- Si “Crear nuevo plan”: misma UI que Opción 1 (añadir medicamentos en el wizard).

**Ventajas:** No se duplican planes; una cita puede quedar ligada a “seguir con el plan de marzo”.  
**Desventajas:** Requiere ajuste en backend (permitir actualización parcial del plan, al menos `id_cita` y `activo`) y posiblemente un endpoint o convención para “listar planes del paciente” si no existe.

---

## Opción 4: Enlace “Gestionar en Detalle del paciente” + mejorar resumen en paso 5

**Idea:** No meter todo el flujo de planes/medicamentos dentro del wizard; en su lugar:

- En el paso 5:  
  - Observaciones del plan (como ahora).  
  - Botón/link: **“Abrir plan de medicación en detalle del paciente”** que cierra (o minimiza) el wizard y navega a DetallePaciente → sección/modal de “Plan de medicación” (o “Medicamentos”), con el paciente y la cita en contexto.  
  - Opcional: si ya existe un plan reciente, mostrar un resumen corto (ej. “Plan activo: Metformina, Losartán”) y el mismo botón para editar en detalle.

**Ventajas:** Reutiliza la UI ya existente en DetallePaciente; el paso 5 sigue liviano; no se duplica lógica de formulario de medicamentos.  
**Desventajas:** El doctor sale del wizard para gestionar medicación; puede ser menos fluido si se quiere “todo en la misma pantalla”.

---

## Resumen recomendado

| Opción | Complejidad | Backend | UX en wizard |
|--------|-------------|---------|----------------|
| **1**  | Media       | Sin cambios | Solo “añadir medicamentos” en paso 5 |
| **2**  | Media–Alta  | Sin cambios (o solo listar planes) | “Usar plan existente” + “Añadir nuevos” |
| **3**  | Alta        | Cambios (actualizar plan con id_cita) | “Vincular plan” + “Nuevo plan” |
| **4**  | Baja        | Sin cambios | Enlace a DetallePaciente para gestionar plan |

- Si se quiere **mínimo cambio y máximo impacto en el wizard**: **Opción 1** (añadir medicamentos en paso 5).
- Si se quiere **reutilizar planes sin duplicar captura** y se acepta prellenar desde un plan existente: **Opción 2**.
- Si se quiere **que la cita quede vinculada a un plan ya existente** sin crear otro plan: **Opción 3** (con ajustes de backend).
- Si se prefiere **no tocar mucho el wizard** y centralizar todo en DetallePaciente: **Opción 4**.

Cuando elijas una (o una combinación, p. ej. 1 + 4), se puede bajar a tareas concretas de frontend/backend y componentes a reutilizar o crear.
