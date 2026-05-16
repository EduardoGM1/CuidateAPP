import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BackHeader from '../../components/common/BackHeader';
import { COLORES, NOMBRE_APP } from '../../utils/constantes';
import {
  PRIVACY_NOTICE_BODY_PLACEHOLDER,
  PRIVACY_NOTICE_BODY_VISIBLE,
  PRIVACY_NOTICE_META,
  PRIVACY_NOTICE_SECTIONS,
  PRIVACY_NOTICE_VERSION,
} from '../../content/avisoPrivacidad';

export default function AvisoPrivacidadScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <BackHeader navigation={navigation} title={PRIVACY_NOTICE_META.title} variant="professional" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.appName}>{NOMBRE_APP}</Text>
        {PRIVACY_NOTICE_BODY_VISIBLE ? (
          <>
            <Text style={styles.meta}>
              Versión {PRIVACY_NOTICE_VERSION} · {PRIVACY_NOTICE_META.lastUpdated}
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>{PRIVACY_NOTICE_META.responsibleLabel}: </Text>
              {PRIVACY_NOTICE_META.responsibleName}
            </Text>
            <Text style={styles.paragraph}>
              <Text style={styles.bold}>Contacto: </Text>
              {PRIVACY_NOTICE_META.contactEmail || ''}
            </Text>
            {PRIVACY_NOTICE_SECTIONS.map((section) => (
              <View key={section.id} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.paragraphs.map((p, i) => (
                  <Text key={i} style={styles.paragraph}>
                    {p}
                  </Text>
                ))}
              </View>
            ))}
          </>
        ) : (
          <Text style={styles.paragraph}>{PRIVACY_NOTICE_BODY_PLACEHOLDER}</Text>
        )}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Volver</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORES.FONDO },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORES.PRIMARIO,
    textAlign: 'center',
    marginBottom: 8,
  },
  meta: { fontSize: 13, color: COLORES.TEXTO_SECUNDARIO, marginBottom: 16, textAlign: 'center' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: COLORES.TEXTO_PRIMARIO, marginBottom: 6 },
  paragraph: { fontSize: 14, color: COLORES.TEXTO_SECUNDARIO, lineHeight: 22, marginBottom: 8 },
  bold: { fontWeight: '600' },
  backBtn: { marginTop: 16, padding: 12, alignItems: 'center' },
  backBtnText: { color: COLORES.PRIMARIO, fontSize: 16, fontWeight: '600' },
});
