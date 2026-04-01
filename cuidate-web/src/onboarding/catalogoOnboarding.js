const ANCLA_CONTENIDO_PRINCIPAL = {
  target: '[data-tour="onboarding-main-content"]',
  placement: 'center',
  disableBeacon: true,
};

export function crearPasosShell(esMovil) {
  const introduccionMovil = [
    {
      target: 'body',
      placement: 'center',
      disableBeacon: true,
      content:
        '¡Hola! Te damos la bienvenida a Cuidate. En un momento verás cómo abrir el menú para moverte entre secciones. Si ya lo sabes todo, puedes pulsar «Omitir».',
    },
    {
      target: '[data-tour="onboarding-menu-toggle"]',
      placement: 'bottom',
      disableBeacon: true,
      content:
        'En el móvil o en pantallas estrechas, el menú no está siempre visible: tócalo aquí para desplegarlo y saltar de una sección a otra.',
    },
  ];

  const introduccionEscritorio = [
    {
      target: 'body',
      placement: 'center',
      disableBeacon: true,
      content:
        '¡Hola! Te damos la bienvenida a Cuidate. Vamos a recorrer el menú lateral y las zonas que usarás cada día. Si prefieres explorar solo, puedes pulsar «Omitir».',
    },
    {
      target: '[data-tour="onboarding-sidebar"]',
      placement: 'right',
      disableBeacon: true,
      content:
        'Desde aquí eliges la sección: Inicio, Pacientes, Citas, Reportes, Perfil y el resto según tu rol (por ejemplo, administración o herramientas de doctor). Es tu mapa principal.',
    },
    {
      target: '[data-tour="onboarding-user-area"]',
      placement: 'right',
      disableBeacon: true,
      content:
        'Aquí ves con qué usuario has entrado. Cuando termines tu jornada, usa «Cerrar sesión» para salir con seguridad, sobre todo si compartes el equipo.',
    },
  ];

  return esMovil ? introduccionMovil : introduccionEscritorio;
}

export function crearPasosSeccion(esAdmin) {
  return {
    dashboard: [
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Esta es tu pantalla de inicio: piensa en ella como un tablero donde ves de un vistazo qué está pasando en la clínica según tu rol (pacientes, citas, avisos…).',
      },
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Las tarjetas y gráficos resumen números importantes (por ejemplo citas del día o alertas). Si ves algo marcado como alerta, suele ser un buen punto para revisarlo con más detalle.',
      },
    ],
    pacientes: [
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'En «Pacientes» gestionas el registro de pacientes: dar de alta a personas nuevas, buscar a quién ya está registrado y abrir la ficha para ver historial, citas y más.',
      },
      {
        target: '[data-tour="section-pacientes-new"]',
        placement: 'left',
        disableBeacon: true,
        content:
          '¿Necesitas incorporar a alguien que aún no está en el sistema? Este botón inicia el alta; te pedirá los datos paso a paso.',
      },
      {
        target: '[data-tour="section-pacientes-filters"]',
        placement: 'bottom',
        disableBeacon: true,
        content:
          'Si la lista es larga, usa la búsqueda y los filtros (estado, comorbilidad, módulo…) para acotar. Así llegas más rápido al paciente que buscas.',
      },
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Cada fila es un paciente. Haz clic en la fila (no solo en el nombre) para abrir su ficha completa: ahí verás citas, signos vitales y el resto del contexto clínico.',
      },
    ],
    citas: [
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Aquí concentras las citas: verlas en lista, pasar a una vista tipo agenda, filtrar y, si tu rol lo permite, actualizar el estado de cada cita.',
      },
      {
        target: '[data-tour="section-citas-view-toggle"]',
        placement: 'bottom',
        disableBeacon: true,
        content:
          'Puedes alternar entre «Lista» (todo en filas) y «Agenda» (más visual por día o semana). Prueba ambas y quédate con la que te resulte más cómoda.',
      },
      {
        target: '[data-tour="section-citas-filters"]',
        placement: 'bottom',
        disableBeacon: true,
        content:
          'Combina filtros (estado, doctor, fechas…) para encontrar una cita concreta o revisar un rango de tiempo, por ejemplo solo las pendientes de esta semana.',
      },
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Clic en una fila para abrir el detalle de esa cita. Si eres doctor o administrador, a veces podrás cambiar el estado desde aquí sin entrar a otra pantalla.',
      },
    ],
    reportes: [
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          '«Reportes» es el lugar para analizar: números, gráficos y, si aplica, exportar datos (por ejemplo PDF). No es la pantalla de día a día, sino de lectura y seguimiento.',
      },
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Más abajo encontrarás desgloses y tarjetas (según tu rol). Si ves opción de descargar PDF u otros informes, suele estar en esta zona.',
      },
    ],
    perfil: [
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'En «Perfil» revisas quién eres en el sistema, actualizas datos profesionales si aplica y cambias tu contraseña cuando lo necesites.',
      },
      {
        target: '[data-tour="section-perfil-password"]',
        placement: 'top',
        disableBeacon: true,
        content:
          'Desde aquí puedes actualizar tu contraseña cuando lo necesites; usa una distinta a la de otros sitios y guárdala en un lugar seguro.',
      },
    ],
    doctores: [
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content: esAdmin
          ? 'Como administrador, aquí gestionas el equipo médico: altas, datos básicos y búsqueda. Los doctores suelen ver una vista más limitada a su propio perfil.'
          : 'Consulta la información de doctores según lo que te permita tu cuenta; si solo ves tu perfil, es normal en algunos roles.',
      },
      ...(esAdmin
        ? [
            {
              target: '[data-tour="section-doctores-new"]',
              placement: 'bottom',
              disableBeacon: true,
              content:
                'Para incorporar a un profesional nuevo, empieza aquí. El sistema te guiará para vincular usuario, datos y módulo cuando corresponda.',
            },
          ]
        : []),
      {
        target: '[data-tour="section-doctores-filters"]',
        placement: 'bottom',
        disableBeacon: true,
        content:
          'Si la lista es larga, filtra por estado o módulo para encontrar a alguien o revisar solo un grupo de trabajo.',
      },
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Cada fila es un doctor. Haz clic para abrir la ficha: verás más detalle y, según permisos, podrás editar.',
      },
    ],
    auditoria: [
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'La auditoría guarda un registro de acciones importantes en el sistema, para poder revisar qué pasó y cuándo. Es muy útil para trazabilidad y cumplimiento.',
      },
      {
        target: '[data-tour="section-auditoria-export"]',
        placement: 'bottom',
        disableBeacon: true,
        content:
          'Si necesitas trabajar los datos fuera de la aplicación (por ejemplo en Excel), puedes exportar el listado a CSV cuando haya resultados.',
      },
      {
        target: '[data-tour="section-auditoria-filters"]',
        placement: 'top',
        disableBeacon: true,
        content:
          'Acota por fechas, IP o texto en la descripción para centrarte en un periodo o en un tipo de evento concreto.',
      },
    ],
    catalogos: [
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Los catálogos son los datos «maestros» que luego verás en formularios: módulos, instituciones, comorbilidades, medicamentos, vacunas… Mantenerlos ordenados ayuda a que todo el equipo use los mismos criterios.',
      },
      {
        target: '[data-tour="section-catalogos-toolbar"]',
        placement: 'top',
        disableBeacon: true,
        content:
          'Desde aquí das de alta y editas registros. Si algo no debe borrarse a la ligera, el sistema suele pedirte confirmación antes de eliminar.',
      },
    ],
    usuarios: [
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Aquí administras las cuentas de acceso: quién puede entrar, con qué rol y si está activo. Es una pantalla sensible; conviene revisarla solo con permisos de administrador.',
      },
      {
        target: '[data-tour="section-usuarios-new"]',
        placement: 'left',
        disableBeacon: true,
        content:
          '¿Necesitas dar de alta a alguien nuevo? Este botón abre el flujo: podrás invitar por correo para que cree su contraseña o definir una contraseña inicial, según elijas.',
      },
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Cada fila es un usuario. Desde las acciones podrás editar datos o desactivar cuentas que ya no deban entrar.',
      },
    ],
    notificaciones: [
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Las notificaciones te avisan de cosas que te conciernen como doctor: citas, mensajes, alertas de signos, etc. Revísalas para no perder nada urgente.',
      },
      {
        target: '[data-tour="section-notificaciones-filters"]',
        placement: 'bottom',
        disableBeacon: true,
        content:
          'Si la bandeja se llena, usa tipo, estado y fechas para ver solo lo pendiente o lo reciente.',
      },
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Toca una tarjeta para leer el mensaje completo. Cuando ya lo hayas tratado, puedes marcarla como leída o archivarla para mantener orden.',
      },
    ],
    'solicitudes-reprogramacion': [
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Aquí llegan las peticiones de cambio de fecha u hora de una cita. Tu trabajo es revisar cada una y decidir si la apruebas o la rechazas, con una respuesta clara al paciente.',
      },
      {
        target: '[data-tour="section-solicitudes-filter"]',
        placement: 'bottom',
        disableBeacon: true,
        content:
          'Filtra por estado para ver solo lo pendiente o revisar lo ya cerrado (aprobado o rechazado).',
      },
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Cada tarjeta resume la solicitud. Si la cita sigue pendiente, usa los botones para aprobar o rechazar; a veces podrás añadir un comentario o motivo.',
      },
    ],
    chat: [
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'El chat es el canal de mensajes con pacientes que escriben desde la app. Aquí ves las conversaciones abiertas y entras a cada una para responder.',
      },
      {
        target: '[data-tour="section-chat-filter"]',
        placement: 'bottom',
        disableBeacon: true,
        content:
          'Si tienes muchas conversaciones, escribe parte del nombre del paciente para acortar la lista.',
      },
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Toca una conversación para abrirla en la pantalla siguiente y leer el hilo completo. Los mensajes nuevos suelen actualizar la lista en tiempo real.',
      },
    ],
    'pacientes-nuevo': [
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Estás en el alta de un paciente nuevo. El formulario te pide datos personales y de contacto; rellénalo con calma, en el orden que te resulte cómodo.',
      },
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Más abajo puedes añadir red de apoyo, datos médicos iniciales o una primera consulta si aplica; todo eso es opcional salvo lo que marque el propio formulario como obligatorio.',
      },
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Cuando termines, usa el botón principal de guardar o crear. Si falta algo importante, el sistema te lo indicará antes de guardar. Puedes volver atrás sin guardar si lo necesitas.',
      },
    ],
    'pacientes-detalle': [
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Esta es la ficha del paciente: aquí concentras su información, historial de citas, signos vitales, medicación y otras secciones según tu rol.',
      },
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Explora con el menú o las pestañas que veas en pantalla. Desde aquí suele poderse agendar citas, registrar datos clínicos o abrir el detalle de cada elemento.',
      },
      {
        target: '[data-tour="paciente-detail-sections-grid"]',
        placement: 'top',
        disableBeacon: true,
        content:
          'Estas tarjetas son accesos al expediente por tema: consultas, citas, signos, medicación, vacunas, etc. Pulsa una para abrir su ventana; la primera vez que entres a cada una verás una explicación breve.',
      },
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'El enlace «Volver a Pacientes» te regresa al listado. Si no ves un dato, puede que tu usuario no tenga permiso para verlo.',
      },
    ],
    'pacientes-editar': [
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Aquí actualizas los datos generales del paciente (nombre, contacto, domicilio, etc.). Al guardar, los cambios sustituyen la información que había antes.',
      },
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Revisa teléfono, CURP y dirección con cuidado; suelen usarse para contacto y trazabilidad. Puedes cancelar y volver a la ficha sin guardar si lo prefieres.',
      },
    ],
    'pacientes-agendar-cita': [
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Vas a crear una cita para este paciente: elige doctor, fecha y hora. El motivo suele ser opcional pero ayuda a quien atienda la consulta.',
      },
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Al confirmar, la cita quedará registrada. Luego la verás en la lista de citas y en el contexto del paciente. Si te equivocas, suele poder corregirse desde el detalle de la cita.',
      },
    ],
    'citas-detalle': [
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Esta pantalla muestra una sola cita: quién es el paciente, el doctor, la fecha, el estado y las observaciones.',
      },
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Según tu rol, podrás cambiar el estado, completar la consulta, registrar signos vitales o reprogramar. Los botones disponibles son los que tu cuenta puede usar.',
      },
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Puedes saltar a la ficha del paciente o ver más citas de esa persona con los accesos que aparezcan. «Volver» te regresa al listado de citas.',
      },
    ],
    'doctores-nuevo': [
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Das de alta a un doctor nuevo. Lo primero es el correo: puedes invitarlo para que él cree su contraseña, o definir una contraseña inicial tú mismo.',
      },
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Completa nombre, datos de contacto y módulo. Al final, el botón de crear guarda todo; si el correo ya existía, el sistema te avisará para que decidas qué hacer.',
      },
    ],
    'doctores-detalle': [
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Resumen del doctor: datos profesionales, pacientes asignados y citas recientes cuando haya información cargada.',
      },
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Desde aquí puedes editar su ficha, gestionar pacientes asignados o acciones de administración (contraseña, activar o desactivar) según lo que permita tu rol.',
      },
    ],
    'doctores-editar': [
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Modificas los datos del doctor en el formulario. Lo que guardes reemplaza la información anterior en el sistema.',
      },
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Si entras a editar tu propio perfil como doctor, algunos campos pueden estar bloqueados; es normal para proteger datos que solo cambia administración.',
      },
    ],
    'auditoria-detalle': [
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Este es un registro puntual de auditoría: qué acción ocurrió, cuándo, qué usuario la hizo y desde qué equipo (IP), en texto legible.',
      },
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Sirve para aclarar dudas o cumplir revisiones internas. Si el registro está ligado a una cita, puede haber un acceso directo para abrirla.',
      },
    ],
    'chat-conversacion': [
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Chateas con un paciente concreto. Arriba verás el historial de mensajes; los tuyos y los del paciente suelen distinguirse por el diseño de cada burbuja.',
      },
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          'Escribe tu mensaje abajo y envíalo con el botón correspondiente. Pueden llegar mensajes nuevos en tiempo real mientras mantengas esta pantalla abierta.',
      },
      {
        ...ANCLA_CONTENIDO_PRINCIPAL,
        content:
          '«Volver» te lleva otra vez a la lista de conversaciones para elegir otro paciente o cerrar el chat.',
      },
    ],
  };
}

export const COPIA_MODAL_PACIENTE = {
  'historial-consultas': [
    'Aquí ves las consultas anteriores del paciente en orden cronológico. Pulsa una fila para abrir el detalle de esa cita.',
  ],
  monitoreo: [
    'El monitoreo continuo concentra alertas y seguimiento cuando hay datos vinculados. Revisa lo que aparezca en pantalla para priorizar la atención.',
  ],
  citas: [
    'Gestiona las citas de este paciente: próximas y pasadas según lo que cargue el sistema. Desde aquí suele poderse crear o revisar citas según tu rol.',
  ],
  signos: [
    'Registra o revisa signos vitales (peso, presión, glucosa, etc.). Puedes ver la evolución y, si aplica, editar o añadir mediciones.',
  ],
  diagnosticos: [
    'Listado de diagnósticos asociados al paciente. Puedes consultar fechas y descripciones y añadir nuevos cuando corresponda.',
  ],
  medicacion: [
    'Planes de medicación y tomas: revisa qué está activo, las dosis y el historial. Los botones te guían para agregar o ajustar tratamientos.',
  ],
  'red-apoyo': [
    'Contactos de la red de apoyo (familiares o acompañantes). Sirve para comunicación autorizada y datos de emergencia.',
  ],
  vacunacion: [
    'Esquema de vacunas aplicadas o pendientes. Puedes registrar nuevas dosis con fecha y datos de la vacuna.',
  ],
  comorbilidades: [
    'Condiciones crónicas o asociadas registradas. Ayuda a tener el contexto clínico completo ante nuevas consultas.',
  ],
  detecciones: [
    'Evaluaciones y detecciones de complicaciones. Documenta resultados y seguimiento según los protocolos de tu institución.',
  ],
  'sesiones-educativas': [
    'Sesiones de educación en salud: tipo, fecha y asistencia. Útil para el seguimiento del autocuidado del paciente.',
  ],
  'salud-bucal': [
    'Registros de salud bucal y tratamientos odontológicos relacionados con el paciente.',
  ],
  'detecciones-tb': [
    'Encuestas y seguimiento de tuberculosis cuando aplique. Completa solo los campos que correspondan al caso.',
  ],
  doctores: [
    'Doctores vinculados a este paciente. Según permisos, puedes asignar o quitar profesionales de la lista.',
  ],
  graficos: [
    'Gráficos de evolución (por ejemplo signos vitales en el tiempo). Cambia filtros o rangos si la pantalla lo permite para interpretar tendencias.',
  ],
};
