/**
 * @file medical-data.test.js
 * @description Pruebas unitarias para funcionalidades médicas
 * @author Senior Developer
 * @date 2025-10-28
 */

import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import citaRoutes from '../routes/cita.js';
import pacienteMedicalDataRoutes from '../routes/pacienteMedicalData.js';
import medicamentoRoutes from '../routes/medicamento.js';

// Mock de models
const mockCita = {
  create: jest.fn(),
  findAll: jest.fn(),
  findByPk: jest.fn(),
  update: jest.fn()
};

const mockSignoVital = {
  create: jest.fn(),
  findAll: jest.fn()
};

const mockDiagnostico = {
  create: jest.fn(),
  findAll: jest.fn()
};

const mockMedicamento = {
  create: jest.fn(),
  findAll: jest.fn()
};

const mockRedApoyo = {
  create: jest.fn(),
  findAll: jest.fn()
};

const mockEsquemaVacunacion = {
  create: jest.fn(),
  findAll: jest.fn()
};

jest.mock('../models/associations.js', () => ({
  Cita: mockCita,
  SignoVital: mockSignoVital,
  Diagnostico: mockDiagnostico,
  PlanMedicacion: mockMedicamento,
  RedApoyo: mockRedApoyo,
  EsquemaVacunacion: mockEsquemaVacunacion
}));

// Setup Express app
const app = express();
app.use(express.json());
app.use('/api/citas', citaRoutes);
app.use('/api/pacientes', pacienteMedicalDataRoutes);
app.use('/api/medicamentos', medicamentoRoutes);

describe('Medical Data - Unit Tests', () => {
  let token;
  let mockUserId;

  beforeEach(() => {
    // Mock JWT token
    mockUserId = 1;
    token = jwt.sign({ id: mockUserId, rol: 'Admin' }, process.env.JWT_SECRET || 'test-secret');
    
    jest.clearAllMocks();
  });

  /**
   * ========================================
   * TESTS PARA CREACIÓN DE CITAS
   * ========================================
   */
  describe('Crear Citas', () => {
    const mockCitaData = {
      id_paciente: 1,
      id_doctor: 5,
      fecha_cita: '2025-10-30',
      motivo: 'Control de glucosa',
      observaciones: 'Paciente estable',
      es_primera_consulta: false
    };

    it('debe crear una cita exitosamente', async () => {
      const mockCreatedCita = {
        id_cita: 123,
        ...mockCitaData,
        fecha_registro: new Date(),
        activo: true
      };

      mockCita.create.mockResolvedValue(mockCreatedCita);

      const result = await createCita({
        body: mockCitaData,
        user: { id: mockUserId, rol: 'Admin' }
      });

      expect(mockCita.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id_paciente: 1,
          id_doctor: 5,
          motivo: 'Control de glucosa'
        }),
        expect.any(Object)
      );
      expect(result.status).toBe(201);
    });

    it('debe validar campos requeridos de cita', async () => {
      const invalidData = {
        id_paciente: 1,
        // Faltan campos requeridos
      };

      const result = await createCita({
        body: invalidData,
        user: { id: mockUserId, rol: 'Admin' }
      });

      expect(result.status).toBe(400);
      expect(result.body).toHaveProperty('error');
    });

    it('debe rechazar fechas pasadas', async () => {
      const pastDate = {
        ...mockCitaData,
        fecha_cita: '2020-01-01' // Fecha pasada
      };

      const result = await createCita({
        body: pastDate,
        user: { id: mockUserId, rol: 'Admin' }
      });

      expect(result.status).toBe(400);
      expect(result.body.error).toContain('fecha');
    });
  });

  /**
   * ========================================
   * TESTS PARA SIGNOS VITALES
   * ========================================
   */
  describe('Crear Signos Vitales', () => {
    const mockSignosData = {
      id_paciente: 1,
      peso_kg: 70,
      talla_m: 1.75,
      presion_sistolica: 120,
      presion_diastolica: 80,
      glucosa_mg_dl: 95,
      observaciones: 'Valores normales'
    };

    it('debe crear signos vitales exitosamente', async () => {
      const mockCreatedSigno = {
        id_signo: 456,
        ...mockSignosData,
        imc: 22.9,
        fecha_medicion: new Date()
      };

      mockSignoVital.create.mockResolvedValue(mockCreatedSigno);

      const result = await createSignosVitales({
        params: { id: 1 },
        body: mockSignosData,
        user: { id: mockUserId, rol: 'Admin' }
      });

      expect(mockSignoVital.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id_paciente: 1,
          peso_kg: 70,
          talla_m: 1.75
        }),
        expect.any(Object)
      );
      expect(result.status).toBe(201);
    });

    it('debe calcular IMC automáticamente', async () => {
      mockSignoVital.create.mockResolvedValue({
        id_signo: 456,
        imc: 22.9
      });

      const result = await createSignosVitales({
        params: { id: 1 },
        body: mockSignosData,
        user: { id: mockUserId, rol: 'Admin' }
      });

      expect(mockSignoVital.create).toHaveBeenCalled();
      const calledData = mockSignoVital.create.mock.calls[0][0];
      expect(calledData.imc).toBeCloseTo(22.9, 1);
    });

    it('debe validar rangos de presión arterial', async () => {
      const invalidData = {
        ...mockSignosData,
        presion_sistolica: 50, // Muy baja
        presion_diastolica: 45 // Muy baja
      };

      const result = await createSignosVitales({
        params: { id: 1 },
        body: invalidData,
        user: { id: mockUserId, rol: 'Admin' }
      });

      expect(result.status).toBe(400);
    });

    it('debe validar que sistólica sea mayor que diastólica', async () => {
      const invalidData = {
        ...mockSignosData,
        presion_sistolica: 80,
        presion_diastolica: 120 // Mayor que sistólica
      };

      const result = await createSignosVitales({
        params: { id: 1 },
        body: invalidData,
        user: { id: mockUserId, rol: 'Admin' }
      });

      expect(result.status).toBe(400);
      expect(result.body.error).toContain('sistólica');
    });

    it('debe validar rango de glucosa', async () => {
      const invalidData = {
        ...mockSignosData,
        glucosa_mg_dl: 500 // Muy alta
      };

      const result = await createSignosVitales({
        params: { id: 1 },
        body: invalidData,
        user: { id: mockUserId, rol: 'Admin' }
      });

      expect(result.status).toBe(400);
    });
  });

  /**
   * ========================================
   * TESTS PARA DIAGNÓSTICOS
   * ========================================
   */
  describe('Crear Diagnósticos', () => {
    const mockDiagnosticoData = {
      id_cita: 123,
      descripcion: 'Diabetes tipo 2 controlada. Paciente con buen control glucémico.'
    };

    it('debe crear diagnóstico exitosamente', async () => {
      const mockCreatedDiagnostico = {
        id_diagnostico: 789,
        ...mockDiagnosticoData,
        fecha_registro: new Date()
      };

      mockDiagnostico.create.mockResolvedValue(mockCreatedDiagnostico);

      const result = await createDiagnostico({
        params: { id: 1 },
        body: mockDiagnosticoData,
        user: { id: mockUserId, rol: 'Admin' }
      });

      expect(mockDiagnostico.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id_cita: 123,
          descripcion: expect.stringContaining('Diabetes')
        }),
        expect.any(Object)
      );
      expect(result.status).toBe(201);
    });

    it('debe rechazar diagnósticos sin descripción', async () => {
      const invalidData = {
        id_cita: 123,
        descripcion: '' // Vacía
      };

      const result = await createDiagnostico({
        params: { id: 1 },
        body: invalidData,
        user: { id: mockUserId, rol: 'Admin' }
      });

      expect(result.status).toBe(400);
    });

    it('debe rechazar descripciones muy cortas', async () => {
      const invalidData = {
        id_cita: 123,
        descripcion: 'OK' // Menos de 10 caracteres
      };

      const result = await createDiagnostico({
        params: { id: 1 },
        body: invalidData,
        user: { id: mockUserId, rol: 'Admin' }
      });

      expect(result.status).toBe(400);
      expect(result.body.error).toContain('10 caracteres');
    });
  });

  /**
   * ========================================
   * TESTS PARA MEDICAMENTOS
   * ========================================
   */
  describe('Crear Plan de Medicación', () => {
    const mockMedicamentoData = {
      id_paciente: 1,
      id_doctor: 5,
      id_cita: 123,
      fecha_inicio: '2025-10-28',
      fecha_fin: '2025-11-28',
      observaciones: 'Tomar con alimentos',
      medicamentos: [
        {
          id_medicamento: 1,
          dosis: '10mg',
          frecuencia: 'Cada 12 horas',
          horario: 'Mañana y Tarde'
        }
      ]
    };

    it('debe crear plan de medicación exitosamente', async () => {
      const mockCreatedPlan = {
        id_plan: 111,
        ...mockMedicamentoData,
        activo: true,
        fecha_creacion: new Date()
      };

      mockMedicamento.create.mockResolvedValue(mockCreatedPlan);

      const result = await createPlanMedicacion({
        params: { id: 1 },
        body: mockMedicamentoData,
        user: { id: mockUserId, rol: 'Admin' }
      });

      expect(mockMedicamento.create).toHaveBeenCalled();
      expect(result.status).toBe(201);
    });

    it('debe validar que haya al menos un medicamento', async () => {
      const invalidData = {
        ...mockMedicamentoData,
        medicamentos: [] // Array vacío
      };

      const result = await createPlanMedicacion({
        params: { id: 1 },
        body: invalidData,
        user: { id: mockUserId, rol: 'Admin' }
      });

      expect(result.status).toBe(400);
      expect(result.body.error).toContain('medicamento');
    });

    it('debe validar fechas', async () => {
      const invalidData = {
        ...mockMedicamentoData,
        fecha_fin: '2024-01-01' // Antes de fecha_inicio
      };

      const result = await createPlanMedicacion({
        params: { id: 1 },
        body: invalidData,
        user: { id: mockUserId, rol: 'Admin' }
      });

      expect(result.status).toBe(400);
      expect(result.body.error).toContain('fecha');
    });
  });

  /**
   * ========================================
   * TESTS PARA RED DE APOYO
   * ========================================
   */
  describe('Crear Red de Apoyo', () => {
    const mockRedApoyoData = {
      nombre_contacto: 'María López',
      numero_celular: '5551234567',
      email: 'maria@example.com',
      direccion: 'Calle 123',
      localidad: 'Pueblo',
      parentesco: 'Hijo'
    };

    it('debe crear contacto de red de apoyo exitosamente', async () => {
      const mockCreatedContacto = {
        id_red_apoyo: 222,
        id_paciente: 1,
        ...mockRedApoyoData,
        fecha_registro: new Date()
      };

      mockRedApoyo.create.mockResolvedValue(mockCreatedContacto);

      const result = await createRedApoyo({
        params: { id: 1 },
        body: mockRedApoyoData,
        user: { id: mockUserId, rol: 'Admin' }
      });

      expect(mockRedApoyo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id_paciente: 1,
          nombre_contacto: 'María López',
          parentesco: 'Hijo'
        }),
        expect.any(Object)
      );
      expect(result.status).toBe(201);
    });

    it('debe validar nombre de contacto requerido', async () => {
      const invalidData = {
        ...mockRedApoyoData,
        nombre_contacto: '' // Vacío
      };

      const result = await createRedApoyo({
        params: { id: 1 },
        body: invalidData,
        user: { id: mockUserId, rol: 'Admin' }
      });

      expect(result.status).toBe(400);
    });

    it('debe validar formato de email', async () => {
      const invalidData = {
        ...mockRedApoyoData,
        email: 'email-invalido' // Sin @
      };

      const result = await createRedApoyo({
        params: { id: 1 },
        body: invalidData,
        user: { id: mockUserId, rol: 'Admin' }
      });

      expect(result.status).toBe(400);
      expect(result.body.error).toContain('email');
    });

    it('debe validar formato de teléfono', async () => {
      const invalidData = {
        ...mockRedApoyoData,
        numero_celular: '123' // Muy corto
      };

      const result = await createRedApoyo({
        params: { id: 1 },
        body: invalidData,
        user: { id: mockUserId, rol: 'Admin' }
      });

      expect(result.status).toBe(400);
    });
  });

  /**
   * ========================================
   * TESTS PARA ESQUEMA DE VACUNACIÓN
   * ========================================
   */
  describe('Crear Esquema de Vacunación', () => {
    const mockVacunaData = {
      vacuna: 'Influenza',
      fecha_aplicacion: '2025-10-15',
      lote_vacuna: 'LOT-2025-001',
      observaciones: 'Primera dosis'
    };

    it('debe crear registro de vacunación exitosamente', async () => {
      const mockCreatedVacuna = {
        id_esquema: 333,
        id_paciente: 1,
        ...mockVacunaData,
        fecha_registro: new Date()
      };

      mockEsquemaVacunacion.create.mockResolvedValue(mockCreatedVacuna);

      const result = await createEsquemaVacunacion({
        params: { id: 1 },
        body: mockVacunaData,
        user: { id: mockUserId, rol: 'Admin' }
      });

      expect(mockEsquemaVacunacion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id_paciente: 1,
          vacuna: 'Influenza',
          fecha_aplicacion: '2025-10-15'
        }),
        expect.any(Object)
      );
      expect(result.status).toBe(201);
    });

    it('debe validar nombre de vacuna requerido', async () => {
      const invalidData = {
        ...mockVacunaData,
        vacuna: '' // Vacío
      };

      const result = await createEsquemaVacunacion({
        params: { id: 1 },
        body: invalidData,
        user: { id: mockUserId, rol: 'Admin' }
      });

      expect(result.status).toBe(400);
    });

    it('debe validar fecha de aplicación requerida', async () => {
      const invalidData = {
        ...mockVacunaData,
        fecha_aplicacion: '' // Vacío
      };

      const result = await createEsquemaVacunacion({
        params: { id: 1 },
        body: invalidData,
        user: { id: mockUserId, rol: 'Admin' }
      });

      expect(result.status).toBe(400);
    });
  });

  /**
   * ========================================
   * TESTS DE INTEGRIDAD DE DATOS
   * ========================================
   */
  describe('Integridad de Datos', () => {
    it('debe evitar inyección SQL en descripciones', async () => {
      const maliciousData = {
        id_cita: 123,
        descripcion: "'; DROP TABLE diagnostico; --"
      };

      const result = await createDiagnostico({
        params: { id: 1 },
        body: maliciousData,
        user: { id: mockUserId, rol: 'Admin' }
      });

      // La descripción debe ser escapada
      expect(mockDiagnostico.create).toHaveBeenCalled();
      const calledData = mockDiagnostico.create.mock.calls[0][0];
      expect(calledData.descripcion).not.toContain('DROP');
    });

    it('debe sanitizar caracteres especiales en observaciones', async () => {
      const dataWithSpecialChars = {
        id_paciente: 1,
        peso_kg: 70,
        observaciones: '<script>alert("XSS")</script>'
      };

      await createSignosVitales({
        params: { id: 1 },
        body: dataWithSpecialChars,
        user: { id: mockUserId, rol: 'Admin' }
      });

      const calledData = mockSignoVital.create.mock.calls[0][0];
      expect(calledData.observaciones).not.toContain('<script>');
    });
  });
});

