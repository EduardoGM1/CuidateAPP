/**
 * Pantalla: Reportes del Doctor
 * 
 * Muestra estadísticas y reportes del doctor sobre sus pacientes asignados.
 * Incluye gráficos de evolución, estadísticas de citas y diagnósticos más frecuentes.
 * 
 * @author Senior Developer
 * @date 2025-11-16
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
import BackHeader from '../../components/common/BackHeader';
import { Card, Title, Button } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import Logger from '../../services/logger';
import { useDoctorDashboard } from '../../hooks/useDashboard';
import { usePacientes } from '../../hooks/useGestion';
import { useReportesDetalle } from '../../hooks/useReportesDetalle';
import ReportesExportPanel from '../../components/reportes/ReportesExportPanel';
import ModalBase from '../../components/DetallePaciente/shared/ModalBase';
import EstadoSelector from '../../components/forms/EstadoSelector';
import { COLORES, NETWORK_STAGGER } from '../../utils/constantes';
import RangoMesesSelector from '../../components/forms/RangoMesesSelector';
import ComorbilidadesHeatmap from '../../components/charts/ComorbilidadesHeatmap';

const ReportesDoctor = ({ navigation }) => {
  const { userData, userRole } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [estadisticas, setEstadisticas] = useState(null);
  const [loadingEstadisticas, setLoadingEstadisticas] = useState(true);
  const [showFiltroModal, setShowFiltroModal] = useState(false);
  const [estadoFiltro, setEstadoFiltro] = useState(null);
  const [estadoFiltroTemporal, setEstadoFiltroTemporal] = useState(null);
  const [periodoFiltro, setPeriodoFiltro] = useState(null);
  const [periodoFiltroTemporal, setPeriodoFiltroTemporal] = useState(null);
  const [rangoMesesFiltro, setRangoMesesFiltro] = useState(null);
  const [rangoMesesFiltroTemporal, setRangoMesesFiltroTemporal] = useState({
    mesInicio: null,
    mesFin: null,
    año: new Date().getFullYear(),
  });

  // Validar que solo doctores puedan acceder
  useEffect(() => {
    if (userRole !== 'Doctor' && userRole !== 'doctor') {
      Logger.warn('Acceso no autorizado a ReportesDoctor', { userRole });
      navigation.navigate('MainTabs', { screen: 'Dashboard' });
    }
  }, [userRole, navigation]);

  // Hook para datos del dashboard del doctor
  const {
    metrics,
    chartData,
    pacientesNuevosData,
    citasPorEstadoData,
    comorbilidadesMasFrecuentes,
    comorbilidadesPorPeriodo,
    loading: dashboardLoading,
    refresh: refreshDashboard,
  } = useDoctorDashboard();

  const detalleReportes = useReportesDetalle({
    enabled: userRole === 'Doctor' || userRole === 'doctor',
  });

  // Actualizar datos cuando cambien los filtros (solo cuando realmente cambien)
  useEffect(() => {
    if ((userRole === 'Doctor' || userRole === 'doctor') && (estadoFiltro !== null || periodoFiltro !== null)) {
      refreshDashboard(estadoFiltro, periodoFiltro, rangoMesesFiltro);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoFiltro, periodoFiltro, rangoMesesFiltro, userRole]);

  // Hook para pacientes (ya filtra por doctor automáticamente)
  const { 
    pacientes, 
    loading: pacientesLoading,
    refresh: refreshPacientes 
  } = usePacientes('activos', 'recent', 'todas');

  // Cargar estadísticas adicionales
  const loadEstadisticas = useCallback(async () => {
    try {
      setLoadingEstadisticas(true);
      Logger.info('ReportesDoctor: Cargando estadísticas adicionales');

      // Calcular estadísticas desde los datos disponibles
      const totalPacientes = pacientes?.length || 0;
      const pacientesActivos = pacientes?.filter(p => p.activo)?.length || 0;
      const citasHoy = metrics?.citasHoy || 0;
      const pacientesAsignados = metrics?.pacientesAsignados || totalPacientes;

      setEstadisticas({
        totalPacientes,
        pacientesActivos,
        citasHoy,
        pacientesAsignados,
        tasaActivos: totalPacientes > 0 ? ((pacientesActivos / totalPacientes) * 100).toFixed(1) : 0
      });
    } catch (error) {
      Logger.error('ReportesDoctor: Error cargando estadísticas', error);
    } finally {
      setLoadingEstadisticas(false);
    }
  }, [pacientes, metrics]);

  // Retrasar carga de estadísticas para no saturar conexiones (useDoctorDashboard + usePacientes ya disparan 2 peticiones)
  useEffect(() => {
    const t = setTimeout(() => loadEstadisticas(), NETWORK_STAGGER.MODULOS_MS);
    return () => clearTimeout(t);
  }, [loadEstadisticas]);

  // Función para refrescar datos
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshDashboard(),
        refreshPacientes(),
        loadEstadisticas(),
        detalleReportes.refresh(),
      ]);
      Logger.info('ReportesDoctor: Datos refrescados exitosamente');
    } catch (error) {
      Logger.error('Error refrescando datos', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshDashboard, refreshPacientes, loadEstadisticas, detalleReportes.refresh]);

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
                          backgroundColor: COLORES.EXITO_LIGHT,
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
                  style={[styles.filterButton, (estadoFiltro || periodoFiltro || rangoMesesFiltro) && styles.filterButtonActive]}
                  onPress={() => {
                    setEstadoFiltroTemporal(estadoFiltro);
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
                  {(estadoFiltro || periodoFiltro || rangoMesesFiltro) && (
                    <View style={styles.filterBadge}>
                      <Text style={styles.filterBadgeText}>
                        {(estadoFiltro ? 1 : 0) + (periodoFiltro ? 1 : 0) + (rangoMesesFiltro ? 1 : 0)}
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
    if (estadoFiltro) tituloCompleto += ` - ${estadoFiltro}`;
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
                style={[styles.filterButton, (estadoFiltro || periodoFiltro || rangoMesesFiltro) && styles.filterButtonActive]}
                onPress={() => {
                  setEstadoFiltroTemporal(estadoFiltro);
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
                {(estadoFiltro || periodoFiltro || rangoMesesFiltro) && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>
                      {(estadoFiltro ? 1 : 0) + (periodoFiltro ? 1 : 0) + (rangoMesesFiltro ? 1 : 0)}
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

  // Renderizar gráfico de barras horizontales (reutilizando patrón de renderChartCard)
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
                style={[styles.filterButton, (estadoFiltro || periodoFiltro || rangoMesesFiltro) && styles.filterButtonActive]}
                onPress={() => {
                  setEstadoFiltroTemporal(estadoFiltro);
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
                {(estadoFiltro || periodoFiltro) && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>
                      {(estadoFiltro ? 1 : 0) + (periodoFiltro ? 1 : 0) + (rangoMesesFiltro ? 1 : 0)}
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
              {estadoFiltro ? `${title} - ${estadoFiltro}` : title}
            </Title>
            {showFilterButton && (
              <TouchableOpacity
                style={[styles.filterButton, (estadoFiltro || periodoFiltro || rangoMesesFiltro) && styles.filterButtonActive]}
                onPress={() => {
                  setEstadoFiltroTemporal(estadoFiltro);
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
                {(estadoFiltro || periodoFiltro) && (
                  <View style={styles.filterBadge}>
                    <Text style={styles.filterBadgeText}>
                      {(estadoFiltro ? 1 : 0) + (periodoFiltro ? 1 : 0) + (rangoMesesFiltro ? 1 : 0)}
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
                          backgroundColor: COLORES.NAV_PRIMARIO,
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
    setEstadoFiltro(estadoFiltroTemporal);
    setPeriodoFiltro(periodoFiltroTemporal);
    
    // Si el periodo es mensual, validar y establecer rango de meses
    let rangoMesesAplicar = null;
    if (periodoFiltroTemporal === 'mensual') {
      if (rangoMesesFiltroTemporal.mesInicio && rangoMesesFiltroTemporal.mesFin && rangoMesesFiltroTemporal.año) {
        if (rangoMesesFiltroTemporal.mesFin >= rangoMesesFiltroTemporal.mesInicio) {
          rangoMesesAplicar = { ...rangoMesesFiltroTemporal };
        } else {
          Logger.warn('Rango de meses inválido: mes final debe ser >= mes inicial');
          return; // No aplicar si el rango es inválido
        }
      } else {
        Logger.warn('Rango de meses incompleto');
        return; // No aplicar si falta información
      }
    }
    
    setRangoMesesFiltro(rangoMesesAplicar);
    setShowFiltroModal(false);
    // Refrescar datos con los nuevos filtros
    refreshDashboard(estadoFiltroTemporal || null, periodoFiltroTemporal || null, rangoMesesAplicar);
  }, [estadoFiltroTemporal, periodoFiltroTemporal, rangoMesesFiltroTemporal, refreshDashboard]);

  // Función para limpiar filtros
  const handleLimpiarFiltros = useCallback(() => {
    setEstadoFiltroTemporal(null);
    setPeriodoFiltroTemporal(null);
    setRangoMesesFiltroTemporal({
      mesInicio: null,
      mesFin: null,
      año: new Date().getFullYear(),
    });
    setEstadoFiltro(null);
    setPeriodoFiltro(null);
    setRangoMesesFiltro(null);
    setShowFiltroModal(false);
    // Refrescar datos sin filtro
    refreshDashboard(null, null, null);
  }, [refreshDashboard]);

  // Función para cerrar modal sin aplicar
  const handleCerrarModal = useCallback(() => {
    setEstadoFiltroTemporal(estadoFiltro);
    setPeriodoFiltroTemporal(periodoFiltro);
    setRangoMesesFiltroTemporal(rangoMesesFiltro || {
      mesInicio: null,
      mesFin: null,
      año: new Date().getFullYear(),
    });
    setShowFiltroModal(false);
  }, [estadoFiltro, periodoFiltro, rangoMesesFiltro]);

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
    const colors = [
      COLORES.PRIMARIO,
      COLORES.SECUNDARIO,
      COLORES.ADVERTENCIA,
      COLORES.ERROR,
      COLORES.IMSS_VERDE_MEDIO,
      COLORES.IMSS_CLARO,
    ];
    const entries = Object.entries(data).map(([key, value], index) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
      value,
      percentage: total > 0 ? ((value / total) * 100).toFixed(1) : 0,
      color: colors[index % colors.length],
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

  // Renderizar card de estadística
  const renderStatCard = (title, value, subtitle, color = COLORES.NAV_PRIMARIO) => (
    <Card style={[styles.statCard, { borderLeftColor: color }]}>
      <Card.Content style={styles.statContent}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
        {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
      </Card.Content>
    </Card>
  );

  // Si no es doctor, no renderizar nada
  if (userRole !== 'Doctor' && userRole !== 'doctor') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDeniedContainer}>
          <Text style={styles.accessDeniedTitle}>🚫 Acceso Denegado</Text>
          <Text style={styles.accessDeniedMessage}>
            Solo los doctores pueden acceder a esta pantalla.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const loading = dashboardLoading || pacientesLoading || loadingEstadisticas;

  return (
    <SafeAreaView style={styles.container}>
      <BackHeader navigation={navigation} title="📊 Reportes" variant="professional" />
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORES.NAV_PRIMARIO]}
            tintColor={COLORES.NAV_PRIMARIO}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📊 Reportes y Estadísticas</Text>
          <Text style={styles.headerSubtitle}>Dr. {userData?.email?.split('@')[0] || 'Usuario'}</Text>
        </View>

        <ReportesExportPanel isAdmin={false} />

        {/* Estadísticas Principales */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Resumen General</Text>
          <View style={styles.statsGrid}>
            {renderStatCard(
              'Pacientes Asignados',
              estadisticas?.pacientesAsignados || metrics?.pacientesAsignados || 0,
              `${estadisticas?.pacientesActivos || 0} activos`,
              COLORES.EXITO_LIGHT
            )}
            {renderStatCard(
              'Citas Hoy',
              metrics?.citasHoy || 0,
              'programadas',
              COLORES.ADVERTENCIA_LIGHT
            )}
            {renderStatCard(
              'Tasa Activos',
              `${estadisticas?.tasaActivos || 0}%`,
              'de pacientes activos',
              COLORES.NAV_PRIMARIO
            )}
          </View>
        </View>

        {/* Gráfico de Citas */}
        {chartData && chartData.length > 0 && (
          <View style={styles.chartsContainer}>
            {renderChartCard('Citas Últimos 7 Días', chartData)}
          </View>
        )}

        {pacientesNuevosData && pacientesNuevosData.length > 0 && (
          <View style={styles.chartsContainer}>
            {renderChartCard('Pacientes nuevos (7 días)', pacientesNuevosData, 'pacientes')}
          </View>
        )}

        {citasPorEstadoData && Object.keys(citasPorEstadoData).length > 0 && (
          <View style={styles.chartsContainer}>
            {renderPieChart('Citas por estado (tus asignadas)', citasPorEstadoData)}
          </View>
        )}

        <View style={styles.chartsContainer}>
          <Text style={styles.sectionTitle}>Análisis detallado</Text>
          {detalleReportes.error ? (
            <Text style={styles.errorDetalleText}>{detalleReportes.error}</Text>
          ) : null}
          {detalleReportes.loading && !detalleReportes.pacientesPorDoctor?.length ? (
            <ActivityIndicator size="small" color={COLORES.NAV_PRIMARIO} style={{ marginVertical: 12 }} />
          ) : null}
          {detalleReportes.pacientesPorDoctor?.length > 0 &&
            renderHorizontalBarChart(
              'Pacientes por doctor (vista reciente)',
              detalleReportes.pacientesPorDoctor.map((r) => ({
                nombre: r.nombre,
                frecuencia: r.total,
              })),
              'frecuencia',
              'nombre',
              false,
            )}
          {detalleReportes.citasPorDiaSemana?.some((d) => d.citas > 0) ? (
            <View style={{ marginTop: 8 }}>{renderChartCard('Citas por día de la semana', detalleReportes.citasPorDiaSemana, 'citas')}</View>
          ) : null}
          {detalleReportes.distribucionEdad?.length > 0 ? (
            <View style={{ marginTop: 8 }}>
              {renderHorizontalBarChart(
                'Distribución por edad',
                detalleReportes.distribucionEdad.map((r) => ({
                  nombre: r.name,
                  frecuencia: r.value,
                })),
                'frecuencia',
                'nombre',
                false,
              )}
            </View>
          ) : null}
          {detalleReportes.distribucionGenero?.length > 0 ? (
            <View style={{ marginTop: 8 }}>
              {renderPieChart(
                'Distribución por género',
                detalleReportes.distribucionGenero.reduce((acc, cur) => {
                  acc[cur.name] = cur.value;
                  return acc;
                }, {}),
              )}
            </View>
          ) : null}
        </View>

        {/* Gráfico de Comorbilidades */}
        {periodoFiltro && comorbilidadesPorPeriodo?.datos ? (
          <View style={styles.chartsContainer}>
            {renderComorbilidadesPorPeriodo(
              'Comorbilidades Más Frecuentes',
              comorbilidadesPorPeriodo.datos,
              true // Mostrar botón de filtro
            )}
          </View>
        ) : comorbilidadesMasFrecuentes && comorbilidadesMasFrecuentes.length > 0 ? (
          <View style={styles.chartsContainer}>
            {renderHorizontalBarChart(
              'Comorbilidades Más Frecuentes',
              comorbilidadesMasFrecuentes,
              'frecuencia',
              'nombre',
              true // Mostrar botón de filtro
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
              Selecciona filtros para analizar las comorbilidades
            </Text>
            <EstadoSelector
              label="Filtrar por Estado"
              value={estadoFiltroTemporal || ''}
              onValueChange={(estado) => {
                setEstadoFiltroTemporal(estado || null);
              }}
              required={false}
            />
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
                      // Si se deselecciona mensual, limpiar rango de meses temporal
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
            
            {/* Selector de Rango de Meses (solo si periodo es mensual) */}
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
                • Los reportes muestran datos de tus pacientes asignados{'\n'}
                • Los gráficos se actualizan en tiempo real{'\n'}
                • Puedes exportar estos datos para análisis adicionales
              </Text>
            </Card.Content>
          </Card>
        </View>

        {loading && !refreshing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORES.NAV_PRIMARIO} />
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
    backgroundColor: COLORES.FONDO,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: COLORES.EXITO_LIGHT,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORES.TEXTO_EN_PRIMARIO,
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORES.SECUNDARIO_LIGHT,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.TEXTO_PRIMARIO,
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
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 5,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.TEXTO_SECUNDARIO,
    marginBottom: 2,
  },
  statSubtitle: {
    fontSize: 12,
    color: COLORES.TEXTO_DISABLED,
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
    color: COLORES.TEXTO_PRIMARIO,
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
    color: COLORES.TEXTO_SECUNDARIO,
    marginTop: 5,
  },
  barValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORES.NAV_PRIMARIO,
    marginBottom: 5,
  },
  noDataText: {
    fontSize: 14,
    color: COLORES.TEXTO_DISABLED,
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
    color: COLORES.TEXTO_PRIMARIO,
  },
  infoText: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    lineHeight: 22,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
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
    color: COLORES.ERROR_LIGHT,
    marginBottom: 10,
  },
  accessDeniedMessage: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
  },
  // Estilos para gráfico de barras horizontales
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
    color: COLORES.TEXTO_PRIMARIO,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  horizontalBarValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORES.NAV_PRIMARIO,
    minWidth: 30,
    textAlign: 'right',
  },
  horizontalBarContainer: {
    height: 24,
    backgroundColor: COLORES.FONDO_SECUNDARIO,
    borderRadius: 4,
    overflow: 'hidden',
  },
  horizontalBar: {
    height: '100%',
    borderRadius: 4,
  },
  // Estilos para el header del gráfico con botón de filtro
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
    backgroundColor: COLORES.FONDO_SECUNDARIO,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORES.SECUNDARIO_LIGHT,
    flexShrink: 0,
  },
  filterButtonActive: {
    backgroundColor: COLORES.FONDO_VERDE_SUAVE,
    borderColor: COLORES.NAV_PRIMARIO,
  },
  filterButtonText: {
    fontSize: 18,
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORES.ERROR,
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORES.BLANCO,
  },
  filterBadgeText: {
    color: COLORES.BLANCO,
    fontSize: 10,
    fontWeight: 'bold',
  },
  // Estilos para el contenido del modal de filtros
  modalFilterContent: {
    padding: 16,
  },
  modalFilterInfo: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
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
  // Estilos para selector de periodo
  periodoSelectorContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  periodoSelectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
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
    borderColor: COLORES.SECUNDARIO_LIGHT,
    backgroundColor: COLORES.FONDO_CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodoSelectorButtonActive: {
    backgroundColor: COLORES.FONDO_VERDE_SUAVE,
    borderColor: COLORES.NAV_PRIMARIO,
  },
  periodoSelectorButtonText: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    fontWeight: '500',
  },
  periodoSelectorButtonTextActive: {
    color: COLORES.NAV_PRIMARIO,
    fontWeight: '600',
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
    color: COLORES.TEXTO_PRIMARIO,
    fontWeight: '500',
    flex: 1,
  },
  pieChartValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORES.NAV_PRIMARIO,
    marginLeft: 8,
  },
  errorDetalleText: {
    fontSize: 13,
    color: COLORES.ERROR,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
});

export default ReportesDoctor;

