import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORES, TAMAÑOS } from '../../utils/constantes';
import theme from '../../config/theme';

/**
 * Variantes: primary | secondary | success | warning | danger | outline
 * Si se pasa variant, se usan colores del theme; si no, colorFondo/colorTexto (retrocompatibilidad).
 */
const getColorsFromVariant = (variant) => {
  const v = theme.button[variant] || theme.button.primary;
  return { backgroundColor: v.backgroundColor, color: v.color };
};

const Boton = ({
  texto,
  alPresionar,
  variant,
  colorFondo,
  colorTexto,
  deshabilitado = false,
  cargando = false,
  estilo = {},
  textoEstilo = {},
}) => {
  const colors = variant
    ? getColorsFromVariant(variant)
    : {
        backgroundColor: colorFondo ?? COLORES.PRIMARIO,
        color: colorTexto ?? COLORES.BLANCO,
      };
  const borderStyle = variant === 'outline' ? theme.button.outline : {};
  return (
    <TouchableOpacity
      style={[
        estilos.boton,
        { backgroundColor: colors.backgroundColor },
        variant === 'outline' && {
          borderWidth: theme.button.outline.borderWidth,
          borderColor: theme.button.outline.borderColor,
        },
        deshabilitado && estilos.botonDeshabilitado,
        estilo,
      ]}
      onPress={alPresionar}
      disabled={deshabilitado || cargando}
    >
      {cargando ? (
        <ActivityIndicator color={colors.color} />
      ) : (
        <Text style={[estilos.texto, { color: colors.color }, textoEstilo]}>
          {texto}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const estilos = StyleSheet.create({
  boton: {
    paddingVertical: TAMAÑOS.ESPACIADO_MEDIO,
    paddingHorizontal: TAMAÑOS.ESPACIADO_GRANDE,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  botonDeshabilitado: {
    opacity: 0.6,
  },
  texto: {
    fontSize: TAMAÑOS.TEXTO_NORMAL,
    fontWeight: '600',
  },
});

export default Boton;
