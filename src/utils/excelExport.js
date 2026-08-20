import { DAY_KEYS, DAY_LABELS, diasTrabajados, sueldoBase, totalNeto, formatDateEs } from './payroll.js';

const DARK_HEADER = 'FF1E293B'; // slate-800
const LIGHT_STRIPE = 'FFF1F5F9'; // slate-100
const MONEY_FORMAT = '$#,##0.00';

const COLUMNS = [
  { header: 'No.', key: 'no', width: 6 },
  { header: 'Nombre del Trabajador', key: 'nombre', width: 30 },
  { header: 'Obra / Frente', key: 'obra', width: 26 },
  { header: 'Puesto', key: 'puesto', width: 18 },
  { header: 'Sueldo Diario', key: 'sueldoDiario', width: 14 },
  ...DAY_KEYS.map((k) => ({ header: DAY_LABELS[k], key: k, width: 7 })),
  { header: 'Días Trab.', key: 'diasTrab', width: 11 },
  { header: 'Sueldo Base', key: 'sueldoBase', width: 14 },
  { header: 'Extras (+)', key: 'extras', width: 13 },
  { header: 'Vales (-)', key: 'vales', width: 13 },
  { header: 'Total Neto', key: 'totalNeto', width: 15 },
  { header: 'Firma de Recibido', key: 'firma', width: 26 },
];

function buildRows(semana, trabajadores, obras) {
  const trabajadorPorId = new Map(trabajadores.map((t) => [t.id, t]));
  const obraPorId = new Map(obras.map((o) => [o.id, o]));

  const rows = (semana?.registros || [])
    .map((registro) => {
      const trabajador = trabajadorPorId.get(registro.trabajadorId);
      if (!trabajador) return null;
      const obra = obraPorId.get(trabajador.obraId);
      return {
        nombre: trabajador.nombre,
        obraNombre: obra?.nombre || 'Sin obra',
        puesto: trabajador.puesto || '',
        sueldoDiario: Number(trabajador.sueldoDiario) || 0,
        dias: registro.dias,
        extras: Number(registro.extras) || 0,
        vales: Number(registro.vales) || 0,
      };
    })
    .filter(Boolean);

  rows.sort((a, b) => {
    const byObra = a.obraNombre.localeCompare(b.obraNombre, 'es');
    if (byObra !== 0) return byObra;
    return a.nombre.localeCompare(b.nombre, 'es');
  });

  return rows;
}

// ExcelJS y file-saver son librerías pesadas usadas solo al exportar;
// se cargan de forma diferida para no engordar el bundle inicial.
export async function exportNominaToExcel({ semana, trabajadores, obras, fileName }) {
  const [{ default: ExcelJS }, { saveAs }] = await Promise.all([
    import('exceljs'),
    import('file-saver'),
  ]);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Control de Asistencia y Nómina de Obra';
  workbook.created = new Date();

  const rows = buildRows(semana, trabajadores, obras);
  addNominaSheet(workbook, rows, semana);
  addResumenSheet(workbook, rows);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const finalName = fileName || `Nomina_${(semana?.label || 'semana').replace(/[^\w-]+/g, '_')}.xlsx`;
  saveAs(blob, finalName);
  return finalName;
}

function addNominaSheet(workbook, rows, semana) {
  const sheet = workbook.addWorksheet('Nómina Semanal', {
    views: [{ state: 'frozen', ySplit: 6 }],
  });
  sheet.columns = COLUMNS;

  const totalCols = COLUMNS.length;

  // --- Encabezado superior ---
  sheet.mergeCells(1, 1, 1, totalCols);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = 'NÓMINA SEMANAL DE OBRA';
  titleCell.font = { bold: true, size: 16, color: { argb: 'FF1E293B' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  sheet.getRow(1).height = 26;

  sheet.mergeCells(2, 1, 2, Math.ceil(totalCols / 2));
  const periodoCell = sheet.getCell(2, 1);
  periodoCell.value = `Período / Semana: ${semana?.label || '—'}`;
  periodoCell.font = { bold: true, size: 11 };

  sheet.mergeCells(2, Math.ceil(totalCols / 2) + 1, 2, totalCols);
  const fechaCell = sheet.getCell(2, Math.ceil(totalCols / 2) + 1);
  fechaCell.value = `Fecha de generación: ${formatDateEs(new Date().toISOString().slice(0, 10))}`;
  fechaCell.font = { italic: true, size: 10, color: { argb: 'FF475569' } };
  fechaCell.alignment = { horizontal: 'right' };

  sheet.mergeCells(3, 1, 3, totalCols);

  // --- Encabezado de columnas (fila 4) ---
  const headerRowIndex = 4;
  const headerRow = sheet.getRow(headerRowIndex);
  COLUMNS.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_HEADER } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = borderAll();
  });
  headerRow.height = 32;

  // --- Filas de datos ---
  let rowIndex = headerRowIndex + 1;
  const firstDataRow = rowIndex;
  rows.forEach((row, i) => {
    const excelRow = sheet.getRow(rowIndex);
    const base = sueldoBase(row.dias, row.sueldoDiario);
    const neto = totalNeto({ dias: row.dias, sueldoDiario: row.sueldoDiario, extras: row.extras, vales: row.vales });

    excelRow.getCell(1).value = i + 1;
    excelRow.getCell(2).value = row.nombre;
    excelRow.getCell(3).value = row.obraNombre;
    excelRow.getCell(4).value = row.puesto;
    excelRow.getCell(5).value = row.sueldoDiario;
    excelRow.getCell(5).numFmt = MONEY_FORMAT;

    DAY_KEYS.forEach((key, dIdx) => {
      const val = row.dias?.[key];
      const cell = excelRow.getCell(6 + dIdx);
      cell.value = val === 0 ? 0 : val || 0;
      cell.alignment = { horizontal: 'center' };
    });

    const diasTrabCol = 6 + DAY_KEYS.length;
    excelRow.getCell(diasTrabCol).value = diasTrabajados(row.dias);
    excelRow.getCell(diasTrabCol).alignment = { horizontal: 'center' };

    excelRow.getCell(diasTrabCol + 1).value = base;
    excelRow.getCell(diasTrabCol + 1).numFmt = MONEY_FORMAT;

    excelRow.getCell(diasTrabCol + 2).value = row.extras;
    excelRow.getCell(diasTrabCol + 2).numFmt = MONEY_FORMAT;

    excelRow.getCell(diasTrabCol + 3).value = row.vales;
    excelRow.getCell(diasTrabCol + 3).numFmt = MONEY_FORMAT;

    excelRow.getCell(diasTrabCol + 4).value = neto;
    excelRow.getCell(diasTrabCol + 4).numFmt = MONEY_FORMAT;
    excelRow.getCell(diasTrabCol + 4).font = { bold: true };

    excelRow.getCell(diasTrabCol + 5).value = '';

    for (let c = 1; c <= totalCols; c++) {
      const cell = excelRow.getCell(c);
      cell.border = borderAll('thin', 'FFCBD5E1');
      if (i % 2 === 1) {
        cell.fill = cell.fill?.fgColor ? cell.fill : { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_STRIPE } };
      }
    }

    rowIndex += 1;
  });

  const lastDataRow = rowIndex - 1;

  // --- Fila de totales con fórmulas dinámicas ---
  const totalsRow = sheet.getRow(rowIndex);
  const sueldoBaseCol = 6 + DAY_KEYS.length + 1;
  const extrasCol = sueldoBaseCol + 1;
  const valesCol = sueldoBaseCol + 2;
  const netoCol = sueldoBaseCol + 3;

  totalsRow.getCell(2).value = 'TOTALES';
  totalsRow.getCell(2).font = { bold: true };

  if (rows.length > 0) {
    [sueldoBaseCol, extrasCol, valesCol, netoCol].forEach((col) => {
      const colLetter = sheet.getColumn(col).letter;
      const cell = totalsRow.getCell(col);
      cell.value = { formula: `SUM(${colLetter}${firstDataRow}:${colLetter}${lastDataRow})` };
      cell.numFmt = MONEY_FORMAT;
      cell.font = { bold: true };
      cell.border = { top: { style: 'double' } };
    });
  }
  totalsRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  });
}

function addResumenSheet(workbook, rows) {
  const sheet = workbook.addWorksheet('Resumen por Obra');
  sheet.columns = [
    { header: 'Obra / Frente', key: 'obra', width: 30 },
    { header: 'Núm. Trabajadores', key: 'num', width: 18 },
    { header: 'Sueldo Base Total', key: 'base', width: 18 },
    { header: 'Extras Totales (+)', key: 'extras', width: 18 },
    { header: 'Vales Totales (-)', key: 'vales', width: 18 },
    { header: 'Total Neto', key: 'neto', width: 18 },
  ];

  const header = sheet.getRow(1);
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_HEADER } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  const byObra = new Map();
  for (const row of rows) {
    if (!byObra.has(row.obraNombre)) {
      byObra.set(row.obraNombre, { num: 0, base: 0, extras: 0, vales: 0, neto: 0 });
    }
    const acc = byObra.get(row.obraNombre);
    const base = sueldoBase(row.dias, row.sueldoDiario);
    const neto = totalNeto({ dias: row.dias, sueldoDiario: row.sueldoDiario, extras: row.extras, vales: row.vales });
    acc.num += 1;
    acc.base += base;
    acc.extras += row.extras;
    acc.vales += row.vales;
    acc.neto += neto;
  }

  const sortedObraNames = Array.from(byObra.keys()).sort((a, b) => a.localeCompare(b, 'es'));

  let rowIndex = 2;
  let grandTotal = { num: 0, base: 0, extras: 0, vales: 0, neto: 0 };
  for (const obraNombre of sortedObraNames) {
    const acc = byObra.get(obraNombre);
    const row = sheet.getRow(rowIndex);
    row.getCell(1).value = obraNombre;
    row.getCell(2).value = acc.num;
    row.getCell(3).value = acc.base;
    row.getCell(3).numFmt = MONEY_FORMAT;
    row.getCell(4).value = acc.extras;
    row.getCell(4).numFmt = MONEY_FORMAT;
    row.getCell(5).value = acc.vales;
    row.getCell(5).numFmt = MONEY_FORMAT;
    row.getCell(6).value = acc.neto;
    row.getCell(6).numFmt = MONEY_FORMAT;
    row.getCell(6).font = { bold: true };
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = borderAll('thin', 'FFCBD5E1');
    });
    grandTotal.num += acc.num;
    grandTotal.base += acc.base;
    grandTotal.extras += acc.extras;
    grandTotal.vales += acc.vales;
    grandTotal.neto += acc.neto;
    rowIndex += 1;
  }

  const totalsRow = sheet.getRow(rowIndex);
  totalsRow.getCell(1).value = 'TOTAL GENERAL';
  totalsRow.getCell(1).font = { bold: true };
  totalsRow.getCell(2).value = grandTotal.num;
  totalsRow.getCell(3).value = grandTotal.base;
  totalsRow.getCell(3).numFmt = MONEY_FORMAT;
  totalsRow.getCell(4).value = grandTotal.extras;
  totalsRow.getCell(4).numFmt = MONEY_FORMAT;
  totalsRow.getCell(5).value = grandTotal.vales;
  totalsRow.getCell(5).numFmt = MONEY_FORMAT;
  totalsRow.getCell(6).value = grandTotal.neto;
  totalsRow.getCell(6).numFmt = MONEY_FORMAT;
  totalsRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { ...(cell.font || {}), bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  });
}

function borderAll(style = 'thin', color = 'FF94A3B8') {
  const border = { style, color: { argb: color } };
  return { top: border, left: border, bottom: border, right: border };
}
