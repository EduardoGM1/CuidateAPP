import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { COLORES } from '../../utils/constantes';
import {
  PRIVACY_CONSENT_LABELS,
  PRIVACY_CONSENT_UI,
} from '../../content/avisoPrivacidad';
import { savePrivacyConsent } from '../../utils/privacyConsent';

/**
 * Modal bloqueante de consentimiento para pacientes (primer inicio de sesión).
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
          <Text style={styles.title}>{PRIVACY_CONSENT_UI.modalTitle}</Text>
          <Text style={styles.heading}>{PRIVACY_CONSENT_UI.heading}</Text>

          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setPrivacyNotice((v) => !v)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: privacyNotice }}
          >
            <View style={[styles.checkbox, privacyNotice && styles.checkboxChecked]}>
              {privacyNotice ? <Text style={styles.checkmark}>✓</Text> : null}
            </View>
            <View style={styles.checkLabelWrap}>
              <Text style={styles.checkLabel}>
                He leído y acepto el{' '}
                {onOpenFullNotice ? (
                  <Text style={styles.link} onPress={(e) => { e?.stopPropagation?.(); onOpenFullNotice(); }}>
                    Aviso de Privacidad
                  </Text>
                ) : (
                  'Aviso de Privacidad'
                )}{' '}
                y los{' '}
                {onOpenFullNotice ? (
                  <Text style={styles.link} onPress={(e) => { e?.stopPropagation?.(); onOpenFullNotice(); }}>
                    Términos y Condiciones de la aplicación
                  </Text>
                ) : (
                  'Términos y Condiciones de la aplicación'
                )}
                .
              </Text>
            </View>
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

          <Text style={styles.footer}>{PRIVACY_CONSENT_UI.footer}</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity
            style={[styles.button, !canSubmit && styles.buttonDisabled]}
            onPress={handleAccept}
            disabled={!canSubmit}
          >
            <Text style={styles.buttonText}>{PRIVACY_CONSENT_UI.acceptButton}</Text>
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
    marginBottom: 8,
    textAlign: 'center',
  },
  heading: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORES.PRIMARIO,
    marginBottom: 14,
    textAlign: 'center',
  },
  footer: {
    fontSize: 12,
    color: COLORES.TEXTO_SECUNDARIO,
    lineHeight: 18,
    marginBottom: 12,
    marginTop: 4,
  },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
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
  checkLabelWrap: { flex: 1 },
  checkLabel: { fontSize: 13, color: COLORES.TEXTO_PRIMARIO, lineHeight: 20 },
  link: { color: COLORES.PRIMARIO, textDecorationLine: 'underline', fontWeight: '600' },
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
