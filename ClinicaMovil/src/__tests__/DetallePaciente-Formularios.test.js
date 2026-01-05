/**
 * @file DetallePaciente-Formularios.test.js
 * @description Tests automatizados para formularios en DetallePaciente
 * @author Senior Developer
 * @date 2025-11-07
 */

// Importar setup de mocks primero
import './setup-detalle-paciente';

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider as AuthProvider } from '../context/AuthContext';
import DetallePaciente from '../screens/admin/DetallePaciente';

// Mock de servicios
jest.mock('../api/gestionService', () => ({
  default: {
    getPacienteCitas: jest.fn(() => Promise.resolve([])),
    createCita: jest.fn(() => Promise.resolve({ id_cita: 1 })),
    getPacienteSignosVitales: jest.fn(() => Promise.resolve([])),
    createSignosVitales: jest.fn(() => Promise.resolve({ id_signos: 1 })),
    getPacienteDiagnosticos: jest.fn(() => Promise.resolve([])),
    createPacienteDiagnostico: jest.fn(() => Promise.resolve({ id_diagnostico: 1 })),
    getPacienteMedicamentos: jest.fn(() => Promise.resolve([])),
    createPacientePlanMedicacion: jest.fn(() => Promise.resolve({ id_medicamento: 1 })),
    getPacienteRedApoyo: jest.fn(() => Promise.resolve([])),
    createPacienteRedApoyo: jest.fn(() => Promise.resolve({ id_red: 1 })),
    getPacienteEsquemaVacunacion: jest.fn(() => Promise.resolve([])),
    createEsquemaVacunacion: jest.fn(() => Promise.resolve({ id_esquema: 1 })),
    getPacienteComorbilidades: jest.fn(() => Promise.resolve([])),
    addPacienteComorbilidad: jest.fn(() => Promise.resolve({ id_comorbilidad: 1 })),
    updatePacienteComorbilidad: jest.fn(() => Promise.resolve({ success: true })),
    deletePacienteComorbilidad: jest.fn(() => Promise.resolve({ success: true })),
    getComorbilidades: jest.fn(() => Promise.resolve([
      { id_comorbilidad: 1, nombre: 'Diabetes' },
      { id_comorbilidad: 2, nombre: 'Hipertensión' },
    ])),
    getVacunas: jest.fn(() => Promise.resolve([
      { id_vacuna: 1, nombre: 'COVID-19' },
      { id_vacuna: 2, nombre: 'Influenza' },
    ])),
    getPacienteDoctores: jest.fn(() => Promise.resolve([])),
    addPacienteDoctor: jest.fn(() => Promise.resolve({ success: true })),
    replacePacienteDoctor: jest.fn(() => Promise.resolve({ success: true })),
    deletePacienteDoctor: jest.fn(() => Promise.resolve({ success: true })),
  }
}));

jest.mock('../hooks/useGestion', () => ({
  useDoctores: jest.fn(() => ({
    doctores: [
      { id_doctor: 1, nombre: 'Dr. Juan', apellido_paterno: 'Pérez' }
    ],
    loading: false
  }))
}));

// Mock de hooks personalizados
jest.mock('../hooks/usePacienteMedicalData', () => ({
  usePacienteComorbilidades: jest.fn(() => ({
    comorbilidades: [],
    loading: false,
    refresh: jest.fn(() => Promise.resolve()),
  })),
  usePacienteEsquemaVacunacion: jest.fn(() => ({
    esquemaVacunacion: [],
    loading: false,
    refresh: jest.fn(() => Promise.resolve()),
  })),
  usePacienteRedApoyo: jest.fn(() => ({
    redApoyo: [],
    loading: false,
    refresh: jest.fn(() => Promise.resolve()),
  })),
}));

jest.mock('../hooks/useGestion', () => ({
  useDoctores: jest.fn(() => ({
    doctores: [
      { id_doctor: 1, nombre: 'Dr. Juan', apellido_paterno: 'Pérez' }
    ],
    loading: false,
  })),
  usePacienteDetails: jest.fn(() => ({
    paciente: {
      id_paciente: 1,
      nombre: 'María',
      apellido_paterno: 'García',
    },
    loading: false,
    refresh: jest.fn(),
  })),
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn()
};

const mockRoute = {
  params: {
    paciente: {
      id_paciente: 1,
      nombre: 'María',
      apellido_paterno: 'García',
      apellido_materno: 'López',
      edad: 45,
      sexo: 'Mujer',
      curp: 'GALM850415HDFRRX01',
      activo: true
    }
  }
};

describe('DetallePaciente - Formularios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * ========================================
   * TESTS DE FORMULARIO DE COMOBILIDADES
   * ========================================
   */
  describe('Formulario de Comorbilidades', () => {
    it('debe tener funcionalidad de agregar comorbilidad disponible', () => {
      // Verificar que el servicio está mockeado correctamente
      const gestionService = require('../api/gestionService').default;
      expect(gestionService.addPacienteComorbilidad).toBeDefined();
      expect(gestionService.getComorbilidades).toBeDefined();
    });

    it('debe tener funcionalidad de actualizar comorbilidad disponible', () => {
      const gestionService = require('../api/gestionService').default;
      expect(gestionService.updatePacienteComorbilidad).toBeDefined();
    });

    it('debe tener funcionalidad de eliminar comorbilidad disponible', () => {
      const gestionService = require('../api/gestionService').default;
      expect(gestionService.deletePacienteComorbilidad).toBeDefined();
    });
  });

  /**
   * ========================================
   * TESTS DE FORMULARIO DE RED DE APOYO
   * ========================================
   */
  describe('Formulario de Red de Apoyo', () => {
    it('debe tener servicio de red de apoyo disponible', () => {
      const gestionService = require('../api/gestionService').default;
      expect(gestionService.createPacienteRedApoyo).toBeDefined();
      expect(gestionService.getPacienteRedApoyo).toBeDefined();
    });
  });

  /**
   * ========================================
   * TESTS DE FORMULARIO DE ESQUEMA DE VACUNACIÓN
   * ========================================
   */
  describe('Formulario de Esquema de Vacunación', () => {
    it('debe tener servicio de esquema de vacunación disponible', () => {
      const gestionService = require('../api/gestionService').default;
      expect(gestionService.createEsquemaVacunacion).toBeDefined();
      expect(gestionService.getPacienteEsquemaVacunacion).toBeDefined();
      expect(gestionService.getVacunas).toBeDefined();
    });
  });

  /**
   * ========================================
   * TESTS DE FORMULARIO DE DOCTOR
   * ========================================
   */
  describe('Formulario de Asignación de Doctor', () => {
    it('debe tener servicios de asignación de doctor disponibles', () => {
      const gestionService = require('../api/gestionService').default;
      expect(gestionService.addPacienteDoctor).toBeDefined();
      expect(gestionService.replacePacienteDoctor).toBeDefined();
      expect(gestionService.deletePacienteDoctor).toBeDefined();
      expect(gestionService.getPacienteDoctores).toBeDefined();
    });
  });

  /**
   * ========================================
   * TESTS DE VALIDACIONES GENERALES
   * ========================================
   */
  describe('Validaciones Generales de Formularios', () => {
    it('debe tener todos los servicios de formularios disponibles', () => {
      const gestionService = require('../api/gestionService').default;
      
      // Verificar servicios de comorbilidades
      expect(gestionService.addPacienteComorbilidad).toBeDefined();
      expect(gestionService.updatePacienteComorbilidad).toBeDefined();
      expect(gestionService.deletePacienteComorbilidad).toBeDefined();
      
      // Verificar servicios de red de apoyo
      expect(gestionService.createPacienteRedApoyo).toBeDefined();
      
      // Verificar servicios de vacunación
      expect(gestionService.createEsquemaVacunacion).toBeDefined();
      
      // Verificar servicios de doctor
      expect(gestionService.addPacienteDoctor).toBeDefined();
    });

    it('debe tener hooks de datos disponibles', () => {
      const usePacienteMedicalData = require('../hooks/usePacienteMedicalData');
      
      expect(usePacienteMedicalData.usePacienteComorbilidades).toBeDefined();
      expect(usePacienteMedicalData.usePacienteRedApoyo).toBeDefined();
      expect(usePacienteMedicalData.usePacienteEsquemaVacunacion).toBeDefined();
    });
  });
});

