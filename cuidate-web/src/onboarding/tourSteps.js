/**
 * Ancla al contenido principal del layout para centrar el tooltip en la zona de trabajo
 * (evita tooltips pegados al borde inferior cuando el objetivo real está abajo).
 */
const TOUR_MAIN_CONTENT = {
  target: '[data-tour="onboarding-main-content"]',
  placement: 'center',
  disableBeacon: true,
};

/** Pasos globales: marco de la app (menú, cabecera, contenido). */
export function getShellSteps(isMobile) {
  const mobileIntro = [
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

  const desktopIntro = [
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

  return isMobile ? mobileIntro : desktopIntro;
}

/** Pasos por sección (anclas data-tour en cada página). */
export function getSectionSteps(sectionId, { isAdmin }) {
  const steps = {
    dashboard: [
      {
        ...TOUR_MAIN_CONTENT,
        content:
          'Esta es tu pantalla de inicio: piensa en ella como un tablero donde ves de un vistazo qué está pasando en la clínica según tu rol (pacientes, citas, avisos…).',
      },
      {
        ...TOUR_MAIN_CONTENT,
        content:
          'Las tarjetas y gráficos resumen números importantes (por ejemplo citas del día o alertas). Si ves algo marcado como alerta, suele ser un buen punto para revisarlo con más detalle.',
      },
    ],
    pacientes: [
      {
        ...TOUR_MAIN_CONTENT,
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
        ...TOUR_MAIN_CONTENT,
        content:
          'Cada fila es un paciente. Haz clic en la fila (no solo en el nombre) para abrir su ficha completa: ahí verás citas, signos vitales y el resto del contexto clínico.',
      },
    ],
    citas: [
      {
        ...TOUR_MAIN_CONTENT,
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
        ...TOUR_MAIN_CONTENT,
        content:
          'Clic en una fila para abrir el detalle de esa cita. Si eres doctor o administrador, a veces podrás cambiar el estado desde aquí sin entrar a otra pantalla.',
      },
    ],
    reportes: [
      {
        ...TOUR_MAIN_CONTENT,
        content:
          '«Reportes» es el lugar para analizar: números, gráficos y, si aplica, exportar datos (por ejemplo PDF). No es la pantalla de día a día, sino de lectura y seguimiento.',
      },
      {
        ...TOUR_MAIN_CONTENT,
        content:
          'Más abajo encontrarás desgloses y tarjetas (según tu rol). Si ves opción de descargar PDF u otros informes, suele estar en esta zona.',
      },
    ],
    perfil: [
      {
        ...TOUR_MAIN_CONTENT,
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
        ...TOUR_MAIN_CONTENT,
        content: isAdmin
          ? 'Como administrador, aquí gestionas el equipo médico: altas, datos básicos y búsqueda. Los doctores suelen ver una vista más limitada a su propio perfil.'
          : 'Consulta la información de doctores según lo que te permita tu cuenta; si solo ves tu perfil, es normal en algunos roles.',
      },
      ...(isAdmin
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
        ...TOUR_MAIN_CONTENT,
        content:
          'Cada fila es un doctor. Haz clic para abrir la ficha: verás más detalle y, según permisos, podrás editar.',
      },
    ],
    auditoria: [
      {
        ...TOUR_MAIN_CONTENT,
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
        ...TOUR_MAIN_CONTENT,
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
        ...TOUR_MAIN_CONTENT,
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
        ...TOUR_MAIN_CONTENT,
        content:
          'Cada fila es un usuario. Desde las acciones podrás editar datos o desactivar cuentas que ya no deban entrar.',
      },
    ],
    notificaciones: [
      {
        ...TOUR_MAIN_CONTENT,
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
        ...TOUR_MAIN_CONTENT,
        content:
          'Toca una tarjeta para leer el mensaje completo. Cuando ya lo hayas tratado, puedes marcarla como leída o archivarla para mantener orden.',
      },
    ],
    'solicitudes-reprogramacion': [
      {
        ...TOUR_MAIN_CONTENT,
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
        ...TOUR_MAIN_CONTENT,
        content:
          'Cada tarjeta resume la solicitud. Si la cita sigue pendiente, usa los botones para aprobar o rechazar; a veces podrás añadir un comentario o motivo.',
      },
    ],
    chat: [
      {
        ...TOUR_MAIN_CONTENT,
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
        ...TOUR_MAIN_CONTENT,
        content:
          'Toca una conversación para abrirla en la pantalla siguiente y leer el hilo completo. Los mensajes nuevos suelen actualizar la lista en tiempo real.',
      },
    ],
  };

  return steps[sectionId] ?? [];
}

export function filterExistingTargets(steps) {
  if (!steps?.length) return [];
  return steps.filter((step) => {
    const t = step.target;
    if (t === 'body') return true;
    try {
      return document.querySelector(t) != null;
    } catch {
      return false;
    }
  });
}
