import React, { useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Image } from 'react-native';
import { Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import BotonAudio from '../../components/common/BotonAudio';
import { COLORES } from '../../utils/constantes';

const PantallaInicioSesion = ({ navigation }) => {
  const [isZoomed, setIsZoomed] = useState(false);

  const handlePaciente = () => {
    navigation.navigate('LoginPaciente');
  };

  const handleDoctor = () => {
    navigation.navigate('LoginDoctor');
  };

  const toggleZoom = () => {
    setIsZoomed(!isZoomed);
  };

  const textoInstrucciones = "Bienvenido a la aplicación de la clínica. Para continuar, selecciona si eres paciente o doctor/administrador. Si eres paciente, presiona el botón con el icono de persona. Si eres doctor o administrador, presiona el botón con el icono médico.";

  return (
    <SafeAreaView style={styles.container}>
      <BotonAudio texto={textoInstrucciones} />
      
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image 
          source={require('../../assets/images/logo.png')} 
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
      
      {/* Header con botones arriba */}
      <View style={styles.header}>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.audioButton} 
            onPress={() => {}}
            accessibilityLabel="Reproducir audio de instrucciones"
            accessibilityHint="Toca para escuchar las instrucciones"
          >
            <Text style={styles.audioIcon}>🔊</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.zoomButton} 
            onPress={toggleZoom}
            accessibilityLabel="Activar zoom para mejor visibilidad"
            accessibilityHint="Toca para hacer zoom en el texto"
          >
            <Text style={styles.zoomIcon}>🔍</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerContent}>
          <Text style={[styles.title, isZoomed && styles.titleZoomed]}>¿Cómo quieres iniciar sesión?</Text>
        </View>
      </View>
      
      <View style={styles.content}>
            <View style={styles.buttonContainer}>
              <Button
                mode="contained"
                onPress={handlePaciente}
                style={styles.button}
                contentStyle={styles.buttonContent}
                labelStyle={[styles.buttonLabel, isZoomed && styles.buttonLabelZoomed]}
              >
                👤 Soy Paciente
              </Button>
              
              <Button
                mode="contained"
                onPress={handleDoctor}
                style={styles.button}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                🩺 Soy Doctor/Administrador
              </Button>

              {/* Botón temporal de diagnóstico */}
              <Button
                mode="outlined"
                onPress={() => navigation.navigate('DiagnosticScreen')}
                style={[styles.button, styles.diagnosticButton]}
                contentStyle={styles.buttonContent}
                labelStyle={styles.buttonLabel}
              >
                🔧 Diagnóstico de Conexión
              </Button>
            </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORES.FONDO,
  },
  logoContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  header: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: COLORES.FONDO,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  headerContent: {
    alignItems: 'center',
  },
  audioButton: {
    padding: 12,
    borderRadius: 25,
    backgroundColor: COLORES.NAV_PACIENTE_FONDO,
    borderWidth: 2,
    borderColor: COLORES.EXITO_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioIcon: {
    fontSize: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: COLORES.TEXTO_PRIMARIO,
  },
  titleZoomed: {
    fontSize: 32,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 20,
  },
  button: {
    borderRadius: 12,
    elevation: 3,
  },
  buttonLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  buttonLabelZoomed: {
    fontSize: 22,
  },
  zoomButton: {
    padding: 12,
    borderRadius: 25,
    backgroundColor: COLORES.NAV_FILTROS_ACTIVOS,
    borderWidth: 2,
    borderColor: COLORES.NAV_PRIMARIO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomIcon: {
    fontSize: 20,
  },
  diagnosticButton: {
    borderColor: COLORES.ADVERTENCIA_LIGHT,
    borderWidth: 2,
  },
  buttonContent: {
    paddingVertical: 12,
  },
});

export default PantallaInicioSesion;
