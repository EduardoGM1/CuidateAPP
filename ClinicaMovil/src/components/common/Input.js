import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { COLORES, TAMAÑOS } from '../../utils/constantes';

const Input = ({
  etiqueta,
  valor,
  alCambiarTexto,
  placeholder,
  tipoTeclado = 'default',
  esSeguro = false,
  error = null,
  estilo = {},
  inputEstilo = {}
}) => {
  const [estaEnfocado, setEstaEnfocado] = useState(false);

  return (
    <View style={[estilos.contenedor, estilo]}>
      {etiqueta && <Text style={estilos.etiqueta}>{etiqueta}</Text>}
      <TextInput
        style={[
          estilos.input,
          estaEnfocado && estilos.inputEnfocado,
          error && estilos.inputError,
          inputEstilo
        ]}
        value={valor}
        onChangeText={alCambiarTexto}
        placeholder={placeholder}
        keyboardType={tipoTeclado}
        secureTextEntry={esSeguro}
        onFocus={() => setEstaEnfocado(true)}
        onBlur={() => setEstaEnfocado(false)}
        placeholderTextColor={COLORES.SECUNDARIO}
      />
      {error && <Text style={estilos.textoError}>{error}</Text>}
    </View>
  );
};

const estilos = StyleSheet.create({
  contenedor: {
    marginBottom: TAMAÑOS.ESPACIADO_MEDIO,
  },
  etiqueta: {
    fontSize: TAMAÑOS.TEXTO_NORMAL,
    color: COLORES.SECUNDARIO,
    marginBottom: TAMAÑOS.ESPACIADO_PEQUEÑO,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: TAMAÑOS.ESPACIADO_MEDIO,
    paddingVertical: TAMAÑOS.ESPACIADO_MEDIO,
    fontSize: TAMAÑOS.TEXTO_NORMAL,
    backgroundColor: COLORES.BLANCO,
  },
  inputEnfocado: {
    borderColor: COLORES.PRIMARIO,
  },
  inputError: {
    borderColor: COLORES.ERROR,
  },
  textoError: {
    color: COLORES.ERROR,
    fontSize: 14,
    marginTop: TAMAÑOS.ESPACIADO_PEQUEÑO,
  },
});

export default Input;
