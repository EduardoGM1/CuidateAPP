/**
 * @file handlers.js
 * @description MSW handlers para mocking de APIs en tests
 * @author Senior Developer
 * @date 2025-11-08
 */

// Usar require en lugar de import para compatibilidad con Jest
const { http, HttpResponse } = require('msw');

// Base URL de la API (ajustar según configuración)
const API_BASE_URL = 'http://localhost:3000/api';

/**
 * Handlers para endpoints de pacientes
 */
const pacienteHandlers = [
  // Obtener detalles de paciente
  http.get(`${API_BASE_URL}/pacientes/:id`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      success: true,
      data: {
        id_paciente: parseInt(id),
        nombre: 'María',
        apellido_paterno: 'García',
        apellido_materno: 'López',
        edad: 45,
        sexo: 'Mujer',
        curp: 'GALM850415HDFRRX01',
        activo: true,
        fecha_nacimiento: '1980-04-15'
      }
    });
  }),

  // Obtener citas del paciente
  http.get(`${API_BASE_URL}/pacientes/:id/citas`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      success: true,
      data: {
        citas: [],
        total: 0
      }
    });
  }),

  // Crear nueva cita
  http.post(`${API_BASE_URL}/citas`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: {
        id_cita: Date.now(),
        ...body,
        created_at: new Date().toISOString()
      }
    }, { status: 201 });
  }),

  // Obtener signos vitales
  http.get(`${API_BASE_URL}/pacientes/:id/signos-vitales`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        signosVitales: [],
        total: 0
      }
    });
  }),

  // Crear signos vitales
  http.post(`${API_BASE_URL}/signos-vitales`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: {
        id_signo: Date.now(),
        ...body,
        created_at: new Date().toISOString()
      }
    }, { status: 201 });
  }),

  // Obtener diagnósticos
  http.get(`${API_BASE_URL}/pacientes/:id/diagnosticos`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        diagnosticos: [],
        total: 0
      }
    });
  }),

  // Crear diagnóstico
  http.post(`${API_BASE_URL}/diagnosticos`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: {
        id_diagnostico: Date.now(),
        ...body,
        created_at: new Date().toISOString()
      }
    }, { status: 201 });
  }),

  // Obtener medicamentos
  http.get(`${API_BASE_URL}/pacientes/:id/medicamentos`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        medicamentos: [],
        total: 0
      }
    });
  }),

  // Crear plan de medicación
  http.post(`${API_BASE_URL}/medicamentos`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: {
        id_plan: Date.now(),
        ...body,
        created_at: new Date().toISOString()
      }
    }, { status: 201 });
  }),

  // Obtener red de apoyo
  http.get(`${API_BASE_URL}/pacientes/:id/red-apoyo`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        redApoyo: [],
        total: 0
      }
    });
  }),

  // Crear contacto de red de apoyo
  http.post(`${API_BASE_URL}/red-apoyo`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: {
        id_contacto: Date.now(),
        ...body,
        created_at: new Date().toISOString()
      }
    }, { status: 201 });
  }),

  // Obtener esquema de vacunación
  http.get(`${API_BASE_URL}/pacientes/:id/vacunacion`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        esquemaVacunacion: [],
        total: 0
      }
    });
  }),

  // Crear registro de vacunación
  http.post(`${API_BASE_URL}/vacunacion`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: {
        id_vacuna: Date.now(),
        ...body,
        created_at: new Date().toISOString()
      }
    }, { status: 201 });
  }),

  // Obtener comorbilidades
  http.get(`${API_BASE_URL}/pacientes/:id/comorbilidades`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        comorbilidades: [],
        total: 0
      }
    });
  }),

  // Crear comorbilidad
  http.post(`${API_BASE_URL}/comorbilidades`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      success: true,
      data: {
        id_comorbilidad: Date.now(),
        ...body,
        created_at: new Date().toISOString()
      }
    }, { status: 201 });
  })
];

/**
 * Handlers para endpoints de doctores
 */
const doctorHandlers = [
  // Obtener lista de doctores
  http.get(`${API_BASE_URL}/doctores`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          id_doctor: 1,
          nombre: 'Dr. Juan',
          apellido_paterno: 'Pérez',
          apellido_materno: 'García',
          especialidad: 'Medicina General',
          activo: true
        }
      ]
    });
  })
];

/**
 * Handlers para errores (para testing de casos de error)
 */
const errorHandlers = [
  // Simular error 500
  http.get(`${API_BASE_URL}/pacientes/:id/error`, () => {
    return HttpResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }),

  // Simular error 404
  http.get(`${API_BASE_URL}/pacientes/999`, () => {
    return HttpResponse.json(
      { success: false, error: 'Paciente no encontrado' },
      { status: 404 }
    );
  }),

  // Simular error de validación 400
  http.post(`${API_BASE_URL}/citas`, async ({ request }) => {
    const body = await request.json();
    if (!body.fecha_cita || !body.motivo) {
      return HttpResponse.json(
        { success: false, error: 'Campos requeridos faltantes', errors: ['fecha_cita', 'motivo'] },
        { status: 400 }
      );
    }
    return HttpResponse.json({ success: true, data: { id_cita: 1, ...body } }, { status: 201 });
  })
];

/**
 * Todos los handlers combinados
 */
const handlers = [
  ...pacienteHandlers,
  ...doctorHandlers,
  // errorHandlers solo se incluyen cuando se necesitan explícitamente
];

module.exports = {
  pacienteHandlers,
  doctorHandlers,
  errorHandlers,
  handlers
};

