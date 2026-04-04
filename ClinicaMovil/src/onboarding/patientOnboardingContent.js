/**
 * Onboarding paciente: shell inicial + tours por pantalla del stack.
 */

export const PATIENT_SHELL_STEPS = [
  {
    key: 'welcome',
    title: 'Bienvenida',
    body:
      'Esta aplicación te ayuda a cuidar tu salud de forma sencilla: ver citas, medicamentos, registrar signos vitales y hablar con tu equipo cuando corresponda.',
  },
  {
    key: 'inicio',
    title: 'Pantalla principal',
    body:
      'En el inicio verás botones grandes para cada acción. Puedes usar el audio (TTS) tocando los iconos según lo que indique cada pantalla. Desliza hacia abajo para actualizar datos.',
  },
  {
    key: 'ayuda',
    title: 'Configuración',
    body:
      'En Configuración ajustas el audio, tamaño de letra y notificaciones. Si compartes el teléfono, cierra sesión al terminar desde el inicio cuando esté disponible.',
  },
];

export const PATIENT_STACK_TOURS = {
  RegistrarSignosVitales: {
    steps: [
      {
        title: 'Signos vitales',
        body:
          'Registra peso, presión, glucosa u otros datos que te indique tu equipo. Los valores ayudan al seguimiento de tu salud.',
      },
    ],
  },
  MisCitas: {
    steps: [
      {
        title: 'Tus citas',
        body:
          'Consulta próximas y pasadas citas. Si necesitas cambiar una, pregunta a tu módulo o usa las opciones que te ofrezca la pantalla.',
      },
    ],
  },
  MisMedicamentos: {
    steps: [
      {
        title: 'Medicamentos',
        body:
          'Revisa qué medicamentos están activos, dosis e indicaciones. No dejes de tomar medicación sin indicación médica.',
      },
    ],
  },
  HistorialMedico: {
    steps: [
      {
        title: 'Historial',
        body:
          'Consulta consultas y eventos de tu historial según lo que tu centro haya registrado para ti.',
      },
    ],
  },
  GraficosEvolucion: {
    steps: [
      {
        title: 'Gráficas',
        body:
          'Visualiza cómo evolucionan algunos signos o datos en el tiempo. Útil para entender tendencias con tu equipo de salud.',
      },
    ],
  },
  ChatDoctor: {
    steps: [
      {
        title: 'Mensajes',
        body:
          'Escribe a tu equipo de salud cuando el chat esté habilitado. No uses este canal para emergencias urgentes: llama a emergencias o a tu módulo.',
      },
    ],
  },
  Configuracion: {
    steps: [
      {
        title: 'Ajustes',
        body:
          'Activa o desactiva la lectura en voz alta (TTS), el tamaño de letra y las notificaciones. Los cambios se guardan para la próxima vez que abras la app.',
      },
    ],
  },
  ChangePIN: {
    steps: [
      {
        title: 'Cambiar PIN',
        body:
          'Elige un PIN de 4 dígitos que recuerdes y que no sea fácil de adivinar. No lo compartas con otras personas.',
      },
    ],
  },
};
