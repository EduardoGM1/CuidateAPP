/**
 * Comparativa de evolución de signos vitales (primer vs último registro).
 * Paridad con la app móvil (ComparativaEvolucion).
 * Solo muestra filas para signos que tengan al menos un valor en inicio o actual.
 */

import { useMemo } from 'react';

const NO_REGISTRADO = 'No registrado';

function formatValor(valor, unidad = '') {
  if (valor === null || valor === undefined || valor === '') return NO_REGISTRADO;
  const num = parseFloat(valor);
  if (Number.isNaN(num)) return NO_REGISTRADO;
  return unidad ? `${num} ${unidad}` : String(num);
}

function formatPresion(sistolica, diastolica) {
  const sist = formatValor(sistolica);
  const diast = formatValor(diastolica);
  if (sist === NO_REGISTRADO && diast === NO_REGISTRADO) return NO_REGISTRADO;
  if (sist === NO_REGISTRADO) return `—/${diast} mmHg`;
  if (diast === NO_REGISTRADO) return `${sist}/— mmHg`;
  return `${sist}/${diast} mmHg`;
}

function calcularIMC(pesoKg, tallaM) {
  if (pesoKg == null || tallaM == null || Number(tallaM) === 0) return null;
  const imc = Number(pesoKg) / (Number(tallaM) * Number(tallaM));
  return Number.isNaN(imc) ? null : parseFloat(imc.toFixed(1));
}

function formatFechaComparativa(fecha) {
  if (!fecha) return 'Fecha no disponible';
  try {
    const d = typeof fecha === 'string' ? new Date(fecha) : fecha;
    if (Number.isNaN(d.getTime())) return 'Fecha inválida';
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  } catch {
    return 'Fecha inválida';
  }
}

const rowStyle = {
  padding: '0.75rem 0',
  borderBottom: '1px solid var(--color-borde-claro)',
};
const labelStyle = { fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-texto-primario)', marginBottom: '0.5rem' };
const valoresContainerStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' };
const valorItemStyle = { flex: '1 1 0', minWidth: 80, textAlign: 'center' };
const valorFechaStyle = { fontSize: '0.75rem', color: 'var(--color-texto-secundario)', marginBottom: '0.25rem' };
const valorTextoStyle = { fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-texto-primario)' };
const flechaStyle = { fontSize: '1.25rem', color: 'var(--color-primario)', fontWeight: 700, padding: '0 0.5rem' };

function ComparativaEvolucionSignos({ signosVitales = [] }) {
  const { sorted, primerRegistro, ultimoRegistro, fechaPrimera, fechaUltima } = useMemo(() => {
    if (!Array.isArray(signosVitales) || signosVitales.length === 0) {
      return { sorted: [], primerRegistro: null, ultimoRegistro: null, fechaPrimera: '', fechaUltima: '' };
    }
    const sorted = [...signosVitales].sort((a, b) => {
      const fa = new Date(a.fecha_medicion || a.fecha_registro || a.fecha_creacion || 0);
      const fb = new Date(b.fecha_medicion || b.fecha_registro || b.fecha_creacion || 0);
      return fa - fb;
    });
    const primer = sorted[0];
    const ultimo = sorted[sorted.length - 1];
    const fechaPrimera = formatFechaComparativa(primer?.fecha_medicion || primer?.fecha_registro || primer?.fecha_creacion);
    const fechaUltima = formatFechaComparativa(ultimo?.fecha_medicion || ultimo?.fecha_registro || ultimo?.fecha_creacion);
    return { sorted, primerRegistro: primer, ultimoRegistro: ultimo, fechaPrimera, fechaUltima };
  }, [signosVitales]);

  const renderRow = (label, valorPrimero, valorUltimo, formateador = formatValor) => {
    const v1 = formateador(valorPrimero);
    const v2 = formateador(valorUltimo);
    if (v1 === NO_REGISTRADO && v2 === NO_REGISTRADO) return null;
    return (
      <div key={label} style={rowStyle}>
        <div style={labelStyle}>{label}</div>
        <div style={valoresContainerStyle}>
          <div style={valorItemStyle}>
            <div style={valorFechaStyle}>Inicio</div>
            <div style={valorTextoStyle}>{v1}</div>
          </div>
          <div style={flechaStyle}>→</div>
          <div style={valorItemStyle}>
            <div style={valorFechaStyle}>Actual</div>
            <div style={valorTextoStyle}>{v2}</div>
          </div>
        </div>
      </div>
    );
  };

  if (!primerRegistro || !ultimoRegistro) {
    return (
      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-texto-secundario)', fontSize: '0.9rem' }}>
        No hay registros de signos vitales disponibles para comparar.
      </div>
    );
  }

  const imcPrimero = primerRegistro.imc ?? calcularIMC(primerRegistro.peso_kg, primerRegistro.talla_m);
  const imcUltimo = ultimoRegistro.imc ?? calcularIMC(ultimoRegistro.peso_kg, ultimoRegistro.talla_m);

  const paPrimero = { sistolica: primerRegistro.presion_sistolica, diastolica: primerRegistro.presion_diastolica };
  const paUltimo = { sistolica: ultimoRegistro.presion_sistolica, diastolica: ultimoRegistro.presion_diastolica };

  const formateadorPA = (v) => {
    if (v && typeof v === 'object' && 'sistolica' in v) return formatPresion(v.sistolica, v.diastolica);
    return formatValor(v);
  };

  const rows = [
    ['Presión arterial', paPrimero, paUltimo, formateadorPA],
    ['Glucosa', primerRegistro.glucosa_mg_dl, ultimoRegistro.glucosa_mg_dl, (v) => formatValor(v, 'mg/dL')],
    ['Peso', primerRegistro.peso_kg, ultimoRegistro.peso_kg, (v) => formatValor(v, 'kg')],
    ['IMC', imcPrimero, imcUltimo, (v) => formatValor(v, 'kg/m²')],
    ['Talla', primerRegistro.talla_m, ultimoRegistro.talla_m, (v) => formatValor(v, 'm')],
    ['Circunferencia de cintura', primerRegistro.medida_cintura_cm, ultimoRegistro.medida_cintura_cm, (v) => formatValor(v, 'cm')],
    ['Colesterol total', primerRegistro.colesterol_mg_dl, ultimoRegistro.colesterol_mg_dl, (v) => formatValor(v, 'mg/dL')],
    ['Colesterol LDL', primerRegistro.colesterol_ldl, ultimoRegistro.colesterol_ldl, (v) => formatValor(v, 'mg/dL')],
    ['Colesterol HDL', primerRegistro.colesterol_hdl, ultimoRegistro.colesterol_hdl, (v) => formatValor(v, 'mg/dL')],
    ['Triglicéridos', primerRegistro.trigliceridos_mg_dl, ultimoRegistro.trigliceridos_mg_dl, (v) => formatValor(v, 'mg/dL')],
    ['HbA1c', primerRegistro.hba1c_porcentaje, ultimoRegistro.hba1c_porcentaje, (v) => formatValor(v, '%')],
    ['Temperatura', primerRegistro.temperatura, ultimoRegistro.temperatura, (v) => formatValor(v, '°C')],
    ['Frecuencia cardíaca', primerRegistro.frecuencia_cardiaca, ultimoRegistro.frecuencia_cardiaca, (v) => formatValor(v, 'bpm')],
    ['Saturación de oxígeno', primerRegistro.saturacion_oxigeno, ultimoRegistro.saturacion_oxigeno, (v) => formatValor(v, '%')],
  ];

  const renderedRows = rows.map(([label, v1, v2, fn]) => renderRow(label, v1, v2, fn)).filter(Boolean);

  return (
    <div
      style={{
        background: 'var(--color-fondo-card)',
        borderRadius: 'var(--radius)',
        padding: '1.25rem',
        marginTop: '1.5rem',
        border: '1px solid var(--color-borde-claro)',
      }}
    >
      <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-texto-primario)', marginBottom: '0.25rem', textAlign: 'center' }}>
        Comparativa de evolución
      </h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--color-texto-secundario)', marginBottom: '1.25rem', textAlign: 'center', lineHeight: 1.4 }}>
        Desde el primer registro ({fechaPrimera}) hasta el último ({fechaUltima})
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {renderedRows.length > 0 ? renderedRows : (
          <p style={{ padding: '1rem', color: 'var(--color-texto-secundario)', fontSize: '0.9rem', textAlign: 'center' }}>
            No hay valores de signos vitales para comparar en estos registros.
          </p>
        )}
      </div>
    </div>
  );
}

export default ComparativaEvolucionSignos;
