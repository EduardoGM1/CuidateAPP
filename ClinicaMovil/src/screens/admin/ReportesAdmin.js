/**
 * Pantalla: Reportes y Estadísticas del Administrador
 * 
 * Muestra estadísticas y reportes del administrador sobre todos los pacientes y doctores.
 * Incluye gráficos de evolución, estadísticas de citas y comorbilidades más frecuentes.
 * 
 * @author Senior Developer
 * @date 2026-01-20
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Title, Button } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import Logger from '../../services/logger';
import { useAdminDashboard } from '../../hooks/useDashboard';
import { usePacientes, useDoctores, useModulos } from '../../hooks/useGestion';
import gestionService from '../../api/gestionService';
import ModalBase from '../../components/DetallePaciente/shared/ModalBase';
import RangoMesesSelector from '../../components/forms/RangoMesesSelector';
import { COLORES } from '../../utils/constantes';
import ComorbilidadesHeatmap from '../../components/charts/ComorbilidadesHeatmap';

const ReportesAdmin = ({ navigation }) => {
  const { userData, userRole } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [estadisticas, setEstadisticas] = useState(null);
  const [loadingEstadisticas, setLoadingEstadisticas] = useState(true);
  const [showFiltroModal, setShowFiltroModal] = useState(false);
  // Filtro por módulo (reemplaza filtro por estado)
  const [moduloFiltro, setModuloFiltro] = useState(null);
  const [moduloFiltroTemporal, setModuloFiltroTemporal] = useState(null);
  const [showModuloDropdown, setShowModuloDropdown] = useState(false);
  const [periodoFiltro, setPeriodoFiltro] = useState(null);
  const [periodoFiltroTemporal, setPeriodoFiltroTemporal] = useState(null);
  const [rangoMesesFiltro, setRangoMesesFiltro] = useState(null);
  const [rangoMesesFiltroTemporal, setRangoMesesFiltroTemporal] = useState({
    mesInicio: null,
    mesFin: null,
    año: new Date().getFullYear(),
  });
  const [comorbilidadesMasFrecuentes, setComorbilidadesMasFrecuentes] = useState([]);
  const [comorbilidadesPorPeriodo, setComorbilidadesPorPeriodo] = useState(null);
  
  // Estadísticas Fase 1
  const [estadisticasFase1, setEstadisticasFase1] = useState({
    pacientesPorDoctor: [],
    citasPorEstado: {},
    topDoctoresActivos: [],
    citasPorDiaSemana: [],
    distribucionEdad: {},
    distribucionGenero: {}
  });
  const [citas, setCitas] = useState([]);
  const [loadingCitas, setLoadingCitas] = useState(false);

  // Validar que solo administradores puedan acceder
  useEffect(() => {
    if (userRole !== 'Admin' && userRole !== 'admin' && userRole !== 'administrador') {
      Logger.warn('Acceso no autorizado a ReportesAdmin', { userRole });
      navigation.navigate('MainTabs', { screen: 'Dashboard' });
    }
  }, [userRole, navigation]);

  // Hook para datos del dashboard del administrador
  const { 
    metrics, 
    chartData,
    pacientesNuevosData,
    loading: dashboardLoading, 
    refresh: refreshDashboard 
  } = useAdminDashboard();

  // Hook para pacientes (todos los pacientes, sin filtrar por doctor)
  const { 
    pacientes, 
    loading: pacientesLoading,
    refresh: refreshPacientes 
  } = usePacientes('todos', 'recent', 'todas');

  // Hook para doctores
  const {
    doctores,
    loading: doctoresLoading,
    refresh: refreshDoctores
  } = useDoctores('activos', 'recent');

  // Hook para módulos
  const { modulos, fetchModulos } = useModulos();

  // Cargar módulos al montar el componente
  useEffect(() => {
    fetchModulos();
  }, [fetchModulos]);

  // Cargar citas para estadísticas
  const loadCitas = useCallback(async () => {
    try {
      setLoadingCitas(true);
      Logger.info('ReportesAdmin: Cargando citas para estadísticas');
      
      // Obtener citas de los últimos 6 meses para análisis
      const fechaDesde = new Date();
      fechaDesde.setMonth(fechaDesde.getMonth() - 6);
      fechaDesde.setHours(0, 0, 0, 0);
      
      // Reducir el límite para evitar timeouts y usar paginación si es necesario
      const response = await gestionService.getAllCitas({
        fecha_desde: fechaDesde.toISOString().split('T')[0],
        limit: 500 // Reducido de 1000 a 500 para evitar timeouts
      });
      
      const citasData = response?.citas || response?.data || [];
      setCitas(Array.isArray(citasData) ? citasData : []);
      Logger.info('ReportesAdmin: Citas cargadas', { count: citasData.length });
    } catch (error) {
      Logger.error('ReportesAdmin: Error cargando citas', error);
      // Si hay error, intentar cargar sin filtro de fecha (solo últimas citas)
      try {
        Logger.info('ReportesAdmin: Intentando cargar citas sin filtro de fecha');
        const responseFallback = await gestionService.getAllCitas({
          limit: 200 // Límite más pequeño como fallback
        });
        const citasFallback = responseFallback?.citas || responseFallback?.data || [];
        setCitas(Array.isArray(citasFallback) ? citasFallback : []);
        Logger.info('ReportesAdmin: Citas cargadas (fallback)', { count: citasFallback.length });
      } catch (fallbackError) {
        Logger.error('ReportesAdmin: Error en fallback de carga de citas', fallbackError);
        setCitas([]);
      }
    } finally {
      setLoadingCitas(false);
    }
  }, []);

  // Calcular estadísticas Fase 1
  const calcularEstadisticasFase1 = useCallback(() => {
    try {
      Logger.info('ReportesAdmin: Calculando estadísticas Fase 1');
      
      // 1. Distribución de pacientes por doctor
      const pacientesPorDoctorMap = {};
      const doctoresMap = {};
      
      doctores?.forEach(doctor => {
        doctoresMap[doctor.id_doctor] = `${doctor.nombre} ${doctor.apellido_paterno || ''}`.trim();
        pacientesPorDoctorMap[doctor.id_doctor] = 0;
      });
      
      pacientes?.forEach(paciente => {
        if (paciente.id_doctor) {
          pacientesPorDoctorMap[paciente.id_doctor] = (pacientesPorDoctorMap[paciente.id_doctor] || 0) + 1;
        }
      });
      
      const pacientesPorDoctor = Object.entries(pacientesPorDoctorMap)
        .map(([idDoctor, count]) => ({
          idDoctor: parseInt(idDoctor),
          nombre: doctoresMap[idDoctor] || `Doctor ${idDoctor}`,
          cantidad: count
        }))
        .sort((a, b) => b.cantidad - a.cantidad);
      
      // 2. Citas por estado (mensual - último mes)
      const ultimoMes = new Date();
      ultimoMes.setMonth(ultimoMes.getMonth() - 1);
      ultimoMes.setHours(0, 0, 0, 0);
      
      const citasUltimoMes = citas.filter(cita => {
        const fechaCita = new Date(cita.fecha_cita);
        return fechaCita >= ultimoMes;
      });
      
      const citasPorEstado = citasUltimoMes.reduce((acc, cita) => {
        const estado = cita.estado || 'pendiente';
        acc[estado] = (acc[estado] || 0) + 1;
        return acc;
      }, {});
      
      // 3. Top 5 doctores más activos (por citas atendidas)
      const citasPorDoctorMap = {};
      citas.forEach(cita => {
        if (cita.id_doctor && (cita.estado === 'atendida' || cita.asistencia === true)) {
          citasPorDoctorMap[cita.id_doctor] = (citasPorDoctorMap[cita.id_doctor] || 0) + 1;
        }
      });
      
      const topDoctoresActivos = Object.entries(citasPorDoctorMap)
        .map(([idDoctor, count]) => ({
          idDoctor: parseInt(idDoctor),
          nombre: doctoresMap[idDoctor] || `Doctor ${idDoctor}`,
          citasAtendidas: count
        }))
        .sort((a, b) => b.citasAtendidas - a.citasAtendidas)
        .slice(0, 5);
      
      // 4. Citas por día de la semana
      const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const citasPorDiaSemanaMap = {};
      diasSemana.forEach(dia => citasPorDiaSemanaMap[dia] = 0);
      
      citas.forEach(cita => {
        if (cita.fecha_cita) {
          const fecha = new Date(cita.fecha_cita);
          const dia = diasSemana[fecha.getDay()];
          citasPorDiaSemanaMap[dia] = (citasPorDiaSemanaMap[dia] || 0) + 1;
        }
      });
      
      // Ordenar por día de semana (Lunes a Domingo)
      const ordenDias = [1, 2, 3, 4, 5, 6, 0]; // Lunes=1, Domingo=0
      const citasPorDiaSemana = ordenDias.map(dayIndex => ({
        dia: diasSemana[dayIndex],
        citas: citasPorDiaSemanaMap[diasSemana[dayIndex]] || 0
      }));
      
      // 5. Distribución por edad
      const rangosEdad = {
        '0-18': 0,
        '19-35': 0,
        '36-50': 0,
        '51-65': 0,
        '65+': 0
      };
      
      pacientes?.forEach(paciente => {
        if (paciente.fecha_nacimiento) {
          const fechaNac = new Date(paciente.fecha_nacimiento);
          const hoy = new Date();
          const edad = hoy.getFullYear() - fechaNac.getFullYear();
          const mes = hoy.getMonth() - fechaNac.getMonth();
          const edadReal = mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate()) ? edad - 1 : edad;
          
          if (edadReal <= 18) rangosEdad['0-18']++;
          else if (edadReal <= 35) rangosEdad['19-35']++;
          else if (edadReal <= 50) rangosEdad['36-50']++;
          else if (edadReal <= 65) rangosEdad['51-65']++;
          else rangosEdad['65+']++;
        }
      });
      
      const distribucionEdad = Object.entries(rangosEdad).map(([rango, cantidad]) => ({
        rango,
        cantidad
      }));
      
      // 6. Distribución por género
      const distribucionGenero = pacientes?.reduce((acc, paciente) => {
        const genero = paciente.genero || paciente.sexo || 'No especificado';
        acc[genero] = (acc[genero] || 0) + 1;
        return acc;
      }, {}) || {};
      
      const distribucionGeneroArray = Object.entries(distribucionGenero).map(([genero, cantidad]) => ({
        genero,
        cantidad
      }));
      
      setEstadisticasFase1({
        pacientesPorDoctor,
        citasPorEstado,
        topDoctoresActivos,
        citasPorDiaSemana,
        distribucionEdad,
        distribucionGenero: distribucionGeneroArray
      });
      
      Logger.info('ReportesAdmin: Estadísticas Fase 1 calculadas exitosamente');
    } catch (error) {
      Logger.error('ReportesAdmin: Error calculando estadísticas Fase 1', error);
    }
  }, [pacientes, doctores, citas]);

  // Cargar comorbilidades más frecuentes (filtrado por módulo)
  const loadComorbilidades = useCallback(async () => {
    try {
      Logger.info('ReportesAdmin: Cargando comorbilidades', { moduloFiltro });
      const response = await gestionService.getComorbilidades();
      if (response && Array.isArray(response)) {
        // Filtrar pacientes por módulo si hay filtro activo
        let pacientesFiltrados = pacientes || [];
        if (moduloFiltro) {
          pacientesFiltrados = pacientesFiltrados.filter(paciente => {
            // Verificar si el paciente pertenece al módulo seleccionado
            return paciente.id_modulo === moduloFiltro || 
                   paciente.modulo?.id_modulo === moduloFiltro;
          });
        }
        
        // Contar frecuencia de comorbilidades en pacientes filtrados
        const frecuencia = {};
        pacientesFiltrados.forEach(paciente => {
          if (paciente.comorbilidades && Array.isArray(paciente.comorbilidades)) {
            paciente.comorbilidades.forEach(comorb => {
              const nombre = comorb.nombre || comorb.nombre_comorbilidad || comorb;
              frecuencia[nombre] = (frecuencia[nombre] || 0) + 1;
            });
          }
        });
        
        const comorbilidadesOrdenadas = Object.entries(frecuencia)
          .map(([nombre, frecuencia]) => ({ nombre, frecuencia }))
          .sort((a, b) => b.frecuencia - a.frecuencia)
          .slice(0, 10);
        
        setComorbilidadesMasFrecuentes(comorbilidadesOrdenadas);
        Logger.info('ReportesAdmin: Comorbilidades cargadas', { 
          total: comorbilidadesOrdenadas.length,
          moduloFiltro,
          pacientesFiltrados: pacientesFiltrados.length
        });
      }
    } catch (error) {
      Logger.error('ReportesAdmin: Error cargando comorbilidades', error);
      // Si falla, usar array vacío en lugar de dejar undefined
      setComorbilidadesMasFrecuentes([]);
    }
  }, [pacientes, moduloFiltro]);

  // Cargar estadísticas adicionales
  const loadEstadisticas = useCallback(async () => {
    try {
      setLoadingEstadisticas(true);
      Logger.info('ReportesAdmin: Cargando estadísticas adicionales');

      // Calcular estadísticas desde los datos disponibles
      const totalPacientes = pacientes?.length || 0;
      const pacientesActivos = pacientes?.filter(p => p.activo)?.length || 0;
      const citasHoy = metrics?.citasHoy?.total || 0;
      const totalDoctores = metrics?.totalDoctores || 0;

      setEstadisticas({
        totalPacientes,
        pacientesActivos,
        citasHoy,
        totalDoctores,
        tasaActivos: totalPacientes > 0 ? ((pacientesActivos / totalPacientes) * 100).toFixed(1) : 0
      });
    } catch (error) {
      Logger.error('ReportesAdmin: Error cargando estadísticas', error);
    } finally {
      setLoadingEstadisticas(false);
    }
  }, [pacientes, metrics]);

  useEffect(() => {
    // Cargar datos de forma secuencial para evitar sobrecarga de red
    const loadDataSequentially = async () => {
      try {
        // Primero cargar estadísticas (usa datos del dashboard que ya están cargados)
        await loadEstadisticas();
        
        // Esperar un poco antes de la siguiente petición
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Luego cargar comorbilidades
        await loadComorbilidades();
        
        // Esperar un poco antes de la siguiente petición
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Finalmente cargar citas (la más pesada)
        await loadCitas();
      } catch (error) {
        Logger.error('ReportesAdmin: Error cargando datos secuencialmente', error);
      }
    };
    
    loadDataSequentially();
  }, [loadEstadisticas, loadComorbilidades, loadCitas]);

  // Recargar comorbilidades cuando cambia el filtro de módulo
  useEffect(() => {
    if (pacientes && pacientes.length > 0) {
      loadComorbilidades();
    }
  }, [moduloFiltro, loadComorbilidades, pacientes]);

  useEffect(() => {
    // Calcular estadísticas cuando tengamos datos suficientes
    // No requerir citas.length > 0 para permitir cálculo parcial
    if (pacientes && pacientes.length > 0) {
      // Si no hay doctores o citas, calcular con lo que tenemos
      if (doctores && doctores.length > 0) {
        calcularEstadisticasFase1();
      } else {
        Logger.warn('ReportesAdmin: Esperando datos de doctores para calcular estadísticas');
      }
    } else {
      Logger.warn('ReportesAdmin: Esperando datos de pacientes para calcular estadísticas');
    }
  }, [pacientes, doctores, citas, calcularEstadisticasFase1]);

  // Función para refrescar datos
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshDashboard(),
        refreshPacientes(),
        refreshDoctores(),
        loadEstadisticas(),
        loadComorbilidades(),
        loadCitas()
      ]);
      Logger.info('ReportesAdmin: Datos refrescados exitosamente');
    } catch (error) {
      Logger.error('Error refrescando datos', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshDashboard, refreshPacientes, refreshDoctores, loadEstadisticas, loadComorbilidades, loadCitas]);

  // Renderizar gráfico simple de barras
  const renderChartCard = (title, data, dataKey = 'citas') => {
    if (!data || data.length === 0) {
      return (
        <Card style={styles.chartCard}>
          <Card.Content>
            <Title style={styles.chartTitle}>{title}</Title>
            <Text style={styles.noDataText}>No hay datos disponibles</Text>
          </Card.Content>
        </Card>
      );
    }

    const maxValue = Math.max(...data.map(item => item[dataKey]), 1);
    
    return (
      <Card style={styles.chartCard}>
        <Card.Content>
          <Title style={styles.chartTitle}>{title}</Title>
          <View style={styles.chartContainer}>
            <View style={styles.chartBars}>
              {data.map((item, index) => {
                const barHeight = (item[dataKey] / maxValue) * 80;
                return (
                  <View key={index} style={styles.barContainer}>
                    <Text style={styles.barValue}>{item[dataKey]}</Text>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: barHeight,
                          backgroundColor: '#4CAF50',
                        },
                      ]}
                    />
                    <Text style={styles.barLabel}>{item.dia}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  // Renderizar gráfico de comorbilidades por periodo (Heatmap)
  const renderComorbilidadesPorPeriodo = (title, datosPorPeriodo, showFilterButton = false) => {
    if (!datosPorPeriodo || !Array.isArray(datosPorPeriodo) || datosPorPeriodo.length === 0) {
      return (
        <Card style={styles.chartCard}>
          <Card.Content>
            <View style={styles.chartHeader}>
              <Title 
                style={[styles.chartTitle, styles.chartTitleInHeader]} 
                numberOfLines={2}
              >
                {title}
              </Title>
              {showFilterButton && (
                <TouchableOpacity
                  style={[styles.filterButton, (moduloFiltro || periodoFiltro || rangoMesesFiltro) && styles.filterButtonActive]}
                  onPress={() => {
                    setModuloFiltroTemporal(moduloFiltro);
                    setPeriodoFiltroTemporal(periodoFiltro);
                    setRangoMesesFiltroTemporal(rangoMesesFiltro || {
                      mesInicio: null,
                      mesFin: null,
                      año: new Date().getFullYear(),
                    });
                    setShowFiltroModal(true);
                  }}
                >
                  <Text style={styles.filterButtonText}>🔍</Text>
                  {(moduloFiltro || periodoFiltro || rangoMesesFiltro) && (
                    <View style={styles.filterBadge}>
                      <Text style={styles.filterBadgeText}>
                        {(moduloFiltro ? 1 : 0) + (periodoFiltro ? 1 : 0) + (rangoMesesFiltro ? 1 : 0)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.noDataText}>No hay datos disponibles</Text>
          </Card.Content>
        </Card>
      );
    }

    // Construir título con filtros
    let tituloCompleto = title;
    if (moduloFiltro) {
      const moduloNombre = modulos.find(m => m.id_modulo === moduloFiltro)?.nombre_modulo || 'Módulo';
      tituloCompleto += ` - ${moduloNombre}`;
    }
    if (periodoFiltro) {
      const periodoLabels = {
        'semestre': 'Semestral',
        'anual': 'Anual',
        'mensual': 'Mensual'
      };
      tituloCompleto += ` (${periodoLabels[periodoFiltro] || periodoFiltro})`;
    }

    return (
      <Card style={styles.chartCard}>
        <Card.Content>
          <View style={styles.chartHeader}>
            <Title 
              style={[styles.chartTitle, styles.chartTitleInHeader]} 
              numberOfLines={2}
            >
              {tituloCompleto}
            </Title>
            {showFilterButton && (
              <TouchableOpacity
                style={[styles.filterButton, (moduloFiltro || periodoFiltro || rangoMesesFiltro) && styles.filterButtonActive]}
                onPress={() => {
                  setModuloFiltroTemporal(moduloFiltro);
                  setPeriodoFiltroTemporal(periodoFiltro);
                  setRangoMesesFiltroTemporal(rangoMesesFiltro || {
                    mesInicio: null,
                    mesFin: null,
                    año: new Date().getFullYear(),
                  });
                  setShowFiltroModal(true);
                }}
              >
                <Text style={styles.filterButtonText}>🔍</Text>
                {(moduloFiltro || periodoFiltro || rangoMesesFiltro) && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>
                      {(moduloFiltro ? 1 : 0) + (periodoFiltro ? 1 : 0) + (rangoMesesFiltro ? 1 : 0)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
          
          {/* Heatmap de Comorbilidades */}
          <ComorbilidadesHeatmap 
            datosPorPeriodo={datosPorPeriodo}
            periodoFiltro={periodoFiltro}
          />
        </Card.Content>
      </Card>
    );
  };

  // Renderizar gráfico de barras horizontales
  const renderHorizontalBarChart = (title, data, dataKey = 'frecuencia', labelKey = 'nombre', showFilterButton = false) => {
    if (!data || data.length === 0) {
      return (
        <Card style={styles.chartCard}>
          <Card.Content>
            <View style={styles.chartHeader}>
              <Title 
                style={[styles.chartTitle, styles.chartTitleInHeader]} 
                numberOfLines={2}
              >
                {title}
              </Title>
            {showFilterButton && (
              <TouchableOpacity
                style={[styles.filterButton, (moduloFiltro || periodoFiltro || rangoMesesFiltro) && styles.filterButtonActive]}
                onPress={() => {
                  setModuloFiltroTemporal(moduloFiltro);
                  setPeriodoFiltroTemporal(periodoFiltro);
                  setRangoMesesFiltroTemporal(rangoMesesFiltro || {
                    mesInicio: null,
                    mesFin: null,
                    año: new Date().getFullYear(),
                  });
                  setShowFiltroModal(true);
                }}
              >
                <Text style={styles.filterButtonText}>🔍</Text>
                {(moduloFiltro || periodoFiltro) && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>
                      {(moduloFiltro ? 1 : 0) + (periodoFiltro ? 1 : 0) + (rangoMesesFiltro ? 1 : 0)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
            <Text style={styles.noDataText}>No hay datos disponibles</Text>
          </Card.Content>
        </Card>
      );
    }

    const maxValue = Math.max(...data.map(item => item[dataKey]), 1);
    
    return (
      <Card style={styles.chartCard}>
        <Card.Content>
          <View style={styles.chartHeader}>
            <Title 
              style={[styles.chartTitle, styles.chartTitleInHeader]} 
              numberOfLines={2}
            >
              {moduloFiltro 
                ? `${title} - ${modulos.find(m => m.id_modulo === moduloFiltro)?.nombre_modulo || 'Módulo'}` 
                : title}
            </Title>
            {showFilterButton && (
              <TouchableOpacity
                style={[styles.filterButton, (moduloFiltro || periodoFiltro || rangoMesesFiltro) && styles.filterButtonActive]}
                onPress={() => {
                  setModuloFiltroTemporal(moduloFiltro);
                  setPeriodoFiltroTemporal(periodoFiltro);
                  setRangoMesesFiltroTemporal(rangoMesesFiltro || {
                    mesInicio: null,
                    mesFin: null,
                    año: new Date().getFullYear(),
                  });
                  setShowFiltroModal(true);
                }}
              >
                <Text style={styles.filterButtonText}>🔍</Text>
                {(moduloFiltro || periodoFiltro) && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>
                      {(moduloFiltro ? 1 : 0) + (periodoFiltro ? 1 : 0) + (rangoMesesFiltro ? 1 : 0)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.horizontalChartContainer}>
            {data.map((item, index) => {
              const barWidth = (item[dataKey] / maxValue) * 100;
              return (
                <View key={index} style={styles.horizontalBarItem}>
                  <View style={styles.horizontalBarLabelContainer}>
                    <Text style={styles.horizontalBarLabel} numberOfLines={1}>
                      {item[labelKey]}
                    </Text>
                    <Text style={styles.horizontalBarValue}>{item[dataKey]}</Text>
                  </View>
                  <View style={styles.horizontalBarContainer}>
                    <View
                      style={[
                        styles.horizontalBar,
                        {
                          width: `${barWidth}%`,
                          backgroundColor: '#2196F3',
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </Card.Content>
      </Card>
    );
  };

  // Función para manejar aplicar filtros
  const handleAplicarFiltros = useCallback(() => {
    setModuloFiltro(moduloFiltroTemporal);
    setPeriodoFiltro(periodoFiltroTemporal);
    
    // Si el periodo es mensual, validar y establecer rango de meses
    let rangoMesesAplicar = null;
    if (periodoFiltroTemporal === 'mensual') {
      if (rangoMesesFiltroTemporal.mesInicio && rangoMesesFiltroTemporal.mesFin && rangoMesesFiltroTemporal.año) {
        if (rangoMesesFiltroTemporal.mesFin >= rangoMesesFiltroTemporal.mesInicio) {
          rangoMesesAplicar = { ...rangoMesesFiltroTemporal };
        } else {
          Logger.warn('Rango de meses inválido: mes final debe ser >= mes inicial');
          return;
        }
      } else {
        Logger.warn('Rango de meses incompleto');
        return;
      }
    }
    
    setRangoMesesFiltro(rangoMesesAplicar);
    setShowFiltroModal(false);
    setShowModuloDropdown(false);
  }, [moduloFiltroTemporal, periodoFiltroTemporal, rangoMesesFiltroTemporal]);

  // Función para limpiar filtros
  const handleLimpiarFiltros = useCallback(() => {
    setModuloFiltroTemporal(null);
    setPeriodoFiltroTemporal(null);
    setRangoMesesFiltroTemporal({
      mesInicio: null,
      mesFin: null,
      año: new Date().getFullYear(),
    });
    setModuloFiltro(null);
    setPeriodoFiltro(null);
    setRangoMesesFiltro(null);
    setShowFiltroModal(false);
    setShowModuloDropdown(false);
  }, []);

  // Función para cerrar modal sin aplicar
  const handleCerrarModal = useCallback(() => {
    setModuloFiltroTemporal(moduloFiltro);
    setPeriodoFiltroTemporal(periodoFiltro);
    setRangoMesesFiltroTemporal(rangoMesesFiltro || {
      mesInicio: null,
      mesFin: null,
      año: new Date().getFullYear(),
    });
    setShowFiltroModal(false);
  }, [moduloFiltro, periodoFiltro, rangoMesesFiltro]);

  // Renderizar card de estadística
  const renderStatCard = (title, value, subtitle, color = '#1976D2') => (
    <Card style={[styles.statCard, { borderLeftColor: color }]}>
      <Card.Content style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </Card.Content>
    </Card>
  );

  // Renderizar gráfico de pie chart simple
  const renderPieChart = (title, data) => {
    if (!data || Object.keys(data).length === 0) {
      return (
        <Card style={styles.chartCard}>
          <Card.Content>
            <Title style={styles.chartTitle}>{title}</Title>
            <Text style={styles.noDataText}>No hay datos disponibles</Text>
          </Card.Content>
        </Card>
      );
    }

    const total = Object.values(data).reduce((sum, val) => sum + val, 0);
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#9C27B0', '#00BCD4'];
    const entries = Object.entries(data).map(([key, value], index) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      value,
      percentage: total > 0 ? ((value / total) * 100).toFixed(1) : 0,
      color: colors[index % colors.length]
    }));

    return (
      <Card style={styles.chartCard}>
        <Card.Content>
          <Title style={styles.chartTitle}>{title}</Title>
          <View style={styles.pieChartContainer}>
            {entries.map((item, index) => (
              <View key={index} style={styles.pieChartItem}>
                <View style={[styles.pieChartColor, { backgroundColor: item.color }]} />
                <View style={styles.pieChartInfo}>
                  <Text style={styles.pieChartLabel}>{item.label}</Text>
                  <Text style={styles.pieChartValue}>
                    {item.value} ({item.percentage}%)
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </Card.Content>
      </Card>
    );
  };

  // Renderizar gráfico de barras horizontales simple (para estadísticas Fase 1)
  const renderHorizontalBarChartSimple = (title, data, valueKey, labelKey, showNumbers = true) => {
    if (!data || data.length === 0) {
      return (
        <Card style={styles.chartCard}>
          <Card.Content>
            <Title style={styles.chartTitle}>{title}</Title>
            <Text style={styles.noDataText}>No hay datos disponibles</Text>
          </Card.Content>
        </Card>
      );
    }

    const maxValue = Math.max(...data.map(item => item[valueKey] || 0));

    return (
      <Card style={styles.chartCard}>
        <Card.Content>
          <Title style={styles.chartTitle}>{title}</Title>
          <View style={styles.horizontalBarContainer}>
            {data.map((item, index) => {
              const value = item[valueKey] || 0;
              const label = item[labelKey] || 'N/A';
              const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
              
              return (
                <View key={index} style={styles.horizontalBarItem}>
                  <View style={styles.horizontalBarLabelContainer}>
                    <Text style={styles.horizontalBarLabel} numberOfLines={1}>
                      {label}
                    </Text>
                    {showNumbers && (
                      <Text style={styles.horizontalBarValue}>{value}</Text>
                    )}
                  </View>
                  <View style={styles.horizontalBarTrack}>
                    <View 
                      style={[
                        styles.horizontalBarFill, 
                        { width: `${percentage}%`, backgroundColor: '#2196F3' }
                      ]} 
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </Card.Content>
      </Card>
    );
  };

  // Si no es administrador, no renderizar nada
  if (userRole !== 'Admin' && userRole !== 'admin' && userRole !== 'administrador') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDeniedContainer}>
          <Text style={styles.accessDeniedTitle}>🚫 Acceso Denegado</Text>
          <Text style={styles.accessDeniedMessage}>
            Solo los administradores pueden acceder a esta pantalla.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const loading = dashboardLoading || pacientesLoading || doctoresLoading || loadingEstadisticas || loadingCitas;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#1976D2']}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📊 Reportes y Estadísticas</Text>
          <Text style={styles.headerSubtitle}>Administrador</Text>
        </View>

        {/* Estadísticas Principales */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Resumen General</Text>
          <View style={styles.statsGrid}>
            {renderStatCard(
              'Pacientes Totales',
              estadisticas?.totalPacientes || metrics?.totalPacientes || 0,
              `${estadisticas?.pacientesActivos || 0} activos`,
              '#4CAF50'
            )}
            {renderStatCard(
              'Doctores Activos',
              estadisticas?.totalDoctores || metrics?.totalDoctores || 0,
              'en el sistema',
              '#2196F3'
            )}
            {renderStatCard(
              'Citas Hoy',
              metrics?.citasHoy?.total || 0,
              'programadas',
              '#FF9800'
            )}
            {renderStatCard(
              'Tasa Activos',
              `${estadisticas?.tasaActivos || 0}%`,
              'de pacientes activos',
              '#9C27B0'
            )}
          </View>
        </View>

        {/* Gráfico de Citas */}
        {chartData && chartData.length > 0 && (
          <View style={styles.chartsContainer}>
            {renderChartCard('Citas Últimos 7 Días', chartData)}
          </View>
        )}

        {/* Gráfico de Pacientes Nuevos */}
        {pacientesNuevosData && pacientesNuevosData.length > 0 && (
          <View style={styles.chartsContainer}>
            {renderChartCard('Pacientes Nuevos Últimos 7 Días', pacientesNuevosData, 'pacientes')}
          </View>
        )}

        {/* Estadísticas Fase 1 */}
        <View style={styles.chartsContainer}>
          <Text style={styles.sectionTitle}>📊 Análisis Detallado</Text>
          
          {/* 1. Distribución de Pacientes por Doctor */}
          {estadisticasFase1.pacientesPorDoctor && estadisticasFase1.pacientesPorDoctor.length > 0 && (
            <View style={styles.chartSection}>
              {renderHorizontalBarChartSimple(
                'Distribución de Pacientes por Doctor',
                estadisticasFase1.pacientesPorDoctor,
                'cantidad',
                'nombre',
                true
              )}
            </View>
          )}

          {/* 2. Citas por Estado (Último Mes) */}
          {estadisticasFase1.citasPorEstado && Object.keys(estadisticasFase1.citasPorEstado).length > 0 && (
            <View style={styles.chartSection}>
              {renderPieChart('Citas por Estado (Último Mes)', estadisticasFase1.citasPorEstado)}
            </View>
          )}

          {/* 3. Top 5 Doctores Más Activos */}
          {estadisticasFase1.topDoctoresActivos && estadisticasFase1.topDoctoresActivos.length > 0 && (
            <View style={styles.chartSection}>
              {renderHorizontalBarChartSimple(
                'Top 5 Doctores Más Activos',
                estadisticasFase1.topDoctoresActivos,
                'citasAtendidas',
                'nombre',
                true
              )}
            </View>
          )}

          {/* 4. Citas por Día de la Semana */}
          {estadisticasFase1.citasPorDiaSemana && estadisticasFase1.citasPorDiaSemana.length > 0 && (
            <View style={styles.chartSection}>
              {renderChartCard('Citas por Día de la Semana', estadisticasFase1.citasPorDiaSemana, 'citas')}
            </View>
          )}

          {/* 5. Distribución por Edad */}
          {estadisticasFase1.distribucionEdad && estadisticasFase1.distribucionEdad.length > 0 && (
            <View style={styles.chartSection}>
              {renderHorizontalBarChartSimple(
                'Distribución de Pacientes por Edad',
                estadisticasFase1.distribucionEdad,
                'cantidad',
                'rango',
                true
              )}
            </View>
          )}

          {/* 6. Distribución por Género */}
          {estadisticasFase1.distribucionGenero && estadisticasFase1.distribucionGenero.length > 0 && (
            <View style={styles.chartSection}>
              {renderPieChart('Distribución de Pacientes por Género', 
                estadisticasFase1.distribucionGenero.reduce((acc, item) => {
                  acc[item.genero] = item.cantidad;
                  return acc;
                }, {})
              )}
            </View>
          )}
        </View>

        {/* Gráfico de Comorbilidades */}
        {periodoFiltro && comorbilidadesPorPeriodo?.datos ? (
          <View style={styles.chartsContainer}>
            {renderComorbilidadesPorPeriodo(
              'Comorbilidades Más Frecuentes',
              comorbilidadesPorPeriodo.datos,
              true
            )}
          </View>
        ) : comorbilidadesMasFrecuentes && comorbilidadesMasFrecuentes.length > 0 ? (
          <View style={styles.chartsContainer}>
            {renderHorizontalBarChart(
              'Comorbilidades Más Frecuentes',
              comorbilidadesMasFrecuentes,
              'frecuencia',
              'nombre',
              true
            )}
          </View>
        ) : null}

        {/* Modal de Filtros */}
        <ModalBase
          visible={showFiltroModal}
          title="🔍 Filtros de Comorbilidades"
          onClose={handleCerrarModal}
          allowOutsideClick={false}
        >
          <View style={styles.modalFilterContent}>
            <Text style={styles.modalFilterInfo}>
              Analiza las comorbilidades más frecuentes por módulo
            </Text>
            
            {/* Selector de Módulo */}
            <View style={styles.moduloSelectorContainer}>
              <Text style={styles.moduloSelectorLabel}>Filtrar por Módulo:</Text>
              <TouchableOpacity
                style={styles.moduloDropdownButton}
                onPress={() => setShowModuloDropdown(!showModuloDropdown)}
              >
                <Text style={[
                  styles.moduloDropdownButtonText,
                  !moduloFiltroTemporal && styles.moduloDropdownPlaceholder
                ]}>
                  {moduloFiltroTemporal 
                    ? modulos.find(m => m.id_modulo === moduloFiltroTemporal)?.nombre_modulo || 'Módulo seleccionado'
                    : 'Todos los módulos'}
                </Text>
                <Text style={styles.moduloDropdownArrow}>
                  {showModuloDropdown ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>
              
              {showModuloDropdown && (
                <View style={styles.moduloDropdownList}>
                  <TouchableOpacity
                    style={[
                      styles.moduloDropdownItem,
                      !moduloFiltroTemporal && styles.moduloDropdownItemSelected
                    ]}
                    onPress={() => {
                      setModuloFiltroTemporal(null);
                      setShowModuloDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.moduloDropdownItemText,
                      !moduloFiltroTemporal && styles.moduloDropdownItemTextSelected
                    ]}>
                      📊 Todos los módulos
                    </Text>
                  </TouchableOpacity>
                  {modulos.map((mod) => (
                    <TouchableOpacity
                      key={mod.id_modulo}
                      style={[
                        styles.moduloDropdownItem,
                        moduloFiltroTemporal === mod.id_modulo && styles.moduloDropdownItemSelected
                      ]}
                      onPress={() => {
                        setModuloFiltroTemporal(mod.id_modulo);
                        setShowModuloDropdown(false);
                      }}
                    >
                      <Text style={[
                        styles.moduloDropdownItemText,
                        moduloFiltroTemporal === mod.id_modulo && styles.moduloDropdownItemTextSelected
                      ]}>
                        🏥 {mod.nombre_modulo}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            
            <View style={styles.periodoSelectorContainer}>
              <Text style={styles.periodoSelectorLabel}>Agrupar por Periodo:</Text>
              <View style={styles.periodoSelectorButtons}>
                {['semestre', 'anual', 'mensual'].map((periodo) => (
                  <TouchableOpacity
                    key={periodo}
                    style={[
                      styles.periodoSelectorButton,
                      periodoFiltroTemporal === periodo && styles.periodoSelectorButtonActive
                    ]}
                    onPress={() => {
                      setPeriodoFiltroTemporal(periodoFiltroTemporal === periodo ? null : periodo);
                      if (periodoFiltroTemporal === periodo && periodo === 'mensual') {
                        setRangoMesesFiltroTemporal({
                          mesInicio: null,
                          mesFin: null,
                          año: new Date().getFullYear(),
                        });
                      }
                    }}
                  >
                    <Text style={[
                      styles.periodoSelectorButtonText,
                      periodoFiltroTemporal === periodo && styles.periodoSelectorButtonTextActive
                    ]}>
                      {periodo === 'semestre' ? 'Semestral' : periodo === 'anual' ? 'Anual' : 'Rango de Meses'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            {periodoFiltroTemporal === 'mensual' && (
              <RangoMesesSelector
                label="Seleccionar Rango de Meses"
                mesInicio={rangoMesesFiltroTemporal.mesInicio}
                mesFin={rangoMesesFiltroTemporal.mesFin}
                año={rangoMesesFiltroTemporal.año}
                onMesInicioChange={(mes) => {
                  setRangoMesesFiltroTemporal(prev => ({ ...prev, mesInicio: mes }));
                }}
                onMesFinChange={(mes) => {
                  setRangoMesesFiltroTemporal(prev => ({ ...prev, mesFin: mes }));
                }}
                onAñoChange={(año) => {
                  setRangoMesesFiltroTemporal(prev => ({ ...prev, año }));
                }}
                error={rangoMesesFiltroTemporal.mesInicio && rangoMesesFiltroTemporal.mesFin && 
                       rangoMesesFiltroTemporal.mesFin < rangoMesesFiltroTemporal.mesInicio 
                       ? 'El mes final debe ser mayor o igual al mes inicial' : null}
              />
            )}
            
            <View style={styles.modalFilterButtons}>
              <Button
                mode="outlined"
                onPress={handleLimpiarFiltros}
                style={styles.modalFilterButton}
              >
                Limpiar
              </Button>
              <Button
                mode="contained"
                onPress={handleAplicarFiltros}
                buttonColor={COLORES.NAV_PRIMARIO}
                style={styles.modalFilterButton}
              >
                Aplicar
              </Button>
            </View>
          </View>
        </ModalBase>

        {/* Información Adicional */}
        <View style={styles.infoContainer}>
          <Card style={styles.infoCard}>
            <Card.Content>
              <Title style={styles.infoTitle}>ℹ️ Información</Title>
              <Text style={styles.infoText}>
                • Los reportes muestran datos de todos los pacientes y doctores{'\n'}
                • Los gráficos se actualizan en tiempo real{'\n'}
                • Puedes exportar estos datos para análisis adicionales
              </Text>
            </Card.Content>
          </Card>
        </View>

        {loading && !refreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1976D2" />
            <Text style={styles.loadingText}>Cargando estadísticas...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
  header: {
    padding: 20,
    backgroundColor: '#1976D2',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E3F2FD',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    marginLeft: 5,
  },
  statsContainer: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    marginBottom: 15,
    elevation: 3,
    borderLeftWidth: 4,
  },
  statContent: {
    padding: 15,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  chartsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  chartCard: {
    width: '100%',
    elevation: 3,
    marginBottom: 15,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  chartTitleInHeader: {
    flex: 1,
    flexShrink: 1,
    marginBottom: 0,
    marginRight: 12,
    textAlign: 'left',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 120,
    width: '100%',
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 20,
    borderRadius: 2,
    marginBottom: 5,
  },
  barLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 5,
  },
  barValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 5,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  infoContainer: {
    padding: 20,
    paddingTop: 0,
  },
  infoCard: {
    elevation: 2,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 10,
  },
  accessDeniedMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  horizontalChartContainer: {
    paddingVertical: 10,
  },
  horizontalBarItem: {
    marginBottom: 12,
  },
  horizontalBarLabelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  horizontalBarLabel: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  horizontalBarValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
    minWidth: 30,
    textAlign: 'right',
  },
  horizontalBarContainer: {
    height: 24,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  horizontalBar: {
    height: '100%',
    borderRadius: 4,
  },
  horizontalBarTrack: {
    height: 24,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  horizontalBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  pieChartContainer: {
    paddingVertical: 10,
  },
  pieChartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 4,
  },
  pieChartColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  pieChartInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pieChartLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  pieChartValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
    marginLeft: 8,
  },
  chartSection: {
    marginBottom: 20,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingRight: 0,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    flexShrink: 0,
  },
  filterButtonActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  filterButtonText: {
    fontSize: 18,
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#f44336',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fff',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalFilterContent: {
    padding: 16,
  },
  modalFilterInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  modalFilterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  modalFilterButton: {
    flex: 1,
  },
  periodoSelectorContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  periodoSelectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  periodoSelectorButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  periodoSelectorButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodoSelectorButtonActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  periodoSelectorButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  periodoSelectorButtonTextActive: {
    color: '#2196F3',
    fontWeight: '600',
  },
  // Estilos para selector de módulo
  moduloSelectorContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  moduloSelectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  moduloDropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  moduloDropdownButtonText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  moduloDropdownPlaceholder: {
    color: '#999',
  },
  moduloDropdownArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  moduloDropdownList: {
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    maxHeight: 200,
  },
  moduloDropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  moduloDropdownItemSelected: {
    backgroundColor: '#E3F2FD',
  },
  moduloDropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  moduloDropdownItemTextSelected: {
    color: '#2196F3',
    fontWeight: '600',
  },
});

export default ReportesAdmin;
