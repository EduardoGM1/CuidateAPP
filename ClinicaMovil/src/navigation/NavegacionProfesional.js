import React, { useMemo, useEffect, useState } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import Logger from '../services/logger';
import useConversacionesDoctor from '../hooks/useConversacionesDoctor';
import TabIconWithBadge from '../components/navigation/TabIconWithBadge';
import DashboardAdmin from '../screens/admin/DashboardAdmin';
import DashboardDoctor from '../screens/doctor/DashboardDoctor';
import GestionAdmin from '../screens/admin/GestionAdmin';
import DetalleDoctor from '../screens/admin/DetalleDoctor';
import DetallePaciente from '../screens/admin/DetallePaciente';
// Nuevas pantallas de formularios
import AgregarDoctor from '../screens/admin/AgregarDoctor';
import EditarDoctor from '../screens/admin/EditarDoctor';
import AgregarPaciente from '../screens/admin/AgregarPaciente';
import EditarPaciente from '../screens/admin/EditarPaciente';
import GestionMedicamentos from '../screens/admin/GestionMedicamentos';
import GestionModulos from '../screens/admin/GestionModulos';
import GestionComorbilidades from '../screens/admin/GestionComorbilidades';
import GestionVacunas from '../screens/admin/GestionVacunas';
import VerTodasCitas from '../screens/admin/VerTodasCitas';
import HistorialAuditoria from '../screens/admin/HistorialAuditoria';
import HistorialNotificaciones from '../screens/doctor/HistorialNotificaciones';
import GraficosEvolucion from '../screens/admin/GraficosEvolucion';
// Pantallas del doctor
import ListaPacientesDoctor from '../screens/doctor/ListaPacientesDoctor';
import ReportesAdmin from '../screens/admin/ReportesAdmin';
import HistorialMedicoDoctor from '../screens/doctor/HistorialMedicoDoctor';
import GestionSolicitudesReprogramacion from '../screens/doctor/GestionSolicitudesReprogramacion';
import ChatPaciente from '../screens/doctor/ChatPaciente';
import ListaChats from '../screens/doctor/ListaChats';
import ChangePasswordScreen from '../screens/settings/ChangePasswordScreen';

// Pantallas profesionales (placeholder por ahora)
const GestionScreen = ({ navigation }) => {
  const { userRole } = useAuth();
  
  // Solo administradores ven la gestión completa
  if (userRole === 'Admin' || userRole === 'admin' || userRole === 'administrador') {
    return <GestionAdmin navigation={navigation} />;
  }
  
  // Doctores ven la lista de sus pacientes con filtros
  return <ListaPacientesDoctor navigation={navigation} />;
};

const MensajesScreen = ({ navigation }) => (
  <ListaChats navigation={navigation} />
);

const PerfilScreen = ({ navigation }) => {
  const { logout, user, userData, userRole } = useAuth();

  const handleLogout = async () => {
    Logger.info('Logout iniciado desde perfil profesional');
    await logout();
  };

  const handleChangePassword = () => {
    Logger.navigation('PerfilScreen', 'ChangePassword');
    navigation.navigate('ChangePassword');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <Text style={styles.title}>👤 Perfil</Text>
          <Text style={styles.subtitle}>Información del profesional</Text>
          
          {/* Información del usuario */}
          {userData && (
            <View style={styles.userInfoCard}>
              <Text style={styles.userInfoLabel}>Email:</Text>
              <Text style={styles.userInfoValue}>{userData.email || 'No disponible'}</Text>
              
              {userData.nombre && (
                <>
                  <Text style={styles.userInfoLabel}>Nombre:</Text>
                  <Text style={styles.userInfoValue}>
                    {userData.nombre} {userData.apellido_paterno || ''} {userData.apellido_materno || ''}
                  </Text>
                </>
              )}
              
              <Text style={styles.userInfoLabel}>Rol:</Text>
              <Text style={styles.userInfoValue}>{userRole || 'No disponible'}</Text>
            </View>
          )}

          {/* Sección de Seguridad */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔒 Seguridad</Text>
            
            <TouchableOpacity
              style={styles.securityButton}
              onPress={handleChangePassword}
            >
              <View style={styles.securityButtonContent}>
                <Text style={styles.securityButtonIcon}>🔐</Text>
                <View style={styles.securityButtonInfo}>
                  <Text style={styles.securityButtonLabel}>Cambiar Contraseña</Text>
                  <Text style={styles.securityButtonDescription}>Actualiza tu contraseña de acceso</Text>
                </View>
                <Text style={styles.securityButtonArrow}>→</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Botón de Cerrar Sesión */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Cerrar Sesión</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Componente que determina qué dashboard mostrar según el rol
const DashboardSelector = ({ navigation }) => {
  const { userRole } = useAuth();
  
  // Solo administradores ven el dashboard administrativo
  if (userRole === 'Admin' || userRole === 'admin' || userRole === 'administrador') {
    return <DashboardAdmin navigation={navigation} />;
  }
  
  // Doctores ven el dashboard de doctor
  return <DashboardDoctor navigation={navigation} />;
};

// Bottom Tab Navigator
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  const { userData, userRole } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Obtener conversaciones solo para doctores
  const esDoctor = userRole === 'Doctor' || userRole === 'doctor';
  const doctorId = esDoctor ? userData?.id_doctor : null;
  
  const { conversaciones, refresh: refreshConversaciones } = useConversacionesDoctor(doctorId);
  
  // Calcular total de mensajes no leídos
  const totalMensajesNoLeidos = useMemo(() => {
    if (!esDoctor || !conversaciones || conversaciones.length === 0) {
      return 0;
    }
    
    return conversaciones.reduce((total, conv) => {
      const mensajesNoLeidos = Number(conv.mensajes_no_leidos) || 0;
      return total + mensajesNoLeidos;
    }, 0);
  }, [conversaciones, esDoctor]);

  // Forzar actualización del tab bar cuando cambien las conversaciones
  useEffect(() => {
    // Forzar re-render del tab navigator cuando cambien los mensajes no leídos
    setRefreshKey(prev => prev + 1);
  }, [totalMensajesNoLeidos]);

  // Refrescar conversaciones cuando se vuelve a la pantalla
  useFocusEffect(
    React.useCallback(() => {
      if (esDoctor && doctorId) {
        Logger.info('TabNavigator: Pantalla enfocada, refrescando conversaciones para badge');
        refreshConversaciones();
      }
    }, [esDoctor, doctorId, refreshConversaciones])
  );

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1976D2',
          borderTopColor: '#1976D2',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#fff',
        tabBarInactiveTintColor: '#BBDEFB',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen 
        name="Dashboard" 
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ focused }) => (
            <TabIconWithBadge icon="🏠" badgeCount={0} focused={focused} />
          ),
        }}
      >
        {({ navigation }) => <DashboardSelector navigation={navigation} />}
      </Tab.Screen>
      <Tab.Screen 
        name="Gestion" 
        options={{
          tabBarLabel: 'Gestión',
          tabBarIcon: ({ focused }) => (
            <TabIconWithBadge icon="📋" badgeCount={0} focused={focused} />
          ),
        }}
      >
        {({ navigation }) => <GestionScreen navigation={navigation} />}
      </Tab.Screen>
      <Tab.Screen 
        name="Mensajes" 
        key={`mensajes-${refreshKey}`}
        component={MensajesScreen}
        options={{
          tabBarLabel: 'Mensajes',
          tabBarIcon: ({ focused }) => (
            <TabIconWithBadge 
              icon="💬" 
              badgeCount={totalMensajesNoLeidos} 
              focused={focused} 
            />
          ),
        }}
      />
      <Tab.Screen 
        name="Perfil" 
        component={PerfilScreen}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: ({ focused }) => (
            <TabIconWithBadge icon="⚙️" badgeCount={0} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Stack Navigator principal
const Stack = createStackNavigator();

const NavegacionProfesional = () => {
  Logger.info('NavegacionProfesional cargada');
  
  return (
    <>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen 
        name="DetalleDoctor" 
        component={DetalleDoctor}
        options={{
          headerShown: true,
          title: 'Detalle del Doctor',
          headerStyle: {
            backgroundColor: '#1976D2',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen 
        name="DetallePaciente" 
        component={DetallePaciente}
        options={{
          headerShown: true,
          title: 'Detalle del Paciente',
          headerStyle: {
            backgroundColor: '#1976D2',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      {/* Nuevas rutas de formularios - Solo para administradores */}
      <Stack.Screen 
        name="AgregarDoctor" 
        component={AgregarDoctor}
        options={{
          headerShown: false, // Usa header personalizado
        }}
      />
      <Stack.Screen 
        name="EditarDoctor" 
        component={EditarDoctor}
        options={{
          headerShown: false, // Usa header personalizado
        }}
      />
      <Stack.Screen 
        name="AgregarPaciente" 
        component={AgregarPaciente}
        options={{
          headerShown: false, // Usa header personalizado
        }}
      />
      <Stack.Screen 
        name="EditarPaciente" 
        component={EditarPaciente}
        options={{
          headerShown: false, // Usa header personalizado
        }}
      />
      <Stack.Screen 
        name="GestionMedicamentos" 
        component={GestionMedicamentos}
        options={{
          headerShown: false, // Usa header personalizado
        }}
      />
      <Stack.Screen 
        name="GestionModulos" 
        component={GestionModulos}
        options={{
          headerShown: false, // Usa header personalizado
        }}
      />
      <Stack.Screen 
        name="GestionComorbilidades" 
        component={GestionComorbilidades}
        options={{
          headerShown: false, // Usa header personalizado
        }}
      />
      <Stack.Screen 
        name="GestionVacunas" 
        component={GestionVacunas}
        options={{
          headerShown: false, // Usa header personalizado
        }}
      />
      <Stack.Screen 
        name="VerTodasCitas" 
        component={VerTodasCitas}
        options={{
          headerShown: false, // Usa header personalizado
        }}
      />
      <Stack.Screen 
        name="HistorialAuditoria" 
        component={HistorialAuditoria}
        options={{
          headerShown: false, // Usa header personalizado
        }}
      />
      <Stack.Screen 
        name="HistorialNotificaciones" 
        component={HistorialNotificaciones}
        options={{
          headerShown: false, // Usa header personalizado
        }}
      />
      <Stack.Screen 
        name="GraficosEvolucion" 
        component={GraficosEvolucion}
        options={{
          headerShown: true,
          title: 'Gráficos de Evolución',
          headerStyle: {
            backgroundColor: '#2196F3',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      {/* Pantallas del Doctor */}
      <Stack.Screen 
        name="ListaPacientesDoctor" 
        component={ListaPacientesDoctor}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="ReportesAdmin" 
        component={ReportesAdmin}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="HistorialMedicoDoctor" 
        component={HistorialMedicoDoctor}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="GestionSolicitudesReprogramacion" 
        component={GestionSolicitudesReprogramacion}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="ChatPaciente" 
        component={ChatPaciente}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen 
        name="ChangePassword" 
        component={ChangePasswordScreen}
        options={{
          headerShown: true,
          title: 'Cambiar Contraseña',
          headerStyle: {
            backgroundColor: '#1976D2',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
    </Stack.Navigator>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  userInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userInfoLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 4,
  },
  userInfoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 16,
  },
  securityButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  securityButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  securityButtonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  securityButtonInfo: {
    flex: 1,
  },
  securityButtonLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  securityButtonDescription: {
    fontSize: 14,
    color: '#666',
  },
  securityButtonArrow: {
    fontSize: 20,
    color: '#1976D2',
    fontWeight: 'bold',
  },
  message: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  tabIcon: {
    fontSize: 20,
  },
  logoutButton: {
    backgroundColor: '#F44336',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginTop: 20,
    alignSelf: 'center',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default NavegacionProfesional;

