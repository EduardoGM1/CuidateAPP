# Comparativa: Formato original (ODS) vs formato generado (XLSX)

Comparación entre **FORMATO ORIGINAL.ods** y el Excel generado por la app web (`formaExcelUtils.js`) para que el diseño generado sea 100% fiel al original.

---

## 1. Imagen / logo

| Aspecto | ODS original | XLSX generado |
|--------|---------------|----------------|
| **Logo o imagen** | Incluye `media/image1.png` (logo institucional referenciado en el ODS). | **No incluye ninguna imagen.** |

**Acción:** Si el original muestra un logo (p. ej. arriba a la izquierda o en el encabezado), hay que insertar la imagen en el libro generado con ExcelJS (posición y tamaño según el ODS).

---

## 2. Configuración de impresión / página

| Aspecto | ODS original | XLSX generado |
|--------|---------------|----------------|
| **Escala** | En `styles.xml`: dos diseños de página; uno con `style:scale-to="23%"` y otro `100%`. | `pageSetup` con `scale="100"`, `fitToWidth="1"`, `fitToHeight="1"`. |
| **Márgenes** | `fo:margin-top/bottom="0.75in"`, `fo:margin-left/right="0.7in"`. | `pageMargins` left/right 0.7, top/bottom 0.75, header/footer 0.3. |

**Acción:** Revisar si el original debe imprimirse al 23% en alguna vista; si es así, replicar esa opción en `pageSetup` (scale o fitToPage).

---

## 3. Estilos de celdas (tipografía y colores)

El ODS original define muchos estilos de celda (`ce92`, `ce18`, `ce19`–`ce24`, etc.). El generado solo usa un subconjunto.

### 3.1 Títulos institucionales (filas 1–5 y año)

| Aspecto | ODS original | XLSX generado |
|--------|---------------|----------------|
| **Estilo** | ce92: Century Gothic 16pt, color **#003300**, negrita, fondo transparente. | ✅ Century Gothic 16pt, #003300, negrita, centrado. |
| **Fondo** | Transparente. | No se aplica relleno (equivalente). ✅ |

### 3.2 Metadatos (Institución, Entidad, etc.)

| Aspecto | ODS original | XLSX generado |
|--------|---------------|----------------|
| **Estilo** | ce93/ce94: Arial 14pt negrita, borde. | ✅ Arial 14pt negrita, borde. |

### 3.3 Secciones (DATOS DE IDENTIFICACIÓN, DX ENFERMEDADES…)

| Aspecto | ODS original | XLSX generado |
|--------|---------------|----------------|
| **Colores** | Rojo #A50021 (texto blanco), verde #B6E0BA, amarillo #FFD961. También aparecen **#9CD4A1** (verde), **#F4B183** (naranja) en otras celdas. | Solo #A50021, #B6E0BA, #FFD961. |
| **Tamaños de fuente** | Por sección: 9pt, 12pt, 13pt, 14pt, **17pt** en alguna (ce102). | Todas las secciones con **14pt**. |
| **Color de texto en secciones** | En alguna celda: texto **#A50021** sobre fondo #B6E0BA (ce103). | Siempre negro o blanco. |

**Acción:**  
- Añadir colores **#9CD4A1** y **#F4B183** donde el original los use.  
- Ajustar tamaños por sección (9pt, 12pt, 13pt, 17pt según corresponda).  
- Aplicar texto #A50021 en la sección que lo lleve en el ODS.

### 3.4 Fila de encabezados de columnas (N°, NOMBRE, …)

| Aspecto | ODS original | XLSX generado |
|--------|---------------|----------------|
| **Estilo** | ce18/ce96: fondo **#A50021**, Arial **13pt**, color **#FFFFFF**, negrita. | ✅ #A50021, Arial 13pt, blanco, negrita, centrado. |

### 3.5 Filas de datos

| Aspecto | ODS original | XLSX generado |
|--------|---------------|----------------|
| **Estilo** | ce14 y similares: Arial **12pt**, sin negrita, fondo blanco, borde. | ✅ Arial 12pt, blanco, borde. |

---

## 4. Anchos de columna

| Aspecto | ODS original | XLSX generado |
|--------|---------------|----------------|
| **Anchos** | Los anchos de columna están definidos en el ODS (posiblemente por estilos de columna `co1`…). No se extrajeron valores exactos en esta revisión. | Col 1 = **5**, Col 2 = **35**, Cols 3–26 = **14**. |

**Acción:** Medir en el ODS original el ancho de cada columna (en unidades ODS o en cm) y mapear a `width` de ExcelJS para que coincidan.

---

## 5. Altura de filas

| Aspecto | ODS original | XLSX generado |
|--------|---------------|----------------|
| **Altura** | El ODS puede definir alturas por fila (`ro1`, `ro2`, …). | XLSX: `defaultRowHeight="15"`. No se fijan alturas por fila. |

**Acción:** Si en el original las filas de título, metadatos o secciones tienen mayor altura, definir `row.height` en las filas correspondientes del generado.

---

## 6. Bordes

| Aspecto | ODS original | XLSX generado |
|--------|---------------|----------------|
| **Celdas con borde** | Metadatos, secciones y datos con borde. | ✅ Bordes aplicados en metadatos, secciones, encabezados y datos. |
| **Estilo** | Borde fino estándar. | thin, color negro. ✅ |

---

## 7. Congelación de paneles

| Aspecto | ODS original | XLSX generado |
|--------|---------------|----------------|
| **Vista** | Probablemente filas superiores fijas. | `ySplit: 23` (congelar hasta fila 23). ✅ |

---

## 8. Contenido y estructura

| Aspecto | ODS original | XLSX generado |
|--------|---------------|----------------|
| **Texto título** | 4 líneas institucionales + año. | ✅ Igual. |
| **Metadatos** | 9 líneas (Institución, Entidad, Jurisdicción, Municipio, Unidad Médica, Nombre GAM, Etapa, Mes y año, Coordinador). | ✅ Igual. |
| **Secciones** | 6 (IDENTIFICACIÓN, DX ENFERMEDADES, EDUCACIÓN, VARIABLES, DETECCIÓN, OTRAS ACCIONES). | ✅ Igual. |
| **Encabezados** | 26 columnas (N°, NOMBRE, Edad, … Exploración Fondo de Ojo). | ✅ Mismas 26 columnas. |

---

## 9. Colores adicionales en el ODS (no usados aún en el generado)

En el ODS aparecen, entre otros:

- **#9CD4A1** – verde (secciones / subsecciones).
- **#F4B183** – naranja.
- **#CCECFF** – azul claro.
- **#A6A6A6** – gris.
- **#BFBFBF** – gris claro.
- **#D6DCE5** – gris azulado.
- **#FFFF00** – amarillo puro.

Si en el original alguna fila o celda concreta usa estos colores, hay que aplicarlos en el mismo lugar en el XLSX generado.

---

## Resumen de acciones para acercar el formato generado al 100%

1. **Incluir imagen/logo** si el ODS la muestra (p. ej. `media/image1.png`).
2. **Revisar escala de impresión** (23% vs 100%) y alinear con el original.
3. **Ajustar tamaños de fuente por sección** (9pt, 12pt, 13pt, 17pt donde corresponda).
4. **Añadir colores** #9CD4A1, #F4B183 y, si aplica, #CCECFF, #A6A6A6, #D6DCE5, #FFFF00 en las celdas que los tengan en el ODS.
5. **Aplicar color de texto #A50021** en la sección que lo use (fondo #B6E0BA).
6. **Definir anchos de columna** según el ODS (y alturas de fila si son distintas a la actual).

Con estos cambios, el diseño del XLSX generado puede igualarse al formato original ODS.
