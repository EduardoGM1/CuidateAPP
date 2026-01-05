/**
 * @file pacienteMapper.test.js
 * @description Tests unitarios para pacienteMapper
 * @author Senior Developer
 * @date 2025-10-28
 */

import {
  normalizeComorbilidades,
  normalizePaciente,
  isValidComorbilidad,
  compareComorbilidadesByName,
  compareComorbilidadesByDate
} from '../utils/pacienteMapper.js';

describe('pacienteMapper', () => {
  
  describe('normalizeComorbilidades', () => {
    
    it('debe retornar array vacío si recibe null', () => {
      expect(normalizeComorbilidades(null)).toEqual([]);
    });

    it('debe retornar array vacío si recibe undefined', () => {
      expect(normalizeComorbilidades(undefined)).toEqual([]);
    });

    it('debe retornar array vacío si recibe un array vacío', () => {
      expect(normalizeComorbilidades([])).toEqual([]);
    });

    it('debe normalizar comorbilidades de Sequelize correctamente', () => {
      const input = [
        {
          id_comorbilidad: 1,
          nombre_comorbilidad: 'Diabetes',
          descripcion: 'Diabetes tipo 2',
          PacienteComorbilidad: {
            fecha_deteccion: '2025-01-15',
            observaciones: 'Diagnosticada en consulta'
          }
        },
        {
          id_comorbilidad: 2,
          nombre_comorbilidad: 'Hipertensión',
          descripcion: null,
          PacienteComorbilidad: {
            fecha_deteccion: '2025-02-20',
            observaciones: null
          }
        }
      ];

      const output = normalizeComorbilidades(input);

      expect(output).toHaveLength(2);
      
      // ✅ Ordenado por fecha descendente (más reciente primero)
      // Hipertensión (2025-02-20) viene primero que Diabetes (2025-01-15)
      expect(output[0]).toEqual({
        id: 2,
        nombre: 'Hipertensión',
        descripcion: null,
        fecha_deteccion: '2025-02-20',
        observaciones: null
      });
      expect(output[1]).toEqual({
        id: 1,
        nombre: 'Diabetes',
        descripcion: 'Diabetes tipo 2',
        fecha_deteccion: '2025-01-15',
        observaciones: 'Diagnosticada en consulta'
      });
    });

    it('debe manejar comorbilidades sin datos de tabla intermedia', () => {
      const input = [
        {
          id_comorbilidad: 1,
          nombre_comorbilidad: 'Diabetes',
          descripcion: null
        }
      ];

      const output = normalizeComorbilidades(input);

      expect(output[0]).toEqual({
        id: 1,
        nombre: 'Diabetes',
        descripcion: null,
        fecha_deteccion: null,
        observaciones: null
      });
    });

    it('debe filtrar comorbilidades inválidas (sin id o nombre)', () => {
      const input = [
        { id_comorbilidad: 1, nombre_comorbilidad: 'Válida' },
        { id_comorbilidad: 2 }, // Sin nombre
        { nombre_comorbilidad: 'Sin ID' }, // Sin id
        null,
        undefined
      ];

      const output = normalizeComorbilidades(input);

      expect(output).toHaveLength(1);
      expect(output[0].nombre).toBe('Válida');
    });

    it('debe manejar formato alternativo (id y nombre en minúsculas)', () => {
      const input = [
        {
          id: 1,
          nombre: 'Diabetes',
          descripcion: 'Test',
          fecha_deteccion: '2025-01-15'
        }
      ];

      const output = normalizeComorbilidades(input);

      expect(output[0]).toEqual({
        id: 1,
        nombre: 'Diabetes',
        descripcion: 'Test',
        fecha_deteccion: '2025-01-15',
        observaciones: null
      });
    });

    it('debe convertir id a número y nombre a string', () => {
      const input = [
        {
          id_comorbilidad: '1',
          nombre_comorbilidad: 123
        }
      ];

      const output = normalizeComorbilidades(input);

      expect(typeof output[0].id).toBe('number');
      expect(typeof output[0].nombre).toBe('string');
    });

    it('debe eliminar espacios en blanco del nombre', () => {
      const input = [
        {
          id_comorbilidad: 1,
          nombre_comorbilidad: '  Diabetes  '
        }
      ];

      const output = normalizeComorbilidades(input);

      expect(output[0].nombre).toBe('Diabetes');
    });
  });

  describe('normalizePaciente', () => {
    
    it('debe retornar null si recibe null o undefined', () => {
      expect(normalizePaciente(null)).toBeNull();
      expect(normalizePaciente(undefined)).toBeNull();
    });

    it('debe normalizar un paciente básico sin relaciones', () => {
      const input = {
        id_paciente: 1,
        nombre: 'Juan',
        apellido_paterno: 'Pérez',
        apellido_materno: 'García',
        fecha_nacimiento: '1990-01-15',
        activo: true
      };

      const output = normalizePaciente(input);

      expect(output).not.toBeNull();
      expect(output.id_paciente).toBe(1);
      expect(output.nombre_completo).toBe('Juan Pérez García');
      expect(output.activo).toBe(true);
    });

    it('debe calcular edad correctamente', () => {
      const birthYear = new Date().getFullYear() - 30;
      const input = {
        id_paciente: 1,
        nombre: 'Test',
        apellido_paterno: 'Test',
        fecha_nacimiento: `${birthYear}-01-15`
      };

      const output = normalizePaciente(input);

      expect(output.edad).toBe(30);
    });

    it('debe incluir comorbilidades si includeComorbilidades es true', () => {
      const input = {
        id_paciente: 1,
        nombre: 'Test',
        apellido_paterno: 'Test',
        Comorbilidades: [
          {
            id_comorbilidad: 1,
            nombre_comorbilidad: 'Diabetes'
          }
        ]
      };

      const output = normalizePaciente(input, { includeComorbilidades: true });

      expect(output.comorbilidades).toHaveLength(1);
      expect(output.comorbilidades[0].nombre).toBe('Diabetes');
    });

    it('no debe incluir comorbilidades si includeComorbilidades es false', () => {
      const input = {
        id_paciente: 1,
        nombre: 'Test',
        apellido_paterno: 'Test',
        Comorbilidades: [{ id_comorbilidad: 1, nombre_comorbilidad: 'Diabetes' }]
      };

      const output = normalizePaciente(input, { includeComorbilidades: false });

      expect(output.comorbilidades).toBeUndefined();
    });

    it('debe normalizar doctor correctamente', () => {
      const input = {
        id_paciente: 1,
        nombre: 'Test',
        apellido_paterno: 'Test',
        Doctors: [
          {
            id_doctor: 1,
            nombre: 'Dr. Juan',
            apellido_paterno: 'Pérez',
            apellido_materno: 'García'
          }
        ]
      };

      const output = normalizePaciente(input);

      expect(output.doctor_nombre).toBe('Dr. Juan Pérez García');
      expect(output.id_doctor).toBe(1);
    });

    it('debe establecer doctor_nombre como "Sin doctor asignado" si no hay doctor', () => {
      const input = {
        id_paciente: 1,
        nombre: 'Test',
        apellido_paterno: 'Test'
      };

      const output = normalizePaciente(input);

      expect(output.doctor_nombre).toBe('Sin doctor asignado');
      expect(output.id_doctor).toBeNull();
    });
  });

  describe('isValidComorbilidad', () => {
    
    it('debe retornar true para comorbilidad válida', () => {
      expect(isValidComorbilidad({ id: 1, nombre: 'Diabetes' })).toBe(true);
      expect(isValidComorbilidad({ id_comorbilidad: 1, nombre_comorbilidad: 'Diabetes' })).toBe(true);
    });

    it('debe retornar false para comorbilidad sin id', () => {
      expect(isValidComorbilidad({ nombre: 'Diabetes' })).toBe(false);
    });

    it('debe retornar false para comorbilidad sin nombre', () => {
      expect(isValidComorbilidad({ id: 1 })).toBe(false);
    });

    it('debe retornar false para null o undefined', () => {
      expect(isValidComorbilidad(null)).toBe(false);
      expect(isValidComorbilidad(undefined)).toBe(false);
    });
  });

  describe('compareComorbilidadesByName', () => {
    
    it('debe ordenar alfabéticamente', () => {
      const a = { nombre: 'Diabetes' };
      const b = { nombre: 'Hipertensión' };

      expect(compareComorbilidadesByName(a, b)).toBeLessThan(0);
      expect(compareComorbilidadesByName(b, a)).toBeGreaterThan(0);
      expect(compareComorbilidadesByName(a, a)).toBe(0);
    });

    it('debe ser case-insensitive', () => {
      const a = { nombre: 'diabetes' };
      const b = { nombre: 'DIABETES' };

      expect(compareComorbilidadesByName(a, b)).toBe(0);
    });
  });

  describe('compareComorbilidadesByDate', () => {
    
    it('debe ordenar por fecha (más reciente primero)', () => {
      const a = { fecha_deteccion: '2025-01-15' };
      const b = { fecha_deteccion: '2025-02-20' };

      expect(compareComorbilidadesByDate(b, a)).toBeLessThan(0); // b es más reciente
      expect(compareComorbilidadesByDate(a, b)).toBeGreaterThan(0); // a es más antigua
    });

    it('debe poner sin fecha al final', () => {
      const a = { fecha_deteccion: '2025-01-15' };
      const b = { fecha_deteccion: null };

      expect(compareComorbilidadesByDate(a, b)).toBeLessThan(0);
      expect(compareComorbilidadesByDate(b, a)).toBeGreaterThan(0);
    });
  });
});

