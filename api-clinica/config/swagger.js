/**
 * OpenAPI mínimo (solo montado fuera de production).
 */
import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'CuidateAPP API',
      version: '1.0.0',
      description:
        'API REST clínica. Auth: Doctor/Admin → /api/auth; Paciente → /api/auth-unified. Bearer JWT.',
    },
    servers: [{ url: '/', description: 'Misma origen' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    paths: {
      '/health': {
        get: {
          summary: 'Health check',
          tags: ['System'],
          responses: { 200: { description: 'OK' } },
        },
      },
      '/api/auth/login': {
        post: {
          summary: 'Login Doctor/Admin',
          tags: ['Auth'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Token emitido' },
            401: { description: 'Credenciales inválidas' },
          },
        },
      },
      '/api/auth/register': {
        post: {
          summary: 'Registro público (solo Paciente)',
          tags: ['Auth'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Usuario creado' },
            403: { description: 'Rol privilegiado no permitido' },
          },
        },
      },
      '/api/auth-unified/login-paciente': {
        post: {
          summary: 'Login paciente PIN/biometría',
          tags: ['Auth Paciente'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    pin: { type: 'string', example: '2020' },
                    id_paciente: { type: 'integer' },
                    device_id: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { 200: { description: 'Token emitido' } },
        },
      },
      '/api/pacientes': {
        get: {
          summary: 'Listar pacientes',
          tags: ['Pacientes'],
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Lista' }, 401: { description: 'No autenticado' } },
        },
      },
      '/api/citas': {
        get: {
          summary: 'Listar citas',
          tags: ['Citas'],
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Lista' } },
        },
      },
      '/api/mensajes-chat/paciente/{idPaciente}/doctor/{idDoctor}': {
        get: {
          summary: 'Conversación paciente-doctor',
          tags: ['Chat'],
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: 'idPaciente', in: 'path', required: true, schema: { type: 'integer' } },
            { name: 'idDoctor', in: 'path', required: true, schema: { type: 'integer' } },
          ],
          responses: { 200: { description: 'Mensajes' } },
        },
      },
      '/api/signos-vitales': {
        get: {
          summary: 'Signos vitales',
          tags: ['Clínica'],
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Lista' } },
        },
      },
      '/api/planes-medicacion': {
        get: {
          summary: 'Planes de medicación',
          tags: ['Clínica'],
          security: [{ bearerAuth: [] }],
          responses: { 200: { description: 'Lista envelope { success, data }' } },
        },
      },
      '/api/paciente-auth/{path}': {
        get: {
          summary: 'Legacy (410 Gone)',
          tags: ['Auth Paciente'],
          parameters: [{ name: 'path', in: 'path', required: true, schema: { type: 'string' } }],
          responses: { 410: { description: 'Deprecated — usar auth-unified' } },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
export default swaggerSpec;
