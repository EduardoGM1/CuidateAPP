/**
 * Genera un libro Excel en formato FORMA (Formato de Registro Mensual de Actividades GAM - SIC).
 * Solo para uso en la app web; la app móvil no usa esta exportación.
 */

import * as XLSX from 'xlsx';

/** Nombres de columnas del FORMA (orden oficial) */
const FORMA_HEADERS = [
  'N°',
  'NOMBRE',
  'Edad (años cumplidos)',
  'Sexo (F/M)',
  'Recibe Tratamiento',
  'Salud Bucal',
  'Tuberculosis',
  'Basal del paciente',
  'Año del Dx',
  'Dx. (s) Agregados posterior al Basal',
  'No Farmacológico',
  'Farmacológico',
  'Nutricional',
  'Actividad Física',
  'Médico-preventiva',
  'Psicológica',
  'Odontológica',
  'Talla (m)',
  'IMC',
  'Colesterol Total (mg/dl)',
  'Triglicéridos (mg/dl)',
  'Glucosa',
  'Presión Sistólica',
  'Presión Diastólica',
  'Microalbuminuria',
  'Exploración Fondo de Ojo',
];

/**
 * Convierte una fila de datos del backend en array de celdas en orden FORMA.
 * @param {object} fila - Objeto con n, nombre, edad, sexo, etc.
 * @returns {Array<string|number>}
 */
function filaToRow(fila) {
  return [
    fila.n ?? '',
    fila.nombre ?? '',
    fila.edad ?? '',
    fila.sexo ?? '',
    fila.recibeTratamiento ?? '',
    fila.saludBucal ?? '',
    fila.tuberculosis ?? '',
    fila.basal ?? '',
    fila.anoDx ?? '',
    fila.dxAgregados ?? '',
    fila.noFarmacologico ?? '',
    fila.farmacologico ?? '',
    fila.nutricional ?? '',
    fila.actividadFisica ?? '',
    fila.medicoPreventiva ?? '',
    fila.psicologica ?? '',
    fila.odontologica ?? '',
    fila.talla ?? '',
    fila.imc ?? '',
    fila.colesterol ?? '',
    fila.trigliceridos ?? '',
    fila.glucosa ?? '',
    fila.presionSistolica ?? '',
    fila.presionDiastolica ?? '',
    fila.microalbuminuria ?? '',
    fila.fondoOjo ?? '',
  ];
}

/**
 * Genera un libro Excel (XLSX) con los datos del FORMA.
 * @param {object} data - { cabecera: object, filas: object[] } desde getFormaData
 * @param {string} [nombreHoja='FORMA'] - Nombre de la hoja
 * @returns {ArrayBuffer} Buffer del archivo XLSX
 */
export function buildFormaExcel(data, nombreHoja = 'FORMA') {
  const { cabecera = {}, filas = [] } = data;
  const rows = [];

  // Bloque de título (compatible con formato SIC)
  rows.push(['CENTRO NACIONAL DE PROGRAMAS PREVENTIVOS Y CONTROL DE ENFERMEDADES']);
  rows.push(['PROGRAMA DE SALUD EN EL ADULTO Y ANCIANO']);
  rows.push(['GRUPOS DE AYUDA MUTUA ENFERMEDADES CRÓNICAS']);
  rows.push(['FORMATO DE REGISTRO MENSUAL DE ACTIVIDADES GAM (FORMA)']);
  rows.push([String(cabecera.anio || new Date().getFullYear())]);
  rows.push([]);
  rows.push([`Institución: ${cabecera.institucion || ''}`]);
  rows.push([`Entidad Federativa: ${cabecera.entidad || ''}`]);
  rows.push([`Municipio: ${cabecera.municipio || ''}`]);
  rows.push([`Unidad Médica: ${cabecera.unidadMedica || ''}`]);
  rows.push([`Nombre del Grupo de Ayuda Mutua EC: ${cabecera.nombreGAM || ''}`]);
  rows.push([`Etapa: ${cabecera.etapa || ''}`]);
  rows.push([`Mes y año a reportar: ${cabecera.mesNombre || ''} ${cabecera.anio || ''}`]);
  rows.push([`Nombre Coordinador del GAM EC: ${cabecera.coordinador || ''}`]);
  rows.push([]);

  // Fila de encabezados de la tabla
  rows.push(FORMA_HEADERS);

  // Filas de datos
  filas.forEach((fila) => {
    rows.push(filaToRow(fila));
  });

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Ancho de columnas aproximado
  ws['!cols'] = FORMA_HEADERS.map((_, i) => {
    if (i === 1) return { wch: 35 }; // NOMBRE
    if (i === 0) return { wch: 4 };
    return { wch: 14 };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, nombreHoja);

  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return buffer;
}

/**
 * Descarga el Excel FORMA en el navegador.
 * @param {object} data - { cabecera, filas } desde getFormaData
 * @param {string} [filename] - Nombre del archivo (ej: forma-2025-08.xlsx)
 */
export function downloadFormaExcel(data, filename) {
  const buffer = buildFormaExcel(data);
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const name =
    filename ||
    `forma-registro-mensual-${data.cabecera?.anio ?? '2025'}-${String(data.cabecera?.mes ?? '').padStart(2, '0')}.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
