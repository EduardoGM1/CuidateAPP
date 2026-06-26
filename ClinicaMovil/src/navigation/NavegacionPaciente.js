import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import Logger from '../services/logger';
import { COLORES } from '../utils/constantes';

// Importar pantallas de paciente (ultra-simplificadas)
import InicioPaciente from '../screens/paciente/InicioPaciente';
import RegistrarSignosVitales from '../screens/paciente/RegistrarSignosVitales';
import MisCitas from '../screens/paciente/MisCitas';
import MisMedicamentos from '../screens/paciente/MisMedicamentos';
import HistorialMedico from '../screens/paciente/HistorialMedico';
import GraficosEvolucion from '../screens/paciente/GraficosEvolucion';
import ListaChatsPaciente from '../screens/paciente/ListaChatsPaciente';
import ChatDoctor from '../screens/paciente/ChatDoctor';
import Configuracion from '../screens/paciente/Configuracion';
import PerfilPaciente from '../screens/paciente/PerfilPaciente';
import ChangePINScreen from '../screens/settings/ChangePINScreen';
import AvisoPrivacidadScreen from '../screens/legal/AvisoPrivacidadScreen';

// Stack Navigator
const Stack = createStackNavigator();

const NavegacionPaciente = () => {
  Logger.info('NavegacionPaciente cargada');
  
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: COLORES.NAV_PACIENTE_FONDO }
      }}
    >
      <Stack.Screen name="InicioPaciente" component={InicioPaciente} />
      <Stack.Screen name="PerfilPaciente" component={PerfilPaciente} />
      <Stack.Screen name="RegistrarSignosVitales" component={RegistrarSignosVitales} />
      <Stack.Screen name="MisCitas" component={MisCitas} />
      <Stack.Screen name="MisMedicamentos" component={MisMedicamentos} />
      <Stack.Screen name="HistorialMedico" component={HistorialMedico} />
      <Stack.Screen name="GraficosEvolucion" component={GraficosEvolucion} />
      <Stack.Screen name="ListaChatsPaciente" component={ListaChatsPaciente} />
      <Stack.Screen name="ChatDoctor" component={ChatDoctor} />
      <Stack.Screen name="Configuracion" component={Configuracion} />
      <Stack.Screen 
        name="ChangePIN" 
        component={ChangePINScreen}
        options={{ 
          headerShown: true,
          title: 'Cambiar PIN',
          headerStyle: { backgroundColor: COLORES.NAV_PACIENTE },
          headerTintColor: COLORES.TEXTO_EN_PRIMARIO,
        }}
      />
      <Stack.Screen name="AvisoPrivacidad" component={AvisoPrivacidadScreen} />
    </Stack.Navigator>
  );
};

export default NavegacionPaciente;

