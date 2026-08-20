// pdfjs-dist es una librería pesada; se carga de forma diferida (dynamic
// import) para no engordar el bundle inicial de la app.
let pdfjsLibPromise = null;
function loadPdfjs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.mjs?url'),
    ]).then(([pdfjsLib, workerUrl]) => {
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.default;
      return pdfjsLib;
    });
  }
  return pdfjsLibPromise;
}

// Extrae todo el texto de un PDF (listas de raya / reportes previos),
// agrupando por líneas usando la posición vertical de cada fragmento.
export async function extractPdfLines(file) {
  const pdfjsLib = await loadPdfjs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const lines = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const rowsByY = new Map();
    for (const item of content.items) {
      const y = Math.round(item.transform[5]);
      if (!rowsByY.has(y)) rowsByY.set(y, []);
      rowsByY.get(y).push(item);
    }

    const sortedYs = Array.from(rowsByY.keys()).sort((a, b) => b - a);
    for (const y of sortedYs) {
      const items = rowsByY.get(y).sort((a, b) => a.transform[4] - b.transform[4]);
      const text = items.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim();
      if (text) lines.push(text);
    }
  }

  return lines;
}

// Heurística: intenta detectar "Nombre ... número número número" por línea,
// típico de listas de raya impresas (nombre + días/sueldo/total).
const NUMBER_RE = /-?\d{1,3}(?:[.,]\d{1,2})?/g;

export function parseLinesToRecords(lines) {
  const records = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const numbers = line.match(NUMBER_RE) || [];
    if (numbers.length === 0) continue;

    const firstNumberIndex = line.search(NUMBER_RE);
    const namePart = firstNumberIndex > 0 ? line.slice(0, firstNumberIndex).trim() : '';

    // Se descartan líneas de encabezado/totales sin un nombre plausible.
    if (namePart.length < 3 || /^(total|subtotal|semana|periodo|obra|fecha)/i.test(namePart)) {
      continue;
    }

    const parsedNumbers = numbers.map((n) => parseFloat(n.replace(',', '.')));

    records.push({
      nombre: namePart,
      obra: '',
      puesto: '',
      sueldoDiario: parsedNumbers[0] ?? 0,
      diasTrabajados: parsedNumbers[1] ?? 0,
      extras: parsedNumbers[2] ?? 0,
      anticipos: parsedNumbers[3] ?? 0,
      _raw: line,
    });
  }

  return records;
}

export async function importFromPdf(file) {
  const lines = await extractPdfLines(file);
  return parseLinesToRecords(lines);
}
