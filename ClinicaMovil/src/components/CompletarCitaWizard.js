import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Card, Title, Paragraph, Button, IconButton } from 'react-native-paper';
import { gestionService } from '../api/gestionService';
import Logger from '../services/logger';
import { formatDateTime } from '../utils/dateUtils';
import { usePacienteComorbilidades } from '../hooks/usePacienteMedicalData';

const PASOS = [
  { id: 'asistencia', titulo: 'Confirmar Asistencia', numero: 1, requerido: true },
  { id: 'signos_vitales', titulo: 'Signos Vitales', numero: 2, requerido: false },
  { id: 'observaciones', titulo: 'Observaciones', numero: 3, requerido: false, recomendado: true },
  { id: 'diagnostico', titulo: 'Diagnóstico', numero: 4, requerido: false },
  { id: 'plan_medicacion', titulo: 'Plan Medicación', numero: 5, requerido: false },
];

const CompletarCitaWizard = ({ 
  visible, 
  onClose, 
  cita,
  onSuccess 
}) => {
  const [pasoActual, setPasoActual] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const [pasosCompletados, setPasosCompletados] = useState(new Set());
  
  // Estados de cada paso
  const [asistencia, setAsistencia] = useState(null);
  const [motivoNoAsistencia, setMotivoNoAsistencia] = useState('');
  const [signosVitales, setSignosVitales] = useState({
    peso_kg: '',
    talla_m: '',
    medida_cintura_cm: '',
    presion_sistolica: '',
    presion_diastolica: '',
    glucosa_mg_dl: '',
    colesterol_mg_dl: '',
    colesterol_ldl: '', // ✅ Colesterol LDL - Solo para pacientes con diagnóstico
    colesterol_hdl: '', // ✅ Colesterol HDL - Solo para pacientes con diagnóstico
    trigliceridos_mg_dl: '',
    hba1c_porcentaje: '', // ✅ HbA1c (%) - Campo obligatorio para criterios de acreditación
    edad_paciente_en_medicion: '', // ✅ Edad en medición (para validar rangos de HbA1c)
    edadEditable: false, // Flag para permitir edición manual de la edad
    observaciones: ''
  });
  const [observaciones, setObservaciones] = useState('');
  const [diagnostico, setDiagnostico] = useState({ descripcion: '' });
  const [planMedicacion, setPlanMedicacion] = useState({
    observaciones: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: '',
    medicamentos: []
  });
  const [marcarComoAtendida, setMarcarComoAtendida] = useState(false);

  // ✅ Obtener ID del paciente desde la cita
  const pacienteId = useMemo(() => {
    if (!cita) return null;
    return cita.id_paciente || cita.Paciente?.id_paciente || cita.paciente?.id_paciente;
  }, [cita]);

  // ✅ Obtener comorbilidades del paciente para verificar Hipercolesterolemia
  const { comorbilidades: comorbilidadesPaciente } = usePacienteComorbilidades(pacienteId, {
    autoFetch: !!pacienteId && visible
  });

  // ✅ Función para verificar si el paciente tiene diagnóstico de Hipercolesterolemia/Dislipidemia
  const tieneHipercolesterolemia = useCallback(() => {
    if (!comorbilidadesPaciente || comorbilidadesPaciente.length === 0) {
      return false;
    }
    
    const nombresRelevantes = ['Dislipidemia', 'Hipercolesterolemia', 'dislipidemia', 'hipercolesterolemia'];
    
    return comorbilidadesPaciente.some(comorbilidad => {
      const nombre = comorbilidad.nombre || comorbilidad.nombre_comorbilidad || '';
      return nombresRelevantes.some(relevante => 
        nombre.toLowerCase().includes(relevante.toLowerCase())
      );
    });
  }, [comorbilidadesPaciente]);

  // ✅ Función para verificar si el paciente tiene diagnóstico de Hipertrigliceridemia
  const tieneHipertrigliceridemia = useCallback(() => {
    if (!comorbilidadesPaciente || comorbilidadesPaciente.length === 0) {
      return false;
    }
    
    const nombresRelevantes = ['Hipertrigliceridemia', 'hipertrigliceridemia', 'trigliceridos', 'triglicéridos'];
    
    return comorbilidadesPaciente.some(comorbilidad => {
      const nombre = comorbilidad.nombre || comorbilidad.nombre_comorbilidad || '';
      return nombresRelevantes.some(relevante => 
        nombre.toLowerCase().includes(relevante.toLowerCase())
      );
    });
  }, [comorbilidadesPaciente]);

  // ✅ Función para calcular edad desde fecha de nacimiento
  const calcularEdad = useCallback((fechaNacimiento) => {
    if (!fechaNacimiento) return null;
    try {
      const fechaNac = new Date(fechaNacimiento);
      const hoy = new Date();
      let edad = hoy.getFullYear() - fechaNac.getFullYear();
      const mes = hoy.getMonth() - fechaNac.getMonth();
      if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNac.getDate())) {
        edad--;
      }
      return edad >= 0 && edad <= 150 ? edad : null;
    } catch (error) {
      return null;
    }
  }, []);

  // ✅ Obtener fecha de nacimiento del paciente desde la cita
  const fechaNacimientoPaciente = useMemo(() => {
    if (!cita) return null;
    return cita.Paciente?.fecha_nacimiento || cita.paciente?.fecha_nacimiento || cita.fecha_nacimiento;
  }, [cita]);

  // ✅ Calcular edad automáticamente cuando cambia la fecha de nacimiento
  useEffect(() => {
    if (fechaNacimientoPaciente && !signosVitales.edadEditable) {
      const edadCalculada = calcularEdad(fechaNacimientoPaciente);
      if (edadCalculada !== null) {
        const edadActual = signosVitales.edad_paciente_en_medicion;
        if (edadActual !== edadCalculada.toString()) {
          setSignosVitales(prev => ({
            ...prev,
            edad_paciente_en_medicion: edadCalculada.toString()
          }));
        }
      }
    }
  }, [fechaNacimientoPaciente, signosVitales.edadEditable, calcularEdad]);

  // Cargar datos existentes de la cita
  useEffect(() => {
    if (visible && cita) {
      setAsistencia(cita.asistencia);
      setMotivoNoAsistencia(cita.motivo_no_asistencia || '');
      setObservaciones(cita.observaciones || '');
      
      // Cargar signos vitales si existen
      if (cita.SignosVitales && cita.SignosVitales.length > 0) {
        const sv = cita.SignosVitales[0];
        const edadCalculada = calcularEdad(fechaNacimientoPaciente);
        setSignosVitales({
          peso_kg: sv.peso_kg?.toString() || '',
          talla_m: sv.talla_m?.toString() || '',
          medida_cintura_cm: sv.medida_cintura_cm?.toString() || '',
          presion_sistolica: sv.presion_sistolica?.toString() || '',
          presion_diastolica: sv.presion_diastolica?.toString() || '',
          glucosa_mg_dl: sv.glucosa_mg_dl?.toString() || '',
          colesterol_mg_dl: sv.colesterol_mg_dl?.toString() || '',
          colesterol_ldl: sv.colesterol_ldl?.toString() || '', // ✅ Colesterol LDL
          colesterol_hdl: sv.colesterol_hdl?.toString() || '', // ✅ Colesterol HDL
          trigliceridos_mg_dl: sv.trigliceridos_mg_dl?.toString() || '',
          hba1c_porcentaje: sv.hba1c_porcentaje?.toString() || '', // ✅ HbA1c (%)
          edad_paciente_en_medicion: sv.edad_paciente_en_medicion?.toString() || (edadCalculada ? edadCalculada.toString() : ''), // ✅ Edad en medición
          edadEditable: false, // ✅ Asegurar que esté deshabilitado por defecto
          observaciones: sv.observaciones || ''
        });
        setPasosCompletados(prev => new Set([...prev, 'signos_vitales']));
      } else if (fechaNacimientoPaciente) {
        // Si no hay signos vitales pero hay fecha de nacimiento, calcular edad automáticamente
        const edadCalculada = calcularEdad(fechaNacimientoPaciente);
        if (edadCalculada) {
          setSignosVitales(prev => ({
            ...prev,
            edad_paciente_en_medicion: edadCalculada.toString(),
            edadEditable: false // ✅ Asegurar que esté deshabilitado por defecto
          }));
        }
      }
      
      // Cargar diagnóstico si existe
      if (cita.Diagnosticos && cita.Diagnosticos.length > 0) {
        setDiagnostico({ descripcion: cita.Diagnosticos[0].descripcion || '' });
        setPasosCompletados(prev => new Set([...prev, 'diagnostico']));
      }
      
      // Marcar pasos completados
      if (cita.asistencia !== null) {
        setPasosCompletados(prev => new Set([...prev, 'asistencia']));
      }
      if (cita.observaciones) {
        setPasosCompletados(prev => new Set([...prev, 'observaciones']));
      }
    }
  }, [visible, cita]);

  // Resetear cuando se cierra
  useEffect(() => {
    if (!visible) {
      setPasoActual(0);
      setGuardando(false);
      setPasosCompletados(new Set());
      setAsistencia(null);
      setMotivoNoAsistencia('');
      setSignosVitales({
        peso_kg: '',
        talla_m: '',
        medida_cintura_cm: '',
        presion_sistolica: '',
        presion_diastolica: '',
        glucosa_mg_dl: '',
        colesterol_mg_dl: '',
        colesterol_ldl: '', // ✅ Colesterol LDL
        colesterol_hdl: '', // ✅ Colesterol HDL
        trigliceridos_mg_dl: '',
        hba1c_porcentaje: '', // ✅ HbA1c (%)
        edad_paciente_en_medicion: '', // ✅ Edad en medición
        edadEditable: false, // ✅ Asegurar que esté deshabilitado por defecto
        observaciones: ''
      });
      setObservaciones('');
      setDiagnostico({ descripcion: '' });
      setPlanMedicacion({
        observaciones: '',
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: '',
        medicamentos: []
      });
      setMarcarComoAtendida(false);
    }
  }, [visible]);

  // Autoseleccionar "Marcar como atendida" cuando el paciente asistió
  useEffect(() => {
    if (asistencia === true) {
      setMarcarComoAtendida(true);
    } else if (asistencia === false) {
      setMarcarComoAtendida(false);
    }
  }, [asistencia]);

  const guardarPaso = async (paso, datosPaso, omitir = false) => {
    if (omitir) {
      setPasosCompletados(prev => new Set([...prev, paso]));
      return true;
    }

    setGuardando(true);
    try {
      const wizardData = {
        paso,
        ...datosPaso
      };

      const response = await gestionService.completarCitaWizard(cita.id_cita, wizardData);

      if (response.success) {
        setPasosCompletados(prev => new Set([...prev, paso]));
        Logger.success(`Paso "${paso}" guardado exitosamente`);
        return true;
      } else {
        Alert.alert('Error', response.error || 'No se pudo guardar el paso');
        return false;
      }
    } catch (error) {
      Logger.error('Error guardando paso del wizard', error);
      Alert.alert('Error', 'No se pudo guardar el paso. Intenta de nuevo.');
      return false;
    } finally {
      setGuardando(false);
    }
  };

  const handleSiguiente = async () => {
    const paso = PASOS[pasoActual];
    
    // Validar paso de asistencia (requerido)
    if (paso.id === 'asistencia' && asistencia === null) {
      Alert.alert('Validación', 'Debes confirmar si el paciente asistió o no');
      return;
    }

    // Guardar paso actual
    let datosPaso = {};
    let omitir = false;

    switch (paso.id) {
      case 'asistencia':
        datosPaso = {
          asistencia,
          motivo_no_asistencia: !asistencia ? motivoNoAsistencia : null
        };
        break;
      case 'signos_vitales':
        const tieneSignos = signosVitales.peso_kg || signosVitales.talla_m || 
                           signosVitales.presion_sistolica || signosVitales.glucosa_mg_dl ||
                           signosVitales.medida_cintura_cm || signosVitales.colesterol_mg_dl ||
                           signosVitales.trigliceridos_mg_dl || signosVitales.hba1c_porcentaje ||
                           signosVitales.colesterol_ldl || signosVitales.colesterol_hdl;
        if (!tieneSignos) {
          omitir = true;
        } else {
          datosPaso = { signos_vitales: signosVitales };
        }
        break;
      case 'observaciones':
        if (!observaciones.trim()) {
          const confirmar = await new Promise(resolve => {
            Alert.alert(
              'Observaciones vacías',
              '¿Deseas omitir las observaciones? Se recomienda agregar observaciones de la consulta.',
              [
                { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Omitir', onPress: () => resolve(true) }
              ]
            );
          });
          if (!confirmar) return;
          omitir = true;
        } else {
          datosPaso = { observaciones };
        }
        break;
      case 'diagnostico':
        if (!diagnostico.descripcion.trim()) {
          omitir = true;
        } else {
          datosPaso = { diagnostico };
        }
        break;
      case 'plan_medicacion':
        const tienePlan = planMedicacion.observaciones || planMedicacion.medicamentos.length > 0;
        if (!tienePlan) {
          omitir = true;
        } else {
          datosPaso = { plan_medicacion: planMedicacion };
        }
        break;
    }

    const guardado = await guardarPaso(paso.id, datosPaso, omitir);
    if (guardado) {
      if (pasoActual < PASOS.length - 1) {
        setPasoActual(pasoActual + 1);
      } else {
        // Último paso, mostrar resumen
        mostrarResumen();
      }
    }
  };

  const handleAtras = () => {
    if (pasoActual > 0) {
      setPasoActual(pasoActual - 1);
    }
  };

  const mostrarResumen = () => {
    // Ir al paso de resumen (paso 6, fuera del array)
    setPasoActual(PASOS.length); // Esto mostrará el resumen
  };

  const handleFinalizar = async () => {
    setGuardando(true);
    try {
      // Guardar todos los datos pendientes en el paso final
      const datosFinal = {
        paso: 'finalizar',
        asistencia,
        motivo_no_asistencia: !asistencia ? motivoNoAsistencia : null,
        observaciones,
        marcar_como_atendida: marcarComoAtendida
      };

      // Agregar datos opcionales si existen
      const tieneSignos = signosVitales.peso_kg || signosVitales.talla_m || 
                         signosVitales.presion_sistolica || signosVitales.glucosa_mg_dl ||
                         signosVitales.medida_cintura_cm || signosVitales.colesterol_mg_dl ||
                         signosVitales.trigliceridos_mg_dl || signosVitales.hba1c_porcentaje ||
                         signosVitales.colesterol_ldl || signosVitales.colesterol_hdl;
      if (tieneSignos) {
        datosFinal.signos_vitales = signosVitales;
      }

      if (diagnostico.descripcion.trim()) {
        datosFinal.diagnostico = diagnostico;
      }

      const tienePlan = planMedicacion.observaciones || planMedicacion.medicamentos.length > 0;
      if (tienePlan) {
        datosFinal.plan_medicacion = planMedicacion;
      }

      const response = await gestionService.completarCitaWizard(cita.id_cita, datosFinal);

      if (response.success) {
        Alert.alert('Éxito', 'Cita completada exitosamente', [
          { text: 'OK', onPress: () => {
            onSuccess && onSuccess();
            onClose();
          }}
        ]);
      } else {
        Alert.alert('Error', response.error || 'No se pudo completar la cita');
      }
    } catch (error) {
      Logger.error('Error finalizando wizard', error);
      Alert.alert('Error', 'No se pudo completar la cita. Intenta de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const renderPaso = () => {
    if (pasoActual >= PASOS.length) {
      // Resumen
      return renderResumen();
    }

    const paso = PASOS[pasoActual];

    switch (paso.id) {
      case 'asistencia':
        return renderPasoAsistencia();
      case 'signos_vitales':
        return renderPasoSignosVitales();
      case 'observaciones':
        return renderPasoObservaciones();
      case 'diagnostico':
        return renderPasoDiagnostico();
      case 'plan_medicacion':
        return renderPasoPlanMedicacion();
      default:
        return null;
    }
  };

  const renderPasoAsistencia = () => (
    <View style={styles.pasoContainer}>
      <Text style={styles.pasoTitulo}>¿El paciente asistió a la cita?</Text>
      
      <View style={styles.opcionesContainer}>
        <TouchableOpacity
          style={[styles.opcionButton, asistencia === true && styles.opcionButtonActiva]}
          onPress={() => setAsistencia(true)}
        >
          <Text style={[styles.opcionTexto, asistencia === true && styles.opcionTextoActiva]}>
            ✅ Sí, asistió
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.opcionButton, asistencia === false && styles.opcionButtonActiva]}
          onPress={() => setAsistencia(false)}
        >
          <Text style={[styles.opcionTexto, asistencia === false && styles.opcionTextoActiva]}>
            ❌ No asistió
          </Text>
        </TouchableOpacity>
      </View>

      {asistencia === false && (
        <View style={styles.motivoContainer}>
          <Text style={styles.label}>Motivo de no asistencia (Opcional):</Text>
          <TextInput
            style={styles.textArea}
            value={motivoNoAsistencia}
            onChangeText={setMotivoNoAsistencia}
            placeholder="Ej: Enfermedad, emergencia familiar..."
            multiline
            numberOfLines={3}
          />
        </View>
      )}
    </View>
  );

  const renderPasoSignosVitales = () => (
    <View style={styles.pasoContainer}>
      <Text style={styles.pasoTitulo}>Signos Vitales (Opcional)</Text>
      <Text style={styles.pasoSubtitulo}>Puedes omitir este paso si no se registraron signos vitales</Text>
      
      <View style={styles.formRow}>
        <View style={styles.formField}>
          <Text style={styles.label}>Peso (kg)</Text>
          <TextInput
            style={styles.input}
            value={signosVitales.peso_kg}
            onChangeText={(text) => setSignosVitales({...signosVitales, peso_kg: text})}
            placeholder="Ej: 75.5"
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.formField}>
          <Text style={styles.label}>Talla (m)</Text>
          <TextInput
            style={styles.input}
            value={signosVitales.talla_m}
            onChangeText={(text) => setSignosVitales({...signosVitales, talla_m: text})}
            placeholder="Ej: 1.70"
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      {signosVitales.peso_kg && signosVitales.talla_m && (
        <View style={styles.imcContainer}>
          <Text style={styles.imcTexto}>
            IMC: {(
              parseFloat(signosVitales.peso_kg) / 
              (parseFloat(signosVitales.talla_m) * parseFloat(signosVitales.talla_m))
            ).toFixed(2)}
          </Text>
        </View>
      )}

      <View style={styles.formRow}>
        <View style={styles.formField}>
          <Text style={styles.label}>Presión Sistólica</Text>
          <TextInput
            style={styles.input}
            value={signosVitales.presion_sistolica}
            onChangeText={(text) => setSignosVitales({...signosVitales, presion_sistolica: text})}
            placeholder="Ej: 120"
            keyboardType="numeric"
          />
        </View>
        <View style={styles.formField}>
          <Text style={styles.label}>Presión Diastólica</Text>
          <TextInput
            style={styles.input}
            value={signosVitales.presion_diastolica}
            onChangeText={(text) => setSignosVitales({...signosVitales, presion_diastolica: text})}
            placeholder="Ej: 80"
            keyboardType="numeric"
          />
        </View>
      </View>

      <View style={styles.formRow}>
        <View style={styles.formField}>
          <Text style={styles.label}>Glucosa (mg/dl)</Text>
          <TextInput
            style={styles.input}
            value={signosVitales.glucosa_mg_dl}
            onChangeText={(text) => setSignosVitales({...signosVitales, glucosa_mg_dl: text})}
            placeholder="Ej: 95"
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.formField}>
          <Text style={styles.label}>Cintura (cm)</Text>
          <TextInput
            style={styles.input}
            value={signosVitales.medida_cintura_cm}
            onChangeText={(text) => setSignosVitales({...signosVitales, medida_cintura_cm: text})}
            placeholder="Ej: 85"
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <View style={styles.formRow}>
        <View style={styles.formField}>
          <Text style={styles.label}>Colesterol Total * (mg/dl)</Text>
          <Text style={styles.labelHint}>Campo obligatorio para criterios de acreditación</Text>
          <TextInput
            style={styles.input}
            value={signosVitales.colesterol_mg_dl}
            onChangeText={(text) => setSignosVitales({...signosVitales, colesterol_mg_dl: text})}
            placeholder="Ej: 180"
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      {/* ✅ Triglicéridos - Solo para pacientes con diagnóstico de Hipertrigliceridemia */}
      {tieneHipertrigliceridemia() && (
        <View style={styles.formRow}>
          <View style={styles.formField}>
            <Text style={styles.label}>Triglicéridos * (mg/dl)</Text>
            <Text style={styles.labelHint}>(Solo para pacientes con diagnóstico de Hipertrigliceridemia)</Text>
            <TextInput
              style={styles.input}
              value={signosVitales.trigliceridos_mg_dl}
              onChangeText={(text) => setSignosVitales({...signosVitales, trigliceridos_mg_dl: text})}
              placeholder="Ej: 120"
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      )}

      {/* ✅ Perfil Lipídico - Solo para pacientes con diagnóstico de Hipercolesterolemia/Dislipidemia */}
      {tieneHipercolesterolemia() && (
        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>📊 Perfil Lipídico</Text>
          <Text style={styles.labelHint}>(Solo para pacientes con diagnóstico de Hipercolesterolemia/Dislipidemia)</Text>
          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.label}>Colesterol LDL (mg/dl)</Text>
              <TextInput
                style={styles.input}
                value={signosVitales.colesterol_ldl}
                onChangeText={(text) => setSignosVitales({...signosVitales, colesterol_ldl: text})}
                placeholder="Ej: 100"
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.formField}>
              <Text style={styles.label}>Colesterol HDL (mg/dl)</Text>
              <TextInput
                style={styles.input}
                value={signosVitales.colesterol_hdl}
                onChangeText={(text) => setSignosVitales({...signosVitales, colesterol_hdl: text})}
                placeholder="Ej: 40"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>
      )}

      {/* ✅ HbA1c (%) - Campo obligatorio para criterios de acreditación */}
      <View style={styles.formRow}>
        <View style={styles.formField}>
          <View style={{ height: 44, justifyContent: 'flex-end' }}>
            <Text style={styles.label}>HbA1c (%) *</Text>
          </View>
          <View style={{ height: 18, justifyContent: 'center' }}>
            <Text style={styles.labelHint} numberOfLines={1}>Campo obligatorio para criterios de acreditación</Text>
          </View>
          <TextInput
            style={styles.input}
            value={signosVitales.hba1c_porcentaje}
            onChangeText={(text) => setSignosVitales({...signosVitales, hba1c_porcentaje: text})}
            placeholder="Ej: 6.5"
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.formField}>
          <View style={{ height: 44, justifyContent: 'flex-end' }}>
            <Text style={styles.label}>Edad en Medición (años) *</Text>
          </View>
          <View style={{ height: 18, justifyContent: 'center' }}>
            <Text style={styles.labelHint} numberOfLines={1}>
              {fechaNacimientoPaciente ? 'Calculado automáticamente' : 'Para validar rangos de HbA1c'}
            </Text>
          </View>
          <TextInput
            style={[
              styles.input,
              fechaNacimientoPaciente && !signosVitales.edadEditable && styles.inputDisabled
            ]}
            value={signosVitales.edad_paciente_en_medicion || ''}
            onChangeText={(text) => {
              setSignosVitales({...signosVitales, edad_paciente_en_medicion: text});
            }}
            placeholder={fechaNacimientoPaciente ? "Calculado automáticamente" : "Ej: 45"}
            keyboardType="number-pad"
            editable={fechaNacimientoPaciente ? signosVitales.edadEditable : true}
          />
        </View>
      </View>
      {/* Texto informativo de edad calculada - Fuera del formRow para no afectar la alineación */}
      {fechaNacimientoPaciente && (
        <View style={{ marginTop: 6, marginLeft: '50%', paddingLeft: 8, paddingRight: 8, flex: 1 }}>
          <Text 
            style={{ 
              fontSize: 12, 
              color: '#3182CE', 
              marginBottom: 4,
              flexWrap: 'wrap'
            }}
          >
            ✓ Calculado automáticamente
          </Text>
          {!signosVitales.edadEditable && (
            <TouchableOpacity
              onPress={() => {
                setSignosVitales({...signosVitales, edadEditable: true});
              }}
              style={{ paddingVertical: 2, alignSelf: 'flex-start' }}
            >
              <Text style={{ fontSize: 12, color: '#3182CE', textDecorationLine: 'underline' }}>
                Editar Manualmente
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {signosVitales.hba1c_porcentaje && signosVitales.edad_paciente_en_medicion && (
        <View style={{ backgroundColor: '#fff3cd', padding: 12, borderRadius: 8, marginTop: 8 }}>
          <Text style={{ fontSize: 12, color: '#856404' }}>
            {(() => {
              const edad = parseInt(signosVitales.edad_paciente_en_medicion, 10);
              const hba1c = parseFloat(signosVitales.hba1c_porcentaje);
              if (isNaN(edad) || isNaN(hba1c)) return '';
              if (edad >= 20 && edad < 60) {
                return hba1c > 7.0 
                  ? `⚠️ HbA1c por encima del objetivo para 20-59 años (objetivo: <7%)`
                  : `✅ HbA1c dentro del objetivo para 20-59 años (objetivo: <7%)`;
              } else if (edad >= 60) {
                return hba1c > 8.0
                  ? `⚠️ HbA1c por encima del objetivo para 60+ años (objetivo: <8%)`
                  : `✅ HbA1c dentro del objetivo para 60+ años (objetivo: <8%)`;
              }
              return '';
            })()}
          </Text>
        </View>
      )}

      <Text style={styles.label}>Observaciones (Opcional)</Text>
      <TextInput
        style={styles.textArea}
        value={signosVitales.observaciones}
        onChangeText={(text) => setSignosVitales({...signosVitales, observaciones: text})}
        placeholder="Notas adicionales sobre los signos vitales..."
        multiline
        numberOfLines={3}
      />
    </View>
  );

  const renderPasoObservaciones = () => (
    <View style={styles.pasoContainer}>
      <Text style={styles.pasoTitulo}>Observaciones de la Consulta</Text>
      <Text style={styles.pasoSubtitulo}>
        💡 Campo principal - Aquí puedes registrar todo lo importante de la consulta
      </Text>
      
      <Text style={styles.label}>Observaciones:</Text>
      <TextInput
        style={[styles.textArea, styles.textAreaGrande]}
        value={observaciones}
        onChangeText={setObservaciones}
        placeholder="Ej: Paciente presenta síntomas leves de resfriado. Se recomienda reposo y medicación sintomática..."
        multiline
        numberOfLines={8}
        textAlignVertical="top"
      />
      
      <View style={styles.tipContainer}>
        <Text style={styles.tipTexto}>
          💡 Tip: Aquí puedes registrar todo lo importante de la consulta, incluso si no hay un diagnóstico formal.
        </Text>
      </View>
    </View>
  );

  const renderPasoDiagnostico = () => (
    <View style={styles.pasoContainer}>
      <Text style={styles.pasoTitulo}>Diagnóstico (Opcional)</Text>
      <Text style={styles.pasoSubtitulo}>
        Solo completa si hay un diagnóstico formal
      </Text>
      
      <Text style={styles.label}>Descripción del diagnóstico:</Text>
      <TextInput
        style={[styles.textArea, styles.textAreaGrande]}
        value={diagnostico.descripcion}
        onChangeText={(text) => setDiagnostico({...diagnostico, descripcion: text})}
        placeholder="Ej: Diabetes tipo 2, Hipertensión arterial..."
        multiline
        numberOfLines={6}
        textAlignVertical="top"
      />
      
      <View style={styles.tipContainer}>
        <Text style={styles.tipTexto}>
          💡 Tip: Si no hay diagnóstico formal, puedes omitir este paso.
        </Text>
      </View>
    </View>
  );

  const renderPasoPlanMedicacion = () => (
    <View style={styles.pasoContainer}>
      <Text style={styles.pasoTitulo}>Plan de Medicación (Opcional)</Text>
      <Text style={styles.pasoSubtitulo}>
        Puedes omitir este paso si no se prescribió medicación
      </Text>
      
      <Text style={styles.label}>Observaciones del plan:</Text>
      <TextInput
        style={styles.textArea}
        value={planMedicacion.observaciones}
        onChangeText={(text) => setPlanMedicacion({...planMedicacion, observaciones: text})}
        placeholder="Instrucciones generales sobre la medicación..."
        multiline
        numberOfLines={4}
      />
      
      <View style={styles.tipContainer}>
        <Text style={styles.tipTexto}>
          💡 Tip: Para agregar medicamentos específicos, puedes hacerlo después desde el detalle del paciente.
        </Text>
      </View>
    </View>
  );

  const renderResumen = () => {
    const paso = PASOS[pasoActual] || { numero: PASOS.length + 1, titulo: 'Resumen' };
    
    return (
      <View style={styles.pasoContainer}>
        <Text style={styles.pasoTitulo}>Resumen - Revisa los datos antes de guardar</Text>
        
        <ScrollView style={styles.resumenContainer}>
          <View style={styles.resumenItem}>
            <Text style={styles.resumenLabel}>✅ Asistencia:</Text>
            <Text style={styles.resumenValor}>
              {asistencia === true ? 'Sí asistió' : asistencia === false ? 'No asistió' : 'No confirmada'}
            </Text>
            {asistencia === false && motivoNoAsistencia && (
              <Text style={styles.resumenSubvalor}>Motivo: {motivoNoAsistencia}</Text>
            )}
          </View>

          <View style={styles.resumenItem}>
            <Text style={styles.resumenLabel}>
              {pasosCompletados.has('signos_vitales') ? '✅' : '⚪'} Signos Vitales:
            </Text>
            <Text style={styles.resumenValor}>
              {pasosCompletados.has('signos_vitales') ? 'Registrados' : 'Omitidos'}
            </Text>
          </View>

          <View style={styles.resumenItem}>
            <Text style={styles.resumenLabel}>
              {pasosCompletados.has('observaciones') ? '✅' : '⚪'} Observaciones:
            </Text>
            <Text style={styles.resumenValor}>
              {observaciones ? observaciones.substring(0, 100) + (observaciones.length > 100 ? '...' : '') : 'Sin observaciones'}
            </Text>
          </View>

          <View style={styles.resumenItem}>
            <Text style={styles.resumenLabel}>
              {pasosCompletados.has('diagnostico') ? '✅' : '⚪'} Diagnóstico:
            </Text>
            <Text style={styles.resumenValor}>
              {diagnostico.descripcion ? diagnostico.descripcion : 'Sin diagnóstico'}
            </Text>
          </View>

          <View style={styles.resumenItem}>
            <Text style={styles.resumenLabel}>
              {pasosCompletados.has('plan_medicacion') ? '✅' : '⚪'} Plan Medicación:
            </Text>
            <Text style={styles.resumenValor}>
              {planMedicacion.observaciones || planMedicacion.medicamentos.length > 0 ? 'Registrado' : 'Omitido'}
            </Text>
          </View>
        </ScrollView>

        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setMarcarComoAtendida(!marcarComoAtendida)}
          >
            <View style={[styles.checkboxBox, marcarComoAtendida && styles.checkboxBoxChecked]}>
              {marcarComoAtendida && <Text style={styles.checkboxCheck}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Marcar como "Atendida"</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // No renderizar si no está visible
  if (!visible) return null;
  
  // Si está visible pero no hay cita, mostrar mensaje de carga
  if (!cita) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <View style={styles.headerTop}>
                <Title style={styles.modalTitle}>Completar Cita</Title>
                <TouchableOpacity onPress={onClose}>
                  <Text style={styles.closeButton}>X</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={[styles.content, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={{ textAlign: 'center', marginTop: 16, color: '#666', fontSize: 16 }}>
                Cargando datos de la cita...
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Obtener información del paso actual
  const paso = pasoActual < PASOS.length 
    ? PASOS[pasoActual] 
    : { numero: PASOS.length + 1, titulo: 'Resumen' };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}
        >
          <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <Title style={styles.modalTitle}>📋 Completar Cita</Title>
              <TouchableOpacity onPress={onClose} disabled={guardando}>
                <Text style={styles.closeButton}>X</Text>
              </TouchableOpacity>
            </View>
            
            {/* Barra de progreso */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressBarFill, 
                    { width: `${((pasoActual + 1) / (PASOS.length + 1)) * 100}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                Paso {paso.numero} de {PASOS.length + 1}
              </Text>
            </View>
          </View>

          {/* Contenido */}
          <ScrollView 
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
          >
            {renderPaso()}
          </ScrollView>

          {/* Footer con botones */}
          <View style={styles.footer}>
            {pasoActual > 0 && (
              <Button
                mode="outlined"
                onPress={handleAtras}
                disabled={guardando}
                style={styles.buttonAtras}
              >
                ← Atrás
              </Button>
            )}
            
            <View style={styles.buttonSpacer} />
            
            {pasoActual < PASOS.length ? (
              <Button
                mode="contained"
                onPress={handleSiguiente}
                disabled={guardando}
                loading={guardando}
                style={styles.buttonSiguiente}
              >
                Siguiente →
              </Button>
            ) : (
              <Button
                mode="contained"
                onPress={handleFinalizar}
                disabled={guardando}
                loading={guardando}
                style={styles.buttonFinalizar}
              >
                💾 Guardar y Finalizar
              </Button>
            )}
          </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    height: '85%',
    maxHeight: '90%',
    minHeight: 400,
    padding: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
    fontWeight: 'bold',
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
  },
  contentContainer: {
    padding: 16,
    flexGrow: 1,
  },
  pasoContainer: {
    flex: 1,
    width: '100%',
    minHeight: 200,
  },
  pasoTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  pasoSubtitulo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  opcionesContainer: {
    marginVertical: 16,
  },
  opcionButton: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    marginBottom: 12,
    backgroundColor: '#f5f5f5',
  },
  opcionButtonActiva: {
    borderColor: '#2196F3',
    backgroundColor: '#e3f2fd',
  },
  opcionTexto: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  opcionTextoActiva: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  motivoContainer: {
    marginTop: 16,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  formField: {
    flex: 1,
    marginRight: 8,
    minWidth: 0, // Permite que el contenido se ajuste correctamente
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  labelHint: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    fontStyle: 'italic',
    flexShrink: 1,
  },
  formSection: {
    marginTop: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#e0e0e0',
    color: '#666',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  textAreaGrande: {
    minHeight: 200,
  },
  imcContainer: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  imcTexto: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976d2',
    textAlign: 'center',
  },
  tipContainer: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  tipTexto: {
    fontSize: 14,
    color: '#856404',
  },
  resumenContainer: {
    maxHeight: 300,
    marginBottom: 16,
  },
  resumenItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  resumenLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
  },
  resumenValor: {
    fontSize: 14,
    color: '#666',
  },
  resumenSubvalor: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  checkboxContainer: {
    marginTop: 16,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#2196F3',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#2196F3',
  },
  checkboxCheck: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  buttonAtras: {
    flex: 1,
  },
  buttonSpacer: {
    width: 12,
  },
  buttonSiguiente: {
    flex: 2,
  },
  buttonFinalizar: {
    flex: 2,
    backgroundColor: '#4CAF50',
  },
});

export default CompletarCitaWizard;


