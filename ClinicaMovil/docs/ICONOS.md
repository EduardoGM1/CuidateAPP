# Convención de iconos – Clínica Móvil

Documento que define el uso de iconos y emojis en la aplicación para mantener coherencia visual y de accesibilidad.

## 1. Resumen

- **Pantallas y cards:** Se permiten emojis en títulos y etiquetas cuando refuerzan el significado (📅 Citas, 💊 Medicamentos, etc.).
- **Botones de acción:** Preferir iconos de librería (`react-native-vector-icons` / MaterialCommunityIcons) para Editar/Eliminar/Llamar/Email; evitar emojis en botones críticos.
- **Estados y badges:** Usar `COLORES` de `utils/constantes.js` para chips y badges; no depender solo del emoji para el estado.

## 2. Dónde usar emojis

- **Títulos de sección o pantalla:** Ej. "📅 Mis Citas", "💬 Chat con Doctor", "📋 Mi Historia".
- **Opciones de menú o listas:** Cuando la lista es corta y el emoji añade claridad (ej. opciones de inicio paciente).
- **Mensajes de empty state o informativos:** Ej. "💊 No tienes medicamentos registrados".
- **Evitar:** Botones de acción primarios (Guardar, Eliminar, Editar) donde se prioriza claridad y accesibilidad; usar iconos de librería o solo texto.

## 3. Dónde usar iconos de librería

- **Acciones en modales:** Editar (pencil), Eliminar (delete), Llamar (phone), Email (email). Componente `OptionsModal` y botones con estilo unificado.
- **Tabs y navegación:** `TabIconWithBadge` y headers ya usan iconos/colores del tema.
- **Campos de formulario:** Iconos opcionales junto a labels (ej. calendario para fecha) con `react-native-vector-icons` o equivalente.

## 4. Colores de iconos y botones

- Usar siempre `COLORES` desde `../../utils/constantes.js`:
  - **Editar / Info:** `COLORES.NAV_PRIMARIO` o `COLORES.INFO_LIGHT`
  - **Eliminar / Peligro:** `COLORES.ERROR_LIGHT` o `COLORES.ACCION_DANGER`
  - **Éxito / Confirmar:** `COLORES.NAV_PACIENTE` o `COLORES.EXITO`
  - **Advertencia:** `COLORES.ADVERTENCIA_LIGHT`
- No usar valores hexadecimales sueltos en nuevos componentes.

## 5. Accesibilidad (recomendaciones)

- **Etiquetas:** En botones e ítems interactivos, usar `accessibilityLabel` (y `accessibilityHint` si ayuda), por ejemplo: "Editar complicación", "Eliminar vacuna".
- **Contraste:** Los colores del sistema de diseño (`COLORES`) están elegidos para legibilidad; evitar texto gris claro sobre fondo blanco.
- **TTS:** En flujos paciente, el hook `useTTS` y textos hablados deben describir la acción (ej. "Botón Editar") sin depender solo del emoji.

## 6. Referencia rápida

| Contexto              | Recomendación                          |
|-----------------------|----------------------------------------|
| Título de pantalla    | Emoji + texto (ej. "📅 Mis Citas")    |
| Botón Editar/Eliminar | Icono de librería + texto, color de `COLORES` |
| Empty state           | Emoji + mensaje claro                  |
| Chips / Badges estado | Texto + color de `COLORES`, emoji opcional |
| Navegación (tabs)     | Iconos de librería + tema (COLORES)   |

---

*Actualizado como parte del Sistema de Diseño unificado (Fase 4 – Iconografía y accesibilidad).*
