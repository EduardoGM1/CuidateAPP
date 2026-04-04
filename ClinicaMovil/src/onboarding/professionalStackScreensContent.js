/** Tours stack profesional (alineado con guías web). steps: { title, body }[] */

export const PROFESSIONAL_STACK_TOURS = {
  DetalleDoctor: {
    steps: [
      {
        title: 'Detalle del doctor',
        body:
          'Resumen del profesional: datos, pacientes asignados y citas recientes. Puedes editar o usar acciones de administración según permisos.',
      },
      {
        title: 'Acciones',
        body:
          'Revisa los botones para editar ficha o gestionar asignaciones. «Atrás» vuelve al listado.',
      },
    ],
  },
  DetallePaciente: {
    steps: [
      {
        title: 'Ficha del paciente',
        body:
          'Información del paciente: historial, citas, signos vitales y más. Usa las secciones o tarjetas para cada tema.',
      },
      {
        title: 'Navegación',
        body:
          'Puedes agendar citas o registrar datos según permisos. Vuelve al listado con atrás.',
      },
    ],
  },
  AgregarDoctor: {
    steps: [
      {
        title: 'Alta de doctor',
        body:
          'Correo primero: invita para que cree contraseña o define una inicial. Completa nombre, contacto y módulo.',
      },
    ],
  },
  EditarDoctor: {
    steps: [
      {
        title: 'Editar doctor',
        body:
          'Los cambios guardados reemplazan datos anteriores. Algunos campos pueden estar bloqueados si editas tu propio perfil.',
      },
    ],
  },
  AgregarPaciente: {
    steps: [
      {
        title: 'Alta de paciente',
        body:
          'Formulario por pasos: datos, PIN, contacto. Lo obligatorio lo marca el formulario.',
      },
      {
        title: 'Opcionales',
        body:
          'Red de apoyo o primera consulta suelen ser opcionales. Confirma con crear o guardar al final.',
      },
    ],
  },
  EditarPaciente: {
    steps: [
      {
        title: 'Editar paciente',
        body:
          'Actualiza datos generales. Revisa teléfono y CURP. Puedes cancelar sin guardar.',
      },
    ],
  },
  GestionMedicamentos: {
    steps: [
      {
        title: 'Medicamentos',
        body: 'Catálogo maestro: alta, edición y búsqueda. Eliminar suele pedir confirmación.',
      },
    ],
  },
  GestionModulos: {
    steps: [
      {
        title: 'Módulos',
        body: 'Datos maestros de módulos usados al asignar pacientes o doctores.',
      },
    ],
  },
  GestionInstituciones: {
    steps: [
      {
        title: 'Instituciones',
        body: 'Instituciones de salud disponibles en formularios (IMSS, ISSSTE, etc.).',
      },
    ],
  },
  GestionComorbilidades: {
    steps: [
      {
        title: 'Comorbilidades',
        body: 'Listado maestro para registros clínicos.',
      },
    ],
  },
  GestionVacunas: {
    steps: [
      {
        title: 'Vacunas',
        body: 'Catálogo de vacunas para esquemas de pacientes.',
      },
    ],
  },
  VerTodasCitas: {
    steps: [
      {
        title: 'Citas',
        body:
          'Lista y filtros por fechas o estado. Toca una fila para el detalle y cambios si tu rol lo permite.',
      },
    ],
  },
  HistorialAuditoria: {
    steps: [
      {
        title: 'Auditoría',
        body: 'Registro de acciones del sistema. Filtra por fechas o texto.',
      },
      {
        title: 'Exportar',
        body: 'Si hay datos, puede existir exportación a CSV u otro formato.',
      },
    ],
  },
  HistorialNotificaciones: {
    steps: [
      {
        title: 'Notificaciones',
        body: 'Avisos de citas, mensajes y alertas. Filtra si la bandeja crece.',
      },
    ],
  },
  GraficosEvolucion: {
    steps: [
      {
        title: 'Gráficos',
        body: 'Evolución de indicadores en el tiempo. Ajusta filtros si existen.',
      },
    ],
  },
  ListaPacientesDoctor: {
    steps: [
      {
        title: 'Mis pacientes',
        body: 'Tus pacientes asignados. Busca y toca una fila para abrir la ficha.',
      },
    ],
  },
  ReportesAdmin: {
    steps: [
      {
        title: 'Reportes',
        body: 'Indicadores y análisis. Revisa gráficos y exportación si aplica.',
      },
    ],
  },
  HistorialMedicoDoctor: {
    steps: [
      {
        title: 'Historial médico',
        body: 'Consultas y datos clínicos según alcance de tu rol.',
      },
    ],
  },
  GestionSolicitudesReprogramacion: {
    steps: [
      {
        title: 'Reprogramación',
        body: 'Aprueba o rechaza cambios de fecha/hora de citas. Filtra por estado.',
      },
    ],
  },
  ChatPaciente: {
    steps: [
      {
        title: 'Chat',
        body: 'Mensajes con el paciente. Historial arriba; escribe abajo. Atrás vuelve a la lista.',
      },
    ],
  },
  ChangePassword: {
    steps: [
      {
        title: 'Contraseña',
        body: 'Usa una contraseña fuerte y distinta a otros sitios.',
      },
    ],
  },
};
