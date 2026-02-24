# Análisis de diseño: filas input/select + botón

## Problema

En varias pantallas hay filas con **Input**, **Select** y **Button** en la misma línea. El componente `Input` (y a veces `Select`) envuelve el control en un `div` con `margin-bottom: 0.75rem`. Cuando ese wrapper está en un flex con `alignItems: 'flex-end'`, el margen inferior hace que la fila sea más alta y el botón quede visualmente más abajo que los campos, produciendo **desalineación** (el mismo tipo de problema que se corrigió en el chat).

## Pantallas afectadas y solución

| Pantalla | Ubicación | Cambio aplicado |
|----------|-----------|------------------|
| **AuditoriaList** | Filtro fechas: 2 inputs `type="date"` + botón "Aplicar fechas" | Contenedor con clase `form-row-inline`; misma altura visual (min-height 40px vía CSS global). |
| **CitaDetail** | Cambiar estado: Select + Input observaciones + botón "Actualizar estado" | Contenedor con `form-row-inline`; el wrapper del `Input` deja de desalinear por margin. |
| **ReportesPage** | Filtros estadísticas: Select módulo + Input Desde + Input Hasta | Contenedor con `form-row-inline`; alineación consistente con min-height. |

## Clase de utilidad global

En `theme/globals.css` se añadió:

- **`.form-row-inline`**: contenedor flex con `gap`, `align-items: center`, y reglas para:
  - Anular `margin-bottom` en los hijos directos (wrappers de Input/Select).
  - Aplicar `min-height: 40px` a `.ant-input`, `input` (text/date/datetime-local), `.ant-select .ant-select-selector` y `.ant-btn`, para alinear alturas.

Así se reutiliza el mismo criterio que en el chat (input + botón alineados) en cualquier fila de formulario con controles + botón.

## Recomendación

En **nuevas pantallas** o modales que muestren una fila con Input/Select y botón, usar la clase `form-row-inline` en el contenedor para evitar desalineaciones sin duplicar estilos.
