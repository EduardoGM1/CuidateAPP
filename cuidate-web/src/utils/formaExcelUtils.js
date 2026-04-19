/**
 * Genera un libro Excel alineado al formato de registro mensual GAM - SIC.
 * Misma estructura, colores y diseño que el formato oficial ODS del SIC.
 * Solo para uso en la app web.
 */

import ExcelJS from 'exceljs';

/** Texto visible en UI y en el libro (sustituye la palabra «FORMA» en etiquetas). */
export const EXCEL_FORMATO_REGISTRO_MENSUAL_LABEL = 'Excel formato de registro mensual';

/** Prefijo de archivo descargado (sin espacios ni tildes, compatible con todos los sistemas). */
export const EXCEL_FORMATO_REGISTRO_MENSUAL_FILE_PREFIX = 'excel-formato-registro-mensual';

/**
 * Nombre de la hoja de cálculo (Excel limita a 31 caracteres).
 * Debe ser ≤ 31.
 */
const EXCEL_FORMATO_REGISTRO_MENSUAL_SHEET_NAME = 'Excel formato registro mensual';

/** Colores del formato oficial SIC (ODS - FORMATO DE REGISTRO MENSUAL agosto SIC 2025) */
const COLORS = {
  TITLE_TEXT: '003300',        // verde oscuro, títulos institucionales (ce92)
  HEADER_ROW: 'A50021',        // rojo SIC, fila de categorías y encabezados (ce18)
  HEADER_LIGHT_GREEN: 'B6E0BA', // verde claro, celdas de encabezado de columna (forma correcta)
  SECTION_LIGHT_GREEN: 'B6E0BA',
  SECTION_YELLOW: 'FFD961',    // amarillo, secciones DETECCIÓN/OTRAS ACCIONES (ce22, ce23)
  WHITE: 'FFFFFF',
  BLACK: '000000',
};

/** Agrupación de columnas por categoría (forma correcta): [N°, Datos identificación, DX EC, Educación, Variables, Detección] */
const SECTION_SPANS = [1, 3, 8, 5, 7, 2];
const SECTION_NAMES = [
  'N°',
  'DATOS DE IDENTIFICACIÓN',
  'DX ENFERMEDADES CRÓNICAS',
  'EDUCACIÓN PARA LA SALUD',
  'VARIABLES.',
  'DETECCIÓN DE COMPLICACIONES',
];

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
  const { fill, fontColor, bold, fontSize = 11, alignment = 'left', fontName = 'Arial', border, textRotation } = opts;
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
    textRotation: textRotation != null ? textRotation : undefined,
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
 * @param {string} [nombreHoja] - Nombre de la hoja (por defecto etiqueta corta ≤31 caracteres)
 * @returns {Promise<ArrayBuffer>}
 */
/** Claves y valores por defecto de cabecera FORMA (por si la API devuelve objeto incompleto). */
const CABECERA_DEFAULTS = {
  institucion: '',
  entidad: '',
  jurisdiccion: '',
  municipio: '',
  unidadMedica: '',
  clues: '',
  nombreGAM: '',
  etapa: '',
  mes: new Date().getMonth() + 1,
  anio: new Date().getFullYear(),
  mesNombre: '',
  coordinador: '',
};

function normalizeCabecera(cabecera) {
  const c = cabecera && typeof cabecera === 'object' ? cabecera : {};
  return {
    institucion: c.institucion ?? CABECERA_DEFAULTS.institucion,
    entidad: c.entidad ?? CABECERA_DEFAULTS.entidad,
    jurisdiccion: c.jurisdiccion ?? c.entidad ?? CABECERA_DEFAULTS.jurisdiccion,
    municipio: c.municipio ?? CABECERA_DEFAULTS.municipio,
    unidadMedica: c.unidadMedica ?? c.institucion ?? CABECERA_DEFAULTS.unidadMedica,
    clues: c.clues ?? c.CLUES ?? CABECERA_DEFAULTS.clues,
    nombreGAM: c.nombreGAM ?? CABECERA_DEFAULTS.nombreGAM,
    etapa: c.etapa ?? CABECERA_DEFAULTS.etapa,
    mes: c.mes ?? CABECERA_DEFAULTS.mes,
    anio: c.anio ?? CABECERA_DEFAULTS.anio,
    mesNombre: c.mesNombre ?? CABECERA_DEFAULTS.mesNombre,
    coordinador: c.coordinador ?? CABECERA_DEFAULTS.coordinador,
  };
}

export async function buildFormaExcel(data, nombreHoja = EXCEL_FORMATO_REGISTRO_MENSUAL_SHEET_NAME) {
  const { cabecera: rawCabecera = {}, filas = [] } = data;
  const cabecera = normalizeCabecera(rawCabecera);
  const wb = new ExcelJS.Workbook();
  const nombreHojaFinal = String(nombreHoja || EXCEL_FORMATO_REGISTRO_MENSUAL_SHEET_NAME).slice(0, 31);
  const ws = wb.addWorksheet(nombreHojaFinal, { views: [{ state: 'frozen', ySplit: 15 }] });

  let row = 1;

  // --- Bloque de título (ODS ce92: #003300, Century Gothic 16pt, centrado) ---
  const titleLines = [
    'CENTRO NACIONAL DE PROGRAMAS PREVENTIVOS Y CONTROL DE ENFERMEDADES',
    'PROGRAMA DE SALUD EN EL ADULTO Y ANCIANO',
    'GRUPOS DE AYUDA MUTUA ENFERMEDADES CRÓNICAS',
    `FORMATO DE REGISTRO MENSUAL DE ACTIVIDADES GAM (${EXCEL_FORMATO_REGISTRO_MENSUAL_LABEL})`,
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

  // --- Metadatos (forma correcta): fila 1 con Institución, Entidad, Jurisdicción, Municipio, Unidad Médica, CLUES ---
  const totalCols = FORMA_HEADERS.length;
  const metaRow1 = [
    ['Institución:', cabecera.institucion ?? ''],
    ['Entidad Federativa:', cabecera.entidad ?? ''],
    ['Jurisdicción:', cabecera.jurisdiccion ?? cabecera.entidad ?? ''],
    ['Municipio:', cabecera.municipio ?? ''],
    ['Unidad Médica:', cabecera.unidadMedica ?? ''],
    ['CLUES:', cabecera.clues ?? ''],
  ];
  const colSpans1 = [4, 4, 4, 4, 4, totalCols - 20]; // 6 bloques en la primera fila
  let col = 1;
  metaRow1.forEach(([label, value], i) => {
    const span = Math.max(1, colSpans1[i] ?? 4);
    const cell = ws.getCell(row, col);
    cell.value = (value != null && value !== '') ? `${label} ${value}`.trim() : label;
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

  // --- Tabla forma correcta: fila de categorías (rojo, celdas fusionadas) + fila de encabezados (verde claro, texto vertical) ---
  let colStart = 1;
  SECTION_NAMES.forEach((text, i) => {
    const span = SECTION_SPANS[i] ?? 1;
    const cell = ws.getCell(row, colStart);
    cell.value = text;
    applyCellStyle(cell, {
      fill: COLORS.HEADER_ROW,
      fontColor: COLORS.WHITE,
      bold: true,
      fontSize: 13,
      alignment: 'center',
      border: true,
    });
    if (span > 1) ws.mergeCells(row, colStart, row, colStart + span - 1);
    colStart += span;
  });
  row++;

  // --- Fila de encabezados de columnas (verde claro, texto vertical -90°, como forma correcta) ---
  const headerRow = ws.getRow(row);
  headerRow.height = 120;
  FORMA_HEADERS.forEach((text, col) => {
    const cell = headerRow.getCell(col + 1);
    cell.value = text;
    applyCellStyle(cell, {
      fill: COLORS.HEADER_LIGHT_GREEN,
      fontColor: COLORS.BLACK,
      bold: true,
      fontSize: 11,
      alignment: 'center',
      border: true,
      textRotation: 255, // -90° en Excel (texto vertical)
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
 * Descarga el Excel de formato de registro mensual en el navegador (mismo diseño que el ODS SIC).
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
    `${EXCEL_FORMATO_REGISTRO_MENSUAL_FILE_PREFIX}-${data.cabecera?.anio ?? '2025'}-${String(data.cabecera?.mes ?? '').padStart(2, '0')}.xlsx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
