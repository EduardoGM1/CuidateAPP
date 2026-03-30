/** Pasos globales: marco de la app (menú, cabecera, contenido). */
export function getShellSteps(isMobile) {
  const mobileIntro = [
    {
      target: 'body',
      placement: 'center',
      disableBeacon: true,
      content:
        'Bienvenido a Cuidate. Esta guía breve te muestra cómo moverte por la aplicación. Puedes omitirla en cualquier momento.',
    },
    {
      target: '[data-tour="onboarding-menu-toggle"]',
      placement: 'bottom',
      disableBeacon: true,
      content:
        'En pantallas pequeñas, abre el menú con este icono para acceder a todas las secciones.',
    },
    {
      target: '[data-tour="onboarding-header-title"]',
      placement: 'bottom',
      disableBeacon: true,
      content: 'Aquí verás el nombre de la sección en la que te encuentras.',
    },
    {
      target: '[data-tour="onboarding-main-content"]',
      placement: 'top',
      disableBeacon: true,
      content:
        'El contenido de cada página aparece aquí. La primera vez que entres a un apartado, te ofreceremos una guía corta específica.',
    },
  ];

  const desktopIntro = [
    {
      target: 'body',
      placement: 'center',
      disableBeacon: true,
      content:
        'Bienvenido a Cuidate. Te mostramos el menú principal y las zonas clave. Puedes omitir esta guía cuando quieras.',
    },
    {
      target: '[data-tour="onboarding-sidebar"]',
      placement: 'right',
      disableBeacon: true,
      content: 'Usa el menú lateral para ir a Inicio, Pacientes, Citas, Reportes, Perfil y el resto de opciones según tu rol.',
    },
    {
      target: '[data-tour="onboarding-header-title"]',
      placement: 'bottom',
      disableBeacon: true,
      content: 'La barra superior indica en qué sección estás trabajando.',
    },
    {
      target: '[data-tour="onboarding-user-area"]',
      placement: 'right',
      disableBeacon: true,
      content: 'Aquí ves tu nombre y puedes cerrar sesión de forma segura.',
    },
    {
      target: '[data-tour="onboarding-main-content"]',
      placement: 'top',
      disableBeacon: true,
      content:
        'Cada pantalla muestra su contenido en esta zona. Las guías por sección aparecerán solo la primera vez que las visites.',
    },
  ];

  return isMobile ? mobileIntro : desktopIntro;
}

/** Pasos por sección (anclas data-tour en cada página). */
export function getSectionSteps(sectionId, { isAdmin }) {
  const steps = {
    dashboard: [
      {
        target: '[data-tour="section-dashboard-root"]',
        placement: 'top',
        disableBeacon: true,
        content: 'El inicio resume la actividad de la clínica según tu rol: métricas, alertas y accesos rápidos.',
      },
      {
        target: '[data-tour="section-dashboard-welcome"]',
        placement: 'bottom',
        disableBeacon: true,
        content: 'Aquí se confirma tu sesión y la fecha de trabajo actual.',
      },
      {
        target: '[data-tour="section-dashboard-stats"]',
        placement: 'top',
        disableBeacon: true,
        content:
          'Las tarjetas y gráficos resumen pacientes, citas y avisos importantes. Puedes pulsar en alertas para ver más detalle cuando aplique.',
      },
    ],
    pacientes: [
      {
        target: '[data-tour="section-pacientes-root"]',
        placement: 'top',
        disableBeacon: true,
        content: 'En Pacientes gestionas el padrón: alta, consulta y seguimiento de cada persona.',
      },
      {
        target: '[data-tour="section-pacientes-new"]',
        placement: 'left',
        disableBeacon: true,
        content: 'Crea un nuevo registro de paciente con este botón.',
      },
      {
        target: '[data-tour="section-pacientes-filters"]',
        placement: 'bottom',
        disableBeacon: true,
        content: 'Busca por nombre y filtra por estado, comorbilidad o módulo para acotar la lista.',
      },
      {
        target: '[data-tour="section-pacientes-table"]',
        placement: 'top',
        disableBeacon: true,
        content: 'Pulsa una fila para abrir la ficha completa del paciente (citas, signos vitales, etc.).',
      },
    ],
    citas: [
      {
        target: '[data-tour="section-citas-root"]',
        placement: 'top',
        disableBeacon: true,
        content: 'Centralizas las citas: consulta, filtra y actualiza estados según tu permiso.',
      },
      {
        target: '[data-tour="section-citas-view-toggle"]',
        placement: 'bottom',
        disableBeacon: true,
        content: 'Alterna entre vista de lista y agenda según cómo prefieras trabajar el día.',
      },
      {
        target: '[data-tour="section-citas-filters"]',
        placement: 'bottom',
        disableBeacon: true,
        content: 'Filtra por estado, doctor y fechas para encontrar citas concretas.',
      },
      {
        target: '[data-tour="section-citas-table"]',
        placement: 'top',
        disableBeacon: true,
        content: 'Abre el detalle de una cita con un clic. Los doctores y administradores pueden cambiar el estado desde la fila.',
      },
    ],
    reportes: [
      {
        target: '[data-tour="section-reportes-root"]',
        placement: 'top',
        disableBeacon: true,
        content: 'Reportes agrupa indicadores, gráficos y exportaciones para análisis y seguimiento.',
      },
      {
        target: '[data-tour="section-reportes-summary"]',
        placement: 'top',
        disableBeacon: true,
        content: 'El resumen numérico ofrece una vista rápida de la actividad reciente.',
      },
      {
        target: '[data-tour="section-reportes-detail"]',
        placement: 'top',
        disableBeacon: true,
        content: 'Más abajo encontrarás desgloses, tablas y opciones como PDF según tu rol.',
      },
    ],
    perfil: [
      {
        target: '[data-tour="section-perfil-root"]',
        placement: 'top',
        disableBeacon: true,
        content: 'En Perfil revisas tu usuario, actualizas datos profesionales (si aplica) y cambias tu contraseña.',
      },
      {
        target: '[data-tour="section-perfil-datos"]',
        placement: 'top',
        disableBeacon: true,
        content: 'Consulta correo, rol y nombre asociados a tu cuenta.',
      },
      {
        target: '[data-tour="section-perfil-password"]',
        placement: 'top',
        disableBeacon: true,
        content: 'Mantén tu contraseña al día por seguridad. Más abajo puedes volver a ver las guías de la aplicación.',
      },
    ],
    doctores: [
      {
        target: '[data-tour="section-doctores-root"]',
        placement: 'top',
        disableBeacon: true,
        content: isAdmin
          ? 'Como administrador, aquí das de alta y administras doctores y sus datos básicos.'
          : 'Consulta la información de doctores según los permisos de tu cuenta.',
      },
      ...(isAdmin
        ? [
            {
              target: '[data-tour="section-doctores-new"]',
              placement: 'bottom',
              disableBeacon: true,
              content: 'Registra un nuevo doctor y vincúlalo a su usuario cuando corresponda.',
            },
          ]
        : []),
      {
        target: '[data-tour="section-doctores-filters"]',
        placement: 'bottom',
        disableBeacon: true,
        content: 'Filtra por estado o módulo para localizar profesionales.',
      },
      {
        target: '[data-tour="section-doctores-table"]',
        placement: 'top',
        disableBeacon: true,
        content: 'Pulsa una fila para ver o editar la ficha del doctor.',
      },
    ],
    auditoria: [
      {
        target: '[data-tour="section-auditoria-root"]',
        placement: 'top',
        disableBeacon: true,
        content: 'La auditoría registra acciones relevantes del sistema para trazabilidad y cumplimiento.',
      },
      {
        target: '[data-tour="section-auditoria-export"]',
        placement: 'bottom',
        disableBeacon: true,
        content: 'Exporta el listado a CSV cuando necesites un informe externo.',
      },
      {
        target: '[data-tour="section-auditoria-filters"]',
        placement: 'top',
        disableBeacon: true,
        content: 'Acota por fechas, IP o texto en la descripción para revisar eventos concretos.',
      },
    ],
    catalogos: [
      {
        target: '[data-tour="section-catalogos-root"]',
        placement: 'top',
        disableBeacon: true,
        content: 'Los catálogos definen datos maestros: módulos, instituciones, comorbilidades, medicamentos y vacunas.',
      },
      {
        target: '[data-tour="section-catalogos-tabs"]',
        placement: 'bottom',
        disableBeacon: true,
        content: 'Cambia de pestaña para administrar cada tipo de catálogo.',
      },
      {
        target: '[data-tour="section-catalogos-toolbar"]',
        placement: 'top',
        disableBeacon: true,
        content: 'Añade registros nuevos o edita los existentes desde la tabla inferior.',
      },
    ],
    usuarios: [
      {
        target: '[data-tour="section-usuarios-root"]',
        placement: 'top',
        disableBeacon: true,
        content: 'Gestiona cuentas de acceso: altas, roles y estado de los usuarios del sistema.',
      },
      {
        target: '[data-tour="section-usuarios-new"]',
        placement: 'left',
        disableBeacon: true,
        content: 'Crea usuarios nuevos por invitación o con contraseña inicial, según el flujo que elijas en el formulario.',
      },
      {
        target: '[data-tour="section-usuarios-table"]',
        placement: 'top',
        disableBeacon: true,
        content: 'Edita o desactiva usuarios desde las acciones de cada fila.',
      },
    ],
    notificaciones: [
      {
        target: '[data-tour="section-notificaciones-root"]',
        placement: 'top',
        disableBeacon: true,
        content: 'Revisa avisos de citas, mensajes y alertas clínicas dirigidas a tu perfil de doctor.',
      },
      {
        target: '[data-tour="section-notificaciones-filters"]',
        placement: 'bottom',
        disableBeacon: true,
        content: 'Filtra por tipo, estado o fechas para priorizar lo urgente.',
      },
      {
        target: '[data-tour="section-notificaciones-list"]',
        placement: 'top',
        disableBeacon: true,
        content: 'Pulsa una tarjeta para abrir el detalle y marcar como leída cuando proceda.',
      },
    ],
    'solicitudes-reprogramacion': [
      {
        target: '[data-tour="section-solicitudes-root"]',
        placement: 'top',
        disableBeacon: true,
        content: 'Aquí respondes a las solicitudes de cambio de fecha u hora de citas.',
      },
      {
        target: '[data-tour="section-solicitudes-filter"]',
        placement: 'bottom',
        disableBeacon: true,
        content: 'Filtra por estado para ver pendientes, aprobadas o rechazadas.',
      },
      {
        target: '[data-tour="section-solicitudes-list"]',
        placement: 'top',
        disableBeacon: true,
        content: 'Cada tarjeta resume la solicitud; usa los botones para aprobar o rechazar con el mensaje adecuado.',
      },
    ],
    chat: [
      {
        target: '[data-tour="section-chat-root"]',
        placement: 'top',
        disableBeacon: true,
        content: 'El chat concentra las conversaciones con pacientes que te escriben desde la app.',
      },
      {
        target: '[data-tour="section-chat-filter"]',
        placement: 'bottom',
        disableBeacon: true,
        content: 'Busca por nombre si tienes muchas conversaciones abiertas.',
      },
      {
        target: '[data-tour="section-chat-list"]',
        placement: 'top',
        disableBeacon: true,
        content: 'Selecciona una conversación para leer y responder en la vista siguiente.',
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
