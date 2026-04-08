/**
 * Ajuste de velocidad TTS según el dispositivo.
 * Objetivo: evitar audio demasiado rápido (muchos OEM aceleran); priorizar lectura clara.
 * Multiplicadores < 1 = más lento.
 */
import { Platform } from 'react-native';

export const TTS_RATE_MIN = 0.2;
/** Tope duro en Android: por encima el motor suele sonar acelerado. */
export const TTS_RATE_MAX_ANDROID = 0.84;
export const TTS_RATE_MAX_IOS = 0.92;

/** Ralentización extra aplicada a todos los Android (evita “subir” velocidad). */
const GLOBAL_SLOWDOWN_ANDROID = 0.88;
const GLOBAL_SLOWDOWN_IOS = 0.94;

/**
 * @returns {number} Factor OEM en (0,1]
 */
export function getTtsRateCompensation() {
  if (Platform.OS === 'ios') {
    return GLOBAL_SLOWDOWN_IOS;
  }
  if (Platform.OS !== 'android') {
    return 1;
  }
  const c = Platform.constants || {};
  const manufacturer = String(c.Manufacturer || '').toLowerCase();
  const brand = String(c.Brand || '').toLowerCase();
  const haystack = `${manufacturer} ${brand}`;

  // OEMs donde el mismo parámetro suele sonar más rápido → ralentizar más
  if (
    /samsung|xiaomi|redmi|poco|oppo|vivo|realme|oneplus|huawei|honor|tecno|infinix|itel|nothing|asus|motorola|lge|lg|sony|nokia/.test(
      haystack,
    )
  ) {
    return 0.76 * GLOBAL_SLOWDOWN_ANDROID;
  }
  // Resto de Android: asumir algo rápido y bajar respecto al valor lógico
  return 0.86 * GLOBAL_SLOWDOWN_ANDROID;
}

/**
 * @param {number} userRate - Valor de configuración / servicio (p. ej. 0.48–1.1)
 * @returns {number} Valor seguro para Tts.setDefaultRate (nunca agresivamente rápido)
 */
export function toNativeSpeechRate(userRate) {
  const r = typeof userRate === 'number' ? userRate : parseFloat(userRate);
  const fallbackLogical = 0.48;
  if (Number.isNaN(r)) {
    const base = fallbackLogical * getTtsRateCompensation();
    return clampForPlatform(base);
  }

  const logical = Math.max(0.2, Math.min(1.15, r));
  let native = logical * getTtsRateCompensation();

  if (Platform.OS === 'android') {
    native = Math.min(native, TTS_RATE_MAX_ANDROID);
  } else if (Platform.OS === 'ios') {
    native = Math.min(native, TTS_RATE_MAX_IOS);
  } else {
    native = Math.min(native, 0.9);
  }

  return Math.max(TTS_RATE_MIN, native);
}

/**
 * Android: valor directo para {@link android.speech.tts.TextToSpeech#setSpeechRate}
 * (1.0 = velocidad normal del motor). Usar solo con {@code Tts.setDefaultRate(rate, true)}.
 *
 * react-native-tts aplica otra transformación no lineal si skipTransform es false; al combinarla
 * con toNativeSpeechRate() las opciones Lenta/Normal/Rápida quedaban casi indistinguibles.
 */
export function logicalToAndroidEngineRate(userRate) {
  const r = typeof userRate === 'number' ? userRate : parseFloat(userRate);
  const logical = Number.isNaN(r) ? 0.48 : Math.max(0.2, Math.min(1.15, r));

  const minL = 0.2;
  const maxL = 1.15;
  const t = (logical - minL) / (maxL - minL);

  const engineMin = 0.55;
  const engineMax = 1.38;
  let engine = engineMin + t * (engineMax - engineMin);

  engine *= getTtsRateCompensation();

  return Math.max(0.42, Math.min(1.45, engine));
}

function clampForPlatform(v) {
  const x = Math.max(TTS_RATE_MIN, v);
  if (Platform.OS === 'android') return Math.min(x, TTS_RATE_MAX_ANDROID);
  if (Platform.OS === 'ios') return Math.min(x, TTS_RATE_MAX_IOS);
  return Math.min(x, 0.9);
}
