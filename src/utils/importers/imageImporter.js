// Importador de fotos / capturas de listas escritas a mano.
// No incluye un motor OCR embebido: expone un "hook" enchufable para
// conectar cualquier servicio de Vision/OCR (Google Vision, AWS Textract,
// Azure Document Intelligence, Tesseract.js, un endpoint propio, etc.).
//
// Uso:
//   import { setOcrProvider, runOcrOnImage } from './imageImporter';
//   setOcrProvider(async (file) => {
//     const text = await miServicioDeVision(file);
//     return text; // string con el texto detectado
//   });

let ocrProvider = null;

export function setOcrProvider(fn) {
  ocrProvider = typeof fn === 'function' ? fn : null;
}

export function hasOcrProvider() {
  return ocrProvider !== null;
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Ejecuta el proveedor OCR configurado. Si no hay ninguno conectado,
// lanza un error descriptivo en vez de fallar silenciosamente.
export async function runOcrOnImage(file) {
  if (!ocrProvider) {
    throw new OcrNotConfiguredError();
  }
  const text = await ocrProvider(file);
  return typeof text === 'string' ? text : '';
}

export class OcrNotConfiguredError extends Error {
  constructor() {
    super(
      'No hay un proveedor de OCR/Vision configurado. Conecta un servicio ' +
        '(Google Vision, Tesseract.js, etc.) mediante setOcrProvider() en imageImporter.js.'
    );
    this.name = 'OcrNotConfiguredError';
  }
}

// Reutiliza el mismo parser heurístico de líneas que el importador de PDF.
import { parseLinesToRecords } from './pdfImporter.js';
export { parseLinesToRecords };

export async function importFromImage(file) {
  const text = await runOcrOnImage(file);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  return parseLinesToRecords(lines);
}
