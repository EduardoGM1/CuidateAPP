/**
 * Exportación PDF (estadísticas HTML) y Excel FORMA (forma-lista), alineado a la app web.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { Card, Title, Button, Divider } from 'react-native-paper';
import FileViewer from 'react-native-file-viewer';
import gestionService from '../../api/gestionService';
import { generatePdfFromHtml } from '../../utils/fileDownloader';
import {
  saveFormaExcelToDevice,
  EXCEL_FORMATO_REGISTRO_MENSUAL_FILE_PREFIX,
  EXCEL_FORMATO_REGISTRO_MENSUAL_LABEL,
} from '../../utils/formaExcelUtils';
import { COLORES } from '../../utils/constantes';
import Logger from '../../services/logger';

/** Meses para el selector Excel (etiqueta legible + valor 1–12). */
const MESES_COMPLETO = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

function buildListaAnios() {
  const actual = new Date().getFullYear();
  const lista = [];
  for (let a = actual + 1; a >= 2000; a -= 1) {
    lista.push(a);
  }
  return lista;
}

function moduloId(m) {
  return m?.id_modulo ?? m?.id;
}

function moduloNombre(m) {
  return m?.nombre_modulo ?? m?.nombre ?? '—';
}

async function openFileSafe(filePath, context) {
  try {
    await FileViewer.open(filePath, {
      showOpenWithDialog: true,
      showAppsSuggestions: true,
    });
  } catch (openError) {
    Logger.warn(`${context}: no se pudo abrir el archivo automáticamente`, openError);
    Alert.alert(
      'Archivo guardado',
      'El archivo se generó correctamente. Si no se abrió, búscalo en Descargas o Documentos.',
    );
  }
}

function exportErrorMessage(error) {
  const isNetwork =
    error?.code === 'ERR_NETWORK' ||
    error?.type === 'connection_error' ||
    error?.message?.includes('Network Error');
  if (isNetwork) {
    return 'No se pudo conectar con el servidor. Comprueba la API y la red.';
  }
  return error?.response?.data?.error || error?.message || 'Operación no completada';
}

/**
 * @param {{ isAdmin?: boolean, modulos?: Array<object> }} props
 */
export default function ReportesExportPanel({ isAdmin = false, modulos = [] }) {
  const [filtroModulo, setFiltroModulo] = useState('');
  const [pdfFechaInicio, setPdfFechaInicio] = useState('');
  const [pdfFechaFin, setPdfFechaFin] = useState('');
  const [loadingPdf, setLoadingPdf] = useState(false);

  const [modoFecha, setModoFecha] = useState('mes');
  const [mesSel, setMesSel] = useState(String(new Date().getMonth() + 1));
  const [anioSel, setAnioSel] = useState(String(new Date().getFullYear()));
  const [fechaDia, setFechaDia] = useState('');
  const [fechaInicioRango, setFechaInicioRango] = useState('');
  const [fechaFinRango, setFechaFinRango] = useState('');
  const [loadingExcel, setLoadingExcel] = useState(false);

  const [moduloMenuVisible, setModuloMenuVisible] = useState(false);
  const [mesPickerVisible, setMesPickerVisible] = useState(false);
  const [anioPickerVisible, setAnioPickerVisible] = useState(false);

  const listaAnios = useMemo(() => buildListaAnios(), []);

  const canFilterModulo = isAdmin && Array.isArray(modulos) && modulos.length > 0;

  const handlePdf = useCallback(async () => {
    setLoadingPdf(true);
    try {
      const params = {};
      if (canFilterModulo && filtroModulo && parseInt(filtroModulo, 10) > 0) {
        params.modulo = parseInt(filtroModulo, 10);
      }
      if (pdfFechaInicio?.trim()) params.fechaInicio = pdfFechaInicio.trim();
      if (pdfFechaFin?.trim()) params.fechaFin = pdfFechaFin.trim();

      const html = await gestionService.getReporteEstadisticasHTML(params);
      const filename = `reporte-estadisticas-${new Date().toISOString().split('T')[0]}.pdf`;
      const result = await generatePdfFromHtml({ html, filename });
      if (result.success && result.filePath) {
        await openFileSafe(result.filePath, 'ReportesExportPanel PDF');
      } else {
        Alert.alert('Error', result.error || 'No se pudo generar el PDF.');
      }
    } catch (error) {
      Logger.error('ReportesExportPanel: PDF', error);
      Alert.alert('Error al exportar', exportErrorMessage(error));
    } finally {
      setLoadingPdf(false);
    }
  }, [canFilterModulo, filtroModulo, pdfFechaInicio, pdfFechaFin]);

  const handleExcel = useCallback(async () => {
    const apiParams = {};
    if (canFilterModulo && filtroModulo && parseInt(filtroModulo, 10) > 0) {
      apiParams.modulo = parseInt(filtroModulo, 10);
    }

    let filename = `${EXCEL_FORMATO_REGISTRO_MENSUAL_FILE_PREFIX}-pacientes.xlsx`;

    if (modoFecha === 'rango') {
      if (!fechaInicioRango?.trim() || !fechaFinRango?.trim()) {
        Alert.alert('Datos incompletos', 'Indica fecha de inicio y fin del rango (AAAA-MM-DD).');
        return;
      }
      apiParams.fechaInicio = fechaInicioRango.trim();
      apiParams.fechaFin = fechaFinRango.trim();
      const a = fechaInicioRango.replace(/-/g, '');
      const b = fechaFinRango.replace(/-/g, '');
      filename = `${EXCEL_FORMATO_REGISTRO_MENSUAL_FILE_PREFIX}-pacientes-${a}-${b}.xlsx`;
    } else {
      let mes = parseInt(mesSel, 10);
      let anio = parseInt(anioSel, 10);
      let dia = null;
      if (modoFecha === 'dia') {
        if (!fechaDia?.trim()) {
          Alert.alert('Datos incompletos', 'Indica una fecha (AAAA-MM-DD).');
          return;
        }
        const parts = fechaDia.trim().split('-');
        if (parts.length < 3) {
          Alert.alert('Formato', 'Usa el formato AAAA-MM-DD para la fecha.');
          return;
        }
        anio = parseInt(parts[0], 10);
        mes = parseInt(parts[1], 10);
        dia = parseInt(parts[2], 10);
      }
      if (!mes || mes < 1 || mes > 12 || !anio || anio < 2000 || anio > 2100) {
        Alert.alert('Validación', 'Mes o año inválido.');
        return;
      }
      apiParams.mes = mes;
      apiParams.anio = anio;
      if (dia != null) apiParams.dia = dia;
      const base = `${EXCEL_FORMATO_REGISTRO_MENSUAL_FILE_PREFIX}-pacientes-${anio}-${String(mes).padStart(2, '0')}`;
      filename = dia != null ? `${base}-${String(dia).padStart(2, '0')}.xlsx` : `${base}.xlsx`;
    }

    setLoadingExcel(true);
    try {
      const data = await gestionService.getFormaListaPacientes(apiParams);
      const truncado = data?.truncado === true;
      const { truncado: _t, ...excelPayload } = data || {};
      const path = await saveFormaExcelToDevice(excelPayload, filename);
      await openFileSafe(path, 'ReportesExportPanel Excel');
      if (truncado) {
        Alert.alert(
          'Exportación lista (truncada)',
          `La lista supera el límite del servidor; se incluyen los primeros registros. ${EXCEL_FORMATO_REGISTRO_MENSUAL_LABEL} guardado.`,
        );
      } else {
        Alert.alert('Listo', `${EXCEL_FORMATO_REGISTRO_MENSUAL_LABEL} guardado correctamente.`);
      }
    } catch (error) {
      Logger.error('ReportesExportPanel: Excel', error);
      Alert.alert('Error al exportar', exportErrorMessage(error));
    } finally {
      setLoadingExcel(false);
    }
  }, [
    canFilterModulo,
    filtroModulo,
    modoFecha,
    mesSel,
    anioSel,
    fechaDia,
    fechaInicioRango,
    fechaFinRango,
  ]);

  const renderModuloPicker = () => {
    if (!canFilterModulo) return null;
    const selectedLabel = filtroModulo
      ? moduloNombre(modulos.find((m) => String(moduloId(m)) === String(filtroModulo)))
      : 'Todos los módulos';

    return (
      <View style={styles.fieldBlock}>
        <Text style={styles.label}>Módulo</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => setModuloMenuVisible(true)}>
          <Text style={styles.dropdownText} numberOfLines={1}>
            {selectedLabel}
          </Text>
          <Text style={styles.dropdownChevron}>▼</Text>
        </TouchableOpacity>
        <Modal visible={moduloMenuVisible} transparent animationType="fade">
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setModuloMenuVisible(false)}
          >
            <View style={styles.modalSheet}>
              <FlatList
                data={[{ id: '', nombre_modulo: 'Todos' }, ...modulos]}
                keyExtractor={(item, index) => (item.id === '' ? 'all' : String(moduloId(item) ?? index))}
                renderItem={({ item }) => {
                  const id = item.id === '' ? '' : String(moduloId(item));
                  return (
                    <TouchableOpacity
                      style={styles.moduloRow}
                      onPress={() => {
                        setFiltroModulo(id);
                        setModuloMenuVisible(false);
                      }}
                    >
                      <Text style={styles.moduloRowText}>{item.id === '' ? 'Todos' : moduloNombre(item)}</Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Title style={styles.cardTitle}>Exportar reportes</Title>
        <Text style={styles.cardHint}>PDF de estadísticas y Excel formato registro mensual (FORMA).</Text>

        {renderModuloPicker()}

        <Text style={styles.sectionLabel}>Estadísticas (PDF)</Text>
        <View style={styles.row}>
          <View style={[styles.fieldBlock, { flex: 1 }]}>
            <Text style={styles.label}>Desde (AAAA-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="Opcional"
              value={pdfFechaInicio}
              onChangeText={setPdfFechaInicio}
              autoCapitalize="none"
            />
          </View>
          <View style={[styles.fieldBlock, { flex: 1 }]}>
            <Text style={styles.label}>Hasta (AAAA-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="Opcional"
              value={pdfFechaFin}
              onChangeText={setPdfFechaFin}
              autoCapitalize="none"
            />
          </View>
        </View>
        <Button
          mode="contained"
          onPress={handlePdf}
          disabled={loadingPdf}
          buttonColor={COLORES.PRIMARIO}
          style={styles.actionBtn}
        >
          {loadingPdf ? <ActivityIndicator color={COLORES.TEXTO_EN_PRIMARIO} /> : 'Generar PDF'}
        </Button>
        <Text style={styles.note}>
          El servidor devuelve HTML; la app lo convierte a PDF. Si el backend no aplica filtros, el contenido puede ser
          el reporte global.
        </Text>

        <Divider style={styles.divider} />

        <Text style={styles.sectionLabel}>{EXCEL_FORMATO_REGISTRO_MENSUAL_LABEL}</Text>
        <Text style={styles.label}>Periodo</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {[
            { id: 'mes', label: 'Mes' },
            { id: 'dia', label: 'Día' },
            { id: 'rango', label: 'Rango' },
          ].map((chip) => (
            <TouchableOpacity
              key={chip.id}
              style={[styles.chip, modoFecha === chip.id && styles.chipActive]}
              onPress={() => setModoFecha(chip.id)}
            >
              <Text style={[styles.chipText, modoFecha === chip.id && styles.chipTextActive]}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {modoFecha === 'mes' && (
          <View style={styles.rowMesAnio}>
            <View style={[styles.fieldBlock, styles.selectorHalf]}>
              <Text style={styles.label}>Mes</Text>
              <TouchableOpacity style={styles.dropdown} onPress={() => setMesPickerVisible(true)} activeOpacity={0.7}>
                <Text style={styles.dropdownText} numberOfLines={1}>
                  {MESES_COMPLETO.find((m) => String(m.value) === mesSel)?.label ?? 'Seleccionar'}
                </Text>
                <Text style={styles.dropdownChevron}>▼</Text>
              </TouchableOpacity>
              <Modal visible={mesPickerVisible} transparent animationType="fade">
                <TouchableOpacity
                  style={styles.modalBackdrop}
                  activeOpacity={1}
                  onPress={() => setMesPickerVisible(false)}
                >
                  <View style={styles.modalSheet}>
                    <FlatList
                      data={MESES_COMPLETO}
                      keyExtractor={(item) => String(item.value)}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.pickerRow}
                          onPress={() => {
                            setMesSel(String(item.value));
                            setMesPickerVisible(false);
                          }}
                        >
                          <Text style={styles.pickerRowText}>{item.label}</Text>
                          {String(item.value) === mesSel ? (
                            <Text style={styles.pickerRowCheck}>✓</Text>
                          ) : null}
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                </TouchableOpacity>
              </Modal>
            </View>
            <View style={[styles.fieldBlock, styles.selectorHalf]}>
              <Text style={styles.label}>Año</Text>
              <TouchableOpacity style={styles.dropdown} onPress={() => setAnioPickerVisible(true)} activeOpacity={0.7}>
                <Text style={styles.dropdownText} numberOfLines={1}>
                  {anioSel}
                </Text>
                <Text style={styles.dropdownChevron}>▼</Text>
              </TouchableOpacity>
              <Modal visible={anioPickerVisible} transparent animationType="fade">
                <TouchableOpacity
                  style={styles.modalBackdrop}
                  activeOpacity={1}
                  onPress={() => setAnioPickerVisible(false)}
                >
                  <View style={styles.modalSheet}>
                    <FlatList
                      data={listaAnios}
                      keyExtractor={(item) => String(item)}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={styles.pickerRow}
                          onPress={() => {
                            setAnioSel(String(item));
                            setAnioPickerVisible(false);
                          }}
                        >
                          <Text style={styles.pickerRowText}>{String(item)}</Text>
                          {String(item) === anioSel ? (
                            <Text style={styles.pickerRowCheck}>✓</Text>
                          ) : null}
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                </TouchableOpacity>
              </Modal>
            </View>
          </View>
        )}

        {modoFecha === 'dia' && (
          <View style={styles.fieldBlock}>
            <Text style={styles.label}>Fecha (AAAA-MM-DD)</Text>
            <TextInput style={styles.input} value={fechaDia} onChangeText={setFechaDia} placeholder="2026-04-20" />
          </View>
        )}

        {modoFecha === 'rango' && (
          <View style={styles.row}>
            <View style={[styles.fieldBlock, { flex: 1 }]}>
              <Text style={styles.label}>Inicio</Text>
              <TextInput style={styles.input} value={fechaInicioRango} onChangeText={setFechaInicioRango} />
            </View>
            <View style={[styles.fieldBlock, { flex: 1 }]}>
              <Text style={styles.label}>Fin</Text>
              <TextInput style={styles.input} value={fechaFinRango} onChangeText={setFechaFinRango} />
            </View>
          </View>
        )}

        <Button
          mode="outlined"
          onPress={handleExcel}
          disabled={loadingExcel}
          textColor={COLORES.PRIMARIO}
          style={styles.actionBtn}
        >
          {loadingExcel ? <ActivityIndicator color={COLORES.PRIMARIO} /> : 'Descargar Excel'}
        </Button>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 4,
  },
  cardHint: {
    fontSize: 13,
    color: COLORES.TEXTO_SECUNDARIO,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORES.TEXTO_PRIMARIO,
    marginTop: 4,
    marginBottom: 8,
  },
  fieldBlock: {
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    color: COLORES.TEXTO_SECUNDARIO,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORES.TEXTO_DISABLED,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    color: COLORES.TEXTO_PRIMARIO,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowMesAnio: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  selectorHalf: {
    flex: 1,
    minWidth: 0,
  },
  actionBtn: {
    marginTop: 8,
    marginBottom: 4,
  },
  note: {
    fontSize: 11,
    color: COLORES.TEXTO_DISABLED,
    marginTop: 6,
  },
  divider: {
    marginVertical: 16,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORES.TEXTO_DISABLED,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    color: COLORES.TEXTO_PRIMARIO,
  },
  dropdownChevron: {
    fontSize: 12,
    color: COLORES.TEXTO_SECUNDARIO,
    marginLeft: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalSheet: {
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  moduloRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORES.TEXTO_DISABLED,
  },
  moduloRowText: {
    fontSize: 15,
    color: COLORES.TEXTO_PRIMARIO,
  },
  chipsScroll: {
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORES.TEXTO_DISABLED,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  chipActive: {
    backgroundColor: COLORES.PRIMARIO,
    borderColor: COLORES.PRIMARIO,
  },
  chipText: {
    fontSize: 13,
    color: COLORES.TEXTO_PRIMARIO,
  },
  chipTextActive: {
    color: COLORES.TEXTO_EN_PRIMARIO,
    fontWeight: '600',
  },
});
