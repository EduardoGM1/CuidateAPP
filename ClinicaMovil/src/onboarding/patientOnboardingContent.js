/**
 * Onboarding paciente: shell inicial + tours por pantalla del stack.
 */

import { NOMBRE_APP } from '../utils/constantes';

/** Texto de bienvenida (onboarding + pantalla de inicio paciente). */
export const PACIENTE_TEXTO_BIENVENIDA = `Con ${NOMBRE_APP} puedes monitorear tu salud y llevar un seguimiento junto a tu médico, ver tus citas, medicamentos, llevar un control de tus signos vitales y hablar con tu doctor.`;

export const PATIENT_SHELL_STEPS = [
  {
    key: 'welcome',
    title: 'Bienvenida',
    body: PACIENTE_TEXTO_BIENVENIDA,
  },
  {
    key: 'inicio',
    title: 'Pantalla principal',
    body:
      'En la pantalla de inicio tienes un botón para cada cosa importante. Usa el botón de accesibilidad (♿) en la esquina para cambiar el tamaño de la letra. Si quieres escuchar las indicaciones, usa el audio que te ofrezca cada pantalla.',
  },
  {
    key: 'ayuda',
    title: 'Configuración',
    body:
      'En Configuración puedes ajustar el sonido, el tamaño de la letra y las notificaciones a tu gusto.',
  },
];

export const PATIENT_STACK_TOURS = {
  RegistrarSignosVitales: {
    steps: [
      {
        title: 'Signos vitales',
        body:
          'Anota peso, presión, glucosa u otros datos que tu médico te pida. Así puede hacer un mejor seguimiento de tu salud.',
      },
    ],
  },
  MisCitas: {
    steps: [
      {
        title: 'Tus citas',
        body:
          'Aquí ves las citas que vienen y las que ya tuviste. Si necesitas cambiar alguna, pregunta en tu módulo o en el hospital, o mira si puedes hacerlo desde esta pantalla.',
      },
    ],
  },
  MisMedicamentos: {
    steps: [
      {
        title: 'Medicamentos',
        body:
          'Consulta qué medicamentos tienes activos, con qué dosis y cómo tomarlos. No cambies ni dejes la medicación sin que tu médico te lo indique.',
      },
    ],
  },
  HistorialMedico: {
    steps: [
      {
        title: 'Historial',
        body:
          'Aquí aparece lo que tu hospital haya registrado sobre tus consultas y tu historial. Si falta algo, pregunta en recepción o con tu médico.',
      },
    ],
  },
  GraficosEvolucion: {
    steps: [
      {
        title: 'Gráficas',
        body:
          'Las gráficas muestran cómo evolucionan algunos datos con el tiempo. Son muy útiles para comentarlas con tu médico en la consulta.',
      },
    ],
  },
  ListaChatsPaciente: {
    steps: [
      {
        title: 'Tus médicos',
        body:
          'Aquí aparecen todos los médicos asignados a ti. Toca un nombre para abrir el chat con esa persona, aunque aún no hayan mensajes.',
      },
    ],
  },
  ChatDoctor: {
    steps: [
      {
        title: 'Mensajes',
        body:
          'Escribe o envía un mensaje de voz a este médico. Para emergencias graves no uses el chat: llama a emergencias o a tu módulo.',
      },
    ],
  },
  Configuracion: {
    steps: [
      {
        title: 'Ajustes',
        body: `Aquí eliges si quieres que ${NOMBRE_APP} lea en voz alta, qué tamaño de letra prefieres y si quieres recibir notificaciones. Los cambios se guardan solos para la próxima vez que abras ${NOMBRE_APP}.`,
      },
    ],
  },
  ChangePIN: {
    steps: [
      {
        title: 'Cambiar PIN',
        body:
          'Elige un PIN de cuatro dígitos que recuerdes bien y que no sea fácil de adivinar. No se lo cuentes a otras personas.',
      },
    ],
  },
};
