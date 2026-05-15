import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { COLORES } from '../../utils/constantes';
import {
  PRIVACY_CONSENT_LABELS,
  PRIVACY_NOTICE_META,
  PRIVACY_NOTICE_SECTIONS,
  PRIVACY_NOTICE_VERSION,
} from '../../content/avisoPrivacidad';
import { savePrivacyConsent } from '../../utils/privacyConsent';

function NoticeBody({ compact }) {
  return (
    <View>
      <Text style={styles.meta}>
        Versión {PRIVACY_NOTICE_VERSION} · Actualización: {PRIVACY_NOTICE_META.lastUpdated}
      </Text>
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>{PRIVACY_NOTICE_META.responsibleLabel}: </Text>
        {PRIVACY_NOTICE_META.responsibleName}
        {'\n'}
        <Text style={styles.bold}>Contacto: </Text>
        {PRIVACY_NOTICE_META.contactEmail}
      </Text>
      {PRIVACY_NOTICE_SECTIONS.map((section) => (
        <View key={section.id} style={styles.section}>
          <Text style={[styles.sectionTitle, compact && styles.sectionTitleCompact]}>{section.title}</Text>
          {section.paragraphs.map((p, i) => (
            <Text key={i} style={styles.paragraph}>
              {p}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * Modal bloqueante de consentimiento (LFPDPPP).
 */
export default function PrivacyConsentModal({
  visible,
  userId,
  onAccepted,
  onOpenFullNotice,
}) {
  const [privacyNotice, setPrivacyNotice] = useState(false);
  const [healthData, setHealthData] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = privacyNotice && healthData;

  const handleAccept = async () => {
    if (!canSubmit) {
      setError('Debes aceptar ambas declaraciones para continuar.');
      return;
    }
    setError('');
    await savePrivacyConsent({ privacyNotice, healthData, userId });
    onAccepted();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Aviso de Privacidad y consentimiento</Text>
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator>
            <NoticeBody compact />
          </ScrollView>
          {onOpenFullNotice ? (
            <TouchableOpacity onPress={onOpenFullNotice} style={styles.linkWrap}>
              <Text style={styles.link}>Ver aviso completo</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setPrivacyNotice((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: privacyNotice }}
          >
            <View style={[styles.checkbox, privacyNotice && styles.checkboxChecked]}>
              {privacyNotice ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={styles.checkLabel}>{PRIVACY_CONSENT_LABELS.privacyNotice}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setHealthData((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: healthData }}
          >
            <View style={[styles.checkbox, healthData && styles.checkboxChecked]}>
              {healthData ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <Text style={styles.checkLabel}>{PRIVACY_CONSENT_LABELS.healthData}</Text>
          </TouchableOpacity>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={handleAccept}
            disabled={!canSubmit}
          >
            <Text style={styles.buttonText}>Aceptar y continuar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: COLORES.FONDO_CARD || '#fff',
    borderRadius: 12,
    padding: 16,
    maxHeight: '90%',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 12,
    textAlign: 'center',
  },
  scroll: {
    maxHeight: 280,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORES.BORDE_CLARO,
    borderRadius: 8,
    padding: 10,
    backgroundColor: COLORES.FONDO_SECUNDARIO || '#f5f5f5',
  },
  meta: {
    fontSize: 12,
    color: COLORES.TEXTO_SECUNDARIO,
    marginBottom: 8,
  },
  section: { marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: COLORES.TEXTO_PRIMARIO, marginBottom: 4 },
  sectionTitleCompact: { fontSize: 14 },
  paragraph: { fontSize: 13, color: COLORES.TEXTO_SECUNDARIO, marginBottom: 6, lineHeight: 20 },
  bold: { fontWeight: '600' },
  linkWrap: { marginBottom: 10 },
  link: { color: COLORES.PRIMARIO, fontSize: 14, textDecorationLine: 'underline' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: COLORES.PRIMARIO,
    borderRadius: 4,
    marginRight: 10,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: COLORES.PRIMARIO },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  checkLabel: { flex: 1, fontSize: 13, color: COLORES.TEXTO_PRIMARIO, lineHeight: 20 },
  error: { color: COLORES.ERROR, fontSize: 13, marginBottom: 8 },
  button: {
    backgroundColor: COLORES.PRIMARIO,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: COLORES.TEXTO_EN_PRIMARIO || '#fff', fontWeight: '600', fontSize: 16 },
});
