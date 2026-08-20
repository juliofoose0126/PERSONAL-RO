import { useRef, useState } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  Camera,
  CheckCircle2,
  Info,
  Loader2,
} from 'lucide-react';
import {
  readSpreadsheet,
  mapRowsToRecords,
  getMappingFields,
  autoMapColumns,
} from '../utils/importers/excelImporter.js';
import { importFromPdf, parseLinesToRecords } from '../utils/importers/pdfImporter.js';
import { runOcrOnImage, OcrNotConfiguredError } from '../utils/importers/imageImporter.js';
import { detectFileKind } from '../utils/importers/index.js';
import { classifyImportBatch } from '../utils/dedupe.js';
import DuplicateModal from './DuplicateModal.jsx';

const FIELD_LABELS = {
  nombre: 'Nombre',
  obra: 'Obra',
  puesto: 'Puesto',
  sueldoDiario: 'Sueldo Diario',
  dias: 'Días',
  extras: 'Extras',
  anticipos: 'Anticipos / Vales',
};

const emptyManualRecord = { nombre: '', obra: '', puesto: '', sueldoDiario: '', diasTrabajados: '', extras: '', anticipos: '' };

export default function ImportPanel({ trabajadores, onApplyImport }) {
  const [stage, setStage] = useState('idle'); // idle | loading | mapping | reviewing | done
  const [error, setError] = useState('');
  const [ocrWarning, setOcrWarning] = useState(false);
  const [manualRecord, setManualRecord] = useState(emptyManualRecord);

  const [sheetData, setSheetData] = useState(null); // { headers, rows }
  const [mapping, setMapping] = useState({});

  const [classified, setClassified] = useState([]); // array from classifyImportBatch
  const [dupIndex, setDupIndex] = useState(0);
  const [summary, setSummary] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const resetAll = () => {
    setStage('idle');
    setError('');
    setOcrWarning(false);
    setSheetData(null);
    setMapping({});
    setClassified([]);
    setDupIndex(0);
    setManualRecord(emptyManualRecord);
  };

  async function handleFiles(fileList) {
    const file = fileList?.[0];
    if (!file) return;
    setError('');
    setOcrWarning(false);
    setStage('loading');

    try {
      const kind = detectFileKind(file);
      if (kind === 'excel') {
        const data = await readSpreadsheet(file);
        if (data.rows.length === 0) {
          setError('No se encontraron filas con datos en el archivo.');
          setStage('idle');
          return;
        }
        setSheetData(data);
        setMapping(autoMapColumns(data.headers));
        setStage('mapping');
        return;
      }

      if (kind === 'pdf') {
        const records = await importFromPdf(file);
        beginClassification(records);
        return;
      }

      if (kind === 'image') {
        try {
          const text = await runOcrOnImage(file);
          const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
          beginClassification(parseLinesToRecords(lines));
        } catch (err) {
          if (err instanceof OcrNotConfiguredError) {
            setOcrWarning(true);
            setStage('idle');
          } else {
            throw err;
          }
        }
        return;
      }

      setError('Formato de archivo no soportado. Usa Excel, CSV, PDF o una imagen.');
      setStage('idle');
    } catch (err) {
      console.error(err);
      setError(`Ocurrió un error al leer el archivo: ${err.message || err}`);
      setStage('idle');
    }
  }

  function confirmMapping() {
    const records = mapRowsToRecords(sheetData.headers, sheetData.rows, mapping);
    if (records.length === 0) {
      setError('No se pudo identificar la columna de "Nombre". Revisa el mapeo.');
      return;
    }
    beginClassification(records);
  }

  function beginClassification(records) {
    if (records.length === 0) {
      setError('No se detectaron registros válidos en el archivo.');
      setStage('idle');
      return;
    }
    const items = classifyImportBatch(records, trabajadores).map((item) => ({
      ...item,
      decision: item.status === 'new' ? 'create' : null,
    }));
    setClassified(items);
    const firstDup = items.findIndex((i) => i.status === 'duplicate');
    setDupIndex(firstDup === -1 ? items.length : firstDup);
    setStage('reviewing');
  }

  function resolveDuplicate(decision) {
    setClassified((prev) => {
      const next = [...prev];
      next[dupIndex] = { ...next[dupIndex], decision };
      return next;
    });
    setDupIndex((idx) => {
      let next = idx + 1;
      while (next < classified.length && classified[next].status !== 'duplicate') next += 1;
      return next;
    });
  }

  function updateDecision(key, decision) {
    setClassified((prev) => prev.map((it) => (it.key === key ? { ...it, decision } : it)));
  }

  function applyImport() {
    const result = onApplyImport(classified.filter((it) => it.decision && it.decision !== 'skip'));
    setSummary(
      result || {
        creados: classified.filter((i) => i.decision === 'create').length,
        actualizados: classified.filter((i) => i.decision === 'merge').length,
        omitidos: classified.filter((i) => !i.decision || i.decision === 'skip').length,
      }
    );
    setStage('done');
  }

  function addManualRecord(e) {
    e.preventDefault();
    if (!manualRecord.nombre.trim()) return;
    beginClassification([
      {
        nombre: manualRecord.nombre.trim(),
        obra: manualRecord.obra.trim(),
        puesto: manualRecord.puesto.trim(),
        sueldoDiario: Number(manualRecord.sueldoDiario) || 0,
        diasTrabajados: Number(manualRecord.diasTrabajados) || 0,
        extras: Number(manualRecord.extras) || 0,
        anticipos: Number(manualRecord.anticipos) || 0,
      },
    ]);
    setManualRecord(emptyManualRecord);
    setOcrWarning(false);
  }

  const currentDuplicate = classified[dupIndex]?.status === 'duplicate' ? classified[dupIndex] : null;
  const pendingDuplicates = classified.filter((i) => i.status === 'duplicate' && !i.decision).length;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <h3 className="mb-1 font-semibold text-slate-800">Importación inteligente</h3>
        <p className="mb-4 text-sm text-slate-500">
          Sube Excel/CSV, PDF de listas de raya, o una foto/captura. El sistema mapea columnas
          automáticamente y detecta trabajadores repetidos antes de guardar.
        </p>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files);
          }}
          className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center sm:px-6 sm:py-10"
        >
          {stage === 'loading' ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-sky-500" />
              <p className="text-sm text-slate-500">Procesando archivo…</p>
            </>
          ) : (
            <>
              <UploadCloud className="h-9 w-9 text-slate-400" />
              <p className="text-sm text-slate-500">
                Arrastra un archivo aquí o usa los botones de abajo
              </p>
              <div className="flex w-full flex-col justify-center gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-700 active:scale-[0.98] sm:py-2"
                >
                  <FileSpreadsheet className="h-4 w-4" /> Excel / CSV / PDF
                </button>
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 active:scale-[0.98] sm:py-2"
                >
                  <Camera className="h-4 w-4" /> Foto / Cámara
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.pdf"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </>
          )}
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
        )}

        {ocrWarning && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <div className="mb-2 flex items-center gap-2 font-medium">
              <Info className="h-4 w-4" /> OCR no configurado
            </div>
            <p className="mb-3">
              La lectura automática de fotos requiere conectar un proveedor de Visión/OCR
              (Google Vision, Tesseract.js, etc.) en <code>imageImporter.js</code>. Mientras
              tanto, captura los datos manualmente:
            </p>
            <form onSubmit={addManualRecord} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <input placeholder="Nombre" value={manualRecord.nombre} onChange={(e) => setManualRecord({ ...manualRecord, nombre: e.target.value })} className="col-span-2 rounded border border-amber-200 px-2 py-2.5 text-sm sm:col-span-1 sm:py-1.5" />
              <input placeholder="Obra" value={manualRecord.obra} onChange={(e) => setManualRecord({ ...manualRecord, obra: e.target.value })} className="rounded border border-amber-200 px-2 py-2.5 text-sm sm:py-1.5" />
              <input placeholder="Puesto" value={manualRecord.puesto} onChange={(e) => setManualRecord({ ...manualRecord, puesto: e.target.value })} className="rounded border border-amber-200 px-2 py-2.5 text-sm sm:py-1.5" />
              <input type="number" placeholder="Sueldo diario" value={manualRecord.sueldoDiario} onChange={(e) => setManualRecord({ ...manualRecord, sueldoDiario: e.target.value })} className="rounded border border-amber-200 px-2 py-2.5 text-sm sm:py-1.5" />
              <input type="number" placeholder="Días" value={manualRecord.diasTrabajados} onChange={(e) => setManualRecord({ ...manualRecord, diasTrabajados: e.target.value })} className="rounded border border-amber-200 px-2 py-2.5 text-sm sm:py-1.5" />
              <input type="number" placeholder="Extras" value={manualRecord.extras} onChange={(e) => setManualRecord({ ...manualRecord, extras: e.target.value })} className="rounded border border-amber-200 px-2 py-2.5 text-sm sm:py-1.5" />
              <input type="number" placeholder="Anticipos" value={manualRecord.anticipos} onChange={(e) => setManualRecord({ ...manualRecord, anticipos: e.target.value })} className="rounded border border-amber-200 px-2 py-2.5 text-sm sm:py-1.5" />
              <button type="submit" className="col-span-2 rounded bg-amber-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-700 sm:col-span-4 sm:py-1.5">
                Agregar registro
              </button>
            </form>
          </div>
        )}
      </div>

      {stage === 'mapping' && sheetData && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-3 flex items-center gap-2 text-slate-700">
            <FileText className="h-5 w-5" />
            <h4 className="font-semibold">Mapeo de columnas ({sheetData.rows.length} filas detectadas)</h4>
          </div>
          <p className="mb-4 text-sm text-slate-500">
            Confirma qué columna del archivo corresponde a cada campo. Se detectaron automáticamente
            cuando fue posible.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {getMappingFields().map((field) => (
              <div key={field}>
                <label className="mb-1 block text-xs font-medium uppercase text-slate-400">
                  {FIELD_LABELS[field]}
                </label>
                <select
                  value={mapping[field] ?? ''}
                  onChange={(e) =>
                    setMapping({ ...mapping, [field]: e.target.value === '' ? undefined : Number(e.target.value) })
                  }
                  className="w-full rounded border border-slate-200 px-2 py-2.5 text-sm sm:py-2"
                >
                  <option value="">(ninguna)</option>
                  {sheetData.headers.map((h, idx) => (
                    <option key={idx} value={idx}>{h || `Columna ${idx + 1}`}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button onClick={resetAll} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 sm:py-2">
              Cancelar
            </button>
            <button onClick={confirmMapping} className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 sm:py-2">
              Continuar
            </button>
          </div>
        </div>
      )}

      {stage === 'reviewing' && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h4 className="font-semibold text-slate-700">
              Revisión de importación ({classified.length} registros)
            </h4>
            {pendingDuplicates > 0 && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                {pendingDuplicates} posible(s) duplicado(s) pendiente(s)
              </span>
            )}
          </div>

          {/* Vista de tarjetas — móvil */}
          <div className="divide-y divide-slate-100 sm:hidden">
            {classified.map((item) => (
              <div key={item.key} className="py-3">
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <p className="font-medium text-slate-700">{item.record.nombre}</p>
                  {item.status === 'duplicate' ? (
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                      {Math.round(item.score * 100)}% dup.
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                      Nuevo
                    </span>
                  )}
                </div>
                <p className="mb-2 text-xs text-slate-400">
                  {item.record.obra || '—'} · Sueldo {item.record.sueldoDiario || '—'} · Días {item.record.diasTrabajados || '—'}
                </p>
                <select
                  value={item.decision || ''}
                  onChange={(e) => updateDecision(item.key, e.target.value)}
                  className="w-full rounded border border-slate-200 px-2 py-2.5 text-sm"
                >
                  <option value="">Pendiente</option>
                  {item.status === 'duplicate' && <option value="merge">Fusionar/Actualizar</option>}
                  <option value="create">Crear como nuevo</option>
                  <option value="skip">Omitir</option>
                </select>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-2">Nombre</th>
                  <th className="py-2 pr-2">Obra</th>
                  <th className="py-2 pr-2">Sueldo</th>
                  <th className="py-2 pr-2">Días</th>
                  <th className="py-2 pr-2">Estado</th>
                  <th className="py-2 pr-2">Decisión</th>
                </tr>
              </thead>
              <tbody>
                {classified.map((item) => (
                  <tr key={item.key} className="border-b border-slate-50">
                    <td className="py-1.5 pr-2 font-medium text-slate-700">{item.record.nombre}</td>
                    <td className="py-1.5 pr-2 text-slate-500">{item.record.obra || '—'}</td>
                    <td className="py-1.5 pr-2 text-slate-500">{item.record.sueldoDiario || '—'}</td>
                    <td className="py-1.5 pr-2 text-slate-500">{item.record.diasTrabajados || '—'}</td>
                    <td className="py-1.5 pr-2">
                      {item.status === 'duplicate' ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Posible duplicado ({Math.round(item.score * 100)}%)
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          Nuevo
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 pr-2">
                      <select
                        value={item.decision || ''}
                        onChange={(e) => updateDecision(item.key, e.target.value)}
                        className="rounded border border-slate-200 px-2 py-1 text-xs"
                      >
                        <option value="">Pendiente</option>
                        {item.status === 'duplicate' && <option value="merge">Fusionar/Actualizar</option>}
                        <option value="create">Crear como nuevo</option>
                        <option value="skip">Omitir</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button onClick={resetAll} className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 sm:py-2">
              Cancelar
            </button>
            <button
              disabled={pendingDuplicates > 0}
              onClick={applyImport}
              className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-300 sm:py-2"
            >
              Aplicar importación
            </button>
          </div>
          {pendingDuplicates > 0 && (
            <p className="mt-2 text-center text-xs text-amber-600 sm:text-right">
              Resuelve los duplicados pendientes en la ventana emergente para continuar.
            </p>
          )}
        </div>
      )}

      {stage === 'done' && summary && (
        <div className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-start sm:p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div className="flex-1 text-sm text-emerald-800">
              <p className="font-semibold">Importación aplicada</p>
              <p>
                {summary.creados} trabajador(es) nuevo(s), {summary.actualizados} actualizado(s),{' '}
                {summary.omitidos} omitido(s).
              </p>
            </div>
          </div>
          <button onClick={resetAll} className="shrink-0 rounded-lg bg-white px-3 py-2 text-xs font-medium text-emerald-700 shadow-sm transition-colors hover:bg-emerald-100 sm:py-1.5">
            Nueva importación
          </button>
        </div>
      )}

      {currentDuplicate && (
        <DuplicateModal
          item={currentDuplicate}
          position={dupIndex + 1}
          total={classified.length}
          onResolve={resolveDuplicate}
        />
      )}
    </div>
  );
}
