import { normalizeText } from '../normalize.js';

// Palabras clave para el mapeo automático de columnas. La primera coincidencia
// (por orden de especificidad) gana.
const FIELD_KEYWORDS = {
  nombre: ['nombre completo', 'nombre del trabajador', 'nombre', 'trabajador', 'empleado'],
  obra: ['obra frente', 'obra', 'frente', 'proyecto', 'sitio'],
  puesto: ['puesto', 'oficio', 'cargo', 'categoria'],
  sueldoDiario: ['sueldo diario', 'salario diario', 'jornal', 'pago diario', 'sueldo', 'salario'],
  dias: ['dias trabajados', 'dias trab', 'dias asistidos', 'dias'],
  extras: ['extras', 'bono', 'bonos', 'horas extra', 'horas extras'],
  anticipos: ['anticipos', 'vales', 'prestamos', 'prestamo', 'descuentos', 'deducciones'],
};

function guessField(header) {
  const norm = normalizeText(header);
  if (!norm) return null;
  for (const [field, keywords] of Object.entries(FIELD_KEYWORDS)) {
    for (const kw of keywords) {
      if (norm === kw || norm.includes(kw)) return field;
    }
  }
  return null;
}

function autoMapColumns(headers) {
  const mapping = {};
  headers.forEach((header, index) => {
    const field = guessField(header);
    if (field && mapping[field] === undefined) {
      mapping[field] = index;
    }
  });
  return mapping;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;
  const cleaned = String(value).replace(/[^0-9.,-]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// Lee un archivo .xlsx, .xls o .csv y devuelve { headers, rows } crudos.
// SheetJS (xlsx) se importa de forma diferida para no engordar el bundle inicial.
export async function readSpreadsheet(file) {
  const XLSX = await import('xlsx');
  const isCsv = file.name.toLowerCase().endsWith('.csv');

  // El CSV se decodifica como texto UTF-8 explícito: leído como ArrayBuffer,
  // SheetJS asume codepage 1252 y corrompe acentos/ñ (mojibake).
  const workbook = isCsv
    ? XLSX.read(await file.text(), { type: 'string', cellDates: true })
    : XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });

  if (rows.length === 0) return { headers: [], rows: [], sheetName };

  const headers = rows[0].map((h) => String(h ?? '').trim());
  const dataRows = rows.slice(1).filter((r) => r.some((cell) => String(cell ?? '').trim() !== ''));

  return { headers, rows: dataRows, sheetName };
}

// Convierte filas crudas + mapeo de columnas en registros normalizados
// listos para pasar por el motor de deduplicación.
export function mapRowsToRecords(headers, rows, manualMapping = {}) {
  const mapping = { ...autoMapColumns(headers), ...manualMapping };

  return rows.map((row, rowIndex) => {
    const get = (field) => (mapping[field] !== undefined ? row[mapping[field]] : '');
    const nombre = String(get('nombre') ?? '').trim();
    return {
      _rowIndex: rowIndex,
      nombre,
      obra: String(get('obra') ?? '').trim(),
      puesto: String(get('puesto') ?? '').trim(),
      sueldoDiario: toNumber(get('sueldoDiario')),
      diasTrabajados: toNumber(get('dias')),
      extras: toNumber(get('extras')),
      anticipos: toNumber(get('anticipos')),
    };
  }).filter((r) => r.nombre !== '');
}

export function getMappingFields() {
  return Object.keys(FIELD_KEYWORDS);
}

export { autoMapColumns };
