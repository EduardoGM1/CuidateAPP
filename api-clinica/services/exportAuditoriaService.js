/**
 * Servicio de Exportación de Auditoría
 * 
 * Exporta datos de auditoría a diferentes formatos (CSV, Excel)
 */

import logger from '../utils/logger.js';

class ExportAuditoriaService {
  /**
   * Exportar datos a CSV
   * @param {Array} datos - Array de registros de auditoría
   * @param {Object} filtros - Filtros aplicados
   * @returns {string} CSV formateado
   */
  exportarCSV(datos, filtros = {}) {
    try {
      if (!datos || datos.length === 0) {
        return 'No hay datos para exportar';
      }

      // Encabezados
      const headers = [
        'ID',
        'Fecha',
        'Tipo de Acción',
        'Entidad Afectada',
        'ID Entidad',
        'Descripción',
        'Usuario',
        'IP Address',
        'Severidad',
        'User Agent'
      ];

      // Crear líneas CSV
      const lineas = [headers.join(',')];

      datos.forEach(registro => {
        const fila = [
          registro.id_auditoria || '',
          this.formatearFecha(registro.fecha_creacion),
          registro.tipo_accion || '',
          registro.entidad_afectada || '',
          registro.id_entidad || '',
          this.escapeCSV(registro.descripcion || ''),
          registro.usuario_nombre || 'Sistema Automático',
          registro.ip_address || '',
          registro.severidad || 'info',
          this.escapeCSV(registro.user_agent || '')
        ];
        lineas.push(fila.join(','));
      });

      // Añadir información de filtros al final
      if (Object.keys(filtros).length > 0) {
        lineas.push('');
        lineas.push('Filtros aplicados:');
        Object.entries(filtros).forEach(([key, value]) => {
          if (value) {
            lineas.push(`${key}: ${value}`);
          }
        });
      }

      return lineas.join('\n');
    } catch (error) {
      logger.error('Error exportando a CSV', { error: error.message });
      throw error;
    }
  }

  /**
   * Exportar datos a Excel (formato simple, compatible con Excel)
   * @param {Array} datos - Array de registros de auditoría
   * @param {Object} filtros - Filtros aplicados
   * @returns {string} TSV (Tab Separated Values) formateado
   */
  exportarExcel(datos, filtros = {}) {
    try {
      if (!datos || datos.length === 0) {
        return 'No hay datos para exportar';
      }

      // Encabezados
      const headers = [
        'ID',
        'Fecha',
        'Tipo de Acción',
        'Entidad Afectada',
        'ID Entidad',
        'Descripción',
        'Usuario',
        'IP Address',
        'Severidad',
        'User Agent'
      ];

      // Crear líneas TSV (Tab Separated Values)
      const lineas = [headers.join('\t')];

      datos.forEach(registro => {
        const fila = [
          registro.id_auditoria || '',
          this.formatearFecha(registro.fecha_creacion),
          registro.tipo_accion || '',
          registro.entidad_afectada || '',
          registro.id_entidad || '',
          registro.descripcion || '',
          registro.usuario_nombre || 'Sistema Automático',
          registro.ip_address || '',
          registro.severidad || 'info',
          registro.user_agent || ''
        ];
        lineas.push(fila.join('\t'));
      });

      return lineas.join('\n');
    } catch (error) {
      logger.error('Error exportando a Excel', { error: error.message });
      throw error;
    }
  }

  /**
   * Formatear fecha para exportación
   * @param {Date|string} fecha - Fecha a formatear
   * @returns {string}
   */
  formatearFecha(fecha) {
    if (!fecha) return '';
    const date = new Date(fecha);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Escapar caracteres especiales para CSV
   * @param {string} texto - Texto a escapar
   * @returns {string}
   */
  escapeCSV(texto) {
    if (!texto) return '';
    // Si contiene comas, comillas o saltos de línea, envolver en comillas y escapar comillas
    if (texto.includes(',') || texto.includes('"') || texto.includes('\n')) {
      return `"${texto.replace(/"/g, '""')}"`;
    }
    return texto;
  }

  /**
   * Generar nombre de archivo con timestamp
   * @param {string} formato - Formato de exportación ('csv' o 'excel')
   * @returns {string}
   */
  generarNombreArchivo(formato = 'csv') {
    const fecha = new Date();
    const timestamp = fecha.toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const extension = formato === 'excel' ? 'xls' : 'csv';
    return `auditoria_${timestamp}.${extension}`;
  }
}

export default new ExportAuditoriaService();

