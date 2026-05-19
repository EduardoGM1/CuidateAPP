/**
 * Servicio de Reportes
 * 
 * Genera reportes en formato PDF y CSV
 */

import { Op } from 'sequelize';
import sequelize from '../config/db.js';
import { 
  Paciente, 
  SignoVital, 
  Diagnostico, 
  Cita, 
  PlanMedicacion,
  PlanDetalle,
  Medicamento,
  Doctor,
  RedApoyo,
  EsquemaVacunacion,
  Comorbilidad,
  PacienteComorbilidad,
  Modulo,
  DeteccionComplicacion,
  SaludBucal,
  DeteccionTuberculosis,
  SesionEducativa,
  DoctorPaciente
} from '../models/associations.js';
import logger from '../utils/logger.js';
import EncryptionService from './encryptionService.js';

/**
 * Formato de nombre completo: "Apellido paterno Apellido materno Nombre" (ej. González Morales José).
 * @param {Object} obj - { apellido_paterno?, apellido_materno?, nombre?, apellido? } (apellido = alias de apellido_paterno)
 * @returns {string}
 */
function formatNombreCompleto(obj) {
  if (obj == null || typeof obj !== 'object') return '';
  const ap = String(obj.apellido_paterno ?? obj.apellido ?? '').trim();
  const am = String(obj.apellido_materno ?? '').trim();
  const n = String(obj.nombre ?? '').trim();
  return [ap, am, n].filter(Boolean).join(' ') || '';
}

/** Desencripta un campo para mostrar en reportes (p. ej. descripcion de Diagnostico). Si no está encriptado, devuelve el valor. */
function decryptForReport(value) {
  if (value == null || value === '') return value;
  const isEncrypted = (typeof value === 'string' && value.trim().startsWith('{') && value.includes('encrypted')) ||
    (typeof value === 'object' && value?.encrypted != null && value?.iv != null && value?.authTag != null);
  if (!isEncrypted) return value;
  try {
    const decrypted = EncryptionService.decryptField(value);
    return decrypted != null ? decrypted : '';
  } catch (e) {
    logger.debug('decryptForReport: no se pudo desencriptar', e?.message);
    return '';
  }
}

const MESES_NOMBRE = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
import DashboardService from './dashboardService.js';
import DashboardRepository from '../repositories/dashboardRepository.js';

/** Máximo de pacientes por exportación FORMA masiva (evita timeouts). */
const FORMA_LISTA_MAX_PACIENTES = 200;

/** Ancho y alto por defecto para gráficas SVG en el reporte PDF */
const CHART_WIDTH = 420;
const CHART_HEIGHT = 200;
const BAR_COLOR = '#1976D2';
const PIE_COLORS = ['#1976D2', '#2E7D32', '#ED6C02', '#C62828', '#6A1B9A', '#00838F'];

function escapeSvgText(text) {
  if (text == null) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Genera SVG de gráfica de barras verticales para el reporte HTML (imprimir a PDF).
 * @param {Array<{ label: string, value: number }>} data
 * @param {{ width?: number, height?: number, barColor?: string }} [opts]
 * @returns {string} SVG
 */
function svgBarChart(data, opts = {}) {
  const w = opts.width ?? CHART_WIDTH;
  const h = opts.height ?? CHART_HEIGHT;
  const barColor = opts.barColor ?? BAR_COLOR;
  if (!Array.isArray(data) || data.length === 0) return '';
  const maxVal = Math.max(1, ...data.map(d => Number(d.value) || 0));
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  const barW = Math.max(8, (chartW / data.length) * 0.7);
  const gap = chartW / data.length;
  const bars = data.map((d, i) => {
    const v = Number(d.value) || 0;
    const barH = maxVal > 0 ? (v / maxVal) * chartH : 0;
    const x = padding.left + i * gap + (gap - barW) / 2;
    const y = padding.top + chartH - barH;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${barColor}" rx="2"/>`;
  }).join('');
  const labels = data.map((d, i) => {
    const x = padding.left + i * gap + gap / 2;
    return `<text x="${x}" y="${h - 8}" text-anchor="middle" font-size="10" fill="#333">${escapeSvgText(String(d.label || '').slice(0, 4))}</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bars}${labels}</svg>`;
}

/**
 * Genera SVG de gráfica de barras horizontales.
 * @param {Array<{ label: string, value: number }>} data
 * @param {{ width?: number, height?: number, maxBars?: number }} [opts]
 * @returns {string} SVG
 */
function svgHorizontalBarChart(data, opts = {}) {
  const w = opts.width ?? CHART_WIDTH;
  const h = opts.height ?? CHART_HEIGHT;
  const maxBars = opts.maxBars ?? 8;
  const showValues = opts.showValues !== false;
  const list = (Array.isArray(data) ? data : []).slice(0, maxBars);
  if (list.length === 0) return '';
  const maxVal = Math.max(1, ...list.map(d => Number(d.value) || 0));
  const padding = { top: 10, right: showValues ? 36 : 50, bottom: 10, left: 120 };
  const chartW = w - padding.left - padding.right;
  const barH = Math.max(14, (h - padding.top - padding.bottom) / list.length - 4);
  const bars = list.map((d, i) => {
    const v = Number(d.value) || 0;
    const barW = maxVal > 0 ? (v / maxVal) * chartW : 0;
    const y = padding.top + i * (barH + 4);
    const label = escapeSvgText(String(d.label || '').slice(0, 18));
    const valueX = padding.left + barW + 6;
    const valueLabel = showValues
      ? `<text x="${valueX.toFixed(1)}" y="${y + barH / 2 + 4}" font-size="10" font-weight="600" fill="#333">${v}</text>`
      : '';
    return `<text x="4" y="${y + barH / 2 + 4}" font-size="10" fill="#333">${label}</text><rect x="${padding.left}" y="${y}" width="${barW.toFixed(1)}" height="${barH.toFixed(1)}" fill="${BAR_COLOR}" rx="2"/>${valueLabel}`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bars}</svg>`;
}

/**
 * Genera SVG de gráfica de pastel para el reporte HTML.
 * @param {Array<{ name: string, value: number }>} data
 * @param {{ width?: number, height?: number, cx?: number, cy?: number, r?: number }} [opts]
 * @returns {string} SVG
 */
function svgPieChart(data, opts = {}) {
  const w = opts.width ?? 280;
  const h = opts.height ?? CHART_HEIGHT;
  const list = (Array.isArray(data) ? data : []).filter(d => Number(d.value) > 0);
  if (list.length === 0) return '';
  const total = list.reduce((s, d) => s + (Number(d.value) || 0), 0);
  if (total <= 0) return '';
  const cx = opts.cx ?? w / 2;
  const cy = opts.cy ?? h / 2 - 10;
  const r = opts.r ?? Math.min(w, h) / 2 - 24;
  let acc = 0;
  const segments = list.map((d, i) => {
    const v = Number(d.value) || 0;
    const ratio = v / total;
    const startAngle = acc * 2 * Math.PI;
    acc += ratio;
    const endAngle = acc * 2 * Math.PI;
    const x1 = cx + r * Math.sin(startAngle);
    const y1 = cy - r * Math.cos(startAngle);
    const x2 = cx + r * Math.sin(endAngle);
    const y2 = cy - r * Math.cos(endAngle);
    const large = ratio > 0.5 ? 1 : 0;
    const color = PIE_COLORS[i % PIE_COLORS.length];
    return `<path d="M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z" fill="${color}"/>`;
  }).join('');
  const legendY = cy + r + 14;
  const legend = list.map((d, i) => {
    const x = 20 + (i % 2) * (w / 2);
    const y = legendY + Math.floor(i / 2) * 16;
    const color = PIE_COLORS[i % PIE_COLORS.length];
    const pct = total > 0 ? ((Number(d.value) / total) * 100).toFixed(0) : 0;
    return `<rect x="${x}" y="${y - 8}" width="12" height="10" fill="${color}"/><text x="${x + 16}" y="${y}" font-size="10" fill="#333">${escapeSvgText(String(d.name || '').slice(0, 20))} (${pct}%)</text>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${segments}${legend}</svg>`;
}

class ReportService {
  /**
   * Generar reporte CSV de signos vitales
   */
  async generateSignosVitalesCSV(pacienteId, fechaInicio, fechaFin) {
    try {
      const where = { id_paciente: pacienteId };
      
      if (fechaInicio && fechaFin) {
        where.fecha_medicion = {
          [Op.between]: [new Date(fechaInicio), new Date(fechaFin)]
        };
      }
      
      const signos = await SignoVital.findAll({
        where,
        order: [['fecha_medicion', 'DESC']],
      });
      
      // Generar CSV
      const headers = [
        'Fecha',
        'Presión Sistólica',
        'Presión Diastólica',
        'Glucosa (mg/dL)',
        'Peso (kg)',
        'IMC',
        'Temperatura (°C)',
        'Frecuencia Cardíaca',
        'Saturación de Oxígeno (%)'
      ];
      
      const rows = signos.map(signo => [
        signo.fecha_medicion || '',
        decryptForReport(signo.presion_sistolica) ?? '',
        decryptForReport(signo.presion_diastolica) ?? '',
        decryptForReport(signo.glucosa_mg_dl) ?? '',
        signo.peso_kg || '',
        signo.imc || '',
        signo.temperatura_c || '',
        signo.frecuencia_cardiaca || '',
        signo.saturacion_oxigeno || ''
      ]);
      
      const csv = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      return csv;
    } catch (error) {
      logger.error('Error generando CSV de signos vitales:', error);
      throw error;
    }
  }

  /**
   * Generar reporte CSV de citas
   */
  async generateCitasCSV(pacienteId, fechaInicio, fechaFin) {
    try {
      const where = { id_paciente: pacienteId };
      
      if (fechaInicio && fechaFin) {
        where.fecha_cita = {
          [Op.between]: [new Date(fechaInicio), new Date(fechaFin)]
        };
      }
      
      const citas = await Cita.findAll({
        where,
        include: [
          {
            model: Doctor,
            attributes: ['nombre', 'apellido_paterno', 'apellido_materno']
          }
        ],
        order: [['fecha_cita', 'DESC']],
      });
      
      const headers = [
        'Fecha',
        'Estado',
        'Motivo',
        'Doctor',
        'Observaciones'
      ];
      
      const rows = citas.map(cita => [
        cita.fecha_cita || '',
        cita.estado || '',
        decryptForReport(cita.motivo) || '',
        cita.Doctor ? formatNombreCompleto(cita.Doctor) : '',
        decryptForReport(cita.observaciones) || ''
      ]);
      
      const csv = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      return csv;
    } catch (error) {
      logger.error('Error generando CSV de citas:', error);
      throw error;
    }
  }

  /**
   * Generar reporte CSV de diagnósticos
   */
  async generateDiagnosticosCSV(pacienteId, fechaInicio, fechaFin) {
    try {
      const where = { id_paciente: pacienteId };
      
      if (fechaInicio && fechaFin) {
        where.fecha_diagnostico = {
          [Op.between]: [new Date(fechaInicio), new Date(fechaFin)]
        };
      }
      
      const diagnosticos = await Diagnostico.findAll({
        where,
        order: [['fecha_diagnostico', 'DESC']],
      });
      
      const headers = [
        'Fecha',
        'Descripción',
        'Observaciones'
      ];
      
      const rows = diagnosticos.map(diagnostico => [
        diagnostico.fecha_diagnostico || '',
        decryptForReport(diagnostico.descripcion) || '',
        diagnostico.observaciones || ''
      ]);
      
      const csv = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      return csv;
    } catch (error) {
      logger.error('Error generando CSV de diagnósticos:', error);
      throw error;
    }
  }

  /**
   * Generar reporte PDF (genérico) - DEPRECADO
   * Ahora se usa generateExpedienteCompletoHTML
   * GET /api/reportes/:tipo/:idPaciente/pdf
   */
  async generatePDFReport(pacienteId, tipo, fechaInicio, fechaFin) {
    try {
      // Por ahora, redirigir al expediente completo para todos los tipos
      // En el futuro se puede implementar reportes individuales
      return await this.generateExpedienteCompletoHTML(pacienteId, fechaInicio, fechaFin);
    } catch (error) {
      logger.error(`Error generando reporte HTML de ${tipo}:`, error);
      throw error;
    }
  }

  /**
   * Generar HTML del expediente médico completo
   */
  generateExpedienteHTML(paciente, citas, signosVitalesContinuo, medicamentosActivos, redApoyo, esquemaVacunacion, totalCitas, totalSignosVitales, totalDiagnosticos, totalMedicamentos) {
    const edad = paciente.fecha_nacimiento 
      ? Math.floor((new Date() - new Date(paciente.fecha_nacimiento)) / (365.25 * 24 * 60 * 60 * 1000))
      : 'N/A';

    const formatDate = (date) => {
      if (!date) return 'N/A';
      const d = new Date(date);
      const fecha = d.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const hora = d.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      return `${fecha}, ${hora}`;
    };

    const formatDateShort = (date) => {
      if (!date) return 'N/A';
      return new Date(date).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const escapeHtml = (text) => {
      if (!text) return '';
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    // Información de la clínica (puedes personalizar esto)
    const clinicaNombre = 'Clínica Salud Integral';
    const clinicaDireccion = 'Dirección de la Clínica';
    const clinicaTelefono = 'Teléfono de la Clínica';
    const clinicaCorreo = 'correo@clinica.com';

    let html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Expediente Médico - ${escapeHtml(formatNombreCompleto(paciente))}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #333;
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      color: #1976D2;
      font-size: 24px;
      margin-bottom: 10px;
    }
    h2 {
      color: #1976D2;
      font-size: 18px;
      margin-top: 30px;
      margin-bottom: 15px;
      border-bottom: 2px solid #1976D2;
      padding-bottom: 5px;
    }
    h3 {
      color: #333;
      font-size: 16px;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    p {
      margin-bottom: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      margin-bottom: 20px;
    }
    table th, table td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    table th {
      background-color: #1976D2;
      color: white;
      font-weight: bold;
    }
    table tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    ul {
      margin-left: 20px;
      margin-bottom: 20px;
    }
    li {
      margin-bottom: 5px;
    }
    footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      font-size: 10px;
      color: #666;
      font-style: italic;
      text-align: center;
    }
    strong {
      font-weight: bold;
    }
  </style>
</head>
<body>
  <h1>Expediente Médico</h1>
  
  <p><strong>${escapeHtml(clinicaNombre)}</strong><br/>
  ${escapeHtml(clinicaDireccion)} | ${escapeHtml(clinicaTelefono)} | ${escapeHtml(clinicaCorreo)}</p>
  
  <p>Fecha de generación: ${new Date().toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })}</p>
  <p><strong>No. expediente:</strong> ${escapeHtml(paciente.numero_expediente || paciente.id_paciente?.toString() || '—')}</p>

  ${citas.length > 0 ? `
    <h2>Historial de Consultas</h2>
    ${citas.map((cita, index) => `
      <h3>Consulta ${citas.length - index}</h3>
      
      <p><strong>Fecha:</strong> ${formatDate(cita.fecha_cita)}</p>
      <p><strong>Estado:</strong> ${escapeHtml(cita.estado || 'N/A')}</p>
      ${cita.Doctor ? `<p><strong>Doctor:</strong> Dr. ${escapeHtml(formatNombreCompleto(cita.Doctor))}</p>` : ''}
      ${cita.motivo ? `<p><strong>Motivo:</strong> ${escapeHtml(decryptForReport(cita.motivo))}</p>` : ''}
      ${cita.observaciones ? `<p><strong>Observaciones:</strong> ${escapeHtml(decryptForReport(cita.observaciones))}</p>` : ''}
      
      ${cita.SignosVitales && cita.SignosVitales.length > 0 ? `
        <table border="1">
          <tr><th>Signo Vital</th><th>Valor</th></tr>
          ${cita.SignosVitales.map(signo => {
            const presionSistolica = decryptForReport(signo.presion_sistolica);
            const presionDiastolica = decryptForReport(signo.presion_diastolica);
            const glucosa = decryptForReport(signo.glucosa_mg_dl);
            const colesterol = decryptForReport(signo.colesterol_mg_dl);
            let rows = '';
            if (signo.peso_kg) rows += `<tr><td>Peso</td><td>${escapeHtml(String(signo.peso_kg))} kg</td></tr>`;
            if (signo.talla_m) rows += `<tr><td>Talla</td><td>${escapeHtml(String(signo.talla_m))} m</td></tr>`;
            if (signo.peso_kg && signo.talla_m) {
              const imc = (signo.peso_kg / (signo.talla_m * signo.talla_m)).toFixed(1);
              rows += `<tr><td>IMC</td><td>${imc}</td></tr>`;
            }
            if (presionSistolica !== '' && presionSistolica != null && presionDiastolica !== '' && presionDiastolica != null) {
              rows += `<tr><td>Presión arterial</td><td>${escapeHtml(String(presionSistolica))}/${escapeHtml(String(presionDiastolica))} mmHg</td></tr>`;
            }
            if (glucosa !== '' && glucosa != null) rows += `<tr><td>Glucosa</td><td>${escapeHtml(String(glucosa))} mg/dL</td></tr>`;
            if (colesterol !== '' && colesterol != null) rows += `<tr><td>Colesterol</td><td>${escapeHtml(String(colesterol))} mg/dL</td></tr>`;
            return rows;
          }).join('')}
        </table>
      ` : ''}
      
      ${cita.PlanMedicacions && cita.PlanMedicacions.length > 0 ? `
        <h3>Medicamentos Prescritos</h3>
        <ul>
          ${cita.PlanMedicacions.map(plan => 
            plan.PlanDetalles && plan.PlanDetalles.length > 0 ? plan.PlanDetalles.map(detalle => {
              const medicamento = detalle.Medicamento;
              let medText = escapeHtml(medicamento?.nombre_medicamento || 'Medicamento');
              if (detalle.dosis) medText += ` – ${escapeHtml(detalle.dosis)}`;
              if (detalle.frecuencia) medText += ` – ${escapeHtml(detalle.frecuencia)}`;
              return `<li>${medText}</li>`;
            }).join('') : ''
          ).join('')}
        </ul>
      ` : ''}
    `).join('')}
  ` : ''}

  ${medicamentosActivos.length > 0 ? `
    <h2>Medicamentos Activos</h2>
    <ul>
      ${medicamentosActivos.map(plan => 
        plan.PlanDetalles && plan.PlanDetalles.length > 0 ? plan.PlanDetalles.map(detalle => {
          const medicamento = detalle.Medicamento;
          const detalles = [];
          if (detalle.dosis) detalles.push(escapeHtml(detalle.dosis));
          if (detalle.frecuencia) detalles.push(escapeHtml(detalle.frecuencia));
          if (detalle.via_administracion) detalles.push(escapeHtml(detalle.via_administracion));
          const detallesStr = detalles.length > 0 ? ` | ${detalles.join(' | ')}` : '';
          const doctorStr = plan.Doctor ? ` | Prescrito por Dr. ${escapeHtml(formatNombreCompleto(plan.Doctor))}` : '';
          return `<li>${escapeHtml(medicamento?.nombre_medicamento || 'Medicamento')}${detallesStr}${doctorStr}</li>`;
        }).join('') : ''
      ).join('')}
    </ul>
  ` : ''}

  ${signosVitalesContinuo.length > 0 ? `
    <h2>Monitoreo Continuo</h2>
    <table border="1">
      <tr>
        <th>Fecha</th>
        <th>Peso</th>
        <th>Talla</th>
        <th>IMC</th>
        <th>Presión</th>
        <th>Glucosa</th>
        <th>Colesterol</th>
        <th>Triglicéridos</th>
      </tr>
      ${signosVitalesContinuo.map(signo => {
        const presionSistolica = decryptForReport(signo.presion_sistolica);
        const presionDiastolica = decryptForReport(signo.presion_diastolica);
        const glucosaDec = decryptForReport(signo.glucosa_mg_dl);
        const colesterolDec = decryptForReport(signo.colesterol_mg_dl);
        const trigliceridosDec = decryptForReport(signo.trigliceridos_mg_dl);
        const fechaMedicion = formatDateShort(signo.fecha_medicion);
        const peso = signo.peso_kg ? `${signo.peso_kg} kg` : '-';
        const talla = signo.talla_m ? `${signo.talla_m} m` : '-';
        const imc = (signo.peso_kg && signo.talla_m) 
          ? (signo.peso_kg / (signo.talla_m * signo.talla_m)).toFixed(1) 
          : '-';
        const presion = (presionSistolica !== '' && presionSistolica != null && presionDiastolica !== '' && presionDiastolica != null) 
          ? `${presionSistolica}/${presionDiastolica}` 
          : '-';
        const glucosa = (glucosaDec !== '' && glucosaDec != null) ? `${glucosaDec} mg/dL` : '-';
        const colesterol = (colesterolDec !== '' && colesterolDec != null) ? `${colesterolDec} mg/dL` : '-';
        const trigliceridos = (trigliceridosDec !== '' && trigliceridosDec != null) ? `${trigliceridosDec} mg/dL` : '-';
        
        return `
          <tr>
            <td>${fechaMedicion}</td>
            <td>${peso}</td>
            <td>${talla}</td>
            <td>${imc}</td>
            <td>${presion}</td>
            <td>${glucosa}</td>
            <td>${colesterol}</td>
            <td>${trigliceridos}</td>
          </tr>
        `;
      }).join('')}
    </table>
  ` : ''}

  <footer>
    <p><em>Este documento contiene información sensible y está protegido por la Ley de Protección de Datos Personales.</em></p>
  </footer>
</body>
</html>
    `;

    return html;
  }

  /**
   * Genera HTML del documento de nota médica (encabezado simplificado; cuerpo tipo expediente).
   * Signos vitales: último registro por fecha_medicion. Cabecera alineada a la cita de ese registro si existe.
   * Diagnóstico: el más reciente (fecha_registro), con o sin cita. Medicamentos: planes activos únicamente.
   * GET /api/reportes/notas-medicas/:idPaciente/html
   * @param {number} pacienteId
   * @returns {Promise<string>}
   */
  async generateNotasMedicasHTML(pacienteId) {
    const escapeHtml = (text) => {
      if (text == null || text === undefined) return '';
      return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    };

    const paciente = await Paciente.findByPk(pacienteId, {
      include: [
        { model: Comorbilidad, as: 'Comorbilidades', through: { attributes: [] }, attributes: ['nombre_comorbilidad'], required: false },
        { model: RedApoyo, as: 'RedApoyos', required: false }
      ]
    });
    if (!paciente) throw new Error('Paciente no encontrado');

    const planDetalleInclude = {
      model: PlanDetalle,
      include: [{ model: Medicamento, attributes: ['nombre_medicamento'] }]
    };

    const flatMedicamentosFromPlanes = (planes) => (planes || []).flatMap((p) =>
      (p.PlanDetalles || []).map((d) => ({
        nombre: d.Medicamento?.nombre_medicamento,
        dosis: d.dosis,
        frecuencia: d.frecuencia,
        via: d.via_administracion
      }))
    ).filter((m) => Boolean(m.nombre || m.dosis || m.frecuencia || m.via));

    const [ultimoSigno, planesActivos, citasPacienteRows] = await Promise.all([
      SignoVital.findOne({
        where: { id_paciente: pacienteId },
        order: [['fecha_medicion', 'DESC']]
      }),
      PlanMedicacion.findAll({
        where: { id_paciente: pacienteId, activo: true },
        include: [planDetalleInclude, { model: Doctor, attributes: ['nombre', 'apellido_paterno'] }],
        order: [['fecha_inicio', 'DESC'], ['fecha_creacion', 'DESC']],
        limit: 20
      }),
      Cita.findAll({
        where: { id_paciente: pacienteId },
        attributes: ['id_cita'],
        raw: true
      })
    ]);

    const citasPacienteIds = (citasPacienteRows || []).map((r) => r.id_cita).filter((id) => id != null);
    const diagnosticoWhere = citasPacienteIds.length
      ? { [Op.or]: [{ id_cita: { [Op.in]: citasPacienteIds } }, { id_cita: null }] }
      : { id_cita: null };

    const ultimoDiagnostico = await Diagnostico.findOne({
      where: diagnosticoWhere,
      attributes: ['id_diagnostico', 'descripcion', 'fecha_registro'],
      order: [['fecha_registro', 'DESC'], ['id_diagnostico', 'DESC']]
    });

    const diagnosticos = ultimoDiagnostico ? [ultimoDiagnostico] : [];

    let cita = null;
    if (ultimoSigno?.id_cita) {
      cita = await Cita.findByPk(ultimoSigno.id_cita, {
        include: [
          { model: Doctor, attributes: ['nombre', 'apellido_paterno', 'apellido_materno', 'grado_estudio'] }
        ]
      });
    }
    if (!cita) {
      cita = await Cita.findOne({
        where: { id_paciente: pacienteId },
        include: [
          { model: Doctor, attributes: ['nombre', 'apellido_paterno', 'apellido_materno', 'grado_estudio'] }
        ],
        order: [['fecha_cita', 'DESC']]
      });
    }

    const signo = ultimoSigno;
    const medicamentos = flatMedicamentosFromPlanes(planesActivos);

    const nombreCompleto = formatNombreCompleto(paciente) || '—';
    const edad = paciente.fecha_nacimiento
      ? Math.floor((new Date() - new Date(paciente.fecha_nacimiento)) / (365.25 * 24 * 60 * 60 * 1000))
      : '—';
    const sexo = paciente.sexo === 'Mujer' ? 'Fem' : paciente.sexo === 'Hombre' ? 'M' : paciente.sexo || '—';
    const domicilio = [paciente.direccion, paciente.localidad].filter(Boolean).join(', ').trim() || '—';
    const fmtFechaHora = (d) =>
      new Date(d).toLocaleString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).replace(',', '');
    let fechaHoraConsulta;
    if (ultimoSigno?.id_cita && cita?.id_cita === ultimoSigno.id_cita && cita.fecha_cita) {
      fechaHoraConsulta = fmtFechaHora(cita.fecha_cita);
    } else if (ultimoSigno?.fecha_medicion) {
      fechaHoraConsulta = fmtFechaHora(ultimoSigno.fecha_medicion);
    } else if (cita?.fecha_cita) {
      fechaHoraConsulta = fmtFechaHora(cita.fecha_cita);
    } else {
      fechaHoraConsulta = fmtFechaHora(new Date());
    }
    const nombreDoctor = cita?.Doctor
      ? `Dr. ${formatNombreCompleto(cita.Doctor)}`
      : '—';

    const presionSistolica = decryptForReport(signo?.presion_sistolica);
    const presionDiastolica = decryptForReport(signo?.presion_diastolica);
    const ta = (presionSistolica !== '' && presionSistolica != null && presionDiastolica !== '' && presionDiastolica != null) ? `${presionSistolica}/${presionDiastolica}` : '—';
    const peso = signo?.peso_kg != null ? `${signo.peso_kg} kg` : '—';
    const talla = signo?.talla_m != null ? `${(signo.talla_m * 100).toFixed(0)} cm` : '—';
    const glucosaDec = decryptForReport(signo?.glucosa_mg_dl);
    const colesterolDec = decryptForReport(signo?.colesterol_mg_dl);
    const trigliceridosDec = decryptForReport(signo?.trigliceridos_mg_dl);
    const glucosa = (glucosaDec !== '' && glucosaDec != null) ? `${glucosaDec} MG/DL` : '—';
    const colesterol = (colesterolDec !== '' && colesterolDec != null) ? `${colesterolDec} MG/DL` : '—';
    const trigliceridos = (trigliceridosDec !== '' && trigliceridosDec != null) ? `${trigliceridosDec} MG/DL` : '—';

    const comorbText = (paciente.Comorbilidades || []).map(c => c.nombre_comorbilidad).filter(Boolean).join('; ') || '—';
    const diagText = diagnosticos.map(d => decryptForReport(d.descripcion)).filter(Boolean).join('; ') || '—';
    const medRows = medicamentos.map(m => `<tr><td>${escapeHtml(m.nombre || '—')} ${m.dosis ? escapeHtml(m.dosis) : ''} ${m.frecuencia ? escapeHtml(m.frecuencia) : ''} ${m.via ? escapeHtml(m.via) : ''}</td></tr>`).join('') || '<tr><td>—</td></tr>';

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><title>Nota médica - ${escapeHtml(nombreCompleto)}</title>
<style>
  body{font-family:Arial,sans-serif;font-size:11px;color:#000;padding:16px;max-width:900px;margin:0 auto;}
  .header{text-align:center;margin-bottom:12px;}
  .header h1{font-size:18px;margin:0;font-weight:bold;}
  table.notas{width:100%;border-collapse:collapse;margin:8px 0;}
  table.notas th, table.notas td{border:1px solid #000;padding:4px 6px;vertical-align:top;}
  table.notas th{background:#e8e8e8;font-weight:bold;}
  .label{font-weight:bold;}
  .section{margin-top:10px;}
  .footer{margin-top:16px;font-size:10px;}
</style>
</head>
<body>
  <div class="header">
    <h1>NOTA MÉDICA</h1>
  </div>

  <table class="notas">
    <tr><th>Nombre</th><td>${escapeHtml(nombreCompleto)}</td><th>Edad</th><td>${edad}</td><th>Sexo</th><td>${escapeHtml(sexo)}</td></tr>
    <tr><th>Servicio</th><td>—</td><th>No. EXPEDIENTE</th><td>${escapeHtml(paciente.numero_expediente || paciente.id_paciente?.toString() || '—')}</td><th>Domicilio</th><td colspan="3">${escapeHtml(domicilio)}</td></tr>
    <tr><th>Tipo consulta</th><td colspan="5">C. EXTERNA</td></tr>
    <tr><th colspan="2">Fecha y hora</th><td colspan="4">${fechaHoraConsulta}</td></tr>
  </table>

  <div class="section"><strong>Signos vitales y antropometría</strong></div>
  <table class="notas">
    <tr><th>TA (mmHg)</th><td>${ta}</td><th>P (x')</th><td>—</td><th>R (x')</th><td>—</td><th>T (°C)</th><td>—</td></tr>
    <tr><th>Peso</th><td>${peso}</td><th>Talla</th><td>${talla}</td><th>Glucosa</th><td>${glucosa}</td><th>Colesterol</th><td>${colesterol}</td></tr>
    <tr><th>Triglicéridos</th><td>${trigliceridos}</td><th>Presión sistólica/diastólica</th><td colspan="3">${ta}</td></tr>
  </table>

  <div class="section"><strong>Antecedentes</strong></div>
  <table class="notas">
    <tr><th>AHE</th><td colspan="5">—</td></tr>
    <tr><th>APP</th><td colspan="5">${escapeHtml(comorbText)}</td></tr>
    <tr><th>APNP</th><td colspan="5">—</td></tr>
    <tr><th>Gineco-obstétricos (M:G:P:C:OTB)</th><td colspan="5">—</td></tr>
  </table>

  <div class="section"><strong>Problema actual (P:S:O:)</strong></div>
  <table class="notas">
    <tr><th>P</th><td colspan="5">${escapeHtml(diagText)}</td></tr>
    <tr><th>S</th><td colspan="5">—</td></tr>
    <tr><th>O</th><td colspan="5">—</td></tr>
  </table>

  <div class="section"><strong>Diagnósticos / Valoraciones</strong></div>
  <table class="notas"><tr><th>Diagnóstico</th></tr>${diagnosticos.length ? diagnosticos.map(d => `<tr><td>${escapeHtml(decryptForReport(d.descripcion) || '—')}</td></tr>`).join('') : '<tr><td>—</td></tr>'}</table>

  <div class="section"><strong>Medicamentos</strong></div>
  <table class="notas"><thead><tr><th>Medicamento / Dosis / Frecuencia / Vía</th></tr></thead><tbody>${medRows}</tbody></table>

  <div class="section"><strong>Pronóstico</strong></div>
  <p>—</p>
  <p><strong>${escapeHtml(nombreDoctor)}</strong></p>

  <div class="footer"><em>Documento generado por CuidateAPP. Información sensible protegida.</em></div>
  <script>window.onload=function(){window.print();}</script>
</body>
</html>`;
    return html;
  }

  /**
   * Generar HTML del expediente médico completo
   * Incluye toda la información del paciente relacionada y estructurada
   *
   * @param {number} pacienteId - ID del paciente
   * @param {string} fechaInicio - Fecha inicio para filtrar (opcional)
   * @param {string} fechaFin - Fecha fin para filtrar (opcional)
   * @returns {Promise<string>} - HTML del expediente médico
   */
  async generateExpedienteCompletoHTML(pacienteId, fechaInicio = null, fechaFin = null) {
    try {
      logger.info('Generando expediente completo HTML', { pacienteId, fechaInicio, fechaFin });

      // Cargar datos del paciente con todas las relaciones
      const paciente = await Paciente.findByPk(pacienteId, {
        include: [
          {
            model: Doctor,
            through: { attributes: ['fecha_asignacion'] },
            attributes: ['id_doctor', 'nombre', 'apellido_paterno', 'apellido_materno', 'grado_estudio'],
            required: false
          },
          {
            model: Comorbilidad,
            as: 'Comorbilidades',
            through: { 
              model: PacienteComorbilidad,
              attributes: ['fecha_deteccion', 'anos_padecimiento', 'observaciones'] 
            },
            attributes: ['id_comorbilidad', 'nombre_comorbilidad'],
            required: false
          }
        ]
      });

      if (!paciente) {
        throw new Error('Paciente no encontrado');
      }
      
      // Construir filtros de fecha
      const fechaFilter = {};
      if (fechaInicio && fechaFin) {
        fechaFilter[Op.between] = [new Date(fechaInicio), new Date(fechaFin)];
      } else if (fechaInicio) {
        fechaFilter[Op.gte] = new Date(fechaInicio);
      } else if (fechaFin) {
        fechaFilter[Op.lte] = new Date(fechaFin);
      }

      // Cargar citas con relaciones
      const citasWhere = { id_paciente: pacienteId };
      if (Object.keys(fechaFilter).length > 0) {
        citasWhere.fecha_cita = fechaFilter;
      }

      const citas = await Cita.findAll({
        where: citasWhere,
        include: [
          {
            model: Doctor,
            attributes: ['id_doctor', 'nombre', 'apellido_paterno', 'apellido_materno', 'grado_estudio']
          },
          {
            model: SignoVital,
            as: 'SignosVitales',
            required: false
          },
          {
            model: Diagnostico,
            as: 'Diagnosticos',
            required: false
          },
          {
            model: PlanMedicacion,
            required: false,
            include: [
              {
                model: PlanDetalle,
                required: false,
                include: [
                  {
                    model: Medicamento,
                    attributes: ['nombre_medicamento']
                  }
                ]
              }
            ]
          }
        ],
        order: [['fecha_cita', 'DESC']]
      });

      // Cargar signos vitales sin cita (monitoreo continuo)
      const signosVitalesWhere = { 
        id_paciente: pacienteId,
        id_cita: { [Op.is]: null }
      };
      if (Object.keys(fechaFilter).length > 0) {
        signosVitalesWhere.fecha_medicion = fechaFilter;
      }

      const signosVitalesContinuo = await SignoVital.findAll({
        where: signosVitalesWhere,
        order: [['fecha_medicion', 'DESC']],
        limit: 50
      });

      // Cargar medicamentos activos
      const medicamentosActivos = await PlanMedicacion.findAll({
        where: {
          id_paciente: pacienteId,
          activo: true
        },
        include: [
          {
            model: PlanDetalle,
            required: false,
            include: [
              {
                model: Medicamento,
                attributes: ['nombre_medicamento']
              }
            ]
          },
          {
            model: Doctor,
            attributes: ['nombre', 'apellido_paterno', 'apellido_materno']
          }
        ],
        order: [['fecha_inicio', 'DESC']]
      });

      // Cargar red de apoyo
      const redApoyo = await RedApoyo.findAll({
        where: { id_paciente: pacienteId },
        order: [['nombre_contacto', 'ASC']]
      });

      // Cargar esquema de vacunación
      const esquemaVacunacion = await EsquemaVacunacion.findAll({
        where: { id_paciente: pacienteId },
        order: [['fecha_aplicacion', 'DESC']]
      });

      // Calcular resumen
      const totalCitas = citas.length;
      const totalSignosVitales = signosVitalesContinuo.length + citas.reduce((sum, cita) => sum + (cita.SignosVitales?.length || 0), 0);
      const totalDiagnosticos = citas.reduce((sum, cita) => sum + (cita.Diagnosticos?.length || 0), 0);
      const totalMedicamentos = medicamentosActivos.length;

      // Generar HTML del expediente médico
      logger.info('Generando HTML del expediente médico', { pacienteId });

      const html = this.generateExpedienteHTML(
        paciente,
        citas,
        signosVitalesContinuo,
        medicamentosActivos,
        redApoyo,
        esquemaVacunacion,
        totalCitas,
        totalSignosVitales,
        totalDiagnosticos,
        totalMedicamentos
      );

      logger.info('Expediente completo HTML generado exitosamente', { 
        pacienteId, 
        htmlLength: html.length
      });

      return html;

      // Validar que el PDF tenga un tamaño mínimo razonable
      if (pdfBuffer.length < 100) {
        logger.error('PDF generado es demasiado pequeño (posiblemente vacío)', {
          pacienteId,
          size: pdfBuffer.length
        });
        throw new Error('El PDF generado está vacío o es inválido');
      }

      // Validar que el PDF tenga el header correcto
      const pdfHeader = pdfBuffer.slice(0, 4).toString('ascii');
      if (!pdfHeader.startsWith('%PDF')) {
        logger.error('PDF generado no tiene el header correcto', {
          pacienteId,
          size: pdfBuffer.length,
          header: pdfHeader
        });
        throw new Error('El PDF generado no es válido');
      }

      logger.info('Expediente completo PDF generado exitosamente con Puppeteer', { 
        pacienteId, 
        size: pdfBuffer.length,
        header: pdfHeader
      });

      return pdfBuffer;
    } catch (error) {
      logger.error('Error generando expediente completo PDF:', error);
      throw error;
    }
  }

  /**
   * Generar HTML del reporte de estadísticas (Admin o Doctor)
   * Para convertir a PDF en el cliente con react-native-html-to-pdf
   * @param {string} rol - 'admin' | 'doctor'
   * @param {Object} options - { idDoctor?: number } (requerido si rol === 'doctor')
   * @returns {Promise<string>} HTML completo
   */
  async generateReporteEstadisticasHTML(rol, options = {}) {
    const escapeHtml = (text) => {
      if (text === null || text === undefined) return '';
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const dashboardService = new DashboardService();
    const dashboardRepository = new DashboardRepository();
    const fechaGen = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

    if (rol === 'doctor') {
      const doctorId = options.idDoctor;
      if (!doctorId) throw new Error('idDoctor es requerido para reporte de doctor');
      const reportFilters = dashboardRepository.parseReportFilters({
        fechaInicio: options.fechaInicio,
        fechaFin: options.fechaFin,
      });
      const filteredDoctor = await dashboardRepository.getDoctorEstadisticasParaReporte(doctorId, {
        fechaInicio: options.fechaInicio,
        fechaFin: options.fechaFin,
      });
      const summary = await dashboardService.getDoctorSummary(doctorId);
      const metrics = summary?.metrics || {};
      const chartData = summary?.chartData || {};
      const comorbilidades = chartData.comorbilidadesMasFrecuentes || chartData.comorbilidadesPorPeriodo?.datos || [];

      const citas7Source = reportFilters.dateRange
        ? filteredDoctor.citasUltimos7Dias
        : chartData.citasUltimos7Dias || [];
      const citas7 = citas7Source.map((d) => ({ label: d.dia || d.fecha || '', value: d.citas ?? 0 }));
      const filtrosHtml = filteredDoctor.filtersLabel
        ? `<p><strong>Filtros aplicados:</strong> ${escapeHtml(filteredDoctor.filtersLabel)}</p>`
        : '';
      const citas7Title = filteredDoctor.citasChartTitle || 'Citas últimos 7 días';
      const comorbList = (Array.isArray(comorbilidades) ? comorbilidades : []).slice(0, 10).map(c => ({
        label: c.nombre || c.nombre_comorbilidad || '-',
        value: c.frecuencia ?? c.pacientes_afectados ?? 0
      }));
      const citas7Rows = citas7.map(d => `
        <tr><td>${escapeHtml(d.label)}</td><td>${d.value}</td></tr>`).join('');
      const comorbRows = comorbList.map(c => `
        <tr><td>${escapeHtml(c.label)}</td><td>${c.value}</td></tr>`).join('');

      const svgCitas7 = svgBarChart(citas7, { width: CHART_WIDTH, height: CHART_HEIGHT });
      const svgComorb = svgHorizontalBarChart(comorbList, { width: CHART_WIDTH, height: Math.max(CHART_HEIGHT, comorbList.length * 28) });

      const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><title>Reporte Estadísticas - Doctor</title>
<style>body{font-family:Arial,sans-serif;font-size:12px;padding:20px;color:#333;} h1{color:#1976D2;} h2{color:#1976D2;font-size:16px;margin-top:24px;} table{width:100%;border-collapse:collapse;margin-top:8px;} th,td{border:1px solid #ddd;padding:8px;} th{background:#1976D2;color:#fff;} .metric{display:inline-block;margin:8px 16px 8px 0;} .metric strong{font-size:18px;} .chart-wrap{margin:12px 0;}</style>
</head>
<body>
<h1>Reporte de Estadísticas - Doctor</h1>
<p>Fecha de generación: ${fechaGen}</p>
${filtrosHtml}
<h2>Resumen</h2>
<p><span class="metric">Pacientes asignados: <strong>${metrics.pacientesAsignados ?? 0}</strong></span>
<span class="metric">Citas hoy: <strong>${metrics.citasHoy ?? 0}</strong></span>
<span class="metric">Próximas citas: <strong>${metrics.proximasCitas ?? 0}</strong></span>
${reportFilters.dateRange ? `<span class="metric">Citas en el periodo: <strong>${filteredDoctor.totalCitasScope ?? 0}</strong></span>` : ''}</p>
<h2>${escapeHtml(citas7Title)}</h2>
<div class="chart-wrap">${svgCitas7 || '<p>Sin datos para graficar</p>'}</div>
<table><thead><tr><th>Día</th><th>Citas</th></tr></thead><tbody>${citas7Rows || '<tr><td colspan="2">Sin datos</td></tr>'}</tbody></table>
<h2>Comorbilidades más frecuentes</h2>
<div class="chart-wrap">${svgComorb || '<p>Sin datos para graficar</p>'}</div>
<table><thead><tr><th>Comorbilidad</th><th>Frecuencia</th></tr></thead><tbody>${comorbRows || '<tr><td colspan="2">Sin datos</td></tr>'}</tbody></table>
<footer style="margin-top:32px;font-size:10px;color:#666;">Generado por CuidateAPP - Reporte Doctor</footer>
</body>
</html>`;
      return html;
    }

    // Admin (respeta filtros modulo / fechaInicio / fechaFin)
    const reportData = await dashboardRepository.getAdminEstadisticasParaReporte({
      modulo: options.modulo,
      fechaInicio: options.fechaInicio,
      fechaFin: options.fechaFin,
    });
    const metrics = reportData.metrics || {};
    const chartData = reportData.chartData || {};
    const charts = reportData.charts || {};
    const citasPorEstado = charts.citasPorEstado || {};
    const doctoresActivos = charts.doctoresActivos || [];
    const comorbilidades = reportData.comorbilidades || [];

    const filtrosHtml = reportData.filtersLabel
      ? `<p><strong>Filtros aplicados:</strong> ${escapeHtml(reportData.filtersLabel)}</p>`
      : '';
    const citas7Title = reportData.citasChartTitle || 'Citas últimos 7 días';
    const pacientes7Title = reportData.pacientesChartTitle || 'Pacientes nuevos últimos 7 días';

    const citas7 = (chartData.citasUltimos7Dias || []).map((d) => ({ label: d.dia || d.fecha || '', value: d.citas ?? 0 }));
    const pacientes7 = (chartData.pacientesNuevos || []).map((d) => ({ label: d.dia || d.fecha || '', value: d.pacientes ?? 0 }));
    const estadoPie = Object.entries(citasPorEstado).map(([name, value]) => ({ name, value: Number(value) || 0 })).filter(d => d.value > 0);
    const doctoresBars = doctoresActivos.map(d => ({ label: (d.nombre || '').slice(0, 18), value: d.total_citas ?? 0 }));
    const comorbList = (Array.isArray(comorbilidades) ? comorbilidades : []).slice(0, 10).map(c => ({
      label: (c.nombre_comorbilidad || c.nombre || '-').slice(0, 18),
      value: c.pacientes_afectados ?? c.frecuencia ?? 0
    }));

    const citas7Rows = citas7.map(d => `<tr><td>${escapeHtml(d.label)}</td><td>${d.value}</td></tr>`).join('');
    const pacientes7Rows = pacientes7.map(d => `<tr><td>${escapeHtml(d.label)}</td><td>${d.value}</td></tr>`).join('');
    const estadoRows = Object.entries(citasPorEstado).map(([estado, count]) => `<tr><td>${escapeHtml(estado)}</td><td>${count}</td></tr>`).join('');
    const doctoresRows = doctoresActivos.map(d => `<tr><td>${escapeHtml(d.nombre)}</td><td>${d.total_citas ?? 0}</td></tr>`).join('');
    const comorbRows = (Array.isArray(comorbilidades) ? comorbilidades : []).slice(0, 10).map(c => `
        <tr><td>${escapeHtml(c.nombre_comorbilidad || c.nombre || '-')}</td><td>${c.pacientes_afectados ?? c.frecuencia ?? 0}</td><td>${c.porcentaje ?? ''}%</td></tr>`).join('');

    const svgCitas7 = svgBarChart(citas7, { width: CHART_WIDTH, height: CHART_HEIGHT });
    const svgPacientes7 = svgBarChart(pacientes7, { width: CHART_WIDTH, height: CHART_HEIGHT, barColor: '#2E7D32' });
    const svgCitasEstado = svgPieChart(estadoPie, { width: 320, height: 220 });
    const svgDoctores = svgHorizontalBarChart(doctoresBars, { width: CHART_WIDTH, height: Math.max(CHART_HEIGHT, doctoresBars.length * 28) });
    const svgComorb = svgHorizontalBarChart(comorbList, { width: CHART_WIDTH, height: Math.max(CHART_HEIGHT, comorbList.length * 28) });

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><title>Reporte Estadísticas - Administrador</title>
<style>body{font-family:Arial,sans-serif;font-size:12px;padding:20px;color:#333;} h1{color:#1976D2;} h2{color:#1976D2;font-size:16px;margin-top:24px;} table{width:100%;border-collapse:collapse;margin-top:8px;} th,td{border:1px solid #ddd;padding:8px;} th{background:#1976D2;color:#fff;} .metric{display:inline-block;margin:8px 16px 8px 0;} .metric strong{font-size:18px;} .chart-wrap{margin:12px 0;}</style>
</head>
<body>
<h1>Reporte de Estadísticas - Administrador</h1>
<p>Fecha de generación: ${fechaGen}</p>
${filtrosHtml}
<h2>Resumen general</h2>
<p><span class="metric">Pacientes totales: <strong>${metrics.totalPacientes ?? 0}</strong></span>
<span class="metric">Doctores activos: <strong>${metrics.totalDoctores ?? 0}</strong></span>
<span class="metric">Citas en el alcance del reporte: <strong>${metrics.citasEnScope ?? 0}</strong></span>
<span class="metric">Tasa asistencia: <strong>${metrics.tasaAsistencia ?? 0}%</strong></span></p>
<h2>${escapeHtml(citas7Title)}</h2>
<div class="chart-wrap">${svgCitas7 || '<p>Sin datos para graficar</p>'}</div>
<table><thead><tr><th>Día</th><th>Citas</th></tr></thead><tbody>${citas7Rows || '<tr><td colspan="2">Sin datos</td></tr>'}</tbody></table>
<h2>${escapeHtml(pacientes7Title)}</h2>
<div class="chart-wrap">${svgPacientes7 || '<p>Sin datos para graficar</p>'}</div>
<table><thead><tr><th>Día</th><th>Pacientes</th></tr></thead><tbody>${pacientes7Rows || '<tr><td colspan="2">Sin datos</td></tr>'}</tbody></table>
<h2>Citas por estado</h2>
<div class="chart-wrap">${svgCitasEstado || '<p>Sin datos para graficar</p>'}</div>
<table><thead><tr><th>Estado</th><th>Cantidad</th></tr></thead><tbody>${estadoRows || '<tr><td colspan="2">Sin datos</td></tr>'}</tbody></table>
<h2>Top doctores más activos</h2>
<div class="chart-wrap">${svgDoctores || '<p>Sin datos para graficar</p>'}</div>
<table><thead><tr><th>Doctor</th><th>Citas</th></tr></thead><tbody>${doctoresRows || '<tr><td colspan="2">Sin datos</td></tr>'}</tbody></table>
<h2>Comorbilidades más frecuentes</h2>
<div class="chart-wrap">${svgComorb || '<p>Sin datos para graficar</p>'}</div>
<table><thead><tr><th>Comorbilidad</th><th>Pacientes</th><th>%</th></tr></thead><tbody>${comorbRows || '<tr><td colspan="3">Sin datos</td></tr>'}</tbody></table>
<footer style="margin-top:32px;font-size:10px;color:#666;">Generado por CuidateAPP - Reporte Administrador</footer>
</body>
</html>`;
    return html;
  }

  _resolveFormaDateRangeFromMesAnioDia(mes, anio, dia = null) {
    const ultimoDia = new Date(anio, mes, 0).getDate();
    const hasDia = Number.isInteger(dia) && dia >= 1 && dia <= ultimoDia;
    const inicioMesStr = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const finMesStr = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;
    const inicioRangoStr = hasDia
      ? `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
      : inicioMesStr;
    const finRangoStr = hasDia ? inicioRangoStr : finMesStr;
    return { inicioRangoStr, finRangoStr, hasDia };
  }

  /**
   * Rango de fechas y texto de periodo para FORMA (mes/día o rango explícito).
   * @param {{ mes?: number, anio?: number, dia?: number|null, fechaInicio?: string, fechaFin?: string }} params
   */
  _resolveFormaListaDateRange(params) {
    const { mes, anio, dia, fechaInicio, fechaFin } = params;
    const fiIn = fechaInicio != null && String(fechaInicio).trim() !== '' ? String(fechaInicio).trim() : '';
    const ffIn = fechaFin != null && String(fechaFin).trim() !== '' ? String(fechaFin).trim() : '';
    const iso = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);

    if (fiIn || ffIn) {
      if (!fiIn || !ffIn) {
        throw new Error('Para filtrar por rango debes enviar fechaInicio y fechaFin (YYYY-MM-DD)');
      }
      if (!iso(fiIn) || !iso(ffIn)) {
        throw new Error('fechaInicio y fechaFin deben tener formato YYYY-MM-DD');
      }
      if (fiIn > ffIn) {
        throw new Error('fechaInicio no puede ser posterior a fechaFin');
      }
      const d0 = new Date(`${fiIn}T12:00:00`);
      const d1 = new Date(`${ffIn}T12:00:00`);
      const maxMs = 370 * 24 * 60 * 60 * 1000;
      if (d1 - d0 > maxMs) {
        throw new Error('El rango máximo permitido es de 370 días');
      }
      const mesRef = d0.getMonth() + 1;
      const anioRef = d0.getFullYear();
      return {
        inicioRangoStr: fiIn,
        finRangoStr: ffIn,
        cabeceraMeta: {
          mes: mesRef,
          anio: anioRef,
          mesNombre: `${fiIn} a ${ffIn}`,
        },
      };
    }

    const m = Number(mes);
    const y = Number(anio);
    if (!Number.isInteger(m) || m < 1 || m > 12) {
      throw new Error('Parámetro mes requerido (1-12), o bien fechaInicio y fechaFin');
    }
    if (!Number.isInteger(y) || y < 2000 || y > 2100) {
      throw new Error('Parámetro anio requerido (2000-2100), o bien fechaInicio y fechaFin');
    }
    const ultimoDia = new Date(y, m, 0).getDate();
    let d = dia != null && dia !== '' ? Number(dia) : null;
    if (d != null && (!Number.isInteger(d) || d < 1 || d > ultimoDia)) {
      throw new Error(`Parámetro dia inválido para ${m}/${y}`);
    }
    const { inicioRangoStr, finRangoStr, hasDia } = this._resolveFormaDateRangeFromMesAnioDia(m, y, d);
    const mesNombre = hasDia ? `${d} de ${MESES_NOMBRE[m]} ${y}` : (MESES_NOMBRE[m] || '');
    return {
      inicioRangoStr,
      finRangoStr,
      cabeceraMeta: { mes: m, anio: y, mesNombre },
    };
  }

  _buildFormaCabeceraFromPatientPlain(p, mes, anio, mesNombreOverride = null) {
    const estadoVal = p && p.estado != null && p.estado !== '' ? String(p.estado).trim() : '';
    const localidadVal = p && p.localidad != null && p.localidad !== '' ? String(p.localidad).trim() : '';
    const institucionVal = p && p.institucion_salud != null && p.institucion_salud !== '' ? String(p.institucion_salud).trim() : '';
    const nombreModulo = p?.Modulo?.nombre_modulo ? String(p.Modulo.nombre_modulo).trim() : '';
    const primerDoctor = Array.isArray(p?.Doctors) && p.Doctors.length > 0 ? p.Doctors[0] : null;
    const institucionDoctor = primerDoctor?.institucion_hospitalaria != null && primerDoctor.institucion_hospitalaria !== ''
      ? String(primerDoctor.institucion_hospitalaria).trim()
      : '';
    const mesNombre = mesNombreOverride != null && String(mesNombreOverride).trim() !== ''
      ? String(mesNombreOverride).trim()
      : (MESES_NOMBRE[mes] || '');
    return {
      institucion: (institucionVal && String(institucionVal).trim()) ? String(institucionVal).trim() : (institucionDoctor || process.env.FORMA_INSTITUCION || 'Institución'),
      entidad: (estadoVal && String(estadoVal).trim()) ? String(estadoVal).trim() : (process.env.FORMA_ENTIDAD || 'Entidad Federativa'),
      jurisdiccion: (estadoVal && String(estadoVal).trim()) ? String(estadoVal).trim() : (process.env.FORMA_JURISDICCION || process.env.FORMA_ENTIDAD || 'Jurisdicción'),
      municipio: (localidadVal && String(localidadVal).trim()) ? String(localidadVal).trim() : (process.env.FORMA_MUNICIPIO || 'Municipio'),
      unidadMedica: (institucionVal && String(institucionVal).trim()) ? String(institucionVal).trim() : (institucionDoctor || process.env.FORMA_UNIDAD_MEDICA || 'Unidad Médica'),
      clues: process.env.FORMA_CLUES || '',
      nombreGAM: (nombreModulo && String(nombreModulo).trim()) ? String(nombreModulo).trim() : (process.env.FORMA_NOMBRE_GAM || 'Nombre del Grupo de Ayuda Mutua EC'),
      etapa: process.env.FORMA_ETAPA || 'Etapa',
      mes,
      anio,
      mesNombre,
      coordinador: process.env.FORMA_COORDINADOR || 'Nombre Coordinador del GAM EC',
    };
  }

  _defaultFormaCabecera(cabeceraMeta) {
    const { mes, anio, mesNombre } = cabeceraMeta;
    return {
      institucion: process.env.FORMA_INSTITUCION || 'Institución',
      entidad: process.env.FORMA_ENTIDAD || 'Entidad Federativa',
      jurisdiccion: process.env.FORMA_JURISDICCION || process.env.FORMA_ENTIDAD || 'Jurisdicción',
      municipio: process.env.FORMA_MUNICIPIO || 'Municipio',
      unidadMedica: process.env.FORMA_UNIDAD_MEDICA || 'Unidad Médica',
      clues: process.env.FORMA_CLUES || '',
      nombreGAM: process.env.FORMA_NOMBRE_GAM || 'Nombre del Grupo de Ayuda Mutua EC',
      etapa: process.env.FORMA_ETAPA || 'Etapa',
      mes,
      anio,
      mesNombre: mesNombre || MESES_NOMBRE[mes] || '',
      coordinador: process.env.FORMA_COORDINADOR || 'Nombre Coordinador del GAM EC',
    };
  }

  async _fetchFormaMetricsForPaciente(idPaciente, inicioRangoStr, finRangoStr) {
    const [signosVitales, deteccionesComplicaciones, saludBucal, deteccionesTb, sesionesEducativas, planesMedicacion] = await Promise.all([
      SignoVital.findAll({
        where: { id_paciente: idPaciente, fecha_medicion: { [Op.between]: [inicioRangoStr, finRangoStr] } },
        order: [['fecha_medicion', 'DESC']],
        limit: 1,
        attributes: ['id_paciente', 'peso_kg', 'talla_m', 'imc', 'presion_sistolica', 'presion_diastolica', 'glucosa_mg_dl', 'colesterol_mg_dl', 'trigliceridos_mg_dl', 'fecha_medicion'],
      }),
      DeteccionComplicacion.findAll({
        where: { id_paciente: idPaciente, fecha_deteccion: { [Op.between]: [inicioRangoStr, finRangoStr] } },
        attributes: ['id_paciente'],
      }),
      SaludBucal.findAll({
        where: { id_paciente: idPaciente, fecha_registro: { [Op.between]: [inicioRangoStr, finRangoStr] } },
        order: [['fecha_registro', 'DESC']],
        attributes: ['id_paciente', 'fecha_registro'],
      }),
      DeteccionTuberculosis.findAll({
        where: { id_paciente: idPaciente, fecha_deteccion: { [Op.between]: [inicioRangoStr, finRangoStr] } },
        order: [['fecha_deteccion', 'DESC']],
        attributes: ['id_paciente', 'fecha_deteccion', 'baciloscopia_resultado'],
      }),
      SesionEducativa.findAll({
        where: { id_paciente: idPaciente, fecha_sesion: { [Op.between]: [inicioRangoStr, finRangoStr] } },
        attributes: ['id_paciente', 'tipo_sesion'],
      }),
      PlanMedicacion.findAll({
        where: { id_paciente: idPaciente, activo: true },
        limit: 1,
        attributes: ['id_paciente'],
      }),
    ]);

    const signo = signosVitales[0] || null;
    const detecciones = deteccionesComplicaciones || [];
    const tieneSaludBucal = saludBucal.length > 0;
    const tieneTb = deteccionesTb.length > 0;
    const sesiones = sesionesEducativas || [];
    const tiposSesion = new Set(sesiones.map((s) => (s.tipo_sesion || '').toLowerCase()));
    const tienePlanMedicacion = planesMedicacion.length > 0;
    return { signo, detecciones, tieneSaludBucal, tieneTb, tiposSesion, tienePlanMedicacion };
  }

  _buildFormaFilaFromPacienteAndMetrics(paciente, metrics) {
    const { signo, detecciones, tieneSaludBucal, tieneTb, tiposSesion, tienePlanMedicacion } = metrics;
    const p = paciente;
    const fechaNac = p.fecha_nacimiento ? new Date(p.fecha_nacimiento) : null;
    const edad = fechaNac ? Math.floor((new Date() - fechaNac) / (365.25 * 24 * 60 * 60 * 1000)) : '';
    const sexo = p.sexo === 'Mujer' ? 'F' : p.sexo === 'Hombre' ? 'M' : '';
    const nombreCompleto = formatNombreCompleto(p);
    const toNumSigno = (val) => {
      const d = decryptForReport(val);
      return (d !== '' && d != null && !Number.isNaN(Number(d))) ? Number(d) : '';
    };

    return {
      nombre: nombreCompleto,
      edad,
      sexo,
      recibeTratamiento: tienePlanMedicacion ? 1 : '',
      saludBucal: tieneSaludBucal ? 1 : '',
      tuberculosis: tieneTb ? 1 : '',
      basal: (p.Comorbilidades && p.Comorbilidades.length) ? 1 : '',
      anoDx: '',
      dxAgregados: '',
      noFarmacologico: tiposSesion.has('nutricional') ? 1 : '',
      farmacologico: tienePlanMedicacion ? 1 : '',
      nutricional: tiposSesion.has('nutricional') ? 1 : '',
      actividadFisica: tiposSesion.has('actividad_fisica') ? 1 : '',
      medicoPreventiva: tiposSesion.has('medico_preventiva') || detecciones.length > 0 ? 1 : '',
      psicologica: tiposSesion.has('psicologica') ? 1 : '',
      odontologica: tiposSesion.has('odontologica') || tieneSaludBucal ? 1 : '',
      talla: signo && signo.talla_m != null ? Number(signo.talla_m) : '',
      imc: signo && signo.imc != null ? Number(signo.imc) : '',
      colesterol: signo ? toNumSigno(signo.colesterol_mg_dl) : '',
      trigliceridos: signo ? toNumSigno(signo.trigliceridos_mg_dl) : '',
      glucosa: signo ? toNumSigno(signo.glucosa_mg_dl) : '',
      presionSistolica: signo ? toNumSigno(signo.presion_sistolica) : '',
      presionDiastolica: signo ? toNumSigno(signo.presion_diastolica) : '',
      microalbuminuria: '',
      fondoOjo: '',
    };
  }

  async _loadPacienteFormaIncludes(idPaciente) {
    return Paciente.findByPk(idPaciente, {
      include: [
        { model: Modulo, attributes: ['id_modulo', 'nombre_modulo'], required: false },
        { model: Doctor, as: 'Doctors', attributes: ['id_doctor', 'institucion_hospitalaria', 'id_modulo'], through: { attributes: [] }, required: false },
        {
          model: Comorbilidad,
          as: 'Comorbilidades',
          through: { attributes: ['fecha_deteccion', 'anos_padecimiento'] },
          attributes: ['id_comorbilidad', 'nombre_comorbilidad'],
          required: false,
        },
      ],
    });
  }

  /**
   * Datos para el FORMA (Formato de Registro Mensual de Actividades GAM - SIC).
   * GET /api/reportes/forma/:idPaciente?mes=8&anio=2025
   * Solo para un paciente en la fecha seleccionada. Uso exclusivo en app web.
   * @param {number} idPaciente - ID del paciente
   * @param {number} mes - Mes (1-12)
   * @param {number} anio - Año (ej. 2025)
   * @returns {Promise<{ cabecera: object, filas: object[] }>}
   */
  async getFormaData(idPaciente, mes, anio, dia = null) {
    try {
      const paciente = await this._loadPacienteFormaIncludes(idPaciente);
      const p = paciente && typeof paciente.get === 'function' ? paciente.get({ plain: true }) : paciente;
      const cabecera = this._buildFormaCabeceraFromPatientPlain(p, mes, anio, null);

      logger.debug('FORMA cabecera (origen BD/env)', {
        idPaciente,
        cabecera: { institucion: cabecera.institucion, entidad: cabecera.entidad, municipio: cabecera.municipio, nombreGAM: cabecera.nombreGAM },
      });

      if (!paciente || !paciente.activo) {
        return { cabecera, filas: [] };
      }

      const ultimoDia = new Date(anio, mes, 0).getDate();
      const hasDia = Number.isInteger(dia) && dia >= 1 && dia <= ultimoDia;
      const { inicioRangoStr, finRangoStr } = this._resolveFormaDateRangeFromMesAnioDia(mes, anio, hasDia ? dia : null);

      const metrics = await this._fetchFormaMetricsForPaciente(idPaciente, inicioRangoStr, finRangoStr);
      const filaBase = this._buildFormaFilaFromPacienteAndMetrics(paciente, metrics);
      const filas = [{ n: 1, ...filaBase }];

      return { cabecera, filas };
    } catch (error) {
      logger.error('Error getFormaData', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * FORMA para todos los pacientes visibles (Admin: activos; Doctor: asignados), en un periodo.
   * GET /api/reportes/forma-lista
   * @param {{ user: object, mes?: number, anio?: number, dia?: number|null, fechaInicio?: string, fechaFin?: string, modulo?: number|null }} opts
   */
  async getFormaListaPacientes(opts) {
    const { user, mes, anio, dia, fechaInicio, fechaFin, modulo } = opts;
    const rol = String(user?.rol || user?.user_type || '').toLowerCase();
    const isAdmin = rol === 'admin' || rol === 'administrador';
    const isDoctor = rol === 'doctor';
    if (!isAdmin && !isDoctor) {
      throw new Error('Solo Admin o Doctor pueden exportar el FORMA');
    }

    const { inicioRangoStr, finRangoStr, cabeceraMeta } = this._resolveFormaListaDateRange({
      mes, anio, dia, fechaInicio, fechaFin,
    });

    let idModulo = null;
    if (modulo != null && modulo !== '') {
      const m = Number(modulo);
      if (Number.isInteger(m) && m > 0) {
        if (!isAdmin) {
          throw new Error('Solo el administrador puede filtrar por módulo');
        }
        idModulo = m;
      }
    }

    let ids = [];
    let truncado = false;
    if (isAdmin) {
      const where = { activo: true };
      if (idModulo) where.id_modulo = idModulo;
      const total = await Paciente.count({ where });
      truncado = total > FORMA_LISTA_MAX_PACIENTES;
      const rows = await Paciente.findAll({
        where,
        attributes: ['id_paciente'],
        order: [['id_paciente', 'ASC']],
        limit: FORMA_LISTA_MAX_PACIENTES,
      });
      ids = rows.map((r) => r.id_paciente);
    } else {
      const idDoctor = user?.id_doctor || user?.id_doctor_usuario;
      if (!idDoctor) {
        throw new Error('Doctor no encontrado para este usuario');
      }
      const links = await DoctorPaciente.findAll({
        where: { id_doctor: idDoctor },
        attributes: ['id_paciente'],
      });
      const raw = [...new Set(links.map((l) => l.id_paciente))];
      if (raw.length === 0) {
        return { cabecera: this._defaultFormaCabecera(cabeceraMeta), filas: [], truncado: false };
      }
      const nActivos = await Paciente.count({
        where: { id_paciente: { [Op.in]: raw }, activo: true },
      });
      truncado = nActivos > FORMA_LISTA_MAX_PACIENTES;
      const activos = await Paciente.findAll({
        where: { id_paciente: { [Op.in]: raw }, activo: true },
        attributes: ['id_paciente'],
        order: [['id_paciente', 'ASC']],
        limit: FORMA_LISTA_MAX_PACIENTES,
      });
      ids = activos.map((r) => r.id_paciente);
    }

    let cabecera = null;
    const filas = [];
    for (const idPaciente of ids) {
      const paciente = await this._loadPacienteFormaIncludes(idPaciente);
      if (!paciente || !paciente.activo) continue;
      const pPlain = paciente.get({ plain: true });
      if (!cabecera) {
        cabecera = this._buildFormaCabeceraFromPatientPlain(
          pPlain,
          cabeceraMeta.mes,
          cabeceraMeta.anio,
          cabeceraMeta.mesNombre,
        );
      }
      const metrics = await this._fetchFormaMetricsForPaciente(idPaciente, inicioRangoStr, finRangoStr);
      const filaBase = this._buildFormaFilaFromPacienteAndMetrics(paciente, metrics);
      filas.push({ n: filas.length + 1, ...filaBase });
    }

    if (!cabecera) {
      cabecera = this._defaultFormaCabecera(cabeceraMeta);
    }

    return { cabecera, filas, truncado };
  }

  /**
   * Periodos (mes/año) con registros del paciente para FORMA. Solo web.
   * GET /api/reportes/forma/:idPaciente/meses-disponibles
   */
  async getFormaMesesDisponibles(idPaciente) {
    try {
      const where = { id_paciente: idPaciente };
      const [signos, citas, detecciones, saludBucal, tb, sesiones] = await Promise.all([
        SignoVital.findAll({
          where,
          attributes: [[sequelize.fn('YEAR', sequelize.col('fecha_medicion')), 'anio'], [sequelize.fn('MONTH', sequelize.col('fecha_medicion')), 'mes']],
          raw: true
        }),
        Cita.findAll({
          where,
          attributes: [[sequelize.fn('YEAR', sequelize.col('fecha_cita')), 'anio'], [sequelize.fn('MONTH', sequelize.col('fecha_cita')), 'mes']],
          raw: true
        }),
        DeteccionComplicacion.findAll({
          where,
          attributes: [[sequelize.fn('YEAR', sequelize.col('fecha_deteccion')), 'anio'], [sequelize.fn('MONTH', sequelize.col('fecha_deteccion')), 'mes']],
          raw: true
        }),
        SaludBucal.findAll({
          where,
          attributes: [[sequelize.fn('YEAR', sequelize.col('fecha_registro')), 'anio'], [sequelize.fn('MONTH', sequelize.col('fecha_registro')), 'mes']],
          raw: true
        }),
        DeteccionTuberculosis.findAll({
          where,
          attributes: [[sequelize.fn('YEAR', sequelize.col('fecha_deteccion')), 'anio'], [sequelize.fn('MONTH', sequelize.col('fecha_deteccion')), 'mes']],
          raw: true
        }),
        SesionEducativa.findAll({
          where,
          attributes: [[sequelize.fn('YEAR', sequelize.col('fecha_sesion')), 'anio'], [sequelize.fn('MONTH', sequelize.col('fecha_sesion')), 'mes']],
          raw: true
        })
      ]);

      const set = new Set();
      [...signos, ...citas, ...detecciones, ...saludBucal, ...tb, ...sesiones].forEach((row) => {
        const anio = row.anio != null ? Number(row.anio) : null;
        const mes = row.mes != null ? Number(row.mes) : null;
        if (anio != null && mes != null && mes >= 1 && mes <= 12) set.add(`${anio}-${String(mes).padStart(2, '0')}`);
      });

      const periodos = Array.from(set)
        .sort((a, b) => b.localeCompare(a))
        .map((key) => {
          const [anioStr, mesStr] = key.split('-');
          const anio = parseInt(anioStr, 10);
          const mes = parseInt(mesStr, 10);
          return {
            mes,
            anio,
            value: key,
            label: `${MESES_NOMBRE[mes]} ${anio}`
          };
        });

      return { periodos };
    } catch (error) {
      logger.error('Error getFormaMesesDisponibles', { error: error.message, stack: error.stack });
      throw error;
    }
  }

}

export default new ReportService();
