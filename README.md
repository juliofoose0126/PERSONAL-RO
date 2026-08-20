# Nómina de Obra

Aplicación web para control de asistencia, importación inteligente con
deduplicación y generación de nómina semanal de obra.

## Funcionalidades

- **Importación inteligente**: Excel/CSV/PDF con mapeo automático de columnas,
  y fotos/capturas con un hook enchufable para OCR/Vision API
  (`src/utils/importers/imageImporter.js`).
- **Deduplicación inteligente**: normalización de texto + comparación difusa
  (Levenshtein + token set) para detectar trabajadores repetidos, con un modal
  para fusionar, crear como nuevo u omitir.
- **Pase de lista semanal** (Lun-Sáb) con valores 1.0 / 0.5 / 0 / Permiso,
  agrupado por obra con subtotales.
- **Cálculos automáticos**: sueldo base, extras, vales/anticipos y total neto.
- **Exportación a Excel** (.xlsx) con encabezado, orden alfabético por
  obra/nombre, formato de moneda, totales con fórmulas `SUM` y hoja de resumen
  por obra.
- **Persistencia** en `localStorage` (obras, trabajadores y semanas
  históricas).
- Botón **"Cargar datos de ejemplo"** con 3 obras y 6 trabajadores.

## Stack

React 19 + Vite + Tailwind CSS v4 + Lucide Icons + ExcelJS + SheetJS (`xlsx`)
+ pdfjs-dist + file-saver.

## Desarrollo

```bash
npm install
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run lint     # oxlint
```

## Conectar un proveedor de OCR/Vision

La importación de fotos no incluye un motor OCR embebido. Para habilitarla,
conecta cualquier servicio (Google Vision, AWS Textract, Tesseract.js, un
endpoint propio, etc.) en `src/utils/importers/imageImporter.js`:

```js
import { setOcrProvider } from './src/utils/importers/imageImporter.js';

setOcrProvider(async (file) => {
  const texto = await miServicioDeVision(file);
  return texto; // string con el texto detectado
});
```

## Nota sobre dependencias

El paquete `xlsx` (SheetJS) usado para leer Excel/CSV tiene advisories de
seguridad conocidos (prototype pollution / ReDoS) sin parche publicado en
npm. El riesgo es acotado porque solo procesa archivos que el propio usuario
sube en su navegador, pero si esto es una preocupación en tu despliegue,
evalúa instalar la build oficial parcheada desde el CDN de SheetJS
(`https://cdn.sheetjs.com`) en lugar del paquete de npm.
