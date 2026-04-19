/**
 * Controlador de Reportes
 */

import reportService from '../services/reportService.js';
import { authenticateToken, authorizeRoles } from '../middlewares/auth.js';
import logger from '../utils/logger.js';

/**
 * Generar reporte CSV de signos vitales
 * GET /api/reportes/signos-vitales/:idPaciente/csv
 */
export const getSignosVitalesCSV = async (req, res) => {
  try {
    const { idPaciente } = req.params;
    const { fechaInicio, fechaFin } = req.query;
    
    const csv = await reportService.generateSignosVitalesCSV(
      parseInt(idPaciente),
      fechaInicio,
      fechaFin
    );
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=signos-vitales-${idPaciente}.csv`);
    res.send(csv);
  } catch (error) {
    logger.error('Error generando CSV de signos vitales:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Generar reporte CSV de citas
 * GET /api/reportes/citas/:idPaciente/csv
 */
export const getCitasCSV = async (req, res) => {
  try {
    const { idPaciente } = req.params;
    const { fechaInicio, fechaFin } = req.query;
    
    const csv = await reportService.generateCitasCSV(
      parseInt(idPaciente),
      fechaInicio,
      fechaFin
    );
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=citas-${idPaciente}.csv`);
    res.send(csv);
  } catch (error) {
    logger.error('Error generando CSV de citas:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Generar reporte CSV de diagnósticos
 * GET /api/reportes/diagnosticos/:idPaciente/csv
 */
export const getDiagnosticosCSV = async (req, res) => {
  try {
    const { idPaciente } = req.params;
    const { fechaInicio, fechaFin } = req.query;
    
    const csv = await reportService.generateDiagnosticosCSV(
      parseInt(idPaciente),
      fechaInicio,
      fechaFin
    );
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=diagnosticos-${idPaciente}.csv`);
    res.send(csv);
  } catch (error) {
    logger.error('Error generando CSV de diagnósticos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Generar reporte PDF
 * GET /api/reportes/:tipo/:idPaciente/pdf
 */
export const getPDFReport = async (req, res) => {
  try {
    const { tipo, idPaciente } = req.params;
    const { fechaInicio, fechaFin } = req.query;
    
    const reporte = await reportService.generatePDFReport(
      parseInt(idPaciente),
      tipo,
      fechaInicio,
      fechaFin
    );
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename=reporte-${tipo}-${idPaciente}.txt`);
    res.send(reporte);
  } catch (error) {
    logger.error('Error generando reporte PDF:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Generar expediente médico completo en HTML
 * GET /api/reportes/expediente/:idPaciente/html
 */
export const getExpedienteCompletoHTML = async (req, res) => {
  try {
    const { idPaciente } = req.params;
    const { fechaInicio, fechaFin } = req.query;
    
    logger.info('Solicitud de expediente completo HTML', {
      idPaciente,
      fechaInicio,
      fechaFin,
      userId: req.user?.id_usuario
    });

    const html = await reportService.generateExpedienteCompletoHTML(
      parseInt(idPaciente),
      fechaInicio || null,
      fechaFin || null
    );
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename=expediente-medico-${idPaciente}-${new Date().toISOString().split('T')[0]}.html`);
    res.send(html);
    
    logger.info('Expediente completo HTML enviado exitosamente', {
      idPaciente,
      htmlLength: html.length
    });
  } catch (error) {
    const errorMessage = error?.message || 'Error desconocido al generar el expediente médico';
    const errorStack = error?.stack || '';
    
    logger.error('Error generando expediente completo HTML:', {
      message: errorMessage,
      stack: errorStack,
      idPaciente: req.params?.idPaciente
    });
    
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorStack : undefined
      });
    }
  }
};

/**
 * Generar expediente médico completo en PDF (DEPRECADO - usa HTML)
 * GET /api/reportes/expediente/:idPaciente/pdf
 * Mantenido para compatibilidad, pero ahora devuelve HTML
 */
export const getExpedienteCompletoPDF = async (req, res) => {
  // Redirigir a HTML
  return getExpedienteCompletoHTML(req, res);
};

/**
 * Generar reporte de estadísticas en HTML (Admin o Doctor)
 * GET /api/reportes/estadisticas/html
 * Para convertir a PDF en el cliente con react-native-html-to-pdf
 */
export const getReporteEstadisticasHTML = async (req, res) => {
  try {
    const rol = (req.user?.rol || req.user?.user_type || '').toLowerCase();
    const isAdmin = rol === 'admin' || rol === 'administrador';
    const isDoctor = rol === 'doctor';

    if (!isAdmin && !isDoctor) {
      return res.status(403).json({ success: false, error: 'Solo Admin o Doctor pueden generar el reporte de estadísticas' });
    }

    const reportRol = isAdmin ? 'admin' : 'doctor';
    const options = {};
    if (isDoctor) {
      const idDoctor = req.user?.id_doctor || req.user?.id_doctor_usuario;
      if (!idDoctor) {
        return res.status(400).json({ success: false, error: 'Doctor no encontrado para este usuario' });
      }
      options.idDoctor = idDoctor;
    }

    logger.info('Solicitud de reporte estadísticas HTML', {
      rol: reportRol,
      userId: req.user?.id_usuario,
      idDoctor: options.idDoctor
    });

    const html = await reportService.generateReporteEstadisticasHTML(reportRol, options);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename=reporte-estadisticas-${reportRol}-${new Date().toISOString().split('T')[0]}.html`);
    res.send(html);

    logger.info('Reporte estadísticas HTML enviado', { rol: reportRol, htmlLength: html.length });
  } catch (error) {
    logger.error('Error generando reporte estadísticas HTML:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

/**
 * Nota médica en HTML. Para imprimir/guardar como PDF.
 * GET /api/reportes/notas-medicas/:idPaciente/html
 */
export const getNotasMedicasHTML = async (req, res) => {
  try {
    const idPaciente = parseInt(req.params.idPaciente, 10);
    if (!Number.isInteger(idPaciente) || idPaciente <= 0) {
      return res.status(400).json({ success: false, error: 'ID de paciente inválido' });
    }
    const html = await reportService.generateNotasMedicasHTML(idPaciente);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename=notas-medicas-${idPaciente}-${new Date().toISOString().split('T')[0]}.html`);
    res.send(html);
  } catch (error) {
    logger.error('Error generando Notas Médicas HTML:', { message: error?.message, stack: error?.stack });
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error?.message || 'Error al generar Notas Médicas' });
    }
  }
};

/**
 * Periodos (mes/año) con registros del paciente para elegir en FORMA. Solo web.
 * GET /api/reportes/forma/:idPaciente/meses-disponibles
 */
export const getFormaMesesDisponibles = async (req, res) => {
  try {
    const idPaciente = parseInt(req.params.idPaciente, 10);
    if (!Number.isInteger(idPaciente) || idPaciente <= 0) {
      return res.status(400).json({ success: false, error: 'ID de paciente inválido' });
    }
    const data = await reportService.getFormaMesesDisponibles(idPaciente);
    res.json(data);
  } catch (error) {
    logger.error('Error getFormaMesesDisponibles:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

/**
 * FORMA Excel: todos los pacientes visibles (Admin: activos; Doctor: asignados) en el periodo.
 * GET /api/reportes/forma-lista?mes=4&anio=2026 | ?mes=4&anio=2026&dia=19 | ?fechaInicio=2026-04-01&fechaFin=2026-04-30
 * Query opcional (solo Admin): modulo=id_modulo
 */
export const getFormaListaPacientes = async (req, res) => {
  try {
    const rol = (req.user?.rol || req.user?.user_type || '').toLowerCase();
    const isAdmin = rol === 'admin' || rol === 'administrador';
    const fechaInicio = req.query.fechaInicio != null ? String(req.query.fechaInicio).trim() : '';
    const fechaFin = req.query.fechaFin != null ? String(req.query.fechaFin).trim() : '';
    const mes = req.query.mes != null && req.query.mes !== '' ? parseInt(req.query.mes, 10) : null;
    const anio = req.query.anio != null && req.query.anio !== '' ? parseInt(req.query.anio, 10) : null;
    const dia = req.query.dia != null && req.query.dia !== '' ? parseInt(req.query.dia, 10) : null;
    const moduloRaw = req.query.modulo;
    const modulo = isAdmin && moduloRaw != null && String(moduloRaw).trim() !== ''
      ? parseInt(String(moduloRaw), 10)
      : null;

    if ((fechaInicio && !fechaFin) || (!fechaInicio && fechaFin)) {
      return res.status(400).json({
        success: false,
        error: 'Para rango de fechas debes enviar fechaInicio y fechaFin (YYYY-MM-DD)',
      });
    }

    if (!fechaInicio && (!Number.isInteger(mes) || !Number.isInteger(anio))) {
      return res.status(400).json({
        success: false,
        error: 'Indica mes y año, o bien fechaInicio y fechaFin',
      });
    }

    if (Number.isInteger(mes) && Number.isInteger(anio) && dia != null) {
      const maxDia = new Date(anio, mes, 0).getDate();
      if (!Number.isInteger(dia) || dia < 1 || dia > maxDia) {
        return res.status(400).json({
          success: false,
          error: `Parámetro dia inválido para ${mes}/${anio}`,
        });
      }
    }

    if (modulo != null && (!Number.isInteger(modulo) || modulo <= 0)) {
      return res.status(400).json({ success: false, error: 'Parámetro modulo inválido' });
    }

    const data = await reportService.getFormaListaPacientes({
      user: req.user,
      mes,
      anio,
      dia: Number.isInteger(dia) ? dia : null,
      fechaInicio: fechaInicio || undefined,
      fechaFin: fechaFin || undefined,
      modulo: Number.isInteger(modulo) && modulo > 0 ? modulo : null,
    });

    const c = data.cabecera || {};
    res.json({
      truncado: !!data.truncado,
      cabecera: {
        institucion: c.institucion ?? '',
        entidad: c.entidad ?? '',
        jurisdiccion: c.jurisdiccion ?? '',
        municipio: c.municipio ?? '',
        unidadMedica: c.unidadMedica ?? '',
        nombreGAM: c.nombreGAM ?? '',
        etapa: c.etapa ?? '',
        mes: c.mes,
        anio: c.anio,
        mesNombre: c.mesNombre ?? '',
        coordinador: c.coordinador ?? '',
      },
      filas: Array.isArray(data.filas) ? data.filas : [],
    });
  } catch (error) {
    logger.error('Error getFormaListaPacientes:', error);
    const msg = error?.message || 'Error al generar FORMA';
    const forbidden = /solo admin|solo el administrador|solo admin o doctor/i.test(msg);
    const bad = /parámetro|fecha|rango|doctor no encontrado|YYYY-MM-DD|370 días/i.test(msg);
    const status = forbidden ? 403 : bad ? 400 : 500;
    if (!res.headersSent) {
      res.status(status).json({ success: false, error: msg });
    }
  }
};

/**
 * Datos para exportar FORMA (Formato de Registro Mensual GAM - SIC).
 * GET /api/reportes/forma/:idPaciente?mes=8&anio=2025
 * Solo web: la app móvil no usa este endpoint. Datos de un solo paciente para la fecha.
 */
export const getFormaData = async (req, res) => {
  try {
    const idPaciente = parseInt(req.params.idPaciente, 10);
    const mes = parseInt(req.query.mes, 10);
    const anio = parseInt(req.query.anio, 10);
    const dia = req.query.dia != null && req.query.dia !== '' ? parseInt(req.query.dia, 10) : null;

    if (!Number.isInteger(idPaciente) || idPaciente <= 0) {
      return res.status(400).json({ success: false, error: 'ID de paciente inválido' });
    }
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
      return res.status(400).json({ success: false, error: 'Parámetro mes requerido (1-12)' });
    }
    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
      return res.status(400).json({ success: false, error: 'Parámetro anio requerido (2000-2100)' });
    }
    if (dia != null) {
      const maxDia = new Date(anio, mes, 0).getDate();
      if (!Number.isInteger(dia) || dia < 1 || dia > maxDia) {
        return res.status(400).json({ success: false, error: `Parámetro dia inválido para ${mes}/${anio}` });
      }
    }

    const data = await reportService.getFormaData(idPaciente, mes, anio, dia);
    const c = data.cabecera || {};
    res.json({
      cabecera: {
        institucion: c.institucion ?? '',
        entidad: c.entidad ?? '',
        jurisdiccion: c.jurisdiccion ?? '',
        municipio: c.municipio ?? '',
        unidadMedica: c.unidadMedica ?? '',
        nombreGAM: c.nombreGAM ?? '',
        etapa: c.etapa ?? '',
        mes: c.mes,
        anio: c.anio,
        mesNombre: c.mesNombre ?? '',
        coordinador: c.coordinador ?? '',
      },
      filas: Array.isArray(data.filas) ? data.filas : [],
    });
  } catch (error) {
    logger.error('Error getFormaData:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};


