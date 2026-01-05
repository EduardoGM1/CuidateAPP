import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORES, TAMAÑOS } from '../../utils/constantes';

const Boton = ({ 
  texto, 
  alPresionar, 
  colorFondo = COLORES.PRIMARIO, 
  colorTexto = COLORES.BLANCO,
  deshabilitado = false,
  cargando = false,
  estilo = {},
  textoEstilo = {}
}) => {
  return (
    <TouchableOpacity
      style={[
        estilos.boton,
        { backgroundColor: colorFondo },
        deshabilitado && estilos.botonDeshabilitado,
        estilo
      ]}
      onPress={alPresionar}
      disabled={deshabilitado || cargando}
    >
      {cargando ? (
        <ActivityIndicator color={colorTexto} />
      ) : (
        <Text style={[estilos.texto, { color: colorTexto }, textoEstilo]}>
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
