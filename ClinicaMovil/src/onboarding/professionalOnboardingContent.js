/**
 * Textos alineados con cuidate-web (catalogoOnboarding / crearPasosShell móvil),
 * adaptados a la navegación real de la app (menú ☰, secciones, accesos rápidos).
 */

export const SHELL_STEPS = [
  {
    key: 'welcome',
    title: 'Bienvenida',
    body:
      '¡Hola! Te damos la bienvenida a Cuidate. En un momento verás cómo usar el menú para moverte entre secciones. Si ya conoces la app, puedes pulsar «Omitir».',
  },
  {
    key: 'menu',
    title: 'Menú principal',
    body:
      'En la parte superior izquierda verás el icono ☰ (menú). Tócalo para abrir el panel: ahí eliges Dashboard, Gestión, Mensajes o Perfil, y según tu rol también aparecen accesos rápidos (citas, pacientes, reportes, etc.).',
  },
  {
    key: 'sections',
    title: 'Secciones',
    body:
      '«Dashboard» resume lo importante según tu rol. «Gestión» concentra pacientes o administración. «Mensajes» es el chat con pacientes (doctores). «Perfil» es tu cuenta, contraseña y cerrar sesión.',
  },
  {
    key: 'tips',
    title: 'Consejos',
    body:
      'La primera vez en cada sección principal (Dashboard, Gestión, Mensajes, Perfil) y al abrir pantallas desde el menú o accesos rápidos verás ayuda breve, al estilo de la web. Puedes repetirla desde Perfil → «Elegir qué reiniciar».',
  },
];

export const MOBILE_SECTION_IDS = {
  Dashboard: 'dashboard',
  Gestion: 'pacientes',
  Mensajes: 'chat',
  Perfil: 'perfil',
};

export const SECTION_TIP_COPY = {
  dashboard: {
    title: 'Dashboard',
    body:
      'Esta es tu pantalla de inicio: un resumen de lo que ocurre en la clínica según tu rol (citas, avisos, indicadores). Las tarjetas destacan lo que conviene revisar primero.',
  },
  pacientes: {
    title: 'Gestión',
    body:
      'Aquí gestionas pacientes o herramientas según tu rol: dar de alta, buscar fichas, citas y más. Usa los accesos rápidos del menú ☰ para ir directo a pantallas frecuentes.',
  },
  chat: {
    title: 'Mensajes',
    body:
      'Canal de mensajes con pacientes que escriben desde la app. Elige una conversación para leer y responder. Si hay no leídos, lo verás en el menú.',
  },
  perfil: {
    title: 'Perfil',
    body:
      'Revisa tu usuario, cambia la contraseña cuando lo necesites y usa «Cerrar sesión» al terminar, sobre todo si compartes el dispositivo.',
  },
};
