import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import PantallaInicioSesion from '../screens/auth/PantallaInicioSesion';
import LoginPaciente from '../screens/auth/LoginPaciente';
import LoginPIN from '../screens/auth/LoginPIN';
import LoginDoctor from '../screens/auth/LoginDoctor';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import ForgotPINScreen from '../screens/auth/ForgotPINScreen';
import DashboardPaciente from '../screens/DashboardPaciente';
import DashboardDoctor from '../screens/doctor/DashboardDoctor';
import DiagnosticScreen from '../screens/DiagnosticScreen';

const Stack = createStackNavigator();

const NavegacionAuth = () => {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        cardStyle: { backgroundColor: '#F5F5F5' }
      }}
    >
        <Stack.Screen name="PantallaInicioSesion" component={PantallaInicioSesion} />
        <Stack.Screen name="LoginPaciente" component={LoginPaciente} />
        <Stack.Screen name="LoginPIN" component={LoginPIN} />
        <Stack.Screen name="LoginDoctor" component={LoginDoctor} />
        <Stack.Screen 
          name="ForgotPassword" 
          component={ForgotPasswordScreen}
          options={{ title: 'Recuperar Contraseña' }}
        />
        <Stack.Screen 
          name="ResetPassword" 
          component={ResetPasswordScreen}
          options={{ title: 'Restablecer Contraseña' }}
        />
        <Stack.Screen 
          name="ForgotPIN" 
          component={ForgotPINScreen}
          options={{ title: 'Olvidé mi PIN' }}
        />
        <Stack.Screen name="DashboardPaciente" component={DashboardPaciente} />
        <Stack.Screen name="DashboardDoctor" component={DashboardDoctor} />
        <Stack.Screen name="DiagnosticScreen" component={DiagnosticScreen} />
    </Stack.Navigator>
  );
};

export default NavegacionAuth;
