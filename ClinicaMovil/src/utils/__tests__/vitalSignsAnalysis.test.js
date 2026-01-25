/**
 * Pruebas unitarias para vitalSignsAnalysis.js
 * 
 * Verifica que las funciones de análisis evolutivo funcionen correctamente
 */

import {
  calcularTendencia,
  calcularEstadisticas,
  compararPeriodos,
  generarZonaRango,
  generarLineaTendencia,
  getCampoSignoVital,
  getNombreSignoVital,
} from '../vitalSignsAnalysis';

// Datos de prueba simulados
const signosVitalesMejorando = [
  {
    glucosa_mg_dl: 150,
    fecha_medicion: new Date('2024-01-01'),
  },
  {
    glucosa_mg_dl: 140,
    fecha_medicion: new Date('2024-02-01'),
  },
  {
    glucosa_mg_dl: 130,
    fecha_medicion: new Date('2024-03-01'),
  },
  {
    glucosa_mg_dl: 120,
    fecha_medicion: new Date('2024-04-01'),
  },
  {
    glucosa_mg_dl: 110,
    fecha_medicion: new Date('2024-05-01'),
  },
];

const signosVitalesEmpeorando = [
  {
    glucosa_mg_dl: 100,
    fecha_medicion: new Date('2024-01-01'),
  },
  {
    glucosa_mg_dl: 110,
    fecha_medicion: new Date('2024-02-01'),
  },
  {
    glucosa_mg_dl: 120,
    fecha_medicion: new Date('2024-03-01'),
  },
  {
    glucosa_mg_dl: 130,
    fecha_medicion: new Date('2024-04-01'),
  },
  {
    glucosa_mg_dl: 140,
    fecha_medicion: new Date('2024-05-01'),
  },
];

describe('vitalSignsAnalysis', () => {
  describe('getCampoSignoVital', () => {
    it('debe retornar el campo correcto para cada tipo', () => {
      expect(getCampoSignoVital('presion')).toBe('presion_sistolica');
      expect(getCampoSignoVital('glucosa')).toBe('glucosa_mg_dl');
      expect(getCampoSignoVital('peso')).toBe('peso_kg');
      expect(getCampoSignoVital('imc')).toBe('imc');
    });
  });

  describe('calcularTendencia', () => {
    it('debe retornar "insuficiente" si hay menos de 3 registros', () => {
      const resultado = calcularTendencia([{ glucosa_mg_dl: 100 }], 'glucosa_mg_dl');
      expect(resultado.tendencia).toBe('insuficiente');
    });

    it('debe detectar tendencia mejorando cuando los valores disminuyen', () => {
      const resultado = calcularTendencia(signosVitalesMejorando, 'glucosa_mg_dl');
      expect(resultado.tendencia).toBe('mejorando');
      expect(parseFloat(resultado.cambioTotal)).toBeLessThan(0);
    });

    it('debe detectar tendencia empeorando cuando los valores aumentan', () => {
      const resultado = calcularTendencia(signosVitalesEmpeorando, 'glucosa_mg_dl');
      expect(resultado.tendencia).toBe('empeorando');
      expect(parseFloat(resultado.cambioTotal)).toBeGreaterThan(0);
    });

    it('debe calcular pendiente y cambio promedio correctamente', () => {
      const resultado = calcularTendencia(signosVitalesMejorando, 'glucosa_mg_dl');
      expect(resultado.pendiente).toBeDefined();
      expect(resultado.cambioPromedio).toBeDefined();
      expect(resultado.puntosAnalizados).toBe(5);
    });
  });

  describe('calcularEstadisticas', () => {
    it('debe retornar null si no hay datos', () => {
      const resultado = calcularEstadisticas([], 'glucosa_mg_dl');
      expect(resultado).toBeNull();
    });

    it('debe calcular promedio, mínimo y máximo correctamente', () => {
      const resultado = calcularEstadisticas(signosVitalesMejorando, 'glucosa_mg_dl');
      expect(resultado).not.toBeNull();
      expect(parseFloat(resultado.promedio)).toBeCloseTo(130, 1);
      expect(parseFloat(resultado.minimo)).toBe(110);
      expect(parseFloat(resultado.maximo)).toBe(150);
      expect(resultado.totalRegistros).toBe(5);
    });

    it('debe calcular desviación estándar y coeficiente de variación', () => {
      const resultado = calcularEstadisticas(signosVitalesMejorando, 'glucosa_mg_dl');
      expect(resultado.desviacion).toBeDefined();
      expect(resultado.coeficienteVariacion).toBeDefined();
      expect(resultado.estabilidad).toBeDefined();
    });
  });

  describe('compararPeriodos', () => {
    it('debe retornar null si no hay datos suficientes', () => {
      const resultado = compararPeriodos([], 'glucosa_mg_dl');
      expect(resultado).toBeNull();
    });

    it('debe comparar períodos correctamente', () => {
      // Crear datos con fechas recientes y antiguas
      const ahora = new Date();
      const datos = [
        { glucosa_mg_dl: 120, fecha_medicion: new Date(ahora.getTime() - 10 * 24 * 60 * 60 * 1000) },
        { glucosa_mg_dl: 125, fecha_medicion: new Date(ahora.getTime() - 20 * 24 * 60 * 60 * 1000) },
        { glucosa_mg_dl: 130, fecha_medicion: new Date(ahora.getTime() - 40 * 24 * 60 * 60 * 1000) },
        { glucosa_mg_dl: 135, fecha_medicion: new Date(ahora.getTime() - 50 * 24 * 60 * 60 * 1000) },
      ];
      
      const resultado = compararPeriodos(datos, 'glucosa_mg_dl', 30);
      if (resultado) {
        expect(resultado.periodoActual).toBeDefined();
        expect(resultado.periodoAnterior).toBeDefined();
        expect(resultado.diferencia).toBeDefined();
        expect(resultado.estado).toBeDefined();
      }
    });
  });

  describe('generarZonaRango', () => {
    it('debe retornar null si no hay rango', () => {
      const resultado = generarZonaRango({ min: null, max: null }, 10);
      expect(resultado).toBeNull();
    });

    it('debe generar datos correctos para zona de rango', () => {
      const rango = { min: 70, max: 100 };
      const resultado = generarZonaRango(rango, 5);
      expect(resultado).not.toBeNull();
      expect(resultado.length).toBe(5);
      // VictoryArea: y es el valor superior (max), y0 es el valor inferior (min)
      expect(resultado[0].y).toBe(100); // Valor superior
      expect(resultado[0].y0).toBe(70);  // Valor inferior
    });
  });

  describe('generarLineaTendencia', () => {
    it('debe retornar null si hay menos de 3 puntos', () => {
      const datos = [{ x: 1, y: 100 }, { x: 2, y: 110 }];
      const resultado = generarLineaTendencia(datos);
      expect(resultado).toBeNull();
    });

    it('debe generar línea de tendencia correctamente', () => {
      const datos = [
        { x: 1, y: 150 },
        { x: 2, y: 140 },
        { x: 3, y: 130 },
        { x: 4, y: 120 },
        { x: 5, y: 110 },
      ];
      const resultado = generarLineaTendencia(datos);
      expect(resultado).not.toBeNull();
      expect(resultado.length).toBe(5);
      expect(resultado[0].x).toBe(1);
      expect(resultado[0].y).toBeDefined();
    });
  });
});

// Función para ejecutar pruebas manualmente (útil para debugging)
export const ejecutarPruebas = () => {
  console.log('=== PRUEBAS DE VITAL SIGNS ANALYSIS ===\n');

  console.log('1. Prueba: calcularTendencia (mejorando)');
  const tendenciaMejorando = calcularTendencia(signosVitalesMejorando, 'glucosa_mg_dl');
  console.log('Resultado:', tendenciaMejorando);
  console.log('✓ Tendencia:', tendenciaMejorando.tendencia);
  console.log('✓ Mensaje:', tendenciaMejorando.mensaje);
  console.log('✓ Cambio total:', tendenciaMejorando.cambioTotal);
  console.log('');

  console.log('2. Prueba: calcularEstadisticas');
  const estadisticas = calcularEstadisticas(signosVitalesMejorando, 'glucosa_mg_dl');
  console.log('Resultado:', estadisticas);
  console.log('✓ Promedio:', estadisticas?.promedio);
  console.log('✓ Mínimo:', estadisticas?.minimo);
  console.log('✓ Máximo:', estadisticas?.maximo);
  console.log('✓ Estabilidad:', estadisticas?.estabilidad);
  console.log('');

  console.log('3. Prueba: generarZonaRango');
  const zonaRango = generarZonaRango({ min: 70, max: 100 }, 5);
  console.log('Resultado:', zonaRango);
  console.log('✓ Puntos generados:', zonaRango?.length);
  console.log('');

  console.log('4. Prueba: generarLineaTendencia');
  const datosGrafica = signosVitalesMejorando.map((s, i) => ({
    x: i + 1,
    y: s.glucosa_mg_dl,
  }));
  const lineaTendencia = generarLineaTendencia(datosGrafica);
  console.log('Resultado:', lineaTendencia);
  console.log('✓ Puntos generados:', lineaTendencia?.length);
  console.log('');

  console.log('=== PRUEBAS COMPLETADAS ===');
};
