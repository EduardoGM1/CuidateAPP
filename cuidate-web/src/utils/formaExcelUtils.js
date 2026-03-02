/**
 * Genera un libro Excel en formato FORMA (Formato de Registro Mensual de Actividades GAM - SIC).
 * Misma estructura, colores y diseño que el formato oficial ODS del SIC.
 * Solo para uso en la app web.
 */

import ExcelJS from 'exceljs';

/** Colores del formato oficial SIC (ODS - FORMATO DE REGISTRO MENSUAL agosto SIC 2025) */
const COLORS = {
  TITLE_TEXT: '003300',        // verde oscuro, títulos institucionales (ce92)
  HEADER_ROW: 'A50021',        // rojo SIC, fila de encabezados N°|NOMBRE|... (ce18)
  SECTION_LIGHT_GREEN: 'B6E0BA', // verde claro, secciones DX/EDUCACIÓN/VARIABLES (ce19-ce21, ce24)
  SECTION_YELLOW: 'FFD961',    // amarillo, secciones DETECCIÓN/OTRAS ACCIONES (ce22, ce23)
  WHITE: 'FFFFFF',
  BLACK: '000000',
};

/** Nombres de columnas del FORMA (orden oficial, mismos que el backend) */
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

/** Convierte valor booleano del backend (1/0 o true/false) a "Si" o vacío para el Excel. */
function boolToSi(val) {
  if (val === 1 || val === true || val === '1') return 'Si';
  return '';
}

function filaToRow(fila) {
  return [
    fila.n ?? '',
    fila.nombre ?? '',
    fila.edad ?? '',
    fila.sexo ?? '',
    boolToSi(fila.recibeTratamiento),
    boolToSi(fila.saludBucal),
    boolToSi(fila.tuberculosis),
    boolToSi(fila.basal),
    fila.anoDx ?? '',
    fila.dxAgregados ?? '',
    boolToSi(fila.noFarmacologico),
    boolToSi(fila.farmacologico),
    boolToSi(fila.nutricional),
    boolToSi(fila.actividadFisica),
    boolToSi(fila.medicoPreventiva),
    boolToSi(fila.psicologica),
    boolToSi(fila.odontologica),
    fila.talla ?? '',
    fila.imc ?? '',
    fila.colesterol ?? '',
    fila.trigliceridos ?? '',
    fila.glucosa ?? '',
    fila.presionSistolica ?? '',
    fila.presionDiastolica ?? '',
    boolToSi(fila.microalbuminuria),
    boolToSi(fila.fondoOjo),
  ];
}

function applyCellStyle(cell, opts = {}) {
  const { fill, fontColor, bold, fontSize = 11, alignment = 'left', fontName = 'Arial', border } = opts;
  if (fill) {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF' + fill },
    };
  }
  cell.font = {
    name: fontName,
    size: fontSize,
    bold: !!bold,
    color: fontColor ? { argb: 'FF' + fontColor } : undefined,
  };
  cell.alignment = {
    vertical: 'middle',
    horizontal: alignment === 'center' ? 'center' : alignment === 'right' ? 'right' : 'left',
    wrapText: true,
  };
  if (border) {
    cell.border = {
      top: thinBorder(),
      bottom: thinBorder(),
      left: thinBorder(),
      right: thinBorder(),
    };
  }
}

function thinBorder() {
  return {
    style: 'thin',
    color: { argb: 'FF' + COLORS.BLACK },
  };
}

/**
 * Genera el libro Excel con formato SIC (colores, secciones, bordes).
 * @param {object} data - { cabecera: object, filas: object[] } desde getFormaData
 * @param {string} [nombreHoja='FORMA'] - Nombre de la hoja
 * @returns {Promise<ArrayBuffer>}
 */
export async function buildFormaExcel(data, nombreHoja = 'FORMA') {
  const { cabecera = {}, filas = [] } = data;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(nombreHoja, { views: [{ state: 'frozen', ySplit: 15 }] });

  let row = 1;

  // --- Bloque de título (ODS ce92: #003300, Century Gothic 16pt, centrado) ---
  const titleLines = [
    'CENTRO NACIONAL DE PROGRAMAS PREVENTIVOS Y CONTROL DE ENFERMEDADES',
    'PROGRAMA DE SALUD EN EL ADULTO Y ANCIANO',
    'GRUPOS DE AYUDA MUTUA ENFERMEDADES CRÓNICAS',
    'FORMATO DE REGISTRO MENSUAL DE ACTIVIDADES GAM (FORMA)',
  ];
  titleLines.forEach((text) => {
    const cell = ws.getCell(row, 1);
    cell.value = text;
    applyCellStyle(cell, {
      fontColor: COLORS.TITLE_TEXT,
      fontName: 'Century Gothic',
      bold: true,
      fontSize: 16,
      alignment: 'center',
    });
    ws.mergeCells(row, 1, row, FORMA_HEADERS.length);
    row++;
  });

  const cellAnio = ws.getCell(row, 1);
  cellAnio.value = String(cabecera.anio || new Date().getFullYear());
  applyCellStyle(cellAnio, {
    fontColor: COLORS.TITLE_TEXT,
    fontName: 'Century Gothic',
    bold: true,
    fontSize: 16,
    alignment: 'center',
  });
  ws.mergeCells(row, 1, row, FORMA_HEADERS.length);
  row++;
  row++;

  // --- Metadatos en disposición horizontal (2 filas, como formato oficial ODS) ---
  // Fila 1: Institución, Entidad Federativa, Jurisdicción, Municipio, Unidad Médica
  const metaRow1 = [
    ['Institución:', cabecera.institucion ?? ''],
    ['Entidad Federativa:', cabecera.entidad ?? ''],
    ['Jurisdicción:', cabecera.jurisdiccion ?? cabecera.entidad ?? ''],
    ['Municipio:', cabecera.municipio ?? ''],
    ['Unidad Médica:', cabecera.unidadMedica ?? ''],
  ];
  const totalCols = FORMA_HEADERS.length;
  const colSpans1 = [5, 5, 5, 5, totalCols - 20]; // 5 celdas en la primera fila
  let col = 1;
  metaRow1.forEach(([label, value], i) => {
    const span = colSpans1[i];
    const cell = ws.getCell(row, col);
    cell.value = `${label} ${value}`.trim();
    applyCellStyle(cell, { bold: true, fontSize: 14, border: true });
    ws.mergeCells(row, col, row, col + span - 1);
    col += span;
  });
  row++;

  // Fila 2: Nombre GAM, Etapa, Mes y año, Nombre Coordinador
  const metaRow2 = [
    ['Nombre del Grupo de Ayuda Mutua EC:', cabecera.nombreGAM ?? ''],
    ['Etapa:', cabecera.etapa ?? ''],
    ['Mes y año a reportar:', `${cabecera.mesNombre ?? ''} ${cabecera.anio ?? ''}`.trim()],
    ['Nombre Coordinador del GAM EC:', cabecera.coordinador ?? ''],
  ];
  const colSpans2 = [6, 6, 7, totalCols - 19]; // 4 celdas en la segunda fila
  col = 1;
  metaRow2.forEach(([label, value], i) => {
    const span = colSpans2[i];
    const cell = ws.getCell(row, col);
    cell.value = `${label} ${value}`.trim();
    applyCellStyle(cell, { bold: true, fontSize: 14, border: true });
    ws.mergeCells(row, col, row, col + span - 1);
    col += span;
  });
  row++;
  row++;

  // --- Secciones (ODS: rojo #A50021 blanco, luego verde #B6E0BA, luego amarillo #FFD961) ---
  const sections = [
    { text: 'DATOS DE IDENTIFICACIÓN', fill: COLORS.HEADER_ROW, fontColor: COLORS.WHITE },
    { text: 'DX ENFERMEDADES CRÓNICAS', fill: COLORS.SECTION_LIGHT_GREEN },
    { text: 'EDUCACIÓN PARA LA SALUD', fill: COLORS.SECTION_LIGHT_GREEN },
    { text: 'VARIABLES', fill: COLORS.SECTION_LIGHT_GREEN },
    { text: 'DETECCIÓN DE COMPLICACIONES', fill: COLORS.SECTION_YELLOW },
    { text: 'OTRAS ACCIONES DE PREVENCIÓN Y CONTROL', fill: COLORS.SECTION_YELLOW },
  ];
  sections.forEach(({ text, fill, fontColor }) => {
    const cell = ws.getCell(row, 1);
    cell.value = text;
    applyCellStyle(cell, { fill, fontColor, bold: true, fontSize: 14, border: true });
    ws.mergeCells(row, 1, row, FORMA_HEADERS.length);
    row++;
  });

  // --- Fila de encabezados de columnas (ODS ce18: fondo #A50021, texto blanco, Arial 13pt bold, borde) ---
  const headerRow = ws.getRow(row);
  FORMA_HEADERS.forEach((text, col) => {
    const cell = headerRow.getCell(col + 1);
    cell.value = text;
    applyCellStyle(cell, {
      fill: COLORS.HEADER_ROW,
      fontColor: COLORS.WHITE,
      bold: true,
      fontSize: 13,
      alignment: 'center',
      border: true,
    });
  });
  row++;

  // --- Filas de datos (ODS ce14: Arial 12pt, borde) ---
  filas.forEach((fila) => {
    const values = filaToRow(fila);
    const dataRow = ws.getRow(row);
    values.forEach((val, col) => {
      const cell = dataRow.getCell(col + 1);
      cell.value = val;
      applyCellStyle(cell, { fill: COLORS.WHITE, fontSize: 12, border: true });
    });
    row++;
  });

  // --- Anchos de columna (formato SIC) ---
  FORMA_HEADERS.forEach((_, i) => {
    const col = ws.getColumn(i + 1);
    col.width = i === 1 ? 35 : i === 0 ? 5 : 14;
  });

  const buffer = await wb.xlsx.writeBuffer();
  return buffer;
}

/**
 * Descarga el Excel FORMA en el navegador (mismo formato y colores que el ODS SIC).
 * @param {object} data - { cabecera, filas } desde getFormaData
 * @param {string} [filename] - Nombre del archivo
 */
export async function downloadFormaExcel(data, filename) {
  const buffer = await buildFormaExcel(data);
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
