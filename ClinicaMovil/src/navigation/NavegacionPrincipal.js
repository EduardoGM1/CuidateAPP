import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { View, Text, StyleSheet } from 'react-native';
import NavegacionAuth from './NavegacionAuth';
import { COLORES, TAMAÑOS } from '../utils/constantes';

const NavegacionPrincipal = () => {
  const { estaAutenticado, usuario } = useSelector((state) => state.auth);

  return (
    <NavigationContainer>
      {estaAutenticado ? (
        <View style={estilos.contenedorHome}>
          <Text style={estilos.titulo}>¡Bienvenido!</Text>
          <Text style={estilos.subtitulo}>
            Hola, {usuario?.nombre || 'Usuario'}
          </Text>
          <Text style={estilos.texto}>
            Rol: {usuario?.rol || 'No definido'}
          </Text>
          <Text style={estilos.mensaje}>
            Las pantallas principales se implementarán en la siguiente fase.
          </Text>
        </View>
      ) : (
        <NavegacionAuth />
      )}
    </NavigationContainer>
  );
};

const estilos = StyleSheet.create({
  contenedorHome: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORES.FONDO,
    paddingHorizontal: TAMAÑOS.ESPACIADO_GRANDE,
  },
  titulo: {
    fontSize: TAMAÑOS.TEXTO_TITULO,
    fontWeight: 'bold',
    color: COLORES.PRIMARIO,
    marginBottom: TAMAÑOS.ESPACIADO_MEDIO,
  },
  subtitulo: {
    fontSize: TAMAÑOS.TEXTO_NORMAL,
    color: COLORES.SECUNDARIO,
    marginBottom: TAMAÑOS.ESPACIADO_PEQUEÑO,
  },
  texto: {
    fontSize: TAMAÑOS.TEXTO_NORMAL,
    color: COLORES.SECUNDARIO,
    marginBottom: TAMAÑOS.ESPACIADO_GRANDE,
  },
  mensaje: {
    fontSize: 14,
    color: COLORES.SECUNDARIO,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default NavegacionPrincipal;
