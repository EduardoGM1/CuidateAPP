import React, { useMemo, useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import Logger from '../services/logger';
import { COLORES } from '../utils/constantes';
import { formatNombreCompleto } from '../utils/formatNombreCompleto';
import useConversacionesDoctor from '../hooks/useConversacionesDoctor';
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
import GestionInstituciones from '../screens/admin/GestionInstituciones';
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

const MensajesScreen = ({ navigation, onBackFromSection }) => (
  <ListaChats navigation={navigation} onBackFromSection={onBackFromSection} />
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
                    {formatNombreCompleto(userData)}
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

// Pantalla única con menú lateral propio (sin tabs ni drawer de React Navigation)
const SECCIONES = [
  { key: 'Dashboard', label: 'Dashboard', icon: '🏠' },
  { key: 'Gestion', label: 'Gestión', icon: '📋' },
  { key: 'Mensajes', label: 'Mensajes', icon: '💬' },
  { key: 'Perfil', label: 'Perfil', icon: '⚙️' },
];

// Accesos rápidos según rol (screen = nombre de ruta en el Stack)
const ACCESOS_RAPIDOS_ADMIN = [
  { label: 'Agregar Doctor', icon: '👨‍⚕️', screen: 'AgregarDoctor' },
  { label: 'Registrar Paciente', icon: '👥', screen: 'AgregarPaciente' },
  { label: 'Todas las Citas', icon: '📅', screen: 'VerTodasCitas' },
  { label: 'Reportes', icon: '📊', screen: 'ReportesAdmin' },
  { label: 'Historial de Auditoría', icon: '📜', screen: 'HistorialAuditoria' },
  { label: 'Módulos', icon: '🏢', screen: 'GestionModulos' },
  { label: 'Instituciones', icon: '🏥', screen: 'GestionInstituciones' },
  { label: 'Medicamentos', icon: '💊', screen: 'GestionMedicamentos' },
  { label: 'Comorbilidades', icon: '🩺', screen: 'GestionComorbilidades' },
  { label: 'Vacunas', icon: '💉', screen: 'GestionVacunas' },
];

const ACCESOS_RAPIDOS_DOCTOR = [
  { label: 'Ver Todas las Citas', icon: '📅', screen: 'VerTodasCitas' },
  { label: 'Mis Pacientes', icon: '👥', screen: 'ListaPacientesDoctor' },
  { label: 'Nuevo Paciente', icon: '➕', screen: 'AgregarPaciente' },
  { label: 'Historial Médico', icon: '📋', screen: 'HistorialMedicoDoctor' },
  { label: 'Solicitudes reprogramación', icon: '🔄', screen: 'GestionSolicitudesReprogramacion' },
  { label: 'Notificaciones', icon: '🔔', screen: 'HistorialNotificaciones' },
];

const MainScreenWithMenu = ({ navigation }) => {
  const [seccion, setSeccion] = useState('Dashboard');
  const [menuVisible, setMenuVisible] = useState(false);
  const { userData, userRole } = useAuth();

  const esDoctor = userRole === 'Doctor' || userRole === 'doctor';
  const esAdmin = userRole === 'Admin' || userRole === 'admin' || userRole === 'administrador';
  const doctorId = esDoctor ? userData?.id_doctor : null;
  const { conversaciones, refresh: refreshConversaciones } = useConversacionesDoctor(doctorId);

  const totalMensajesNoLeidos = useMemo(() => {
    if (!esDoctor || !conversaciones || conversaciones.length === 0) return 0;
    return conversaciones.reduce((total, conv) => total + (Number(conv.mensajes_no_leidos) || 0), 0);
  }, [conversaciones, esDoctor]);

  useFocusEffect(
    React.useCallback(() => {
      if (esDoctor && doctorId) refreshConversaciones();
    }, [esDoctor, doctorId, refreshConversaciones])
  );

  const titulo = SECCIONES.find(s => s.key === seccion)?.label || 'Dashboard';
  const labelMensajes = totalMensajesNoLeidos > 0 ? `Mensajes (${totalMensajesNoLeidos})` : 'Mensajes';
  const accesosRapidos = esAdmin ? ACCESOS_RAPIDOS_ADMIN : (esDoctor ? ACCESOS_RAPIDOS_DOCTOR : []);

  const elegirSeccion = (key) => {
    setSeccion(key);
    setMenuVisible(false);
  };

  const navegarAccesoRapido = (screenName) => {
    setMenuVisible(false);
    navigation.navigate(screenName);
  };

  return (
    <View style={styles.mainContainer}>
      {/* Header con botón hamburguesa */}
      <View style={styles.mainHeader}>
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          style={styles.hamburgerButton}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.hamburgerIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.mainHeaderTitle} numberOfLines={1}>{titulo}</Text>
      </View>

      {/* Contenido según sección */}
      <View style={styles.mainContent}>
        {seccion === 'Dashboard' && <DashboardSelector navigation={navigation} />}
        {seccion === 'Gestion' && <GestionScreen navigation={navigation} />}
        {seccion === 'Mensajes' && <MensajesScreen navigation={navigation} onBackFromSection={() => setSeccion('Dashboard')} />}
        {seccion === 'Perfil' && <PerfilScreen navigation={navigation} />}
      </View>

      {/* Modal: menú lateral (hamburguesa) */}
      <Modal visible={menuVisible} transparent animationType="fade">
        <View style={styles.menuOverlay}>
          <View style={styles.menuPanel}>
            <ScrollView style={styles.menuPanelScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.menuPanelTitle}>Menú</Text>
              {SECCIONES.map(({ key, label, icon }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.menuItem, seccion === key && styles.menuItemActive]}
                  onPress={() => elegirSeccion(key)}
                >
                  <Text style={styles.menuItemIcon}>{icon}</Text>
                  <Text style={[styles.menuItemLabel, seccion === key && styles.menuItemLabelActive]}>
                    {key === 'Mensajes' ? labelMensajes : label}
                  </Text>
                </TouchableOpacity>
              ))}

              {accesosRapidos.length > 0 && (
                <>
                  <View style={styles.menuDivider} />
                  <Text style={styles.menuSectionTitle}>Accesos Rápidos</Text>
                  {accesosRapidos.map(({ label, icon, screen }) => (
                    <TouchableOpacity
                      key={screen}
                      style={styles.menuQuickItem}
                      onPress={() => navegarAccesoRapido(screen)}
                    >
                      <Text style={styles.menuQuickIcon}>{icon}</Text>
                      <Text style={styles.menuQuickLabel} numberOfLines={1}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
          <Pressable style={styles.menuBackdrop} onPress={() => setMenuVisible(false)} />
        </View>
      </Modal>
    </View>
  );
};

// Stack Navigator principal
const Stack = createStackNavigator();

const NavegacionProfesional = () => {
  Logger.info('NavegacionProfesional cargada');
  
  return (
    <>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          headerBackVisible: true,
          gestureEnabled: true,
        }}
      >
      <Stack.Screen name="MainTabs" component={MainScreenWithMenu} />
      <Stack.Screen 
        name="DetalleDoctor" 
        component={DetalleDoctor}
        options={{
          headerShown: true,
          title: 'Detalle del Doctor',
          headerStyle: {
            backgroundColor: COLORES.NAV_PRIMARIO,
          },
          headerTintColor: COLORES.TEXTO_EN_PRIMARIO,
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
            backgroundColor: COLORES.NAV_PRIMARIO,
          },
          headerTintColor: COLORES.TEXTO_EN_PRIMARIO,
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
        name="GestionInstituciones" 
        component={GestionInstituciones}
        options={{
          headerShown: false,
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
            backgroundColor: COLORES.NAV_PRIMARIO,
          },
          headerTintColor: COLORES.TEXTO_EN_PRIMARIO,
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
            backgroundColor: COLORES.NAV_PRIMARIO,
          },
          headerTintColor: COLORES.TEXTO_EN_PRIMARIO,
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
  mainContainer: {
    flex: 1,
    backgroundColor: COLORES.FONDO,
  },
  mainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORES.NAV_PRIMARIO,
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  hamburgerButton: {
    padding: 8,
    marginRight: 12,
  },
  hamburgerIcon: {
    fontSize: 28,
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontWeight: 'bold',
  },
  mainHeaderTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.TEXTO_EN_PRIMARIO,
  },
  mainContent: {
    flex: 1,
  },
  menuOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  menuPanel: {
    width: 280,
    backgroundColor: COLORES.FONDO_CARD || '#fff',
    paddingTop: 20,
    paddingHorizontal: 16,
    alignSelf: 'stretch',
  },
  menuPanelScroll: {
    flexGrow: 1,
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORES.BORDE_CLARO || '#eee',
    marginVertical: 12,
  },
  menuSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.TEXTO_SECUNDARIO || '#666',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  menuQuickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 2,
  },
  menuQuickIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  menuQuickLabel: {
    flex: 1,
    fontSize: 14,
    color: COLORES.TEXTO_PRIMARIO || '#333',
  },
  menuPanelTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORES.NAV_PRIMARIO,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  menuItemActive: {
    backgroundColor: COLORES.NAV_PRIMARIO,
  },
  menuItemIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORES.TEXTO_SECUNDARIO || '#333',
  },
  menuItemLabelActive: {
    color: COLORES.TEXTO_EN_PRIMARIO,
  },
  container: {
    flex: 1,
    backgroundColor: COLORES.FONDO,
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
    color: COLORES.NAV_PRIMARIO,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: COLORES.TEXTO_SECUNDARIO,
    marginBottom: 20,
    textAlign: 'center',
  },
  userInfoCard: {
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: COLORES.NEGRO,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userInfoLabel: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    marginTop: 8,
    marginBottom: 4,
  },
  userInfoValue: {
    fontSize: 16,
    color: COLORES.TEXTO_PRIMARIO,
    fontWeight: '500',
  },
  section: {
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: COLORES.NEGRO,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORES.NAV_PRIMARIO,
    marginBottom: 16,
  },
  securityButton: {
    backgroundColor: COLORES.FONDO,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORES.SECUNDARIO_LIGHT,
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
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 4,
  },
  securityButtonDescription: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
  },
  securityButtonArrow: {
    fontSize: 20,
    color: COLORES.NAV_PRIMARIO,
    fontWeight: 'bold',
  },
  message: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  logoutButton: {
    backgroundColor: COLORES.ERROR_LIGHT,
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginTop: 20,
    alignSelf: 'center',
  },
  logoutText: {
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontSize: 18,
    fontWeight: '600',
  },
});

export default NavegacionProfesional;

