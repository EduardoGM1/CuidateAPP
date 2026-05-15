import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { COLORES } from '../../utils/constantes';
import { hasValidPrivacyConsent } from '../../utils/privacyConsent';
import PrivacyConsentModal from './PrivacyConsentModal';

/**
 * Muestra modal de consentimiento tras autenticación si no hay aceptación vigente.
 */
export default function PrivacyConsentGate({ children }) {
  const navigation = useNavigation();
  const { userData } = useAuth();
  const userId =
    userData?.id ?? userData?.id_usuario ?? userData?.id_doctor ?? userData?.id_paciente;

  const [loading, setLoading] = useState(true);
  const [needsConsent, setNeedsConsent] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const valid = await hasValidPrivacyConsent(userId);
    setNeedsConsent(!valid);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openFullNotice = () => {
    navigation.navigate('AvisoPrivacidad');
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORES.PRIMARIO} />
        <Text style={styles.loadingText}>Cargando…</Text>
      </View>
    );
  }

  return (
    <>
      {children}
      <PrivacyConsentModal
        visible={needsConsent}
        userId={userId}
        onAccepted={() => setNeedsConsent(false)}
        onOpenFullNotice={openFullNotice}
      />
    </>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORES.FONDO },
  loadingText: { marginTop: 12, color: COLORES.TEXTO_SECUNDARIO },
});
