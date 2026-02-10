import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORES } from '../../utils/constantes';

/**
 * PatientHeader - Header del paciente con información principal
 * 
 * Muestra avatar, nombre completo, edad, sexo, estado y doctores asignados.
 * OPTIMIZADO: Memoizado con React.memo para evitar re-renders innecesarios
 * 
 * @param {Object} props
 * @param {Object} props.paciente - Objeto con datos del paciente
 * @param {Function} props.calcularEdad - Función para calcular edad
 * @param {Function} props.obtenerDoctorAsignado - Función para obtener doctor (fallback si no hay lista)
 * @param {string[]} [props.nombresDoctoresAsignados] - Lista de nombres de todos los doctores asignados
 * @param {Function} props.formatearFecha - Función para formatear fecha
 */
const PatientHeader = ({ paciente, calcularEdad, obtenerDoctorAsignado, nombresDoctoresAsignados, formatearFecha }) => {
  if (!paciente) return null;

  // Memoizar cálculos costosos
  const iniciales = useMemo(() => 
    `${paciente.nombre?.charAt(0)?.toUpperCase() || ''}${paciente.apellido_paterno?.charAt(0)?.toUpperCase() || ''}`,
    [paciente.nombre, paciente.apellido_paterno]
  );
  
  const nombreCompleto = useMemo(() => 
    `${paciente.nombre} ${paciente.apellido_paterno} ${paciente.apellido_materno || ''}`.trim(),
    [paciente.nombre, paciente.apellido_paterno, paciente.apellido_materno]
  );
  
  const edad = useMemo(() => calcularEdad(paciente.fecha_nacimiento), [paciente.fecha_nacimiento, calcularEdad]);
  
  // Icono según sexo
  const sexoIcon = useMemo(() => 
    paciente.sexo === 'Hombre' ? '👨' : 
    paciente.sexo === 'Mujer' ? '👩' : '👤',
    [paciente.sexo]
  );
  
  // Lista de doctores a mostrar: si viene la lista usarla, si no el fallback de un solo nombre
  const doctoresAMostrar = useMemo(() => {
    if (nombresDoctoresAsignados && nombresDoctoresAsignados.length > 0) {
      return nombresDoctoresAsignados;
    }
    const uno = obtenerDoctorAsignado ? obtenerDoctorAsignado() : '';
    return uno && uno !== 'Sin doctor asignado' ? [uno] : [];
  }, [nombresDoctoresAsignados, obtenerDoctorAsignado]);
  
  const fechaRegistroFormateada = useMemo(() => 
    formatearFecha(paciente.fecha_registro),
    [paciente.fecha_registro, formatearFecha]
  );

  return (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <View style={styles.headerTop}>
          {/* Avatar */}
          <View style={styles.patientAvatar}>
            <Text style={styles.avatarText}>{iniciales}</Text>
          </View>

          {/* Información del paciente */}
          <View style={styles.patientInfo}>
            <Text style={styles.headerTitle}>{nombreCompleto}</Text>
            <Text style={styles.headerSubtitle}>
              {sexoIcon} • {edad} años
            </Text>
            
            {/* Estado activo/inactivo */}
            <View style={styles.statusContainer}>
              <View 
                style={[
                  styles.statusIndicator,
                  { backgroundColor: paciente.activo ? '#4CAF50' : '#F44336' }
                ]} 
              />
              <Text style={styles.statusText}>
                {paciente.activo ? 'Activo' : 'Inactivo'}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Detalles adicionales */}
        <View style={styles.headerDetails}>
          {/* Doctores asignados: todos en una línea separados por coma */}
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>👨‍⚕️</Text>
            <Text style={styles.detailText} numberOfLines={2}>
              {doctoresAMostrar.length === 0
                ? 'Sin doctor asignado'
                : doctoresAMostrar.join(', ')}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>🏥</Text>
            <Text style={styles.detailText}>{paciente.institucion_salud || 'Sin institución'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>📅</Text>
            <Text style={styles.detailText}>
              Registro: {fechaRegistroFormateada}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORES.FONDO_CARD,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORES.BORDE_CLARO,
  },
  headerContent: {
    width: '100%',
  },
  headerTop: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  patientAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORES.PRIMARIO,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  patientInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  headerDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#666666',
    flex: 1,
  },
});

// Función de comparación personalizada para React.memo
const areEqual = (prevProps, nextProps) => {
  const prevNombres = prevProps.nombresDoctoresAsignados;
  const nextNombres = nextProps.nombresDoctoresAsignados;
  const mismosDoctores = (prevNombres?.length ?? 0) === (nextNombres?.length ?? 0) &&
    (!prevNombres?.length || (prevNombres.join('|') === nextNombres?.join('|')));
  return (
    prevProps.paciente?.id_paciente === nextProps.paciente?.id_paciente &&
    prevProps.paciente?.activo === nextProps.paciente?.activo &&
    prevProps.paciente?.nombre === nextProps.paciente?.nombre &&
    prevProps.paciente?.apellido_paterno === nextProps.paciente?.apellido_paterno &&
    prevProps.paciente?.institucion_salud === nextProps.paciente?.institucion_salud &&
    prevProps.paciente?.fecha_registro === nextProps.paciente?.fecha_registro &&
    prevProps.calcularEdad === nextProps.calcularEdad &&
    prevProps.obtenerDoctorAsignado === nextProps.obtenerDoctorAsignado &&
    prevProps.formatearFecha === nextProps.formatearFecha &&
    mismosDoctores
  );
};

export default memo(PatientHeader, areEqual);



