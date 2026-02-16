import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Searchbar, Button } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import Logger from '../../services/logger';
import gestionService from '../../api/gestionService';
import useDebounce from '../../hooks/useDebounce';
import { COLORES } from '../../utils/constantes';
import { listActionButtonStyles } from '../../utils/sharedStyles';

const GestionInstituciones = ({ navigation }) => {
  const { userRole } = useAuth();
  const [instituciones, setInstituciones] = useState([]);
  const [filteredInstituciones, setFilteredInstituciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedInstitucion, setSelectedInstitucion] = useState(null);
  const [editingInstitucion, setEditingInstitucion] = useState(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({ nombre: '', activo: true });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (!userRole || !['Admin', 'admin', 'administrador'].includes(userRole)) {
      Logger.warn('Acceso no autorizado a gestión de instituciones', { userRole });
      navigation.goBack();
    }
  }, [userRole, navigation]);

  const loadInstituciones = useCallback(async () => {
    try {
      setLoading(true);
      const data = await gestionService.getInstitucionesSalud({ activo: 'false' });
      const list = Array.isArray(data) ? data : [];
      setInstituciones(list);
      setFilteredInstituciones(list);
    } catch (error) {
      Logger.error('Error cargando instituciones', error);
      Alert.alert('Error', 'No se pudieron cargar las instituciones');
      setInstituciones([]);
      setFilteredInstituciones([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadInstituciones(); }, [loadInstituciones]);
  useFocusEffect(useCallback(() => { loadInstituciones(); }, [loadInstituciones]));

  const debouncedSearch = useDebounce(searchQuery, 300);
  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setFilteredInstituciones(instituciones);
      return;
    }
    const q = debouncedSearch.toLowerCase();
    setFilteredInstituciones(instituciones.filter((i) => (i.nombre || '').toLowerCase().includes(q)));
  }, [debouncedSearch, instituciones]);

  const validateForm = () => {
    const err = {};
    if (!formData.nombre.trim()) err.nombre = 'El nombre es requerido';
    else if (formData.nombre.trim().length > 100) err.nombre = 'Máximo 100 caracteres';
    setFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const resetForm = () => {
    setFormData({ nombre: '', activo: true });
    setFormErrors({});
    setEditingInstitucion(null);
  };

  const handleOpenCreate = () => { resetForm(); setShowModal(true); };
  const handleOpenOptions = useCallback((inst) => { setSelectedInstitucion(inst); setShowOptionsModal(true); }, []);
  const handleCloseOptions = () => { setShowOptionsModal(false); setSelectedInstitucion(null); };

  const handleOpenEdit = () => {
    if (!selectedInstitucion) return;
    setFormData({
      nombre: selectedInstitucion.nombre || '',
      activo: selectedInstitucion.activo !== false
    });
    setEditingInstitucion(selectedInstitucion);
    setFormErrors({});
    setShowOptionsModal(false);
    setSelectedInstitucion(null);
    setShowModal(true);
  };

  const handleDeleteFromOptions = () => {
    if (!selectedInstitucion) return;
    setShowOptionsModal(false);
    handleDelete(selectedInstitucion);
    setSelectedInstitucion(null);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert('Error', 'Corrige los errores del formulario');
      return;
    }
    setSaving(true);
    try {
      const payload = { nombre: formData.nombre.trim(), activo: formData.activo };
      if (editingInstitucion) {
        await gestionService.updateInstitucionSalud(editingInstitucion.id_institucion_salud, payload);
        Alert.alert('Éxito', 'Institución actualizada');
      } else {
        await gestionService.createInstitucionSalud(payload);
        Alert.alert('Éxito', 'Institución creada');
      }
      setShowModal(false);
      resetForm();
      await loadInstituciones();
    } catch (error) {
      Logger.error('Error guardando institución', error);
      const msg = error.response?.data?.error || error.response?.data?.message || error.message || 'No se pudo guardar';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = useCallback((inst) => {
    Alert.alert(
      'Eliminar institución',
      `¿Eliminar "${inst.nombre}"? Si hay pacientes asignados no se podrá eliminar.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await gestionService.deleteInstitucionSalud(inst.id_institucion_salud);
              Alert.alert('Éxito', 'Institución eliminada');
              await loadInstituciones();
            } catch (error) {
              const msg = error.response?.data?.error || error.message || 'No se pudo eliminar';
              Alert.alert('Error', msg);
            }
          }
        }
      ]
    );
  }, []);

  const renderItem = useCallback(({ item }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{item.nombre}</Text>
            <Text style={styles.cardSubtitle}>{item.activo !== false ? 'Activa' : 'Inactiva'}</Text>
          </View>
          <TouchableOpacity style={styles.optionsBtn} onPress={() => handleOpenOptions(item)}>
            <Text style={styles.optionsBtnText}>Opciones</Text>
          </TouchableOpacity>
        </View>
      </Card.Content>
    </Card>
  ), [handleOpenOptions]);

  if (!userRole || !['Admin', 'admin', 'administrador'].includes(userRole)) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.denied}>
          <Text style={styles.deniedTitle}>Solo administradores</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.headerBackText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Instituciones de salud</Text>
          <Text style={styles.headerSubtitle}>Catálogo para pacientes</Text>
        </View>
      </View>
      <View style={styles.searchContainer}>
        <Searchbar placeholder="Buscar..." onChangeText={setSearchQuery} value={searchQuery} style={styles.searchBar} />
      </View>
      <View style={listActionButtonStyles.buttonsContainer}>
        <Button mode="contained" onPress={handleOpenCreate} style={listActionButtonStyles.addButton} labelStyle={listActionButtonStyles.addButtonLabel} buttonColor={COLORES.NAV_PRIMARIO} icon="plus">
          Agregar institución
        </Button>
      </View>
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORES.PRIMARIO} />
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredInstituciones}
          renderItem={renderItem}
          keyExtractor={(item) => `inst-${item.id_institucion_salud}`}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={<Text style={styles.counter}>{filteredInstituciones.length} de {instituciones.length}</Text>}
          ListEmptyComponent={<Card style={styles.empty}><Card.Content><Text style={styles.emptyText}>{searchQuery ? 'Sin resultados' : 'No hay instituciones'}</Text></Card.Content></Card>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadInstituciones(); }} colors={[COLORES.PRIMARIO]} />}
        />
      )}

      <Modal visible={showOptionsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.optionsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>{selectedInstitucion?.nombre || 'Institución'}</Text>
              <TouchableOpacity onPress={handleCloseOptions}><Text style={styles.closeX}>X</Text></TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.optItem} onPress={handleOpenEdit}><Text style={styles.optText}>Editar</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.optItem, styles.optItemDel]} onPress={handleDeleteFromOptions}><Text style={styles.optTextDel}>Eliminar</Text></TouchableOpacity>
            <View style={styles.modalFooter}><Button mode="outlined" onPress={handleCloseOptions}>Cancelar</Button></View>
          </View>
        </View>
      </Modal>

      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => !saving && (setShowModal(false), resetForm())}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.formModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingInstitucion ? 'Editar institución' : 'Nueva institución'}</Text>
              <TouchableOpacity onPress={() => !saving && (setShowModal(false), resetForm())} disabled={saving}><Text style={styles.closeX}>X</Text></TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <View style={styles.field}>
                <Text style={styles.label}>Nombre *</Text>
                <TextInput
                  style={[styles.input, formErrors.nombre && styles.inputErr]}
                  value={formData.nombre}
                  onChangeText={(t) => { setFormData({ ...formData, nombre: t }); if (formErrors.nombre) setFormErrors({ ...formErrors, nombre: null }); }}
                  placeholder="Ej: IMSS, ISSSTE..."
                  maxLength={100}
                  editable={!saving}
                />
                {formErrors.nombre && <Text style={styles.errText}>{formErrors.nombre}</Text>}
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.label}>Activa (visible en formularios)</Text>
                <Switch value={formData.activo} onValueChange={(v) => setFormData({ ...formData, activo: v })} disabled={saving} />
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <Button mode="outlined" onPress={() => !saving && (setShowModal(false), resetForm())} disabled={saving} style={styles.cancelBtn}>Cancelar</Button>
              <Button mode="contained" onPress={handleSave} disabled={saving} loading={saving} style={styles.saveBtn}>{editingInstitucion ? 'Actualizar' : 'Crear'}</Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORES.FONDO },
  header: { padding: 20, backgroundColor: COLORES.PRIMARIO, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 10 },
  headerBackText: { fontSize: 24, color: COLORES.BLANCO },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORES.BLANCO },
  headerSubtitle: { fontSize: 14, color: COLORES.INFO_LIGHT },
  searchContainer: { paddingHorizontal: 20, paddingTop: 16 },
  searchBar: { marginBottom: 12 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  loadingText: { marginTop: 10, fontSize: 16, color: COLORES.TEXTO_SECUNDARIO },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  counter: { paddingVertical: 12, fontSize: 14, color: COLORES.TEXTO_SECUNDARIO, textAlign: 'center' },
  card: { marginBottom: 12, borderRadius: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardInfo: { flex: 1, marginRight: 10 },
  cardTitle: { fontSize: 18, fontWeight: '600', color: COLORES.TEXTO_PRIMARIO },
  cardSubtitle: { fontSize: 12, color: COLORES.TEXTO_SECUNDARIO, marginTop: 4 },
  optionsBtn: { backgroundColor: COLORES.PRIMARIO, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  optionsBtnText: { color: COLORES.BLANCO, fontSize: 14, fontWeight: '600' },
  empty: { marginTop: 20, borderRadius: 12 },
  emptyText: { textAlign: 'center', color: COLORES.TEXTO_SECUNDARIO, padding: 20, fontStyle: 'italic' },
  denied: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  deniedTitle: { fontSize: 18, color: COLORES.ERROR_LIGHT, marginBottom: 20, textAlign: 'center' },
  backBtn: { backgroundColor: COLORES.PRIMARIO, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  backBtnText: { color: COLORES.BLANCO, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  optionsModal: { backgroundColor: COLORES.BLANCO, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 24 },
  formModal: { backgroundColor: COLORES.BLANCO, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', paddingBottom: Platform.OS === 'ios' ? 20 : 0 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: COLORES.TEXTO_DISABLED },
  modalTitle: { fontSize: 18, fontWeight: '700', color: COLORES.PRIMARIO, flex: 1 },
  closeX: { fontSize: 24, fontWeight: 'bold', color: COLORES.ERROR_LIGHT, padding: 8 },
  optItem: { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: COLORES.TEXTO_DISABLED },
  optText: { fontSize: 16, color: COLORES.TEXTO_PRIMARIO, fontWeight: '600', textAlign: 'center' },
  optItemDel: { borderBottomWidth: 0 },
  optTextDel: { fontSize: 16, color: COLORES.ERROR_LIGHT, fontWeight: '600', textAlign: 'center' },
  modalBody: { paddingHorizontal: 20, paddingVertical: 20 },
  field: { marginBottom: 18 },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  label: { fontSize: 16, fontWeight: '600', color: COLORES.TEXTO_PRIMARIO, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: COLORES.TEXTO_DISABLED, borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: COLORES.BLANCO, color: COLORES.TEXTO_PRIMARIO },
  inputErr: { borderColor: COLORES.ERROR_LIGHT },
  errText: { fontSize: 14, color: COLORES.ERROR_LIGHT, marginTop: 4 },
  modalFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: COLORES.TEXTO_DISABLED },
  cancelBtn: { flex: 1, marginRight: 10, borderRadius: 8 },
  saveBtn: { flex: 1, borderRadius: 8 },
});

export default GestionInstituciones;
