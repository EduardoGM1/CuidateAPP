/**
 * Obtiene el nombre de la ruta hoja activa (último nivel del árbol de navegación).
 */
export function getDeepestRouteName(state) {
  if (!state || typeof state.index !== 'number' || !state.routes) {
    return null;
  }
  const route = state.routes[state.index];
  if (route.state) {
    return getDeepestRouteName(route.state);
  }
  return route.name;
}

export function isProfessionalRole(role) {
  return (
    role === 'Doctor' ||
    role === 'doctor' ||
    role === 'Admin' ||
    role === 'admin' ||
    role === 'administrador'
  );
}

export function isPacienteRole(role) {
  return role === 'paciente' || role === 'Paciente';
}
