import React, { useState, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORES } from '../../utils/constantes';

export default function OnboardingShellModal({
  visible,
  steps,
  onSkip,
  onFinish,
}) {
  const { height } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const total = steps.length;

  useEffect(() => {
    if (visible) {
      setIndex(0);
    }
  }, [visible, total]);
  const step = steps[index];
  const isLast = index >= total - 1;

  const goNext = useCallback(() => {
    if (isLast) {
      onFinish();
      setIndex(0);
    } else {
      setIndex((i) => i + 1);
    }
  }, [isLast, onFinish]);

  const handleSkip = useCallback(() => {
    setIndex(0);
    onSkip();
  }, [onSkip]);

  if (!visible || !step) return null;

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleSkip} />
        <SafeAreaView style={[styles.cardWrap, { maxHeight: height * 0.78 }]}>
          <View style={styles.card}>
            <Text style={styles.progress}>
              {index + 1} / {total}
            </Text>
            <Text style={styles.title}>{step.title}</Text>
            <Text style={styles.body}>{step.body}</Text>
            <View style={styles.dots}>
              {steps.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === index && styles.dotActive]}
                />
              ))}
            </View>
            <View style={styles.actions}>
              <TouchableOpacity onPress={handleSkip} style={styles.btnGhost}>
                <Text style={styles.btnGhostText}>Omitir</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={goNext} style={styles.btnPrimary}>
                <Text style={styles.btnPrimaryText}>
                  {isLast ? 'Entendido' : 'Siguiente'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: COLORES.FONDO_OVERLAY,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  cardWrap: {
    width: '100%',
  },
  card: {
    backgroundColor: COLORES.FONDO_CARD,
    borderRadius: 16,
    padding: 22,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  progress: {
    fontSize: 13,
    color: COLORES.TEXTO_SECUNDARIO,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORES.PRIMARIO,
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORES.TEXTO_PRIMARIO,
    marginBottom: 20,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORES.TEXTO_DISABLED,
  },
  dotActive: {
    backgroundColor: COLORES.PRIMARIO,
    width: 22,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  btnGhost: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  btnGhostText: {
    fontSize: 16,
    color: COLORES.TEXTO_SECUNDARIO,
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: COLORES.ACCION_PRIMARIA,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORES.TEXTO_EN_PRIMARIO,
  },
});
