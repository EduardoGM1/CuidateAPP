# Análisis: Modal "Detalle de signo vital" en estilo expediente médico

## Objetivo
Rediseñar (o ofrecer una vista alternativa) del modal **Detalle de signo vital** para que se vea como un **registro de expediente médico** similar al documento NOTAS MÉDICAS/PDF: diseño tabular, formal y con **todos los datos del registro**, listo para lectura clínica o impresión/PDF.

---

## 1. Estado actual del modal

### Diseño actual
- **Componente:** `cuidate-web/src/components/pacientes/DetalleSignoVitalModal.jsx`
- **Aspecto:** Bloques tipo “card” con iconos (📅 Fecha, 📏 Antropométricos, 🩺 Presión arterial, 🧪 Exámenes de laboratorio), cada uno con borde y fondo.
- **Contenido mostrado:**
  - Fecha de medición + “Registrado por: Paciente/Doctor”
  - Antropométricos: Peso, Talla, IMC (con color por rango), Cintura (si existe)
  - Presión arterial: sistólica/diastólica mmHg
  - Laboratorio: Glucosa, Colesterol total, LDL, HDL, Triglicéridos, HbA1c (solo los que tengan valor)
  - Observaciones (texto)
- **Acciones:** Cerrar y, si aplica, Editar.
- **Ancho:** 520px; scroll si hay mucho contenido.

### Lo que no se muestra hoy (pero existe en el modelo)
En el modelo **SignoVital** hay más campos que pueden no mostrarse de forma explícita o unificada en un “expediente” de un solo registro:

| Campo en BD | Uso en modal actual |
|-------------|----------------------|
| `id_signo` | No se muestra (podría ser “No. registro”) |
| `id_paciente` | No (contexto de la página) |
| `id_cita` | No (útil: “Vinculado a cita” sí/no) |
| `fecha_medicion` | Sí (como “Fecha”) |
| `fecha_creacion` | Sí como respaldo si no hay fecha_medicion |
| `peso_kg`, `talla_m`, `imc`, `medida_cintura_cm` | Sí |
| `presion_sistolica`, `presion_diastolica` | Sí |
| `glucosa_mg_dl`, `colesterol_*`, `trigliceridos_mg_dl`, `hba1c_porcentaje` | Sí |
| `edad_paciente_en_medicion` | No (relevante para interpretación de HbA1c) |
| `registrado_por` | Sí |
| `observaciones` | Sí |

Para un “expediente de un solo registro” conviene mostrar **todos** estos datos de forma ordenada (incluidos “—” cuando no aplique), no solo los que tengan valor.

---

## 2. Diseño deseado: estilo expediente médico (tipo NOTAS MÉDICAS / PDF)

### Referencia
El documento NOTAS MÉDICAS que genera el sistema tiene:
- Encabezado institucional (ej. SECRETARÍA DE SALUD MÓDULO IV, NOTAS MÉDICAS).
- Tablas con bordes `1px solid #000`, celdas con `th` (fondo gris) y `td`.
- Secciones con títulos en negrita: “Signos vitales y antropometría”, “Laboratorio”, etc.
- Valores vacíos representados como “—”.
- Pie: “Documento generado por CuidateAPP…”.

### Aplicado al modal “Detalle de signo vital”
- **Misma sensación visual:** tablas con bordes, filas/columnas, sin cards redondeadas ni iconos de emoji.
- **Un solo registro:** todo el contenido es de **ese** signo vital; no es un resumen de varias consultas.
- **Todos los datos del registro:** incluir todos los campos del modelo, con “—” cuando no haya valor.
- **Opcional:** encabezado corto tipo “Registro de signo vital” o “Medición – [fecha]” y pie “CuidateAPP” para impresión/PDF.

Ventajas:
- Consistencia con NOTAS MÉDICAS y con la idea de “expediente”.
- Facilidad para **imprimir o Guardar como PDF** desde el navegador (una sola vista clara).
- Lectura rápida en formato “hoja clínica” (tablas escaneables).
- Inclusión explícita de todos los campos (incl. ID registro, vinculación a cita, edad en medición) para uso clínico o auditoría.

---

## 3. Propuesta de estructura (vista “expediente” del registro)

### 3.1 Encabezado (opcional, estilo institucional)
- Línea 1: “SECRETARÍA DE SALUD” / “MÓDULO IV” (o variable según config).
- Línea 2: “REGISTRO DE SIGNO VITAL” (o “Medición – Signos vitales y antropometría”).

### 3.2 Tabla: Identificación del registro
| Campo | Valor |
|-------|--------|
| No. registro | id_signo |
| Fecha y hora | fecha_medicion (formato dd/mm/yyyy, hh:mm) |
| Registrado por | Paciente / Doctor |
| Vinculado a cita | Sí (id_cita) / No |
| Edad en medición | edad_paciente_en_medicion (años) o — |

### 3.3 Sección: Signos vitales y antropometría
Tabla de dos filas (o una tabla con varias celdas), mismo estilo bordes:

| TA (mmHg) | Peso | Talla | IMC | Cintura (cm) |
|-----------|------|-------|-----|--------------|
| 122/78    | 78.00 kg | 1.72 m | 26.4 | — |

Valores vacíos como “—”. IMC puede calcularse en front si no viene (como ahora).

### 3.4 Sección: Laboratorio
Tabla:

| Glucosa (mg/dL) | Colesterol total | Colesterol LDL | Colesterol HDL | Triglicéridos | HbA1c (%) |
|-----------------|-------------------|----------------|----------------|---------------|-----------|
| 95              | —                 | —              | —              | —             | —         |

Siempre las mismas columnas; sin valor → “—”.

### 3.5 Sección: Observaciones
- Una fila o bloque: “Observaciones” + texto (o “—” si está vacío).
- Si hay muchas líneas, el bloque puede crecer en alto (igual que en NOTAS MÉDICAS).

### 3.6 Pie (opcional)
- “Documento generado por CuidateAPP. Información sensible protegida.” (o similar).
- En el modal, debajo: botones **Cerrar** y **Editar** (y opcional **Imprimir** / **Guardar como PDF**).

---

## 4. Opciones de implementación

### A) Sustituir el contenido actual del modal
- El modal pasa a tener solo la vista “expediente” (tablas, todos los campos).
- Pros: una sola interfaz, siempre lista para imprimir/PDF.
- Contras: se pierde la vista “card” actual (algunos usuarios pueden preferirla).

### B) Dos vistas en el mismo modal (recomendado)
- Por defecto: **Vista expediente** (tablas, todos los datos del registro).
- Toggle o pestaña: “Vista resumen” = diseño actual en cards (opcional).
- Ventaja: quien quiera “hoja clínica” la tiene por defecto; quien prefiera la vista corta puede cambiar.

### C) Modal actual + botón “Ver como expediente”
- Botón que abre una **segunda modal** (o un drawer) solo con la vista expediente (tablas, todos los datos, sin Editar).
- Incluso un botón “Imprimir” que abra esa vista en ventana nueva para “Guardar como PDF”.
- El modal actual sigue igual para la edición rápida.

---

## 5. Campos a incluir en “todos los datos del registro”

Para que la vista “expediente” muestre **todo** el registro:

| Sección | Campos |
|---------|--------|
| Identificación | id_signo, fecha_medicion, fecha_creacion (si difiere), registrado_por, id_cita (Sí/No o número), edad_paciente_en_medicion |
| Antropométricos | peso_kg, talla_m, imc (calculado si falta), medida_cintura_cm |
| Presión | presion_sistolica, presion_diastolica (y TA combinada 122/78) |
| Laboratorio | glucosa_mg_dl, colesterol_mg_dl, colesterol_ldl, colesterol_hdl, trigliceridos_mg_dl, hba1c_porcentaje |
| Observaciones | observaciones |

Todos con “—” cuando el valor sea null/undefined/vacío. Unidades fijas (kg, m, mmHg, mg/dL, %, cm) como en NOTAS MÉDICAS.

---

## 6. Consideraciones técnicas

### Estilos
- Reutilizar la estética de NOTAS MÉDICAS: `table { border-collapse: collapse }`, `th, td { border: 1px solid #000; padding: 4px 8px }`, `th { background: #e8e8e8 }`.
- En el modal se puede usar una clase tipo `detalle-signo-estilo-expediente` para no afectar al resto de la app.
- Si hay toggle “Vista resumen”, la clase se aplica solo al contenedor de la vista expediente.

### Impresión / PDF
- Añadir una clase `@media print` que oculte botones (Cerrar, Editar) y ajuste márgenes.
- Opción: botón “Imprimir” que dispare `window.print()` con esa vista; el usuario puede elegir “Guardar como PDF”.
- Opcional: en el futuro, endpoint que devuelva HTML de este registro (como Notas Médicas) para abrir en nueva pestaña e imprimir.

### Desencriptación
- Los campos sensibles del signo vital ya llegan desencriptados por los hooks del backend cuando el usuario está autorizado; el modal solo debe mostrar los valores que recibe (sin cambios adicionales de seguridad en front).

### Responsive
- En pantallas pequeñas las tablas pueden hacer scroll horizontal o apilar celdas (por ejemplo, en móvil mostrar cada métrica en una fila “Etiqueta / Valor”).

---

## 7. Resumen

- **Objetivo:** Mostrar el detalle del signo vital con un diseño de **expediente médico** (tablas, bordes, todas las secciones) y **todos los datos del registro**.
- **Referencia de diseño:** NOTAS MÉDICAS (PDF) del mismo proyecto.
- **Recomendación:** Implementar la vista “expediente” como **vista principal del modal** (opción B: con opción de “Vista resumen” en cards si se desea) y asegurar que se listen todos los campos del modelo SignoVital, con “—” donde no haya valor.
- **Extra:** Botón “Imprimir” y estilos `@media print` para facilitar “Guardar como PDF” desde el navegador.

Con esto el modal pasa a funcionar como una “hoja” de expediente de un solo registro de signo vital, alineada al estilo del resto de documentos clínicos del sistema.
