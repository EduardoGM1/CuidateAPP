/**
 * Textos alineados con cuidate-web (catalogoOnboarding / crearPasosShell móvil),
 * adaptados a la navegación real de la app (menú ☰, secciones, accesos rápidos).
 */

import { NOMBRE_APP } from '../utils/constantes';

export const SHELL_STEPS = [
  {
    key: 'welcome',
    title: 'Bienvenida',
    body: `¡Hola! Te damos la bienvenida a ${NOMBRE_APP}. En un momento te explicamos cómo moverte con el menú. Si ya conoces ${NOMBRE_APP}, puedes pulsar «Omitir».`,
  },
  {
    key: 'menu',
    title: 'Menú principal',
    body:
      'Arriba a la izquierda está el icono ☰ del menú. Ábrelo para ir al Dashboard, a Gestión, a Mensajes o a Perfil; según tu rol también verás accesos rápidos a citas, pacientes, reportes y más.',
  },
  {
    key: 'sections',
    title: 'Secciones',
    body:
      'En Dashboard ves el resumen de lo más importante. Gestión agrupa pacientes y tareas administrativas. Mensajes es el chat con pacientes (para personal médico). En Perfil está tu cuenta, la contraseña y cerrar sesión.',
  },
  {
    key: 'tips',
    title: 'Consejos',
    body:
      'La primera vez que entres en cada sección o en una pantalla del menú verás ayudas breves. Para verlas otra vez, ve a Perfil y pulsa «Volver a ver ayudas».',
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
      'Es tu pantalla de inicio: un vistazo de lo que pasa en el hospital según tu rol (citas, avisos, indicadores). Las tarjetas te orientan sobre qué revisar primero.',
  },
  pacientes: {
    title: 'Gestión',
    body:
      'Desde aquí trabajas con pacientes o con las herramientas de administración, según tu rol: altas, búsquedas, citas y más. El menú ☰ te lleva en un toque a lo que más usas.',
  },
  chat: {
    title: 'Mensajes',
    body: `Aquí llegan los mensajes de pacientes que escriben desde ${NOMBRE_APP}. Elige una conversación para leer y responder. Si hay mensajes sin leer, lo notarás en el menú.`,
  },
  perfil: {
    title: 'Perfil',
    body:
      'Revisa tus datos, cambia la contraseña cuando quieras y, al terminar, usa «Cerrar sesión»—sobre todo si compartes el dispositivo con otra persona.',
  },
};
