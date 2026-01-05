/**
 * Servicio de Alertas Automáticas
 * 
 * Verifica valores de signos vitales y genera alertas automáticas
 * cuando los valores están fuera de rangos normales.
 * Notifica al paciente, red de apoyo y médico asignado.
 */

import { Paciente, Doctor, DoctorPaciente, RedApoyo, Usuario, Comorbilidad } from '../models/associations.js';
import pushNotificationService from './pushNotificationService.js';
import logger from '../utils/logger.js';

class AlertService {
  constructor() {
    // Rangos normales base de signos vitales (para pacientes sin comorbilidades específicas)
    this.rangosNormales = {
      glucosa: { min: 70, max: 126, criticoMin: 50, criticoMax: 200 }, // mg/dL
      presionSistolica: { min: 90, max: 140, criticoMin: 70, criticoMax: 160 }, // mmHg
      presionDiastolica: { min: 60, max: 90, criticoMin: 50, criticoMax: 100 }, // mmHg
      imc: { min: 18.5, max: 24.9, criticoMin: 15, criticoMax: 35 }, // kg/m²
      peso: { min: 50, max: 150 }, // kg (ajustable por paciente)
    };

    // Rangos personalizados por comorbilidad
    // Claves deben coincidir con nombres de comorbilidades en la BD (case-insensitive)
    this.rangosPorComorbilidad = {
      // Diabetes
      diabetes: {
        glucosa: { min: 80, max: 130, criticoMin: 60, criticoMax: 180 }, // Más estricto para diabéticos
        presionSistolica: { min: 90, max: 130, criticoMin: 70, criticoMax: 150 }, // Más estricto
        presionDiastolica: { min: 60, max: 85, criticoMin: 50, criticoMax: 95 },
      },
      'diabetes mellitus': {
        glucosa: { min: 80, max: 130, criticoMin: 60, criticoMax: 180 },
        presionSistolica: { min: 90, max: 130, criticoMin: 70, criticoMax: 150 },
        presionDiastolica: { min: 60, max: 85, criticoMin: 50, criticoMax: 95 },
      },
      // Hipertensión
      hipertension: {
        presionSistolica: { min: 90, max: 130, criticoMin: 70, criticoMax: 150 }, // Más estricto
        presionDiastolica: { min: 60, max: 85, criticoMin: 50, criticoMax: 95 },
      },
      'hipertensión arterial': {
        presionSistolica: { min: 90, max: 130, criticoMin: 70, criticoMax: 150 },
        presionDiastolica: { min: 60, max: 85, criticoMin: 50, criticoMax: 95 },
      },
      // Obesidad
      obesidad: {
        imc: { min: 18.5, max: 29.9, criticoMin: 15, criticoMax: 40 }, // Ajustado para obesos
        peso: { min: 50, max: 200 }, // Rango más amplio
      },
      // Sobrepeso
      sobrepeso: {
        imc: { min: 18.5, max: 27.9, criticoMin: 15, criticoMax: 35 },
      },
    };
  }

  /**
   * Obtener rangos personalizados según comorbilidades del paciente
   * @param {Array} comorbilidades - Array de comorbilidades del paciente
   * @returns {Object} Rangos personalizados
   */
  obtenerRangosPersonalizados(comorbilidades) {
    if (!comorbilidades || comorbilidades.length === 0) {
      return this.rangosNormales;
    }

    // Inicializar con rangos base
    const rangosPersonalizados = JSON.parse(JSON.stringify(this.rangosNormales));

    // Aplicar ajustes según comorbilidades
    for (const comorbilidad of comorbilidades) {
      const nombreComorbilidad = (comorbilidad.nombre_comorbilidad || comorbilidad.Comorbilidad?.nombre_comorbilidad || '').toLowerCase().trim();
      
      // Buscar configuración para esta comorbilidad
      const configComorbilidad = this.rangosPorComorbilidad[nombreComorbilidad];
      
      if (configComorbilidad) {
        // Aplicar ajustes de esta comorbilidad
        Object.keys(configComorbilidad).forEach((tipo) => {
          if (rangosPersonalizados[tipo]) {
            // Fusionar rangos (los de comorbilidad tienen prioridad)
            rangosPersonalizados[tipo] = {
              ...rangosPersonalizados[tipo],
              ...configComorbilidad[tipo],
            };
          }
        });
        
        logger.debug('Rangos personalizados aplicados', {
          comorbilidad: nombreComorbilidad,
          rangos: configComorbilidad,
        });
      }
    }

    return rangosPersonalizados;
  }

  /**
   * Verificar signos vitales y generar alertas
   * @param {Object} signosVitales - Datos de signos vitales
   * @param {number} pacienteId - ID del paciente
   */
  async verificarSignosVitales(signosVitales, pacienteId) {
    try {
      const alertas = [];

      // Obtener comorbilidades del paciente para rangos personalizados
      const paciente = await Paciente.findByPk(pacienteId, {
        include: [
          {
            model: Comorbilidad,
            as: 'Comorbilidades',
            through: { attributes: [] }, // No incluir datos de tabla intermedia
            required: false,
          },
        ],
      });

      const comorbilidades = paciente?.Comorbilidades || [];
      const rangosPersonalizados = this.obtenerRangosPersonalizados(comorbilidades);

      // Verificar glucosa
      if (signosVitales.glucosa_mg_dl !== null && signosVitales.glucosa_mg_dl !== undefined) {
        const alertaGlucosa = this.verificarGlucosa(signosVitales.glucosa_mg_dl, rangosPersonalizados);
        if (alertaGlucosa) {
          alertas.push({
            tipo: 'glucosa',
            ...alertaGlucosa,
          });
        }
      }

      // Verificar presión arterial
      if (
        (signosVitales.presion_sistolica !== null && signosVitales.presion_sistolica !== undefined) ||
        (signosVitales.presion_diastolica !== null && signosVitales.presion_diastolica !== undefined)
      ) {
        const alertaPresion = this.verificarPresion(
          signosVitales.presion_sistolica,
          signosVitales.presion_diastolica,
          rangosPersonalizados
        );
        if (alertaPresion) {
          alertas.push({
            tipo: 'presion',
            ...alertaPresion,
          });
        }
      }

      // Verificar IMC
      if (signosVitales.imc !== null && signosVitales.imc !== undefined) {
        const alertaIMC = this.verificarIMC(signosVitales.imc, rangosPersonalizados);
        if (alertaIMC) {
          alertas.push({
            tipo: 'imc',
            ...alertaIMC,
          });
        }
      }

      // Si hay alertas, enviar notificaciones
      if (alertas.length > 0) {
        await this.enviarAlertas(pacienteId, alertas, signosVitales);
      }

      return {
        tieneAlertas: alertas.length > 0,
        alertas,
      };
    } catch (error) {
      logger.error('Error verificando signos vitales:', error);
      // No fallar la creación de signos vitales si hay error en alertas
      return { tieneAlertas: false, alertas: [], error: error.message };
    }
  }

  /**
   * Verificar nivel de glucosa
   * @param {number} glucosa - Valor de glucosa
   * @param {Object} rangos - Rangos a usar (personalizados o normales)
   */
  verificarGlucosa(glucosa, rangos = this.rangosNormales) {
    const { min, max, criticoMin, criticoMax } = rangos.glucosa || this.rangosNormales.glucosa;

    if (glucosa <= criticoMin || glucosa >= criticoMax) {
      return {
        severidad: 'critica',
        mensaje: `⚠️ ALERTA CRÍTICA: Glucosa en ${glucosa} mg/dL. ${glucosa < min ? 'Valor muy bajo (hipoglucemia)' : 'Valor muy alto (hiperglucemia)'}. Consulta médica urgente.`,
        valor: glucosa,
        rangoNormal: `${min}-${max} mg/dL`,
      };
    } else if (glucosa < min || glucosa > max) {
      return {
        severidad: 'moderada',
        mensaje: `⚠️ Glucosa fuera de rango: ${glucosa} mg/dL. Rango normal: ${min}-${max} mg/dL. Consulta a tu médico.`,
        valor: glucosa,
        rangoNormal: `${min}-${max} mg/dL`,
      };
    }

    return null;
  }

  /**
   * Verificar presión arterial
   * @param {number} sistolica - Presión sistólica
   * @param {number} diastolica - Presión diastólica
   * @param {Object} rangos - Rangos a usar (personalizados o normales)
   */
  verificarPresion(sistolica, diastolica, rangos = this.rangosNormales) {
    const sistolicaRange = rangos.presionSistolica || this.rangosNormales.presionSistolica;
    const diastolicaRange = rangos.presionDiastolica || this.rangosNormales.presionDiastolica;

    let severidad = null;
    let mensaje = '';

    // Verificar sistólica
    if (sistolica !== null && sistolica !== undefined) {
      if (sistolica <= sistolicaRange.criticoMin || sistolica >= sistolicaRange.criticoMax) {
        severidad = 'critica';
        mensaje = `⚠️ ALERTA CRÍTICA: Presión sistólica en ${sistolica} mmHg. ${sistolica < sistolicaRange.min ? 'Presión muy baja' : 'Presión muy alta (hipertensión)'}. Consulta médica urgente.`;
      } else if (sistolica < sistolicaRange.min || sistolica > sistolicaRange.max) {
        if (!severidad) severidad = 'moderada';
        mensaje = `⚠️ Presión sistólica fuera de rango: ${sistolica} mmHg. Rango normal: ${sistolicaRange.min}-${sistolicaRange.max} mmHg.`;
      }
    }

    // Verificar diastólica
    if (diastolica !== null && diastolica !== undefined) {
      if (diastolica <= diastolicaRange.criticoMin || diastolica >= diastolicaRange.criticoMax) {
        severidad = 'critica';
        mensaje += `\n⚠️ ALERTA CRÍTICA: Presión diastólica en ${diastolica} mmHg. ${diastolica < diastolicaRange.min ? 'Presión muy baja' : 'Presión muy alta'}. Consulta médica urgente.`;
      } else if (diastolica < diastolicaRange.min || diastolica > diastolicaRange.max) {
        if (!severidad) severidad = 'moderada';
        mensaje += `\n⚠️ Presión diastólica fuera de rango: ${diastolica} mmHg. Rango normal: ${diastolicaRange.min}-${diastolicaRange.max} mmHg.`;
      }
    }

    if (!mensaje) return null;

    return {
      severidad: severidad || 'moderada',
      mensaje: mensaje || `Presión: ${sistolica}/${diastolica} mmHg fuera de rango normal.`,
      valor: `${sistolica}/${diastolica}`,
      rangoNormal: `${sistolicaRange.min}-${sistolicaRange.max}/${diastolicaRange.min}-${diastolicaRange.max} mmHg`,
    };
  }

  /**
   * Verificar IMC
   * @param {number} imc - Valor de IMC
   * @param {Object} rangos - Rangos a usar (personalizados o normales)
   */
  verificarIMC(imc, rangos = this.rangosNormales) {
    const { min, max, criticoMin, criticoMax } = rangos.imc || this.rangosNormales.imc;

    if (imc <= criticoMin || imc >= criticoMax) {
      return {
        severidad: 'critica',
        mensaje: `⚠️ ALERTA CRÍTICA: IMC en ${imc}. ${imc < min ? 'Peso muy bajo (delgadez extrema)' : 'Obesidad severa'}. Consulta médica urgente.`,
        valor: imc,
        rangoNormal: `${min}-${max}`,
      };
    } else if (imc < min || imc > max) {
      return {
        severidad: 'moderada',
        mensaje: `⚠️ IMC fuera de rango: ${imc}. Rango normal: ${min}-${max}. Consulta a tu médico.`,
        valor: imc,
        rangoNormal: `${min}-${max}`,
      };
    }

    return null;
  }

  /**
   * Enviar alertas a paciente, red de apoyo y médico
   */
  async enviarAlertas(pacienteId, alertas, signosVitales) {
    try {
      // Obtener información del paciente
      const paciente = await Paciente.findByPk(pacienteId, {
        include: [
          {
            model: Usuario,
            attributes: ['id_usuario'],
            required: false,
          },
        ],
      });

      if (!paciente) {
        logger.warn('Paciente no encontrado para enviar alertas', { pacienteId });
        return;
      }

      // Obtener médico asignado
      const asignacion = await DoctorPaciente.findOne({
        where: { id_paciente: pacienteId },
        include: [
          {
            model: Doctor,
            include: [
              {
                model: Usuario,
                attributes: ['id_usuario'],
              },
            ],
          },
        ],
      });

      // Obtener red de apoyo
      const redApoyo = await RedApoyo.findAll({
        where: { id_paciente: pacienteId },
      });

      // Determinar la alerta más crítica
      const alertaCritica = alertas.find((a) => a.severidad === 'critica');
      const alertaPrincipal = alertaCritica || alertas[0];

      // Mensaje consolidado
      const mensajeConsolidado = alertas
        .map((a) => a.mensaje)
        .join('\n\n');

      // Notificar al paciente
      if (paciente.id_usuario) {
        await this.enviarNotificacion(
          paciente.id_usuario,
          {
            title: alertaPrincipal.severidad === 'critica' ? '🚨 ALERTA CRÍTICA' : '⚠️ Alerta de Salud',
            message: mensajeConsolidado,
            type: 'alerta_salud',
            data: {
              pacienteId,
              alertas,
              signosVitales,
              timestamp: new Date().toISOString(),
            },
          },
          'paciente'
        );
      }

      // Notificar al médico asignado
      if (asignacion?.Doctor?.Usuario?.id_usuario) {
        await this.enviarNotificacion(
          asignacion.Doctor.Usuario.id_usuario,
          {
            title: `🚨 Alerta: ${paciente.nombre} ${paciente.apellido_paterno}`,
            message: mensajeConsolidado,
            type: 'alerta_paciente',
            data: {
              pacienteId,
              pacienteNombre: `${paciente.nombre} ${paciente.apellido_paterno}`,
              alertas,
              signosVitales,
              timestamp: new Date().toISOString(),
            },
          },
          'doctor'
        );
      }

      // Notificar a la red de apoyo
      for (const contacto of redApoyo) {
        // Si el contacto tiene usuario asociado (futuro)
        if (contacto.id_usuario) {
          await this.enviarNotificacion(
            contacto.id_usuario,
            {
              title: `⚠️ Alerta: ${paciente.nombre} ${paciente.apellido_paterno}`,
              message: mensajeConsolidado,
              type: 'alerta_familiar',
              data: {
                pacienteId,
                pacienteNombre: `${paciente.nombre} ${paciente.apellido_paterno}`,
                relacion: contacto.parentesco,
                alertas,
                timestamp: new Date().toISOString(),
              },
            },
            'familiar'
          );
        }
      }

      logger.info('Alertas enviadas', {
        pacienteId,
        totalAlertas: alertas.length,
        severidad: alertaPrincipal.severidad,
        notificados: {
          paciente: !!paciente.id_usuario,
          doctor: !!asignacion?.Doctor?.Usuario?.id_usuario,
          redApoyo: redApoyo.length,
        },
      });
    } catch (error) {
      logger.error('Error enviando alertas:', error);
      // No fallar si hay error en notificaciones
    }
  }

  /**
   * Enviar notificación push
   */
  async enviarNotificacion(userId, notification, tipo) {
    try {
      await pushNotificationService.sendPushNotification(userId, notification);
      logger.debug('Notificación enviada', { userId, tipo, notificationType: notification.type });
    } catch (error) {
      logger.error('Error enviando notificación push:', error);
      // No propagar error - las alertas no deben fallar el registro de signos vitales
    }
  }

  /**
   * Verificar si un valor está en rango crítico
   */
  esValorCritico(tipo, valor) {
    const rango = this.rangosNormales[tipo];
    if (!rango || valor === null || valor === undefined) return false;

    const { criticoMin, criticoMax } = rango;
    return valor <= criticoMin || valor >= criticoMax;
  }

  /**
   * Obtener mensaje de alerta personalizado
   */
  obtenerMensajeAlerta(tipo, valor, severidad) {
    const mensajes = {
      glucosa: {
        critica: `🚨 ALERTA CRÍTICA: Glucosa en ${valor} mg/dL. Consulta médica urgente.`,
        moderada: `⚠️ Glucosa fuera de rango: ${valor} mg/dL. Consulta a tu médico.`,
      },
      presion: {
        critica: `🚨 ALERTA CRÍTICA: Presión arterial ${valor} mmHg. Consulta médica urgente.`,
        moderada: `⚠️ Presión fuera de rango: ${valor} mmHg. Consulta a tu médico.`,
      },
      imc: {
        critica: `🚨 ALERTA CRÍTICA: IMC en ${valor}. Consulta médica urgente.`,
        moderada: `⚠️ IMC fuera de rango: ${valor}. Consulta a tu médico.`,
      },
    };

    return mensajes[tipo]?.[severidad] || `⚠️ Valor fuera de rango: ${valor}`;
  }
}

// Singleton
const alertService = new AlertService();

export default alertService;




