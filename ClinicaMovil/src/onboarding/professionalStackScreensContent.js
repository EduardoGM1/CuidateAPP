/** Tours stack profesional (alineado con guías web). steps: { title, body }[] */

export const PROFESSIONAL_STACK_TOURS = {
  DetalleDoctor: {
    steps: [
      {
        title: 'Detalle del doctor',
        body:
          'Aquí ves un resumen del profesional: sus datos, pacientes asignados y citas recientes. Según tus permisos, puedes editar la ficha o usar otras acciones de administración.',
      },
      {
        title: 'Acciones',
        body:
          'Mira los botones para editar la ficha o gestionar asignaciones. El botón «Atrás» te devuelve al listado.',
      },
    ],
  },
  DetallePaciente: {
    steps: [
      {
        title: 'Vista general de la ficha',
        body:
          'Esta pantalla concentra la información clínica del paciente en tarjetas y secciones. Desliza hacia abajo para ver todo; usa actualizar si necesitas datos recientes.',
      },
      {
        title: 'Citas',
        body:
          'En las tarjetas de citas verás la próxima cita, el resumen de citas y el historial de consultas. Desde aquí puedes revisar fechas, estados y, según tu rol, agendar o completar citas.',
      },
      {
        title: 'Monitoreo continuo',
        body:
          'La sección de monitoreo continuo agrupa signos vitales y seguimiento en el tiempo. Úsala para ver tendencias y registrar mediciones cuando corresponda.',
      },
      {
        title: 'Medicamentos',
        body:
          'Consulta y gestiona el tratamiento activo: dosis, frecuencia e indicaciones. Cualquier cambio debe quedar bien registrado y alineado con la prescripción.',
      },
      {
        title: 'Registros e historial',
        body:
          'El historial y la línea de tiempo de consultas te muestran evolución y notas clínicas. Abre cada registro para ver el detalle completo cuando lo necesites.',
      },
      {
        title: 'Red de apoyo',
        body:
          'Aquí figuran familiares o contactos de apoyo del paciente. Sirve para coordinar cuidados o ubicar a alguien autorizado en seguimiento.',
      },
      {
        title: 'Esquema de vacunación',
        body:
          'Revisa vacunas aplicadas y pendientes según el esquema registrado. Puedes actualizar dosis o fechas cuando el sistema y tu rol lo permitan.',
      },
      {
        title: 'Complicaciones',
        body:
          'Las detecciones o complicaciones documentan eventos o alertas clínicas relevantes. Revísalas para no perder de vista riesgos o seguimientos pendientes.',
      },
      {
        title: 'Comorbilidades crónicas',
        body:
          'Las comorbilidades crónicas condicionan el plan de cuidados. Mantén el listado actualizado para que citas, medicamentos y educación sean coherentes con el estado del paciente.',
      },
      {
        title: 'Sesiones educativas',
        body:
          'Registra o consulta sesiones de educación en salud: temas abordados, fechas y participación. Ayuda a documentar adherencia y autocuidado.',
      },
      {
        title: 'Salud bucal',
        body:
          'En salud bucal verás hallazgos odontológicos, tratamientos y observaciones. Completa o amplía el historial desde los botones de la sección cuando aplique.',
      },
      {
        title: 'Detección de tuberculosis',
        body:
          'Esta sección concentra encuestas, baciloscopia, tratamiento y notas de TB. Úsala para seguimiento de programa y trazabilidad de la detección.',
      },
      {
        title: 'Permisos y volver al listado',
        body:
          'Lo que puedas ver o editar depende de tu rol. El botón atrás te devuelve al listado de pacientes; si falta alguna tarjeta, puede ser por permisos o porque aún no hay datos.',
      },
    ],
  },
  AgregarDoctor: {
    steps: [
      {
        title: 'Alta de doctor',
        body:
          'Empieza por el correo: puedes invitar al doctor para que cree su contraseña o asignarle una inicial. Luego completa nombre, contacto y módulo.',
      },
    ],
  },
  EditarDoctor: {
    steps: [
      {
        title: 'Editar doctor',
        body:
          'Lo que guardes sustituye a los datos anteriores. Si estás editando tu propio perfil, es posible que algunos campos no se puedan cambiar.',
      },
    ],
  },
  AgregarPaciente: {
    steps: [
      {
        title: 'Alta de paciente',
        body:
          'El formulario va por pasos: datos personales, PIN, contacto… Lo que sea obligatorio lo verás marcado claramente.',
      },
      {
        title: 'Opcionales',
        body:
          'Campos como la red de apoyo o la primera consulta suelen ser opcionales. Cuando termines, confirma con crear o guardar.',
      },
    ],
  },
  EditarPaciente: {
    steps: [
      {
        title: 'Editar paciente',
        body:
          'Actualiza los datos generales y revisa bien teléfono y CURP. Si te arrepientes, puedes salir sin guardar.',
      },
    ],
  },
  GestionMedicamentos: {
    steps: [
      {
        title: 'Medicamentos',
        body:
          'Es el catálogo general: puedes dar de alta, editar y buscar. Si borras algo, lo normal es que el sistema te pida confirmación.',
      },
    ],
  },
  GestionModulos: {
    steps: [
      {
        title: 'Módulos',
        body:
          'Aquí se definen los módulos que luego usarás al asignar pacientes o doctores.',
      },
    ],
  },
  GestionInstituciones: {
    steps: [
      {
        title: 'Instituciones',
        body:
          'Listado de instituciones de salud (por ejemplo IMSS, ISSSTE) que aparecen en los formularios.',
      },
    ],
  },
  GestionComorbilidades: {
    steps: [
      {
        title: 'Comorbilidades',
        body:
          'Catálogo de comorbilidades para usar en los registros clínicos.',
      },
    ],
  },
  GestionVacunas: {
    steps: [
      {
        title: 'Vacunas',
        body:
          'Vacunas disponibles para armar o consultar esquemas de pacientes.',
      },
    ],
  },
  VerTodasCitas: {
    steps: [
      {
        title: 'Citas',
        body:
          'Lista de citas con filtros por fecha o estado. Toca una fila para ver el detalle y, si tu rol lo permite, hacer cambios.',
      },
    ],
  },
  HistorialAuditoria: {
    steps: [
      {
        title: 'Auditoría',
        body:
          'Registro de lo que ha pasado en el sistema. Puedes filtrar por fechas o por texto.',
      },
      {
        title: 'Exportar',
        body:
          'Si hay datos, a veces podrás exportarlos a CSV u otro formato desde esta pantalla.',
      },
    ],
  },
  HistorialNotificaciones: {
    steps: [
      {
        title: 'Notificaciones',
        body:
          'Avisos de citas, mensajes y alertas. Si se llena la lista, usa los filtros para encontrar lo que buscas.',
      },
    ],
  },
  GraficosEvolucion: {
    steps: [
      {
        title: 'Gráficos',
        body:
          'Gráficas de cómo evolucionan indicadores en el tiempo. Si hay filtros, úsalos para acotar lo que ves.',
      },
    ],
  },
  ListaPacientesDoctor: {
    steps: [
      {
        title: 'Mis pacientes',
        body:
          'Pacientes que tienes asignados. Busca por nombre o datos y toca una fila para abrir la ficha completa.',
      },
    ],
  },
  ReportesAdmin: {
    steps: [
      {
        title: 'Reportes',
        body:
          'Indicadores y análisis para revisar. Mira también si puedes exportar o descargar algo desde aquí.',
      },
    ],
  },
  HistorialMedicoDoctor: {
    steps: [
      {
        title: 'Historial médico',
        body:
          'Consultas y datos clínicos según lo que tu rol te permita ver.',
      },
    ],
  },
  GestionSolicitudesReprogramacion: {
    steps: [
      {
        title: 'Reprogramación',
        body:
          'Solicitudes de cambio de fecha u hora de citas: puedes aprobarlas o rechazarlas. Filtra por estado para ir más rápido.',
      },
    ],
  },
  ChatPaciente: {
    steps: [
      {
        title: 'Chat',
        body:
          'Conversación con el paciente: el historial arriba y el campo para escribir abajo. Atrás te lleva de nuevo a la lista de chats.',
      },
    ],
  },
  ChangePassword: {
    steps: [
      {
        title: 'Contraseña',
        body:
          'Elige una contraseña segura y distinta a la que uses en otros sitios web o apps.',
      },
    ],
  },
};
