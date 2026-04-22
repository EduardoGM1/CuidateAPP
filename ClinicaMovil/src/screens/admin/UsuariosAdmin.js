import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card, Title } from 'react-native-paper';
import { useAuth } from '../../context/AuthContext';
import gestionService from '../../api/gestionService';
import Logger from '../../services/logger';
import { COLORES } from '../../utils/constantes';

const ROLES = ['Admin', 'Doctor', 'Paciente'];

const INITIAL_FORM = {
  email: '',
  rol: 'Admin',
  password: '',
};
const PASSWORD_MIN = 5;

const UsuariosAdmin = ({ navigation }) => {
  const { userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [search, setSearch] = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    if (!['Admin', 'admin', 'administrador'].includes(userRole)) {
      navigation.goBack();
    }
  }, [navigation, userRole]);

  const loadUsuarios = useCallback(async () => {
    try {
      setLoading(true);
      const data = await gestionService.getUsuarios({ includeInactive: true });
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (error) {
      Logger.error('UsuariosAdmin: error cargando usuarios', error);
      Alert.alert('Error', 'No se pudieron cargar los usuarios.');
      setUsuarios([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsuarios();
  }, [loadUsuarios]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadUsuarios();
  }, [loadUsuarios]);

  const filteredUsuarios = useMemo(() => {
    const q = search.trim().toLowerCase();
    return usuarios.filter((u) => {
      if (estadoFiltro === 'activos' && u.activo === false) return false;
      if (estadoFiltro === 'inactivos' && u.activo !== false) return false;
      if (!q) return true;
      return (
        String(u.email || '').toLowerCase().includes(q) ||
        String(u.rol || '').toLowerCase().includes(q)
      );
    });
  }, [estadoFiltro, search, usuarios]);
  const adminPasswordChecks = useMemo(() => {
    const pwd = String(form.password || '').trim();
    return [
      { key: 'min', label: `Minimo ${PASSWORD_MIN} caracteres`, ok: pwd.length >= PASSWORD_MIN },
      { key: 'upper', label: 'Al menos una mayuscula (A-Z)', ok: /[A-Z]/.test(pwd) },
      { key: 'number', label: 'Al menos un numero (0-9)', ok: /\d/.test(pwd) },
      { key: 'symbol', label: 'Al menos un simbolo (!@#$...)', ok: /[^A-Za-z0-9]/.test(pwd) },
    ];
  }, [form.password]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(INITIAL_FORM);
    setModalVisible(true);
  }, []);

  const openEdit = useCallback((usuario) => {
    setEditing(usuario);
    setForm({
      email: usuario.email || '',
      rol: usuario.rol || 'Admin',
      password: '',
    });
    setModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    if (saving) return;
    setModalVisible(false);
    setEditing(null);
    setForm(INITIAL_FORM);
  }, [saving]);

  const validateForm = useCallback(() => {
    if (!form.email.trim()) return 'El correo es obligatorio.';
    if (!editing) {
      const password = form.password.trim();
      if (password.length < PASSWORD_MIN) {
        return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`;
      }
      if (form.rol === 'Admin' || form.rol === 'Doctor') {
        if (!/[A-Z]/.test(password)) return `Para ${form.rol}, agrega al menos una letra mayúscula.`;
        if (!/\d/.test(password)) return `Para ${form.rol}, agrega al menos un número.`;
        if (!/[^A-Za-z0-9]/.test(password)) return `Para ${form.rol}, agrega al menos un símbolo.`;
      }
    }
    return null;
  }, [editing, form.email, form.password, form.rol]);

  const handleSave = useCallback(async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Validación', validationError);
      return;
    }

    setSaving(true);
    try {
      if (editing?.id_usuario) {
        await gestionService.updateUsuario(editing.id_usuario, {
          email: form.email.trim(),
          rol: form.rol,
        });
      } else {
        await gestionService.createUsuario({
          email: form.email.trim(),
          rol: form.rol,
          password: form.password.trim(),
        });
      }
      closeModal();
      await loadUsuarios();
      Alert.alert('Éxito', editing ? 'Usuario actualizado.' : 'Usuario creado.');
    } catch (error) {
      const msg = error?.response?.data?.error || error?.message || 'No se pudo guardar el usuario.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  }, [closeModal, editing, form, loadUsuarios, validateForm]);

  const handleToggleActivo = useCallback((usuario) => {
    const isActive = usuario.activo !== false;
    const actionText = isActive ? 'desactivar' : 'activar';
    Alert.alert(
      'Confirmar',
      `¿Deseas ${actionText} este usuario?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: isActive ? 'destructive' : 'default',
          onPress: async () => {
            try {
              if (isActive) {
                await gestionService.deleteUsuario(usuario.id_usuario);
              } else {
                await gestionService.updateUsuario(usuario.id_usuario, { activo: true });
              }
              await loadUsuarios();
            } catch (error) {
              const msg = error?.response?.data?.error || error?.message || 'No se pudo actualizar el estado.';
              Alert.alert('Error', msg);
            }
          },
        },
      ]
    );
  }, [loadUsuarios]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.title}>Usuarios</Title>
        <TouchableOpacity style={styles.primaryButton} onPress={openCreate}>
          <Text style={styles.primaryButtonText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por correo o rol..."
          style={styles.input}
          placeholderTextColor={COLORES.TEXTO_SECUNDARIO}
        />
        <View style={styles.chipsRow}>
          {['todos', 'activos', 'inactivos'].map((estado) => {
            const selected = estadoFiltro === estado;
            return (
              <TouchableOpacity
                key={estado}
                style={[styles.chip, selected && styles.chipActive]}
                onPress={() => setEstadoFiltro(estado)}
              >
                <Text style={[styles.chipText, selected && styles.chipTextActive]}>{estado}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORES.PRIMARIO} size="large" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {filteredUsuarios.map((usuario) => (
            <Card key={String(usuario.id_usuario)} style={styles.card}>
              <Card.Content>
                <Text style={styles.cardTitle}>{usuario.email}</Text>
                <Text style={styles.cardMeta}>Rol: {usuario.rol || '—'}</Text>
                <Text style={styles.cardMeta}>Estado: {usuario.activo === false ? 'Inactivo' : 'Activo'}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => openEdit(usuario)}>
                    <Text style={styles.secondaryButtonText}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.secondaryButton, usuario.activo === false ? styles.successButton : styles.dangerButton]}
                    onPress={() => handleToggleActivo(usuario)}
                  >
                    <Text style={styles.secondaryButtonText}>{usuario.activo === false ? 'Activar' : 'Desactivar'}</Text>
                  </TouchableOpacity>
                </View>
              </Card.Content>
            </Card>
          ))}
          {!filteredUsuarios.length && <Text style={styles.emptyText}>No hay usuarios para mostrar.</Text>}
        </ScrollView>
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editing ? 'Editar usuario' : 'Nuevo usuario'}</Text>
            <TextInput
              value={form.email}
              onChangeText={(v) => setForm((prev) => ({ ...prev, email: v }))}
              placeholder="Correo"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.modalLabel}>Rol</Text>
            <View style={styles.chipsRow}>
              {ROLES.map((rol) => {
                const selected = form.rol === rol;
                return (
                  <TouchableOpacity
                    key={rol}
                    style={[styles.chip, selected && styles.chipActive]}
                    onPress={() => setForm((prev) => ({ ...prev, rol }))}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextActive]}>{rol}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {!editing && (
              <TextInput
                value={form.password}
                onChangeText={(v) => setForm((prev) => ({ ...prev, password: v }))}
                placeholder={`Contrasena (min. ${PASSWORD_MIN})`}
                secureTextEntry
                style={styles.input}
              />
            )}
            {!editing && (form.rol === 'Admin' || form.rol === 'Doctor') && (
              <View style={styles.rulesBlock}>
                <Text style={styles.helpText}>Cuentas {form.rol}: maximo 128 caracteres.</Text>
                {adminPasswordChecks.map((rule) => (
                  <Text key={rule.key} style={[styles.ruleText, rule.ok ? styles.ruleOk : styles.rulePending]}>
                    {`${rule.ok ? 'Cumple: ' : 'Falta: '}${rule.label}`}
                  </Text>
                ))}
              </View>
            )}
            {form.rol === 'Doctor' && (
              <Text style={styles.helpText}>
                Nota: este flujo crea la cuenta de acceso. Si se requiere expediente de doctor completo,
                complétalo desde Gestión de Doctores.
              </Text>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={closeModal} disabled={saving}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleSave} disabled={saving}>
                <Text style={styles.primaryButtonText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORES.FONDO },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  title: { color: COLORES.NAV_PRIMARIO, fontWeight: '700' },
  filters: { paddingHorizontal: 16, paddingBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
    borderRadius: 10,
    backgroundColor: COLORES.FONDO_CARD,
    color: COLORES.TEXTO_PRIMARIO,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  chipsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORES.FONDO_CARD,
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
  },
  chipActive: { backgroundColor: COLORES.NAV_PRIMARIO, borderColor: COLORES.NAV_PRIMARIO },
  chipText: { color: COLORES.TEXTO_PRIMARIO, fontSize: 12, textTransform: 'capitalize' },
  chipTextActive: { color: COLORES.TEXTO_EN_PRIMARIO, fontWeight: '600' },
  card: { marginHorizontal: 16, marginVertical: 6 },
  cardTitle: { fontWeight: '700', color: COLORES.TEXTO_PRIMARIO, marginBottom: 4 },
  cardMeta: { color: COLORES.TEXTO_SECUNDARIO, marginBottom: 2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  primaryButton: {
    backgroundColor: COLORES.NAV_PRIMARIO,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryButtonText: { color: COLORES.TEXTO_EN_PRIMARIO, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: COLORES.SECUNDARIO_LIGHT,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  secondaryButtonText: { color: COLORES.TEXTO_EN_PRIMARIO, fontWeight: '600' },
  dangerButton: { backgroundColor: COLORES.ERROR },
  successButton: { backgroundColor: COLORES.EXITO },
  emptyText: {
    textAlign: 'center',
    color: COLORES.TEXTO_SECUNDARIO,
    marginVertical: 24,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 12,
  },
  modalLabel: {
    color: COLORES.TEXTO_SECUNDARIO,
    fontWeight: '600',
    marginBottom: 6,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 10 },
  helpText: { color: COLORES.TEXTO_SECUNDARIO, fontSize: 12, marginBottom: 8 },
  rulesBlock: { marginBottom: 8 },
  ruleText: { fontSize: 12, marginBottom: 3 },
  ruleOk: { color: COLORES.EXITO, fontWeight: '600' },
  rulePending: { color: COLORES.TEXTO_SECUNDARIO },
});

export default UsuariosAdmin;
