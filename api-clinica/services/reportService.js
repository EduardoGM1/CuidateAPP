/**
 * Servicio de Reportes
 * 
 * Genera reportes en formato PDF y CSV
 */

import { Op } from 'sequelize';
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
  PacienteComorbilidad
} from '../models/associations.js';
import logger from '../utils/logger.js';

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
        signo.presion_sistolica || '',
        signo.presion_diastolica || '',
        signo.glucosa_mg_dl || '',
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
        cita.motivo || '',
        cita.Doctor ? `${cita.Doctor.nombre} ${cita.Doctor.apellido_paterno || ''}` : '',
        cita.observaciones || ''
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
        diagnostico.descripcion || '',
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
  <title>Expediente Médico - ${escapeHtml(paciente.nombre)} ${escapeHtml(paciente.apellido_paterno || '')}</title>
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

  ${citas.length > 0 ? `
    <h2>Historial de Consultas</h2>
    ${citas.map((cita, index) => `
      <h3>Consulta ${citas.length - index}</h3>
      
      <p><strong>Fecha:</strong> ${formatDate(cita.fecha_cita)}</p>
      <p><strong>Estado:</strong> ${escapeHtml(cita.estado || 'N/A')}</p>
      ${cita.Doctor ? `<p><strong>Doctor:</strong> Dr. ${escapeHtml(cita.Doctor.nombre)} ${escapeHtml(cita.Doctor.apellido_paterno || '')} ${escapeHtml(cita.Doctor.apellido_materno || '')}</p>` : ''}
      ${cita.motivo ? `<p><strong>Motivo:</strong> ${escapeHtml(cita.motivo)}</p>` : ''}
      ${cita.observaciones ? `<p><strong>Observaciones:</strong> ${escapeHtml(cita.observaciones)}</p>` : ''}
      
      ${cita.SignosVitales && cita.SignosVitales.length > 0 ? `
        <table border="1">
          <tr><th>Signo Vital</th><th>Valor</th></tr>
          ${cita.SignosVitales.map(signo => {
            let rows = '';
            if (signo.peso_kg) rows += `<tr><td>Peso</td><td>${signo.peso_kg} kg</td></tr>`;
            if (signo.talla_m) rows += `<tr><td>Talla</td><td>${signo.talla_m} m</td></tr>`;
            if (signo.peso_kg && signo.talla_m) {
              const imc = (signo.peso_kg / (signo.talla_m * signo.talla_m)).toFixed(1);
              rows += `<tr><td>IMC</td><td>${imc}</td></tr>`;
            }
            if (signo.presion_sistolica && signo.presion_diastolica) {
              rows += `<tr><td>Presión arterial</td><td>${signo.presion_sistolica}/${signo.presion_diastolica} mmHg</td></tr>`;
            }
            if (signo.glucosa_mg_dl) rows += `<tr><td>Glucosa</td><td>${signo.glucosa_mg_dl} mg/dL</td></tr>`;
            if (signo.colesterol_mg_dl) rows += `<tr><td>Colesterol</td><td>${signo.colesterol_mg_dl} mg/dL</td></tr>`;
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
          const doctorStr = plan.Doctor ? ` | Prescrito por Dr. ${escapeHtml(plan.Doctor.nombre)} ${escapeHtml(plan.Doctor.apellido_paterno || '')}` : '';
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
        const fechaMedicion = formatDateShort(signo.fecha_medicion);
        const peso = signo.peso_kg ? `${signo.peso_kg} kg` : '-';
        const talla = signo.talla_m ? `${signo.talla_m} m` : '-';
        const imc = (signo.peso_kg && signo.talla_m) 
          ? (signo.peso_kg / (signo.talla_m * signo.talla_m)).toFixed(1) 
          : '-';
        const presion = (signo.presion_sistolica && signo.presion_diastolica) 
          ? `${signo.presion_sistolica}/${signo.presion_diastolica}` 
          : '-';
        const glucosa = signo.glucosa_mg_dl ? `${signo.glucosa_mg_dl} mg/dL` : '-';
        const colesterol = signo.colesterol_mg_dl ? `${signo.colesterol_mg_dl} mg/dL` : '-';
        const trigliceridos = signo.trigliceridos_mg_dl ? `${signo.trigliceridos_mg_dl} mg/dL` : '-';
        
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

}

export default new ReportService();
