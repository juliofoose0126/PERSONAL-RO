import { AlertTriangle, GitMerge, UserPlus, XCircle } from 'lucide-react';
import { currencyMX } from '../utils/payroll.js';

// Modal interactivo que aparece cuando se detecta un posible trabajador
// repetido durante la importación. Ofrece 3 acciones: fusionar/actualizar,
// crear como nuevo, u omitir/descartar.
export default function DuplicateModal({ item, total, position, onResolve }) {
  if (!item) return null;
  const { record, match, score } = item;
  const pct = Math.round(score * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 rounded-t-2xl bg-amber-50 px-6 py-4 border-b border-amber-200">
          <AlertTriangle className="h-6 w-6 shrink-0 text-amber-500" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-800">Posible trabajador repetido</h2>
            <p className="text-sm text-slate-500">
              Registro {position} de {total} · Coincidencia del {pct}%
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Registro importado
            </p>
            <p className="text-base font-semibold text-slate-800">{record.nombre || '—'}</p>
            <dl className="mt-2 space-y-1 text-sm text-slate-600">
              {record.obra && (
                <div className="flex justify-between"><dt>Obra</dt><dd>{record.obra}</dd></div>
              )}
              {record.puesto && (
                <div className="flex justify-between"><dt>Puesto</dt><dd>{record.puesto}</dd></div>
              )}
              {!!record.sueldoDiario && (
                <div className="flex justify-between"><dt>Sueldo diario</dt><dd>{currencyMX(record.sueldoDiario)}</dd></div>
              )}
              {!!record.diasTrabajados && (
                <div className="flex justify-between"><dt>Días</dt><dd>{record.diasTrabajados}</dd></div>
              )}
            </dl>
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-sky-500">
              Trabajador existente
            </p>
            <p className="text-base font-semibold text-slate-800">{match?.nombre}</p>
            <dl className="mt-2 space-y-1 text-sm text-slate-600">
              <div className="flex justify-between"><dt>Puesto</dt><dd>{match?.puesto || '—'}</dd></div>
              <div className="flex justify-between"><dt>Sueldo diario</dt><dd>{currencyMX(match?.sueldoDiario)}</dd></div>
            </dl>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            onClick={() => onResolve('skip')}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <XCircle className="h-4 w-4" /> Omitir / Descartar
          </button>
          <button
            onClick={() => onResolve('create')}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <UserPlus className="h-4 w-4" /> Crear como nuevo
          </button>
          <button
            onClick={() => onResolve('merge')}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700"
          >
            <GitMerge className="h-4 w-4" /> Fusionar / Actualizar
          </button>
        </div>
      </div>
    </div>
  );
}
