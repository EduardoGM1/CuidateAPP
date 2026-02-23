# Diseño responsivo - App móvil CuidateApp

## Objetivo

Garantizar que la app se vea y funcione bien en **todos los tamaños de pantalla**: teléfonos pequeños (~320px), estándar (375–414px), grandes y tablets, así como en **rotación** y **multi-ventana**.

## Utilidades centrales

### `src/utils/responsive.js`

- **`useResponsiveDimensions()`**  
  Devuelve `{ width, height, isSmallScreen, isLandscape, scale, cardWidthHalf, spacing }`.  
  Usa `useWindowDimensions()` de React Native, por lo que **reacciona a rotación y cambio de tamaño**.

- **`scaleWithWidth(value, screenWidth, baseWidth)`**  
  Escala un valor (px) según el ancho de pantalla, con límites para no dejar texto/iconos demasiado pequeños o grandes.

- **`getCardWidthTwoColumns(screenWidth)`**  
  Ancho recomendado para una tarjeta en grid de 2 columnas.

- **`getHorizontalPadding(screenWidth)`**  
  Padding horizontal recomendado según tamaño de pantalla.

**Recomendación:** En pantallas con grids o cards que dependen del ancho, usar `useResponsiveDimensions()` y aplicar `cardWidthHalf` o anchos calculados en estilo inline, en lugar de `Dimensions.get('window')` (que no se actualiza al rotar).

## SafeArea

- Todas las pantallas principales usan **`SafeAreaView`** de `react-native-safe-area-context` para respetar notch, barra de estado y área segura inferior.
- En headers personalizados (por ejemplo menú hamburguesa), el contenido debe respetar los insets; si hace falta, usar **`useSafeAreaInsets()`** para padding superior/inferior.

## Buenas prácticas

1. **Evitar anchos fijos** para cards o botones en grid: usar `width: (screenWidth - gap) / 2` o `cardWidthHalf` del hook.
2. **Modales:** usar `maxHeight: '70%'` o `'80%'` en lugar de `maxHeight: 400` para que se adapten a pantallas pequeñas y grandes.
3. **ScrollView:** envolver listas y formularios largos para permitir scroll en pantallas pequeñas y en landscape.
4. **Texto:** usar `numberOfLines` y `ellipsizeMode` donde el texto pueda ser largo para evitar desbordes.
5. **Touch targets:** mantener botones y enlaces con al menos ~44px de altura/ancho para accesibilidad.

## Constantes de diseño

- **Colores y espaciado base:** `src/utils/constantes.js` (`COLORES`, `TAMAÑOS`).
- **Theme:** `src/config/theme.js`.
- Para escalar tamaños según pantalla, usar `scaleWithWidth(TAMAÑOS.TEXTO_NORMAL, width)` desde el hook.

## Pantallas ya adaptadas

- **DashboardAdmin** y **DashboardDoctor:** métricas y accesos rápidos usan `useResponsiveDimensions()` y `cardWidthHalf` para que el grid de 2 columnas se adapte al ancho y a la rotación.
- **sharedStyles:** modales con `maxHeight: '70%'`, estado vacío con `minHeight` razonable para pantallas pequeñas.
