import { useMemo } from 'react';
import { Plus, Minus } from 'lucide-react';
import {
  DAY_KEYS,
  DAY_LABELS,
  ATTENDANCE_VALUES,
  diasTrabajados,
  sueldoBase,
  totalNeto,
  currencyMX,
} from '../utils/payroll.js';

function nextAttendanceValue(current) {
  const order = ATTENDANCE_VALUES.map((v) => v.value);
  const idx = order.findIndex((v) => v === current);
  return order[(idx + 1) % order.length];
}

function AttendanceCell({ value, onChange }) {
  const config = ATTENDANCE_VALUES.find((v) => v.value === value) || ATTENDANCE_VALUES[2];
  return (
    <button
      type="button"
      title={`${config.title} — clic para cambiar`}
      onClick={() => onChange(nextAttendanceValue(value))}
      className={`h-9 w-11 rounded-md text-xs font-semibold transition ${config.className} hover:brightness-95 active:scale-95`}
    >
      {config.label}
    </button>
  );
}

export default function AttendanceMatrix({ trabajadores, obras, registrosPorTrabajador, onSetDia, onSetMonto }) {
  const trabajadoresPorObra = useMemo(() => {
    const map = new Map();
    for (const obra of obras) map.set(obra.id, []);
    for (const t of trabajadores) {
      if (!map.has(t.obraId)) map.set(t.obraId, []);
      map.get(t.obraId).push(t);
    }
    return map;
  }, [trabajadores, obras]);

  if (trabajadores.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
        No hay trabajadores para mostrar. Agrega trabajadores o carga los datos de ejemplo.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {obras
        .filter((obra) => (trabajadoresPorObra.get(obra.id) || []).length > 0)
        .map((obra) => {
          const equipo = trabajadoresPorObra.get(obra.id) || [];
          let subtotal = 0;

          return (
            <div key={obra.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between bg-slate-800 px-4 py-3">
                <h3 className="font-semibold text-white">{obra.nombre}</h3>
                <span className="text-xs text-slate-300">{equipo.length} trabajador(es)</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[880px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500">
                      <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2 text-left font-semibold">Trabajador</th>
                      <th className="px-2 py-2 text-right font-semibold">Sueldo Diario</th>
                      {DAY_KEYS.map((k) => (
                        <th key={k} className="px-1 py-2 text-center font-semibold">{DAY_LABELS[k]}</th>
                      ))}
                      <th className="px-2 py-2 text-center font-semibold">Días</th>
                      <th className="px-2 py-2 text-right font-semibold">Sueldo Base</th>
                      <th className="px-2 py-2 text-right font-semibold">Extras (+)</th>
                      <th className="px-2 py-2 text-right font-semibold">Vales (-)</th>
                      <th className="px-2 py-2 text-right font-semibold">Total Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipo.map((trabajador) => {
                      const registro = registrosPorTrabajador.get(trabajador.id);
                      const dias = registro?.dias || {};
                      const extras = registro?.extras || 0;
                      const vales = registro?.vales || 0;
                      const base = sueldoBase(dias, trabajador.sueldoDiario);
                      const neto = totalNeto({ dias, sueldoDiario: trabajador.sueldoDiario, extras, vales });
                      subtotal += neto;

                      return (
                        <tr key={trabajador.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                          <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-slate-700">
                            {trabajador.nombre}
                            <div className="text-xs font-normal text-slate-400">{trabajador.puesto}</div>
                          </td>
                          <td className="px-2 py-2 text-right text-slate-500">{currencyMX(trabajador.sueldoDiario)}</td>
                          {DAY_KEYS.map((key) => (
                            <td key={key} className="px-1 py-2 text-center">
                              <AttendanceCell
                                value={dias[key] ?? 0}
                                onChange={(val) => onSetDia(trabajador.id, key, val)}
                              />
                            </td>
                          ))}
                          <td className="px-2 py-2 text-center font-semibold text-slate-700">
                            {diasTrabajados(dias)}
                          </td>
                          <td className="px-2 py-2 text-right text-slate-600">{currencyMX(base)}</td>
                          <td className="px-1 py-2">
                            <MoneyStepper value={extras} onChange={(v) => onSetMonto(trabajador.id, 'extras', v)} tone="emerald" />
                          </td>
                          <td className="px-1 py-2">
                            <MoneyStepper value={vales} onChange={(v) => onSetMonto(trabajador.id, 'vales', v)} tone="rose" />
                          </td>
                          <td className="px-2 py-2 text-right font-bold text-slate-800">{currencyMX(neto)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-700">
                      <td colSpan={DAY_KEYS.length + 6} className="px-3 py-2 text-right">
                        Subtotal {obra.nombre}
                      </td>
                      <td className="px-2 py-2 text-right">{currencyMX(subtotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        })}
    </div>
  );
}

function MoneyStepper({ value, onChange, tone }) {
  const toneClass = tone === 'emerald' ? 'text-emerald-600' : 'text-rose-600';
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, (Number(value) || 0) - 50))}
        className="rounded bg-slate-100 p-1 text-slate-500 hover:bg-slate-200"
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="number"
        min="0"
        step="10"
        value={value || 0}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className={`w-16 rounded border border-slate-200 px-1 py-1 text-right text-xs ${toneClass}`}
      />
      <button
        type="button"
        onClick={() => onChange((Number(value) || 0) + 50)}
        className="rounded bg-slate-100 p-1 text-slate-500 hover:bg-slate-200"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
}
