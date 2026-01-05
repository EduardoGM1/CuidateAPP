import React, { useState } from 'react';
import { TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Text } from 'react-native-paper';

const BotonAudio = ({ texto, estilo }) => {
  const [mostrando, setMostrando] = useState(false);

  const mostrarInstrucciones = () => {
    if (mostrando) {
      setMostrando(false);
    } else {
      setMostrando(true);
      
      // Mostrar instrucciones de manera clara
      Alert.alert(
        '📋 Instrucciones',
        texto,
        [
          {
            text: '✅ Entendido',
            onPress: () => {
              setMostrando(false);
              console.log('Usuario confirmó que entendió las instrucciones');
            }
          }
        ],
        { 
          cancelable: true, 
          onDismiss: () => setMostrando(false) 
        }
      );
    }
  };

  return (
    <TouchableOpacity
      style={[styles.botonAudio, estilo]}
      onPress={mostrarInstrucciones}
      activeOpacity={0.7}
    >
      <Text style={styles.icono}>
        {mostrando ? '📋' : '❓'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  botonAudio: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFD700', // Amarillo dorado
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  icono: {
    fontSize: 24,
  },
});

export default BotonAudio;
