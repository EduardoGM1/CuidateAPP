/**
 * Pantalla: Historial Médico
 * 
 * Historial médico completo del paciente de forma simplificada.
 * Muestra signos vitales, diagnósticos, citas y medicamentos.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Alert,
  Linking,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import usePacienteData from '../../hooks/usePacienteData';
import { useHealthStatus } from '../../hooks/useHealthStatus';
import HealthStatusIndicator from '../../components/paciente/HealthStatusIndicator';
import ValueCard from '../../components/paciente/ValueCard';
import useTTS from '../../hooks/useTTS';
import SkeletonLoader, { SkeletonCard } from '../../components/common/SkeletonLoader';
import { formatDate, formatDateShort, formatDateWithWeekday } from '../../utils/dateUtils';
import hapticService from '../../services/hapticService';
import audioFeedbackService from '../../services/audioFeedbackService';
import Logger from '../../services/logger';
import { COLORES } from '../../utils/constantes';
import gestionService from '../../api/gestionService';

const HistorialMedico = () => {
  const navigation = useNavigation();
  const {
    paciente,
    loading: loadingPaciente,
    signosVitales,
    diagnosticos,
    citas,
    medicamentos,
    resumen,
    refresh,
    totalSignosVitales,
    totalDiagnosticos,
    totalCitas,
    totalMedicamentos,
  } = usePacienteData();
  
  const { speak, stopAndClear, createTimeout } = useTTS();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('resumen'); // resumen, signos, diagnosticos, citas
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const [expandedCitaId, setExpandedCitaId] = useState(null); // ID de la cita expandida

  // Estado de salud
  const healthStatus = useHealthStatus(signosVitales, !loadingPaciente);

  // Listener para cambios de tamaño de pantalla (rotación, etc.)
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setScreenWidth(window.width);
    });

    return () => subscription?.remove();
  }, []);

  // Cargar datos al entrar
  useFocusEffect(
    useCallback(() => {
      // Saludo inicial mejorado con información del historial
      const timer = createTimeout(async () => {
        let mensaje = 'Tu historial médico completo. ';
        
        if (totalSignosVitales > 0) {
          mensaje += `Tienes ${totalSignosVitales} registro${totalSignosVitales > 1 ? 's' : ''} de signos vitales. `;
        }
        if (totalDiagnosticos > 0) {
          mensaje += `${totalDiagnosticos} diagnóstico${totalDiagnosticos > 1 ? 's' : ''}. `;
        }
        if (totalCitas > 0) {
          mensaje += `${totalCitas} cita${totalCitas > 1 ? 's' : ''} registrada${totalCitas > 1 ? 's' : ''}. `;
        }
        if (totalMedicamentos > 0) {
          mensaje += `${totalMedicamentos} medicamento${totalMedicamentos > 1 ? 's' : ''}. `;
        }
        
        if (totalSignosVitales === 0 && totalDiagnosticos === 0 && totalCitas === 0 && totalMedicamentos === 0) {
          mensaje = 'Tu historial médico. Aún no tienes registros médicos.';
        }
        
        await speak(mensaje);
      }, 800); // Delay para que carguen los datos
      
      return () => {
        // Cleanup: Detener TTS y limpiar cola cuando se sale de la pantalla
        Logger.debug('HistorialMedico: Cleanup - Deteniendo TTS y limpiando cola');
        stopAndClear();
        clearTimeout(timer);
      };
    }, [speak, stopAndClear, createTimeout, totalSignosVitales, totalDiagnosticos, totalCitas, totalMedicamentos])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    hapticService.medium();
    await refresh();
    setRefreshing(false);
    audioFeedbackService.playSuccess();
  };

  const handleTabChange = async (tab) => {
    hapticService.selection();
    setActiveTab(tab);
    
    const tabNames = {
      resumen: 'Resumen',
      signos: 'Signos Vitales',
      diagnosticos: 'Diagnósticos',
      citas: 'Citas',
    };
    
    await speak(`Mostrando ${tabNames[tab]}`);
  };

  // Funciones de exportación
  const pacienteId = paciente?.id_paciente || paciente?.id;

  const handleExportarSignosVitales = useCallback(async () => {
    if (!pacienteId) return;
    
    try {
      Alert.alert(
        'Exportar Signos Vitales',
        '¿En qué formato deseas exportar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'CSV',
            onPress: async () => {
              try {
                const url = await gestionService.exportarSignosVitalesCSV(pacienteId);
                const canOpen = await Linking.canOpenURL(url);
                if (canOpen) {
                  await Linking.openURL(url);
                  Alert.alert('Éxito', 'El archivo CSV se está descargando');
                } else {
                  Alert.alert('Error', 'No se puede abrir la URL de descarga');
                }
              } catch (error) {
                Logger.error('Error exportando signos vitales:', error);
                Alert.alert('Error', 'No se pudo exportar los signos vitales');
              }
            }
          },
          {
            text: 'PDF',
            onPress: async () => {
              try {
                const url = await gestionService.exportarPDF('signos-vitales', pacienteId);
                const canOpen = await Linking.canOpenURL(url);
                if (canOpen) {
                  await Linking.openURL(url);
                  Alert.alert('Éxito', 'El archivo PDF se está descargando');
                } else {
                  Alert.alert('Error', 'No se puede abrir la URL de descarga');
                }
              } catch (error) {
                Logger.error('Error exportando signos vitales PDF:', error);
                Alert.alert('Error', 'No se pudo exportar los signos vitales');
              }
            }
          }
        ]
      );
    } catch (error) {
      Logger.error('Error en exportación de signos vitales:', error);
      Alert.alert('Error', 'No se pudo exportar los signos vitales');
    }
  }, [pacienteId]);

  const handleExportarCitas = useCallback(async () => {
    if (!pacienteId) return;
    
    try {
      Alert.alert(
        'Exportar Citas',
        '¿En qué formato deseas exportar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'CSV',
            onPress: async () => {
              try {
                const url = await gestionService.exportarCitasCSV(pacienteId);
                const canOpen = await Linking.canOpenURL(url);
                if (canOpen) {
                  await Linking.openURL(url);
                  Alert.alert('Éxito', 'El archivo CSV se está descargando');
                } else {
                  Alert.alert('Error', 'No se puede abrir la URL de descarga');
                }
              } catch (error) {
                Logger.error('Error exportando citas:', error);
                Alert.alert('Error', 'No se pudo exportar las citas');
              }
            }
          },
          {
            text: 'PDF',
            onPress: async () => {
              try {
                const url = await gestionService.exportarPDF('citas', pacienteId);
                const canOpen = await Linking.canOpenURL(url);
                if (canOpen) {
                  await Linking.openURL(url);
                  Alert.alert('Éxito', 'El archivo PDF se está descargando');
                } else {
                  Alert.alert('Error', 'No se puede abrir la URL de descarga');
                }
              } catch (error) {
                Logger.error('Error exportando citas PDF:', error);
                Alert.alert('Error', 'No se pudo exportar las citas');
              }
            }
          }
        ]
      );
    } catch (error) {
      Logger.error('Error en exportación de citas:', error);
      Alert.alert('Error', 'No se pudo exportar las citas');
    }
  }, [pacienteId]);

  const handleExportarDiagnosticos = useCallback(async () => {
    if (!pacienteId) return;
    
    try {
      Alert.alert(
        'Exportar Diagnósticos',
        '¿En qué formato deseas exportar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'CSV',
            onPress: async () => {
              try {
                const url = await gestionService.exportarDiagnosticosCSV(pacienteId);
                const canOpen = await Linking.canOpenURL(url);
                if (canOpen) {
                  await Linking.openURL(url);
                  Alert.alert('Éxito', 'El archivo CSV se está descargando');
                } else {
                  Alert.alert('Error', 'No se puede abrir la URL de descarga');
                }
              } catch (error) {
                Logger.error('Error exportando diagnósticos:', error);
                Alert.alert('Error', 'No se pudo exportar los diagnósticos');
              }
            }
          },
          {
            text: 'PDF',
            onPress: async () => {
              try {
                const url = await gestionService.exportarPDF('diagnosticos', pacienteId);
                const canOpen = await Linking.canOpenURL(url);
                if (canOpen) {
                  await Linking.openURL(url);
                  Alert.alert('Éxito', 'El archivo PDF se está descargando');
                } else {
                  Alert.alert('Error', 'No se puede abrir la URL de descarga');
                }
              } catch (error) {
                Logger.error('Error exportando diagnósticos PDF:', error);
                Alert.alert('Error', 'No se pudo exportar los diagnósticos');
              }
            }
          }
        ]
      );
    } catch (error) {
      Logger.error('Error en exportación de diagnósticos:', error);
      Alert.alert('Error', 'No se pudo exportar los diagnósticos');
    }
  }, [pacienteId]);

  // Obtener últimos signos vitales
  const ultimosSignos = signosVitales?.[0] || null;

  // Formatear fecha (usa formato legible)
  const formatFecha = (fecha) => {
    try {
      const fechaObj = new Date(fecha);
      if (isNaN(fechaObj.getTime())) return 'Fecha inválida';
      
      // Verificar si tiene hora
      const tieneHora = fechaObj.getHours() !== 0 || 
                        fechaObj.getMinutes() !== 0 || 
                        fechaObj.getSeconds() !== 0 ||
                        fecha.toString().includes('T') ||
                        fecha.toString().includes(' ');
      
      // Formatear fecha: "6 de noviembre del 2025"
      const dia = fechaObj.getDate();
      const meses = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
      ];
      const mes = meses[fechaObj.getMonth()];
      const año = fechaObj.getFullYear();
      const fechaFormateada = `${dia} de ${mes} del ${año}`;
      
      if (tieneHora) {
        const horaStr = fechaObj.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        return `${fechaFormateada}, hora: ${horaStr}`;
      }
      
      return fechaFormateada;
    } catch {
      return fecha;
    }
  };

  // Formatear fecha corta para timeline - usar formateo manual en español
  const formatFechaCorta = (fecha) => {
    try {
      return formatDateShort(new Date(fecha), true);
    } catch {
      return fecha;
    }
  };

  // Calcular comparación de signos vitales (último vs anterior)
  const calcularComparacion = (campo) => {
    if (!signosVitales || signosVitales.length < 2) {
      return null;
    }

    const ultimo = signosVitales[0];
    const anterior = signosVitales[1];

    const valorUltimo = ultimo[campo];
    const valorAnterior = anterior[campo];

    if (!valorUltimo || !valorAnterior) {
      return null;
    }

    const diferencia = valorUltimo - valorAnterior;
    const porcentaje = valorAnterior !== 0 ? ((diferencia / valorAnterior) * 100).toFixed(1) : 0;

    // Determinar si mejoró, empeoró o está igual
    // Para presión, glucosa, peso: menor es mejor
    // Para saturación: mayor es mejor
    let estado = 'igual';
    let mensaje = '';
    let color = COLORES.TEXTO_SECUNDARIO;

    if (campo === 'presion_sistolica' || campo === 'presion_diastolica') {
      if (diferencia < -5) {
        estado = 'mejoro';
        mensaje = 'Mejoró';
        color = COLORES.NAV_PACIENTE;
      } else if (diferencia > 5) {
        estado = 'empeoro';
        mensaje = 'Aumentó';
        color = COLORES.ERROR_LIGHT;
      } else {
        estado = 'igual';
        mensaje = 'Estable';
        color = COLORES.ADVERTENCIA_LIGHT;
      }
    } else if (campo === 'glucosa_mg_dl' || campo === 'peso_kg') {
      if (diferencia < -5) {
        estado = 'mejoro';
        mensaje = 'Mejoró';
        color = COLORES.NAV_PACIENTE;
      } else if (diferencia > 5) {
        estado = 'empeoro';
        mensaje = 'Aumentó';
        color = COLORES.ERROR_LIGHT;
      } else {
        estado = 'igual';
        mensaje = 'Estable';
        color = COLORES.ADVERTENCIA_LIGHT;
      }
    } else if (campo === 'saturacion_oxigeno') {
      if (diferencia > 2) {
        estado = 'mejoro';
        mensaje = 'Mejoró';
        color = COLORES.NAV_PACIENTE;
      } else if (diferencia < -2) {
        estado = 'empeoro';
        mensaje = 'Disminuyó';
        color = COLORES.ERROR_LIGHT;
      } else {
        estado = 'igual';
        mensaje = 'Estable';
        color = COLORES.ADVERTENCIA_LIGHT;
      }
    }

    return {
      ultimo: valorUltimo,
      anterior: valorAnterior,
      diferencia,
      porcentaje: Math.abs(porcentaje),
      estado,
      mensaje,
      color,
    };
  };

  // Renderizar un solo gráfico con una línea (índice de salud)
  const renderGraficoEvolutivo = () => {
    if (!signosVitales || signosVitales.length < 2) {
      return (
        <View style={styles.graficoContainer}>
          <Text style={styles.emptyText}>
            Necesitas al menos 2 registros de signos vitales para ver la evolución
          </Text>
        </View>
      );
    }

    // Obtener últimos 6 meses de datos
    const ahora = new Date();
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

    // Filtrar y ordenar signos vitales (más antiguo primero para el gráfico)
    const signosOrdenados = signosVitales
      .filter(sv => {
        const fecha = new Date(sv.fecha_medicion || sv.fecha_creacion);
        return fecha >= seisMesesAtras;
      })
      .sort((a, b) => new Date(a.fecha_medicion || a.fecha_creacion) - new Date(b.fecha_medicion || b.fecha_creacion))
      .slice(0, 12); // Últimos 12 registros

    if (signosOrdenados.length === 0) {
      return (
        <View style={styles.graficoContainer}>
          <Text style={styles.emptyText}>No hay datos suficientes para mostrar la evolución</Text>
        </View>
      );
    }

    // Preparar datos para el gráfico
    const datosGrafico = signosOrdenados.map((signo, index) => {
      const fecha = new Date(signo.fecha_medicion || signo.fecha_creacion);
      // Usar formateo manual en español
      const fechaLabel = formatDateShort(fecha, false);
      
      return {
        x: index + 1,
        fecha: fechaLabel,
        fechaCompleta: formatDate(fecha),
        peso: Number(signo.peso_kg) || null,
        presionSistolica: Number(signo.presion_sistolica) || null,
        presionDiastolica: Number(signo.presion_diastolica) || null,
        glucosa: Number(signo.glucosa_mg_dl) || null,
        saturacion: Number(signo.saturacion_oxigeno) || null,
        frecuencia: Number(signo.frecuencia_cardiaca) || null,
        temperatura: Number(signo.temperatura) || null,
      };
    });

    // Calcular índice de salud (0-100) basado en todos los signos vitales
    const calcularIndiceSalud = (punto) => {
      let suma = 0;
      let contador = 0;

      // Peso (normalizado 50-100kg = 0-100)
      if (punto.peso !== null) {
        const pesoNormalizado = Math.max(0, Math.min(100, ((punto.peso - 50) / 50) * 100));
        suma += pesoNormalizado;
        contador++;
      }

      // Presión sistólica (normal: 120 = 100, hipertensión: 180 = 0)
      if (punto.presionSistolica !== null) {
        const presionNormalizada = Math.max(0, Math.min(100, ((120 - Math.abs(punto.presionSistolica - 120)) / 60) * 100));
        suma += presionNormalizada;
        contador++;
      }

      // Glucosa (normal: 100 = 100, diabetes: 200 = 0)
      if (punto.glucosa !== null) {
        const glucosaNormalizada = Math.max(0, Math.min(100, ((100 - Math.abs(punto.glucosa - 100)) / 100) * 100));
        suma += glucosaNormalizada;
        contador++;
      }

      // Saturación (normal: 98-100 = 100, bajo: 90 = 0)
      if (punto.saturacion !== null) {
        const saturacionNormalizada = Math.max(0, Math.min(100, ((punto.saturacion - 90) / 10) * 100));
        suma += saturacionNormalizada;
        contador++;
      }

      return contador > 0 ? suma / contador : 50; // Promedio normalizado
    };

    // Calcular índices de salud para cada punto
    const datosConIndice = datosGrafico.map(d => ({
      ...d,
      indiceSalud: calcularIndiceSalud(d),
    }));

    // Obtener min y max del índice de salud
    const indices = datosConIndice.map(d => d.indiceSalud);
    const minIndice = Math.min(...indices) - 10;
    const maxIndice = Math.max(...indices) + 10;

    // Configuración del gráfico
    const alturaGrafico = 220;
    const anchoDisponible = screenWidth - 80;
    // Ancho mínimo por punto para que sea scrolleable
    const anchoMinimoPorPunto = 60;
    const anchoGrafico = Math.max(anchoDisponible, datosConIndice.length * anchoMinimoPorPunto);
    const svgWidth = anchoGrafico - 50;
    const svgHeight = alturaGrafico - 50;
    const anchoPunto = svgWidth / Math.max(datosConIndice.length - 1, 1);

    // Normalizar índice de salud para el gráfico
    const normalizarIndice = (indice) => {
      return ((indice - minIndice) / (maxIndice - minIndice)) * svgHeight;
    };

    // Construir path SVG
    const puntos = datosConIndice.map((punto, idx) => {
      const x = idx * anchoPunto;
      const y = svgHeight - normalizarIndice(punto.indiceSalud);
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');

    // Construir mensaje TTS completo para una fecha
    const construirMensajeTTS = (punto) => {
      let mensaje = `Registro del ${punto.fechaCompleta}. `;
      
      if (punto.peso !== null) {
        mensaje += `Peso: ${punto.peso.toFixed(1)} kilogramos. `;
      }
      
      if (punto.presionSistolica !== null && punto.presionDiastolica !== null) {
        mensaje += `Presión arterial: ${punto.presionSistolica} sobre ${punto.presionDiastolica} milímetros de mercurio. `;
      } else if (punto.presionSistolica !== null) {
        mensaje += `Presión sistólica: ${punto.presionSistolica} milímetros de mercurio. `;
      }
      
      if (punto.glucosa !== null) {
        mensaje += `Glucosa: ${punto.glucosa} miligramos por decilitro. `;
      }
      
      if (punto.saturacion !== null) {
        mensaje += `Saturación de oxígeno: ${punto.saturacion} por ciento. `;
      }
      
      if (punto.frecuencia !== null) {
        mensaje += `Frecuencia cardíaca: ${punto.frecuencia} latidos por minuto. `;
      }
      
      if (punto.temperatura !== null) {
        mensaje += `Temperatura: ${punto.temperatura.toFixed(1)} grados centígrados. `;
      }

      // Añadir comentario sobre el índice de salud
      if (punto.indiceSalud >= 75) {
        mensaje += `Tu estado de salud está bien. `;
      } else if (punto.indiceSalud >= 50) {
        mensaje += `Tu estado de salud requiere atención. `;
      } else {
        mensaje += `Tu estado de salud necesita atención médica. `;
      }
      
      return mensaje;
    };

    return (
      <View style={styles.graficoContainer}>
        <Text style={styles.graficoTitulo}>📊 Evolución de tu Salud</Text>
        <Text style={styles.graficoSubtitle}>
          Toca cualquier fecha para escuchar todos tus datos de ese día
        </Text>

        {/* Gráfico único con scroll horizontal */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          contentContainerStyle={styles.graficoScrollContentUnico}
          style={styles.graficoScrollUnico}
        >
          <View style={[styles.graficoAreaUnico, { width: anchoGrafico, height: alturaGrafico }]}>
            {/* Eje Y */}
            <View style={styles.ejeYUnico}>
              <Text style={styles.labelYUnico}>{Math.round(maxIndice)}</Text>
              <Text style={styles.labelYUnico}>{Math.round((minIndice + maxIndice) / 2)}</Text>
              <Text style={styles.labelYUnico}>{Math.round(minIndice)}</Text>
            </View>

            {/* Área de trazado */}
            <View style={styles.areaTrazadoUnico}>
              <Svg width={svgWidth} height={svgHeight} style={styles.svgChartUnico}>
                {/* Línea del gráfico */}
                <Path
                  d={puntos}
                  stroke={COLORES.NAV_PACIENTE}
                  strokeWidth="5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                
                {/* Puntos en la línea */}
                {datosConIndice.map((punto, index) => {
                  const x = index * anchoPunto;
                  const y = svgHeight - normalizarIndice(punto.indiceSalud);
                  
                  // Color según índice de salud
                  let colorPunto = COLORES.NAV_PACIENTE; // Verde (bueno)
                  if (punto.indiceSalud < 50) {
                    colorPunto = COLORES.ERROR_LIGHT; // Rojo (crítico)
                  } else if (punto.indiceSalud < 75) {
                    colorPunto = COLORES.ADVERTENCIA_LIGHT; // Naranja (atención)
                  }
                  
                  return (
                    <Circle
                      key={`punto-${index}`}
                      cx={x}
                      cy={y}
                      r="6"
                      fill={colorPunto}
                      stroke={COLORES.BLANCO}
                      strokeWidth="3"
                    />
                  );
                })}
              </Svg>

              {/* Áreas táctiles para interactividad */}
              {datosConIndice.map((punto, index) => {
                const x = index * anchoPunto;
                return (
                  <TouchableOpacity
                    key={`tactil-${index}`}
                    style={[
                      styles.areaTactilUnico,
                      {
                        left: x - 25,
                        top: 0,
                        width: 50,
                        height: svgHeight,
                      },
                    ]}
                    onPress={async () => {
                      hapticService.medium();
                      const mensaje = construirMensajeTTS(punto);
                      await speak(mensaje, {
                        variant: 'information',
                        priority: 'medium'
                      });
                    }}
                    activeOpacity={0.3}
                  />
                );
              })}
            </View>

            {/* Eje X - fechas */}
            <View style={styles.ejeXUnico}>
              {datosConIndice.map((punto, index) => {
                if (index % Math.max(1, Math.floor(datosConIndice.length / 5)) !== 0 && 
                    index !== datosConIndice.length - 1) return null;
                
                return (
                  <View
                    key={`fecha-${index}`}
                    style={[
                      styles.marcaXUnico,
                      { left: index * anchoPunto - 30 },
                    ]}
                  >
                    <Text style={styles.labelXUnico}>{punto.fecha}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Información de referencia */}
        <View style={styles.referenciasContainer}>
          <Text style={styles.referenciasTitle}>💡 Cómo entender tu gráfico:</Text>
          <Text style={styles.referenciasText}>
            La línea verde muestra tu evolución de salud general. Cuando sube, significa que tus signos vitales están mejorando.
          </Text>
          <Text style={styles.referenciasText}>
            🟢 Verde = Bien • 🟡 Naranja = Atención • 🔴 Rojo = Crítico
          </Text>
          <Text style={styles.referenciasHint}>
            Presiona cualquier fecha para escuchar todos tus datos de ese día
          </Text>
        </View>
      </View>
    );
  };

  if (loadingPaciente) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                hapticService.light();
                navigation.goBack();
              }}
            >
              <Text style={styles.backButtonText}>← Atrás</Text>
            </TouchableOpacity>
            <Text style={styles.title}>📋 Historial Médico</Text>
          </View>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORES.NAV_PACIENTE]}
            tintColor={COLORES.NAV_PACIENTE}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              hapticService.light();
              navigation.goBack();
            }}
          >
            <Text style={styles.backButtonText}>← Atrás</Text>
          </TouchableOpacity>
          
          <View style={styles.titleContainer}>
            <Text style={styles.title}>📋 Mi Historia</Text>
            <HealthStatusIndicator
              status={healthStatus.status}
              label={healthStatus.label}
              size="medium"
              showLabel={true}
            />
          </View>
          
          <TouchableOpacity
            style={styles.listenButton}
            onPress={async () => {
              try {
                hapticService.light();
                const mensaje = `Tu historial médico completo. Estado de salud: ${healthStatus.label}`;
                await speak(mensaje);
              } catch (error) {
                Logger.error('Error en TTS:', error);
                hapticService.error();
              }
            }}
          >
            <Text style={styles.listenButtonText}>🔊</Text>
          </TouchableOpacity>
        </View>

        {/* Botones de Exportación */}
        <View style={styles.exportContainer}>
          <Text style={styles.exportTitle}>📥 Exportar Datos</Text>
          <View style={styles.exportButtonsContainer}>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleExportarSignosVitales}
            >
              <Text style={styles.exportButtonIcon}>💓</Text>
              <Text style={styles.exportButtonText}>Signos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleExportarCitas}
            >
              <Text style={styles.exportButtonIcon}>📅</Text>
              <Text style={styles.exportButtonText}>Citas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.exportButton}
              onPress={handleExportarDiagnosticos}
            >
              <Text style={styles.exportButtonIcon}>📋</Text>
              <Text style={styles.exportButtonText}>Diag.</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs de navegación */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'resumen' && styles.tabActive]}
            onPress={() => handleTabChange('resumen')}
          >
            <Text style={[styles.tabText, activeTab === 'resumen' && styles.tabTextActive]}>
              Resumen
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'citas' && styles.tabActive]}
            onPress={() => handleTabChange('citas')}
          >
            <Text style={[styles.tabText, activeTab === 'citas' && styles.tabTextActive]}>
              Citas
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'signos' && styles.tabActive]}
            onPress={() => handleTabChange('signos')}
          >
            <Text style={[styles.tabText, activeTab === 'signos' && styles.tabTextActive]}>
              Signos
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'diagnosticos' && styles.tabActive]}
            onPress={() => handleTabChange('diagnosticos')}
          >
            <Text style={[styles.tabText, activeTab === 'diagnosticos' && styles.tabTextActive]}>
              {screenWidth < 380 ? 'Diag.' : 'Diagnósticos'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contenido según tab activo */}
        {activeTab === 'resumen' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Resumen Médico</Text>
            
            {/* Estadísticas rápidas */}
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{totalSignosVitales || 0}</Text>
                <Text style={styles.statLabel}>Signos Vitales</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{totalDiagnosticos || 0}</Text>
                <Text style={styles.statLabel}>Diagnósticos</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{totalCitas || 0}</Text>
                <Text style={styles.statLabel}>Citas Totales</Text>
              </View>
              
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{totalMedicamentos || 0}</Text>
                <Text style={styles.statLabel}>Medicamentos</Text>
              </View>
            </View>

            {/* Últimos signos vitales */}
            {ultimosSignos && (() => {
              // Calcular IMC si no está presente pero hay peso y talla
              const imcCalculado = ultimosSignos.imc || 
                (ultimosSignos.peso_kg && ultimosSignos.talla_m 
                  ? (ultimosSignos.peso_kg / (ultimosSignos.talla_m * ultimosSignos.talla_m)).toFixed(2)
                  : null);
              
              return (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Últimos Signos Vitales</Text>
                  <Text style={styles.sectionSubtitle}>
                    Registrados el {formatFecha(ultimosSignos.fecha_medicion || ultimosSignos.fecha_creacion)}
                  </Text>
                  
                  <View style={styles.valuesGrid}>
                    {/* Antropométricos */}
                    <View style={styles.gridItem}>
                      <ValueCard
                        label="Peso"
                        value={ultimosSignos.peso_kg || 'Sin datos'}
                        unit={ultimosSignos.peso_kg ? "kg" : ""}
                        status={ultimosSignos.peso_kg ? "normal" : "empty"}
                      />
                    </View>
                    
                    <View style={styles.gridItem}>
                      <ValueCard
                        label="Talla"
                        value={ultimosSignos.talla_m || 'Sin datos'}
                        unit={ultimosSignos.talla_m ? "m" : ""}
                        status={ultimosSignos.talla_m ? "normal" : "empty"}
                      />
                    </View>
                    
                    <View style={styles.gridItem}>
                      <ValueCard
                        label="IMC"
                        value={imcCalculado || 'Sin datos'}
                        unit={imcCalculado ? "" : ""}
                        status={imcCalculado ? "normal" : "empty"}
                      />
                    </View>
                    
                    <View style={styles.gridItem}>
                      <ValueCard
                        label="Cintura"
                        value={ultimosSignos.medida_cintura_cm || 'Sin datos'}
                        unit={ultimosSignos.medida_cintura_cm ? "cm" : ""}
                        status={ultimosSignos.medida_cintura_cm ? "normal" : "empty"}
                      />
                    </View>
                    
                    {/* Presión arterial */}
                    <View style={styles.gridItem}>
                      <ValueCard
                        label="Presión Arterial"
                        value={
                          ultimosSignos.presion_sistolica 
                            ? `${ultimosSignos.presion_sistolica}/${ultimosSignos.presion_diastolica || '--'}` 
                            : 'Sin datos'
                        }
                        unit={ultimosSignos.presion_sistolica ? "mmHg" : ""}
                        status={ultimosSignos.presion_sistolica ? "normal" : "empty"}
                      />
                    </View>
                    
                    {/* Exámenes de laboratorio */}
                    <View style={styles.gridItem}>
                      <ValueCard
                        label="Glucosa"
                        value={ultimosSignos.glucosa_mg_dl || 'Sin datos'}
                        unit={ultimosSignos.glucosa_mg_dl ? "mg/dL" : ""}
                        status={
                          !ultimosSignos.glucosa_mg_dl 
                            ? "empty" 
                            : ultimosSignos.glucosa_mg_dl > 126 
                              ? 'warning' 
                              : 'normal'
                        }
                      />
                    </View>
                    
                    <View style={styles.gridItem}>
                      <ValueCard
                        label="Colesterol"
                        value={ultimosSignos.colesterol_mg_dl || 'Sin datos'}
                        unit={ultimosSignos.colesterol_mg_dl ? "mg/dL" : ""}
                        status={ultimosSignos.colesterol_mg_dl ? "normal" : "empty"}
                      />
                    </View>
                    
                    <View style={styles.gridItem}>
                      <ValueCard
                        label="Triglicéridos"
                        value={ultimosSignos.trigliceridos_mg_dl || 'Sin datos'}
                        unit={ultimosSignos.trigliceridos_mg_dl ? "mg/dL" : ""}
                        status={ultimosSignos.trigliceridos_mg_dl ? "normal" : "empty"}
                      />
                    </View>
                  </View>
                  
                  {/* Observaciones de signos vitales */}
                  <View style={styles.observacionesContainer}>
                    <Text style={styles.observacionesLabel}>📝 Observaciones:</Text>
                    <Text style={styles.observacionesText}>
                      {ultimosSignos.observaciones || 'Sin observaciones registradas'}
                    </Text>
                  </View>
                </View>
              );
            })()}

            {/* Evolución Médica del Paciente - Gráfico de Barras */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📈 Evolución de tu Salud</Text>
              {renderGraficoEvolutivo()}
            </View>
          </View>
        )}

        {activeTab === 'signos' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Signos Vitales Históricos</Text>
            
            {signosVitales && signosVitales.length > 0 ? (
              signosVitales.slice(0, 10).map((signo, index) => {
                const imcCalculado = signo.imc || (signo.peso_kg && signo.talla_m 
                  ? (signo.peso_kg / (signo.talla_m * signo.talla_m)).toFixed(2) 
                  : null);
                
                return (
                  <View key={signo.id_signo || index} style={styles.historialItem}>
                    <Text style={styles.historialFecha}>
                      {formatFecha(signo.fecha_medicion || signo.fecha_creacion)}
                    </Text>
                    
                    <View style={styles.historialValues}>
                      {/* Antropométricos */}
                      {signo.peso_kg && (
                        <Text style={styles.historialValue}>
                          Peso: {signo.peso_kg} kg
                        </Text>
                      )}
                      {signo.talla_m && (
                        <Text style={styles.historialValue}>
                          Talla: {signo.talla_m} m
                        </Text>
                      )}
                      {imcCalculado && (
                        <Text style={styles.historialValue}>
                          IMC: {imcCalculado}
                        </Text>
                      )}
                      {signo.medida_cintura_cm && (
                        <Text style={styles.historialValue}>
                          Cintura: {signo.medida_cintura_cm} cm
                        </Text>
                      )}
                      
                      {/* Presión arterial */}
                      {signo.presion_sistolica && (
                        <Text style={styles.historialValue}>
                          Presión: {signo.presion_sistolica}/{signo.presion_diastolica || '--'} mmHg
                        </Text>
                      )}
                      
                      {/* Exámenes de laboratorio */}
                      {signo.glucosa_mg_dl && (
                        <Text style={styles.historialValue}>
                          Glucosa: {signo.glucosa_mg_dl} mg/dL
                        </Text>
                      )}
                      {signo.colesterol_mg_dl && (
                        <Text style={styles.historialValue}>
                          Colesterol: {signo.colesterol_mg_dl} mg/dL
                        </Text>
                      )}
                      {signo.trigliceridos_mg_dl && (
                        <Text style={styles.historialValue}>
                          Triglicéridos: {signo.trigliceridos_mg_dl} mg/dL
                        </Text>
                      )}
                      
                      {/* Observaciones */}
                      {signo.observaciones && (
                        <Text style={[styles.historialValue, { fontStyle: 'italic', marginTop: 4 }]}>
                          📝 {signo.observaciones}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.emptyText}>No hay registros de signos vitales</Text>
            )}
          </View>
        )}

        {activeTab === 'diagnosticos' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Diagnósticos</Text>
            
            {diagnosticos && diagnosticos.length > 0 ? (
              diagnosticos.slice(0, 10).map((diagnostico, index) => (
                <View key={diagnostico.id_diagnostico || index} style={styles.historialItem}>
                  <Text style={styles.historialFecha}>
                    {formatFecha(diagnostico.fecha_registro || diagnostico.fecha_creacion)}
                  </Text>
                  <Text style={styles.historialDescription}>
                    {diagnostico.descripcion || 'Sin descripción'}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No hay diagnósticos registrados</Text>
            )}
          </View>
        )}

        {activeTab === 'citas' && (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Citas Médicas</Text>
            
            {citas && citas.length > 0 ? (
              citas.slice(0, 10).map((cita, index) => {
                const citaId = cita.id_cita || cita.id || index;
                const isExpanded = expandedCitaId === citaId;
                
                // Filtrar signos vitales relacionados con esta cita
                const signosVitalesCita = signosVitales?.filter(
                  signo => (signo.id_cita === citaId || signo.id_cita === cita.id_cita)
                ) || [];
                
                // Filtrar diagnósticos relacionados con esta cita
                const diagnosticosCita = diagnosticos?.filter(
                  diagnostico => (diagnostico.id_cita === citaId || diagnostico.id_cita === cita.id_cita)
                ) || [];
                
                // Formatear fecha y hora completa - usar formateo manual en español
                const fechaCompleta = cita.fecha_cita 
                  ? formatDateWithWeekday(new Date(cita.fecha_cita))
                  : formatFecha(cita.fecha_cita);
                
                const horaCompleta = cita.fecha_cita
                  ? new Date(cita.fecha_cita).toLocaleTimeString('es-MX', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';

                const handlePress = async () => {
                  hapticService.medium();
                  
                  if (isExpanded) {
                    // Contraer
                    setExpandedCitaId(null);
                  } else {
                    // Expandir
                    setExpandedCitaId(citaId);
                    
                    // Leer información completa con TTS
                    try {
                      let mensaje = `Cita del ${fechaCompleta}`;
                      if (horaCompleta) {
                        mensaje += ` a las ${horaCompleta}`;
                      }
                      if (cita.motivo) {
                        mensaje += `. Motivo: ${cita.motivo}`;
                      }
                      if (cita.doctor_nombre) {
                        mensaje += `. Con el doctor ${cita.doctor_nombre}`;
                      }
                      if (cita.observaciones) {
                        mensaje += `. Observaciones: ${cita.observaciones}`;
                      }
                      if (cita.estado) {
                        mensaje += `. Estado: ${cita.estado}`;
                      }
                      
                      // Agregar signos vitales si hay
                      if (signosVitalesCita.length > 0) {
                        mensaje += `. Signos vitales registrados: ${signosVitalesCita.length}`;
                      }
                      
                      // Agregar diagnósticos si hay
                      if (diagnosticosCita.length > 0) {
                        mensaje += `. Diagnósticos: ${diagnosticosCita.length}`;
                      }
                      
                      await speak(mensaje, {
                        variant: 'information',
                        priority: 'medium'
                      });
                    } catch (error) {
                      Logger.error('Error en TTS de cita:', error);
                    }
                  }
                };

                return (
                  <TouchableOpacity
                    key={citaId}
                    style={[
                      styles.historialItem,
                      isExpanded && styles.historialItemExpanded
                    ]}
                    onPress={handlePress}
                    activeOpacity={0.7}
                  >
                    <View style={styles.citaHeader}>
                      <Text style={styles.historialFecha}>
                        {fechaCompleta}
                        {horaCompleta && ` - ${horaCompleta}`}
                      </Text>
                      <Text style={styles.expandIndicator}>
                        {isExpanded ? '▼' : '▶'}
                      </Text>
                    </View>
                    
                    {/* Información básica (siempre visible) */}
                    {cita.motivo && (
                      <Text style={styles.historialDescription}>
                        Motivo: {cita.motivo}
                      </Text>
                    )}
                    {cita.doctor_nombre && (
                      <Text style={styles.historialDescription}>
                        Doctor: {cita.doctor_nombre}
                      </Text>
                    )}
                    
                    {/* Información expandida (solo cuando está expandida) */}
                    {isExpanded && (
                      <View style={styles.expandedContent}>
                        {cita.observaciones && (
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Observaciones:</Text>
                            <Text style={styles.infoValue}>{cita.observaciones}</Text>
                          </View>
                        )}
                        
                        {cita.estado && (
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Estado:</Text>
                            <Text style={[
                              styles.infoValue,
                              cita.estado === 'completada' && styles.estadoCompletada,
                              cita.estado === 'cancelada' && styles.estadoCancelada,
                              cita.estado === 'programada' && styles.estadoProgramada,
                            ]}>
                              {cita.estado.charAt(0).toUpperCase() + cita.estado.slice(1)}
                            </Text>
                          </View>
                        )}
                        
                        {cita.ubicacion && (
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Ubicación:</Text>
                            <Text style={styles.infoValue}>{cita.ubicacion}</Text>
                          </View>
                        )}
                        
                        {cita.duracion && (
                          <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Duración:</Text>
                            <Text style={styles.infoValue}>{cita.duracion} minutos</Text>
                          </View>
                        )}
                        
                        {/* Signos Vitales de la cita */}
                        {signosVitalesCita.length > 0 && (
                          <View style={styles.sectionExpandida}>
                            <Text style={styles.sectionExpandidaTitle}>
                              💓 Signos Vitales Registrados
                            </Text>
                            <View style={styles.signosGrid}>
                              {signosVitalesCita[0].peso_kg && (
                                <View style={styles.signoItem}>
                                  <Text style={styles.signoLabel}>Peso:</Text>
                                  <Text style={styles.signoValue}>{signosVitalesCita[0].peso_kg} kg</Text>
                                </View>
                              )}
                              {signosVitalesCita[0].talla_m && (
                                <View style={styles.signoItem}>
                                  <Text style={styles.signoLabel}>Talla:</Text>
                                  <Text style={styles.signoValue}>{signosVitalesCita[0].talla_m} m</Text>
                                </View>
                              )}
                              {signosVitalesCita[0].imc && (
                                <View style={styles.signoItem}>
                                  <Text style={styles.signoLabel}>IMC:</Text>
                                  <Text style={styles.signoValue}>{signosVitalesCita[0].imc}</Text>
                                </View>
                              )}
                              {signosVitalesCita[0].medida_cintura_cm && (
                                <View style={styles.signoItem}>
                                  <Text style={styles.signoLabel}>Cintura:</Text>
                                  <Text style={styles.signoValue}>{signosVitalesCita[0].medida_cintura_cm} cm</Text>
                                </View>
                              )}
                              {signosVitalesCita[0].presion_sistolica && (
                                <View style={styles.signoItem}>
                                  <Text style={styles.signoLabel}>Presión:</Text>
                                  <Text style={styles.signoValue}>
                                    {signosVitalesCita[0].presion_sistolica}/{signosVitalesCita[0].presion_diastolica || ''} mmHg
                                  </Text>
                                </View>
                              )}
                              {signosVitalesCita[0].glucosa_mg_dl && (
                                <View style={styles.signoItem}>
                                  <Text style={styles.signoLabel}>Glucosa:</Text>
                                  <Text style={styles.signoValue}>{signosVitalesCita[0].glucosa_mg_dl} mg/dL</Text>
                                </View>
                              )}
                              {signosVitalesCita[0].colesterol_mg_dl && (
                                <View style={styles.signoItem}>
                                  <Text style={styles.signoLabel}>Colesterol:</Text>
                                  <Text style={styles.signoValue}>{signosVitalesCita[0].colesterol_mg_dl} mg/dL</Text>
                                </View>
                              )}
                              {signosVitalesCita[0].trigliceridos_mg_dl && (
                                <View style={styles.signoItem}>
                                  <Text style={styles.signoLabel}>Triglicéridos:</Text>
                                  <Text style={styles.signoValue}>{signosVitalesCita[0].trigliceridos_mg_dl} mg/dL</Text>
                                </View>
                              )}
                              {signosVitalesCita[0].frecuencia_cardiaca && (
                                <View style={styles.signoItem}>
                                  <Text style={styles.signoLabel}>Frecuencia:</Text>
                                  <Text style={styles.signoValue}>{signosVitalesCita[0].frecuencia_cardiaca} bpm</Text>
                                </View>
                              )}
                              {signosVitalesCita[0].temperatura && (
                                <View style={styles.signoItem}>
                                  <Text style={styles.signoLabel}>Temperatura:</Text>
                                  <Text style={styles.signoValue}>{signosVitalesCita[0].temperatura} °C</Text>
                                </View>
                              )}
                              {signosVitalesCita[0].saturacion_oxigeno && (
                                <View style={styles.signoItem}>
                                  <Text style={styles.signoLabel}>Saturación:</Text>
                                  <Text style={styles.signoValue}>{signosVitalesCita[0].saturacion_oxigeno} %</Text>
                                </View>
                              )}
                            </View>
                            {/* Observaciones de signos vitales */}
                            {signosVitalesCita[0].observaciones && (
                              <View style={styles.observacionesContainer}>
                                <Text style={styles.observacionesLabel}>📝 Observaciones:</Text>
                                <Text style={styles.observacionesText}>{signosVitalesCita[0].observaciones}</Text>
                              </View>
                            )}
                          </View>
                        )}
                        
                        {/* Diagnósticos de la cita */}
                        {diagnosticosCita.length > 0 && (
                          <View style={styles.sectionExpandida}>
                            <Text style={styles.sectionExpandidaTitle}>
                              🩺 Diagnósticos Realizados
                            </Text>
                            {diagnosticosCita.map((diagnostico, diagIndex) => (
                              <View key={diagnostico.id_diagnostico || diagIndex} style={styles.diagnosticoItem}>
                                <Text style={styles.diagnosticoText}>
                                  {diagnostico.descripcion || 'Sin descripción'}
                                </Text>
                                {diagnostico.fecha_registro && (
                                  <Text style={styles.diagnosticoFecha}>
                                    {formatFecha(diagnostico.fecha_registro)}
                                  </Text>
                                )}
                              </View>
                            ))}
                          </View>
                        )}
                        
                        <Text style={styles.expandHint}>
                          Presiona de nuevo para cerrar
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={styles.emptyText}>No hay citas registradas</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORES.NAV_PACIENTE_FONDO,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORES.FONDO_CARD,
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
  },
  backButtonText: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
    fontWeight: '600',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORES.EXITO,
    textAlign: 'center',
  },
  listenButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORES.NAV_FILTROS_ACTIVOS,
    borderWidth: 1,
    borderColor: COLORES.NAV_PRIMARIO,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listenButtonText: {
    fontSize: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: COLORES.BORDE_CLARO,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#4CAF50',
  },
  tabText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORES.TEXTO_SECUNDARIO,
  },
  tabTextActive: {
    color: COLORES.TEXTO_EN_PRIMARIO,
  },
  tabContent: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORES.NAV_PACIENTE,
    marginBottom: 12,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORES.EXITO,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  valuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%', // 2 columnas con gap de 12
    marginBottom: 12,
  },
  historialItem: {
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
  },
  historialItemExpanded: {
    borderWidth: 2,
    borderColor: COLORES.NAV_PACIENTE,
    backgroundColor: COLORES.FONDO_VERDE_SUAVE,
  },
  citaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expandIndicator: {
    fontSize: 16,
    color: COLORES.NAV_PACIENTE,
    fontWeight: 'bold',
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORES.BORDE_CLARO,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    lineHeight: 20,
  },
  estadoCompletada: {
    color: COLORES.NAV_PACIENTE,
    fontWeight: 'bold',
  },
  estadoCancelada: {
    color: COLORES.ERROR_LIGHT,
    fontWeight: 'bold',
  },
  estadoProgramada: {
    color: COLORES.NAV_PRIMARIO,
    fontWeight: 'bold',
  },
  expandHint: {
    fontSize: 12,
    color: COLORES.TEXTO_SECUNDARIO,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  sectionExpandida: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORES.BORDE_CLARO,
  },
  sectionExpandidaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORES.EXITO,
    marginBottom: 12,
  },
  signosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  signoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORES.FONDO_VERDE_SUAVE,
    padding: 8,
    borderRadius: 8,
    minWidth: '45%',
    borderWidth: 1,
    borderColor: COLORES.BORDE_VERDE_SUAVE,
  },
  signoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
    marginRight: 6,
  },
  signoValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORES.EXITO,
  },
  diagnosticoItem: {
    backgroundColor: COLORES.FONDO_VERDE_SUAVE,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORES.BORDE_VERDE_SUAVE,
  },
  diagnosticoText: {
    fontSize: 14,
    color: COLORES.TEXTO_PRIMARIO,
    fontWeight: '600',
    marginBottom: 4,
  },
  diagnosticoFecha: {
    fontSize: 12,
    color: COLORES.TEXTO_SECUNDARIO,
    fontStyle: 'italic',
  },
  observacionesContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORES.BORDE_CLARO,
  },
  observacionesLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORES.EXITO,
    marginBottom: 6,
  },
  observacionesText: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    lineHeight: 20,
  },
  historialFecha: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 8,
  },
  historialValues: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  historialValue: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
  },
  historialDescription: {
    fontSize: 14,
    color: COLORES.TEXTO_SECUNDARIO,
    marginTop: 4,
  },
  emptyText: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
    marginTop: 40,
    fontStyle: 'italic',
  },
  // Estilos para Gráfico de Barras Apiladas Evolutivo
  graficoContainer: {
    marginTop: 12,
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
    elevation: 3,
    shadowColor: COLORES.NEGRO,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: '100%',
  },
  graficoTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORES.EXITO,
    textAlign: 'center',
    marginBottom: 8,
  },
  graficoSubtitle: {
    fontSize: 12,
    color: COLORES.TEXTO_SECUNDARIO,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  graficoScrollUnico: {
    marginBottom: 20,
    maxHeight: 250,
  },
  graficoScrollContentUnico: {
    paddingHorizontal: 8,
    paddingBottom: 20,
  },
  graficoAreaUnico: {
    position: 'relative',
    backgroundColor: COLORES.FONDO_SECUNDARIO,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
    overflow: 'hidden',
  },
  ejeYUnico: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 50,
    width: 50,
    justifyContent: 'space-between',
    paddingVertical: 12,
    alignItems: 'flex-end',
    paddingRight: 8,
  },
  labelYUnico: {
    fontSize: 11,
    color: COLORES.TEXTO_SECUNDARIO,
    fontWeight: '600',
  },
  areaTrazadoUnico: {
    position: 'absolute',
    left: 50,
    right: 0,
    top: 0,
    bottom: 50,
  },
  svgChartUnico: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  areaTactilUnico: {
    position: 'absolute',
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  ejeXUnico: {
    position: 'absolute',
    left: 50,
    right: 0,
    bottom: 0,
    height: 50,
    flexDirection: 'row',
  },
  marcaXUnico: {
    position: 'absolute',
    bottom: 8,
    alignItems: 'center',
    minWidth: 60,
  },
  labelXUnico: {
    fontSize: 10,
    color: COLORES.TEXTO_SECUNDARIO,
    fontWeight: '600',
    textAlign: 'center',
  },
  referenciasContainer: {
    backgroundColor: COLORES.FONDO_VERDE_SUAVE,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORES.BORDE_VERDE_SUAVE,
    marginTop: 8,
  },
  referenciasTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORES.EXITO,
    marginBottom: 4,
  },
  referenciasText: {
    fontSize: 11,
    color: COLORES.TEXTO_SECUNDARIO,
    marginBottom: 4,
  },
  referenciasHint: {
    fontSize: 10,
    color: COLORES.TEXTO_SECUNDARIO,
    fontStyle: 'italic',
    marginTop: 4,
  },
  exportContainer: {
    backgroundColor: COLORES.FONDO,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
  },
  exportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 12,
    textAlign: 'center',
  },
  exportButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  exportButton: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
    elevation: 2,
    shadowColor: COLORES.NEGRO,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  exportButtonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  exportButtonText: {
    fontSize: 12,
    color: COLORES.TEXTO_PRIMARIO,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default HistorialMedico;


