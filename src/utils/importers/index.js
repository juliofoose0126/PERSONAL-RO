export * from './excelImporter.js';
export * from './pdfImporter.js';
export * from './imageImporter.js';

export const SUPPORTED_EXTENSIONS = {
  excel: ['.xlsx', '.xls', '.csv'],
  pdf: ['.pdf'],
  image: ['.png', '.jpg', '.jpeg', '.webp', '.heic'],
};

export function detectFileKind(file) {
  const name = file.name.toLowerCase();
  if (SUPPORTED_EXTENSIONS.excel.some((ext) => name.endsWith(ext))) return 'excel';
  if (SUPPORTED_EXTENSIONS.pdf.some((ext) => name.endsWith(ext))) return 'pdf';
  if (SUPPORTED_EXTENSIONS.image.some((ext) => name.endsWith(ext))) return 'image';
  if (file.type?.startsWith('image/')) return 'image';
  return 'unknown';
}
