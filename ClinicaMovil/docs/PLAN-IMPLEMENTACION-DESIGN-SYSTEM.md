# Plan de implementación – Design System unificado

Documento de referencia para unificar diseño, colores, botones e iconos en toda la aplicación, con buenas prácticas y reutilización de código.

---

## Principios

1. **Una sola fuente de verdad**: `utils/constantes.js` (COLORES, TAMAÑOS) y `config/theme.js`.
2. **Reutilizar**: componentes existentes (`Boton`, `sharedStyles`, `OptionsModal`) y extenderlos, no duplicar.
3. **Incremental**: por fases; cada fase deja la app estable y probada.
4. **Compatibilidad**: pantallas que ya usan COLORES no se rompen; se migran cuando toque.

---

## Fase 0: Cimentación (theme + constantes + utilidades)

**Objetivo**: Tener una base única y helpers reutilizables sin cambiar pantallas aún.

### Paso 0.1 – Ajustar constantes si hace falta

- **Archivo**: `ClinicaMovil/src/utils/constantes.js`
- **Acción**:
  - Añadir alias si faltan (ej. `NAV_PRIMARIO` = `PRIMARIO` para tabs/headers).
  - Mantener IMSS Bienestar; no eliminar colores ya referenciados.
- **Reutilización**: Todo el resto del plan importará desde aquí.

### Paso 0.2 – Theme como export único de estilos

- **Archivo**: `ClinicaMovil/src/config/theme.js`
- **Acción**:
  - Asegurar que `theme` exporte: `colors`, `button`, `card`, `header`, `background`, `text`, `input`, `spacing`, `border`, `shadow`.
  - Añadir sección `navigation`: `tabBarBackground`, `headerBackground`, `headerTintColor` usando `COLORES`.
- **Uso**: Navegación y componentes nuevos leerán `theme` en lugar de hex sueltos.

### Paso 0.3 – Helpers de estilos desde theme

- **Archivo nuevo (opcional)**: `ClinicaMovil/src/utils/themeStyles.js`
- **Acción**:
  - Exportar funciones o objetos derivados de `theme` para uso en `StyleSheet.create`:
    - `getButtonStyle(variant)` → primary | secondary | success | warning | danger | outline.
    - `getCardStyle()`, `getModalOverlay()`, `getHeaderStyle()` usando `theme`.
  - Así las pantallas no duplican objetos de estilo; solo llaman al helper.
- **Reutilización**: sharedStyles y componentes comunes usarán estos helpers.

### Paso 0.4 – sharedStyles que usen theme

- **Archivo**: `ClinicaMovil/src/utils/sharedStyles.js`
- **Acción**:
  - Importar `COLORES` desde `constantes` (o `theme.colors`).
  - Sustituir en `modalStyles`, `filterStyles`, `listStyles`, `emptyStateStyles`, `activeFiltersStyles` todo hex por `COLORES.*` (ej. `#FFFFFF` → `COLORES.FONDO_CARD`, `#333` → `COLORES.TEXTO_PRIMARIO`, `#2196F3` → `COLORES.PRIMARIO_LIGHT` o `INFO`).
- **Reutilización**: VerTodasCitas, HistorialAuditoria, DashboardAdmin, etc., que ya usan sharedStyles se unifican sin tocar cada pantalla.

**Criterio de éxito Fase 0**: Build correcto; pantallas que usan sharedStyles siguen viéndose igual pero con colores desde constantes.

---

## Fase 1: Navegación (tabs, stack, headers)

**Objetivo**: Un solo criterio de color y estilo para tabs y headers en profesional y paciente.

### Paso 1.1 – Colores de navegación desde constantes

- **Archivos**:  
  - `ClinicaMovil/src/navigation/NavegacionProfesional.js`  
  - `ClinicaMovil/src/navigation/NavegacionPaciente.js`
- **Acción**:
  - Importar `COLORES` desde `../utils/constantes`.
  - En **NavegacionProfesional**: reemplazar `#1976D2` por `COLORES.PRIMARIO` o `COLORES.PRIMARIO_LIGHT` (elegir uno y documentarlo), `#BBDEFB` por `COLORES.INFO_LIGHT` o un gris claro de constantes, `#fff` por `COLORES.TEXTO_EN_PRIMARIO`.
  - En **GraficosEvolucion** (header): mismo color que el resto de headers (ej. `COLORES.PRIMARIO`), no `#2196F3` distinto.
  - En **NavegacionPaciente**: `cardStyle.backgroundColor` y `headerStyle.backgroundColor` usar `COLORES.EXITO_LIGHT` o el verde definido en constantes (ej. `COLORES.BIEN`), `#E8F5E8` → algo tipo `COLORES.FONDO` o un verde muy claro si se añade.
- **Reutilización**: Un solo valor por “rol” (profesional = azul, paciente = verde) definido en constantes.

### Paso 1.2 – Headers de stack unificados

- **Archivo**: `NavegacionProfesional.js`
- **Acción**:
  - Crear un `screenOptions` por defecto para el Stack (o un objeto `defaultHeaderOptions`) con `headerStyle: { backgroundColor: COLORES.PRIMARIO }`, `headerTintColor: COLORES.TEXTO_EN_PRIMARIO`, `headerTitleStyle: { fontWeight: 'bold' }`.
  - Aplicar ese objeto a todas las pantallas que muestran header nativo (DetalleDoctor, DetallePaciente, GraficosEvolucion, ChangePassword).
- **Reutilización**: Un solo lugar donde cambiar el estilo de header.

**Criterio de éxito Fase 1**: Tabs y headers usan solo COLORES; mismo azul/verde en todos los headers de cada flujo.

---

## Fase 2: Componentes base (botones, cards, modales)

**Objetivo**: Botones, cards y modales con variantes estándar y colores desde theme/COLORES.

### Paso 2.1 – Componente Botón estándar (Paper + theme)

- **Reutilizar**: `components/common/Boton.js` (ya usa COLORES y TAMAÑOS).
- **Acción**:
  - Opción A: Mantener `Boton` y crear un wrapper que mapee variantes (primary, success, danger) a COLORES (ej. `colorFondo={COLORES.ACCION_PRIMARIA}`).
  - Opción B: Crear `AppButton.js` que use react-native-paper `Button` con `buttonColor` y `textColor` desde `theme.button[variant]`, para pantallas que prefieran Paper.
  - En ambos casos, **todas las variantes** (primary, secondary, success, warning, danger, outline) deben salir de `theme.button` o COLORES.
- **Documentación**: En el plan o en Storybook/doc, listar cuándo usar “primary” vs “success” vs “danger”.

### Paso 2.2 – Uso de variantes en pantallas

- **Archivos**: Cualquier pantalla que use `<Button … buttonColor="#…" />`.
- **Acción** (incremental):
  - Sustituir `buttonColor="#4CAF50"` por `theme.button.success.backgroundColor` o COLORES.ACCION_SUCESS.
  - Sustituir `buttonColor="#1976D2"` / `#2196F3` por COLORES.PRIMARIO o PRIMARIO_LIGHT.
  - Sustituir rojos/naranjas por COLORES.ACCION_DANGER / ACCION_WARNING.
  - Prioridad: navegación (Fase 1), luego auth, luego admin/doctor/paciente por módulo.

### Paso 2.3 – Cards desde theme

- **Archivo**: `config/theme.js` (ya tiene `card`).
- **Acción**:
  - Crear en `themeStyles.js` (o en theme) `getCardStyle()` que devuelva `theme.card`.
  - En pantallas que definan `infoCard`, `appointmentCard`, etc., usar primero `StyleSheet.flatten([getCardStyle(), styles.infoCard])` o pasar `theme.card` como base y solo sobrescribir lo específico (ej. margin).
- **Reutilización**: Menos definiciones duplicadas de borderRadius, elevation, backgroundColor.

### Paso 2.4 – Modales base desde theme + sharedStyles

- **Archivos**: `utils/sharedStyles.js`, componentes que definen `modalOverlay`/`modalContent` localmente.
- **Acción**:
  - En sharedStyles, `modalOverlay.backgroundColor` = `COLORES.FONDO_OVERLAY`, `modalContent.backgroundColor` = `COLORES.FONDO_CARD`, bordes/headers con COLORES.TEXTO_SECUNDARIO o theme.border.
  - Donde ya se use `modalStyles` de sharedStyles, no cambiar lógica; solo asegurar que sharedStyles use COLORES (hecho en Fase 0.4).
  - Pantallas con modales propios (ej. DetalleDoctor, VerTodasCitas): sustituir hex por COLORES o por `modalStyles` importado, cuando el layout sea compatible.

**Criterio de éxito Fase 2**: Botones y modales base sin hex; variantes consistentes con theme.

---

## Fase 3: Pantallas por módulo (auth, admin, doctor, paciente)

**Objetivo**: Migrar pantallas de forma ordenada sin romper flujos.

### Paso 3.1 – Auth (login, recuperar contraseña, PIN)

- **Archivos**: `PantallaInicioSesion.js`, `LoginDoctor.js`, `LoginPaciente.js`, `ForgotPasswordScreen.js`, `ForgotPINScreen.js`, `ResetPasswordScreen.js`, `LoginPIN.js`.
- **Acción**:
  - Importar `COLORES` y, si aplica, `TAMAÑOS` o `theme`.
  - Reemplazar en StyleSheet todos los `#…` por constantes (ej. `#F5F5F5` → `COLORES.FONDO`, `#333` → `COLORES.TEXTO_PRIMARIO`, `#4CAF50` → `COLORES.EXITO_LIGHT`, `#1976D2` → `COLORES.PRIMARIO_LIGHT`).
  - Botones: usar variantes de theme o componente Boton con COLORES.
- **Reutilización**: Misma paleta que el resto de la app; mismo criterio de “primario” y “éxito”.

### Paso 3.2 – Admin (dashboards, listas, formularios)

- **Archivos**: `DashboardAdmin.js`, `GestionAdmin.js`, `DetallePaciente.js`, `DetalleDoctor.js`, `VerTodasCitas.js`, `AgregarPaciente.js`, `AgregarDoctor.js`, `EditarPaciente.js`, `EditarDoctor.js`, Gestion*.js, HistorialAuditoria.js, ReportesAdmin.js.
- **Acción**:
  - Importar COLORES (y theme/sharedStyles donde ya se use).
  - Reemplazar hex en estilos por COLORES.
  - Headers personalizados (backButton, headerTitle): unificar color de texto y fondo con theme.header o COLORES.
  - Botones: mismo criterio que Fase 2.
- **Reutilización**: sharedStyles para modales y filtros; theme para cards y botones.

### Paso 3.3 – Doctor (dashboard, listas, chat, notificaciones)

- **Archivos**: `DashboardDoctor.js`, `ListaPacientesDoctor.js`, `ListaChats.js`, `ChatPaciente.js`, `HistorialNotificaciones.js`, `GestionSolicitudesReprogramacion.js`, `HistorialMedicoDoctor.js`, `ReportesDoctor.js`.
- **Acción**: Igual que 3.2 (COLORES, theme, botones estándar, headers coherentes con navegación).

### Paso 3.4 – Paciente (inicio, citas, medicamentos, configuración, chat)

- **Archivos**: `InicioPaciente.js`, `MisCitas.js`, `MisMedicamentos.js`, `HistorialMedico.js`, `GraficosEvolucion.js`, `ChatDoctor.js`, `Configuracion.js`, `RegistrarSignosVitales.js`.
- **Acción**:
  - Mismo reemplazo de hex por COLORES.
  - Mantener identidad “verde” del flujo paciente usando COLORES.EXITO_LIGHT / BIEN / ESTABLE según corresponda.
  - BigIconButton y otros componentes de paciente: en Fase 2 o aquí, hacer que sus paletas (green, red, blue, orange) usen COLORES (ej. green → COLORES.EXITO_LIGHT, red → COLORES.ERROR_LIGHT).

**Criterio de éxito Fase 3**: Ningún hex en estilos de pantallas; todo vía COLORES o theme.

---

## Fase 4: Iconos y accesibilidad

**Objetivo**: Criterio único para iconos y mejora de accesibilidad sin romper flujos.

### Paso 4.1 – Decisión y convención de iconos

- **Opción A – Emojis**: Mantener emojis en tabs y títulos; documentar lista de emojis por contexto (ej. 📅 citas, 👤 perfil, 🔐 seguridad).
- **Opción B – Librería**: Introducir una librería (ej. MaterialCommunityIcons) solo donde aporte (botones de acción, estados). Tabs pueden seguir con emojis si se prefiere.
- **Acción**: Definir en el plan o en un `docs/ICONOS.md` la convención (dónde emoji, dónde icono) y usarla en componentes nuevos y al tocar pantallas.

### Paso 4.2 – TabIconWithBadge y badges

- **Archivo**: `components/navigation/TabIconWithBadge.js`
- **Acción**: Sustituir `#F44336`, `#1976D2` por COLORES.ERROR_LIGHT y COLORES.PRIMARIO (o el que use la tab bar).

### Paso 4.3 – BigIconButton y componentes paciente

- **Archivo**: `components/paciente/BigIconButton.js`
- **Acción**: El objeto `colorStyles` (green, red, blue, orange, purple) debe usar COLORES (ej. green → COLORES.EXITO_LIGHT / BIEN, red → COLORES.ERROR_LIGHT, blue → COLORES.PRIMARIO_LIGHT, orange → COLORES.ADVERTENCIA_LIGHT).

### Paso 4.4 – Accesibilidad (opcional pero recomendado)

- Asegurar contraste (TEXTO_PRIMARIO sobre FONDO_CARD, etc.).
- Mantener y extender TTS y botones grandes en paciente; considerar etiquetas y roles en botones de profesional.

**Criterio de éxito Fase 4**: Iconos y badges sin hex; convención de iconos documentada.

---

## Buenas prácticas durante la implementación

1. **Una pantalla o un flujo a la vez**: Hacer commit después de cada pantalla o subflujo estable.
2. **Siempre importar desde constantes/theme**:  
   `import { COLORES, TAMAÑOS } from '../../utils/constantes'` o `import { theme } from '../../config/theme'`.
3. **No borrar estilos que “funcionan”**: Sustituir valores (hex → COLORES); mantener estructura de StyleSheet mientras sea posible.
4. **Reutilizar componentes existentes**: OptionsModal, ModalBase, FormModal, Boton, sharedStyles; extender o envolver, no duplicar.
5. **Nomenclatura**: Usar variantes semánticas (primary, success, danger) en lugar de colores (“azul”, “verde”) en props.
6. **Pruebas**: Tras cada fase, revisar en dispositivo/emulador: login, un flujo admin, un flujo doctor, un flujo paciente.

---

## Orden sugerido de implementación (resumen)

| Orden | Fase   | Alcance principal |
|-------|--------|--------------------|
| 1     | Fase 0 | theme + sharedStyles con COLORES; helpers opcionales |
| 2     | Fase 1 | Navegación (tabs, stack, headers) |
| 3     | Fase 2 | Botones, cards y modales base |
| 4     | Fase 3.1 | Auth |
| 5     | Fase 3.2 | Admin |
| 6     | Fase 3.3 | Doctor |
| 7     | Fase 3.4 | Paciente |
| 8     | Fase 4  | Iconos, badges, BigIconButton, convención |

---

## Archivos clave a tocar (referencia)

- **Fuente de verdad**: `utils/constantes.js`, `config/theme.js`
- **Estilos compartidos**: `utils/sharedStyles.js`, `utils/themeStyles.js` (nuevo si se crea)
- **Navegación**: `navigation/NavegacionProfesional.js`, `navigation/NavegacionPaciente.js`
- **Componentes base**: `components/common/Boton.js`, `components/navigation/TabIconWithBadge.js`, `components/paciente/BigIconButton.js`
- **Modales**: `components/DetallePaciente/shared/OptionsModal.js`, `shared/ModalBase.js`, `shared/FormModal.js`
- **Pantallas**: todas las listadas en Fases 3.1–3.4

Este plan permite implementar paso a paso, con buenas prácticas y reutilizando código, componentes y funciones existentes.
