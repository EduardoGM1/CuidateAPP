/**
 * @file helpers.js
 * @description Helpers y utilities para testing
 * @author Senior Developer
 * @date 2025-11-08
 */

/**
 * Crea un mock de paciente con valores por defecto
 * 
 * @param {Object} overrides - Valores para sobrescribir los defaults
 * @returns {Object} - Objeto paciente mockeado
 */
export const createMockPaciente = (overrides = {}) => ({
  id_paciente: 1,
  nombre: 'María',
  apellido_paterno: 'García',
  apellido_materno: 'López',
  edad: 45,
  sexo: 'Mujer',
  curp: 'GALM850415HDFRRX01',
  activo: true,
  fecha_nacimiento: '1980-04-15',
  telefono: '5551234567',
  email: 'maria.garcia@example.com',
  direccion: 'Calle Principal 123',
  ...overrides
});

/**
 * Crea un mock de route para React Navigation
 * 
 * @param {Object} paciente - Datos del paciente
 * @param {Object} overrides - Valores adicionales para el route
 * @returns {Object} - Objeto route mockeado
 */
export const createMockRoute = (paciente, overrides = {}) => ({
  params: {
    paciente: createMockPaciente(paciente),
    ...overrides.params
  },
  key: 'test-key',
  name: 'DetallePaciente',
  ...overrides
});

/**
 * Crea un mock de navigation para React Navigation
 * 
 * @param {Object} overrides - Valores para sobrescribir los defaults
 * @returns {Object} - Objeto navigation mockeado
 */
export const createMockNavigation = (overrides = {}) => ({
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
  replace: jest.fn(),
  push: jest.fn(),
  pop: jest.fn(),
  popToTop: jest.fn(),
  reset: jest.fn(),
  ...overrides
});

/**
 * Crea un mock de cita
 * 
 * @param {Object} overrides - Valores para sobrescribir los defaults
 * @returns {Object} - Objeto cita mockeado
 */
export const createMockCita = (overrides = {}) => ({
  id_cita: 1,
  id_paciente: 1,
  id_doctor: 1,
  fecha_cita: new Date().toISOString(),
  motivo: 'Consulta general',
  estado: 'programada',
  observaciones: '',
  es_primera_consulta: false,
  ...overrides
});

/**
 * Crea un mock de signos vitales
 * 
 * @param {Object} overrides - Valores para sobrescribir los defaults
 * @returns {Object} - Objeto signos vitales mockeado
 */
export const createMockSignosVitales = (overrides = {}) => ({
  id_signo: 1,
  id_paciente: 1,
  id_cita: null,
  peso_kg: 70,
  talla_m: 1.75,
  medida_cintura_cm: 80,
  presion_sistolica: 120,
  presion_diastolica: 80,
  glucosa_mg_dl: 100,
  colesterol_mg_dl: 200,
  trigliceridos_mg_dl: 150,
  observaciones: '',
  fecha_medicion: new Date().toISOString(),
  ...overrides
});

/**
 * Crea un mock de diagnóstico
 * 
 * @param {Object} overrides - Valores para sobrescribir los defaults
 * @returns {Object} - Objeto diagnóstico mockeado
 */
export const createMockDiagnostico = (overrides = {}) => ({
  id_diagnostico: 1,
  id_paciente: 1,
  id_cita: 1,
  descripcion: 'Diagnóstico de prueba con suficiente texto',
  fecha_diagnostico: new Date().toISOString(),
  ...overrides
});

/**
 * Crea un mock de doctor
 * 
 * @param {Object} overrides - Valores para sobrescribir los defaults
 * @returns {Object} - Objeto doctor mockeado
 */
export const createMockDoctor = (overrides = {}) => ({
  id_doctor: 1,
  nombre: 'Dr. Juan',
  apellido_paterno: 'Pérez',
  apellido_materno: 'García',
  especialidad: 'Medicina General',
  activo: true,
  ...overrides
});

/**
 * Crea un mock de contacto de red de apoyo
 * 
 * @param {Object} overrides - Valores para sobrescribir los defaults
 * @returns {Object} - Objeto contacto mockeado
 */
export const createMockContacto = (overrides = {}) => ({
  id_contacto: 1,
  id_paciente: 1,
  nombre: 'Juan Pérez',
  parentesco: 'Esposo',
  telefono: '5551234567',
  email: 'juan.perez@example.com',
  direccion: 'Calle Principal 123',
  ...overrides
});

/**
 * Crea un mock de vacuna
 * 
 * @param {Object} overrides - Valores para sobrescribir los defaults
 * @returns {Object} - Objeto vacuna mockeado
 */
export const createMockVacuna = (overrides = {}) => ({
  id_vacuna: 1,
  id_paciente: 1,
  nombre_vacuna: 'Influenza',
  fecha_aplicacion: new Date().toISOString(),
  dosis: 'Primera',
  lote: 'ABC123',
  ...overrides
});

/**
 * Crea un mock de comorbilidad
 * 
 * @param {Object} overrides - Valores para sobrescribir los defaults
 * @returns {Object} - Objeto comorbilidad mockeado
 */
export const createMockComorbilidad = (overrides = {}) => ({
  id_comorbilidad: 1,
  id_paciente: 1,
  nombre: 'Diabetes Tipo 2',
  fecha_diagnostico: new Date().toISOString(),
  tratamiento: 'Metformina 500mg',
  ...overrides
});

/**
 * Espera a que un elemento aparezca con timeout personalizado
 * 
 * @param {Function} queryFn - Función de query (getByText, getByTestId, etc.)
 * @param {string|RegExp} text - Texto o patrón a buscar
 * @param {number} timeout - Timeout en ms (default: 5000)
 * @returns {Promise} - Promise que se resuelve cuando el elemento aparece
 */
export const waitForElement = async (queryFn, text, timeout = 5000) => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      const element = queryFn(text);
      if (element) return element;
    } catch (e) {
      // Elemento no encontrado, continuar esperando
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Element with text "${text}" not found within ${timeout}ms`);
};

/**
 * Helper para crear múltiples pacientes
 * 
 * @param {number} count - Número de pacientes a crear
 * @param {Function} factory - Función factory para crear cada paciente
 * @returns {Array} - Array de pacientes mockeados
 */
export const createMockPacientes = (count, factory = createMockPaciente) => {
  return Array.from({ length: count }, (_, index) => 
    factory({ id_paciente: index + 1, nombre: `Paciente ${index + 1}` })
  );
};

/**
 * Helper para crear múltiples citas
 * 
 * @param {number} count - Número de citas a crear
 * @param {Function} factory - Función factory para crear cada cita
 * @returns {Array} - Array de citas mockeadas
 */
export const createMockCitas = (count, factory = createMockCita) => {
  return Array.from({ length: count }, (_, index) => 
    factory({ id_cita: index + 1 })
  );
};

