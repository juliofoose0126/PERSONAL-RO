import { Fragment, useMemo, useState } from 'react';
import { Users, Plus, Trash2, Pencil, Check, X, Search, ChevronDown, IdCard, HardHat } from 'lucide-react';
import { currencyMX, DAY_KEYS } from '../utils/payroll.js';

const emptyForm = { nombre: '', obraId: '', puesto: '', sueldoSemanal: '', esCabo: false, caboId: '' };

const round2 = (n) => Math.round(n * 100) / 100;
// El foreman captura el sueldo SEMANAL; la app lo divide entre los días
// laborales (Lun–Sáb) para obtener el sueldo diario que usan los cálculos.
const sueldoDiarioDeSemanal = (semanal) => round2((Number(semanal) || 0) / DAY_KEYS.length);
const sueldoSemanalDeDiario = (diario) => (diario ? round2(Number(diario) * DAY_KEYS.length) : '');

export default function WorkersPanel({ trabajadores, obras, onAdd, onUpdate, onDelete }) {
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [busqueda, setBusqueda] = useState('');
  const [filtroObra, setFiltroObra] = useState('todas');
  const [expandedId, setExpandedId] = useState(null);

  const obraNombre = (id) => obras.find((o) => o.id === id)?.nombre || 'Sin obra';
  const caboNombre = (id) => trabajadores.find((t) => t.id === id)?.nombre || '';

  const cabosActivos = useMemo(
    () => trabajadores.filter((t) => t.esCabo && t.activo !== false).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [trabajadores]
  );

  const filtrados = useMemo(() => {
    return trabajadores
      .filter((t) => (filtroObra === 'todas' ? true : t.obraId === filtroObra))
      .filter((t) => t.nombre.toLowerCase().includes(busqueda.toLowerCase()))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [trabajadores, busqueda, filtroObra]);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.obraId) return;
    onAdd({
      nombre: form.nombre.trim(),
      obraId: form.obraId,
      puesto: form.puesto.trim(),
      sueldoDiario: sueldoDiarioDeSemanal(form.sueldoSemanal),
      activo: true,
      esCabo: form.esCabo,
      caboId: form.esCabo ? null : form.caboId || null,
    });
    setForm(emptyForm);
  };

  const startEdit = (t) => {
    setEditId(t.id);
    setEditForm({
      nombre: t.nombre,
      obraId: t.obraId,
      puesto: t.puesto || '',
      sueldoSemanal: sueldoSemanalDeDiario(t.sueldoDiario),
      esCabo: !!t.esCabo,
      caboId: t.caboId || '',
    });
  };

  const saveEdit = () => {
    onUpdate(editId, {
      nombre: editForm.nombre.trim(),
      obraId: editForm.obraId,
      puesto: editForm.puesto.trim(),
      sueldoDiario: sueldoDiarioDeSemanal(editForm.sueldoSemanal),
      esCabo: editForm.esCabo,
      caboId: editForm.esCabo ? null : editForm.caboId || null,
    });
    setEditId(null);
  };

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-slate-500" />
        <h3 className="font-semibold text-slate-800">Trabajadores</h3>
        <span className="ml-auto text-xs text-slate-400">{trabajadores.length} total</span>
      </div>

      <form onSubmit={handleAdd} className="mb-5 grid grid-cols-1 gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-5">
        <input
          placeholder="Nombre completo"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          className="rounded border border-slate-200 px-3 py-2.5 text-sm sm:col-span-2 sm:py-2"
        />
        <select
          value={form.obraId}
          onChange={(e) => setForm({ ...form, obraId: e.target.value })}
          className="rounded border border-slate-200 px-3 py-2.5 text-sm sm:py-2"
        >
          <option value="">Obra…</option>
          {obras.map((o) => (
            <option key={o.id} value={o.id}>{o.nombre}</option>
          ))}
        </select>
        <input
          placeholder="Puesto"
          value={form.puesto}
          onChange={(e) => setForm({ ...form, puesto: e.target.value })}
          className="rounded border border-slate-200 px-3 py-2.5 text-sm sm:py-2"
        />
        <div>
          <input
            type="number"
            min="0"
            placeholder="Sueldo semanal"
            value={form.sueldoSemanal}
            onChange={(e) => setForm({ ...form, sueldoSemanal: e.target.value })}
            className="w-full rounded border border-slate-200 px-3 py-2.5 text-sm sm:py-2"
          />
          {!!Number(form.sueldoSemanal) && (
            <p className="mt-1 text-[11px] text-slate-400">= {currencyMX(sueldoDiarioDeSemanal(form.sueldoSemanal))}/día</p>
          )}
        </div>

        <div className="flex flex-col gap-2 sm:col-span-5 sm:flex-row sm:items-center sm:gap-4">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.esCabo}
              onChange={(e) => setForm({ ...form, esCabo: e.target.checked, caboId: '' })}
              className="h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-slate-500"
            />
            ¿Es Cabo / Encargado?
          </label>
          {!form.esCabo && (
            <select
              value={form.caboId}
              onChange={(e) => setForm({ ...form, caboId: e.target.value })}
              className="flex-1 rounded border border-slate-200 px-3 py-2.5 text-sm sm:py-2"
            >
              <option value="">Sin cabo asignado (pago directo)</option>
              {cabosActivos.map((c) => (
                <option key={c.id} value={c.id}>Cuadrilla de {c.nombre}</option>
              ))}
            </select>
          )}
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-800 px-3 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-700 active:scale-[0.99] sm:col-span-5 sm:py-2"
        >
          <Plus className="h-4 w-4" /> Agregar trabajador
        </button>
      </form>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-3 h-4 w-4 text-slate-400 sm:top-2.5" />
          <input
            placeholder="Buscar por nombre…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-8 pr-3 text-sm sm:py-2"
          />
        </div>
        <select
          value={filtroObra}
          onChange={(e) => setFiltroObra(e.target.value)}
          className="rounded-lg border border-slate-200 px-2 py-2.5 text-sm sm:py-2"
        >
          <option value="todas">Todas las obras</option>
          {obras.map((o) => (
            <option key={o.id} value={o.id}>{o.nombre}</option>
          ))}
        </select>
      </div>

      {filtrados.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-400">No hay trabajadores que coincidan.</p>
      )}

      {/* Vista de tarjetas — móvil */}
      <div className="divide-y divide-slate-100 sm:hidden">
        {filtrados.map((t) => (
          <div key={t.id} className="py-3">
            {editId === t.id ? (
              <div className="space-y-2 rounded-lg border border-sky-200 bg-sky-50/40 p-3">
                <input
                  value={editForm.nombre}
                  onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                  className="w-full rounded border border-sky-300 px-3 py-2.5 text-sm"
                  placeholder="Nombre completo"
                />
                <select
                  value={editForm.obraId}
                  onChange={(e) => setEditForm({ ...editForm, obraId: e.target.value })}
                  className="w-full rounded border border-sky-300 px-3 py-2.5 text-sm"
                >
                  {obras.map((o) => (
                    <option key={o.id} value={o.id}>{o.nombre}</option>
                  ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={editForm.puesto}
                    onChange={(e) => setEditForm({ ...editForm, puesto: e.target.value })}
                    className="rounded border border-sky-300 px-3 py-2.5 text-sm"
                    placeholder="Puesto"
                  />
                  <div>
                    <input
                      type="number"
                      value={editForm.sueldoSemanal}
                      onChange={(e) => setEditForm({ ...editForm, sueldoSemanal: e.target.value })}
                      className="w-full rounded border border-sky-300 px-3 py-2.5 text-right text-sm"
                      placeholder="Sueldo semanal"
                    />
                    {!!Number(editForm.sueldoSemanal) && (
                      <p className="mt-1 text-right text-[11px] text-slate-400">= {currencyMX(sueldoDiarioDeSemanal(editForm.sueldoSemanal))}/día</p>
                    )}
                  </div>
                </div>

                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={editForm.esCabo}
                    onChange={(e) => setEditForm({ ...editForm, esCabo: e.target.checked, caboId: '' })}
                    className="h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-slate-500"
                  />
                  ¿Es Cabo / Encargado?
                </label>
                {!editForm.esCabo && (
                  <select
                    value={editForm.caboId}
                    onChange={(e) => setEditForm({ ...editForm, caboId: e.target.value })}
                    className="w-full rounded border border-sky-300 px-3 py-2.5 text-sm"
                  >
                    <option value="">Sin cabo asignado (pago directo)</option>
                    {cabosActivos.filter((c) => c.id !== editId).map((c) => (
                      <option key={c.id} value={c.id}>Cuadrilla de {c.nombre}</option>
                    ))}
                  </select>
                )}

                <div className="flex gap-2 pt-1">
                  <button onClick={saveEdit} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white">
                    <Check className="h-4 w-4" /> Guardar
                  </button>
                  <button onClick={() => setEditId(null)} className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-500">
                    <X className="h-4 w-4" /> Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => t.imss && toggleExpand(t.id)}
                    className="flex min-w-0 flex-1 items-start gap-1.5 text-left"
                  >
                    {t.imss && (
                      <ChevronDown className={`mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 ${expandedId === t.id ? 'rotate-180' : ''}`} />
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate font-medium text-slate-700">{t.nombre}</span>
                        {t.esCabo && (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">
                            <HardHat className="h-2.5 w-2.5" /> Cabo
                          </span>
                        )}
                        {t.imss?.estatus === 'BAJA' && (
                          <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-500">BAJA</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">
                        {obraNombre(t.obraId)} · {t.puesto || '—'}
                        {!t.esCabo && t.caboId && <> · Cuadrilla de {caboNombre(t.caboId) || '—'}</>}
                      </p>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold text-slate-600">{currencyMX(t.sueldoDiario)}</span>
                    <button onClick={() => startEdit(t)} className="rounded p-2 text-slate-400 hover:bg-slate-100">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => onDelete(t.id)} className="rounded p-2 text-rose-400 hover:bg-rose-50">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {expandedId === t.id && t.imss && (
                  <div className="animate-fade-in mt-2 rounded-lg bg-slate-50/70 p-3">
                    <div className="flex items-start gap-2">
                      <IdCard className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-2 text-xs">
                        <Dato label="NSS" value={t.imss.nss} />
                        <Dato label="RFC" value={t.imss.rfc} />
                        <Dato label="CURP" value={t.imss.curp} />
                        <Dato label="Registro patronal" value={t.imss.registroPatronal} />
                        <Dato label="Fecha inicio" value={t.imss.fechaInicio} />
                        <Dato label="Fecha baja" value={t.imss.fechaBaja} />
                        <Dato label="Estatus" value={t.imss.estatus} />
                        <Dato
                          label="Documentos"
                          value={`INE:${t.imss.documentos?.ine || '—'} · CURP:${t.imss.documentos?.curp || '—'} · CSF:${t.imss.documentos?.csf || '—'}`}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Vista de tabla — escritorio */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2 pr-2">Nombre</th>
              <th className="py-2 pr-2">Obra</th>
              <th className="py-2 pr-2">Puesto</th>
              <th className="py-2 pr-2">Cabo</th>
              <th className="py-2 pr-2 text-right">Sueldo diario</th>
              <th className="py-2 pr-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((t) => (
              <Fragment key={t.id}>
              <tr className="border-b border-slate-50 hover:bg-slate-50/60">
                {editId === t.id ? (
                  <>
                    <td className="py-1.5 pr-2">
                      <input
                        value={editForm.nombre}
                        onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                        className="w-full rounded border border-sky-300 px-2 py-1"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <select
                        value={editForm.obraId}
                        onChange={(e) => setEditForm({ ...editForm, obraId: e.target.value })}
                        className="w-full rounded border border-sky-300 px-2 py-1"
                      >
                        {obras.map((o) => (
                          <option key={o.id} value={o.id}>{o.nombre}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        value={editForm.puesto}
                        onChange={(e) => setEditForm({ ...editForm, puesto: e.target.value })}
                        className="w-full rounded border border-sky-300 px-2 py-1"
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <label className="mb-1 inline-flex items-center gap-1 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={editForm.esCabo}
                          onChange={(e) => setEditForm({ ...editForm, esCabo: e.target.checked, caboId: '' })}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-slate-800 focus:ring-slate-500"
                        />
                        Cabo
                      </label>
                      {!editForm.esCabo && (
                        <select
                          value={editForm.caboId}
                          onChange={(e) => setEditForm({ ...editForm, caboId: e.target.value })}
                          className="w-full rounded border border-sky-300 px-1.5 py-1 text-xs"
                        >
                          <option value="">Sin cabo</option>
                          {cabosActivos.filter((c) => c.id !== editId).map((c) => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        type="number"
                        value={editForm.sueldoSemanal}
                        onChange={(e) => setEditForm({ ...editForm, sueldoSemanal: e.target.value })}
                        title="Sueldo semanal"
                        className="w-24 rounded border border-sky-300 px-2 py-1 text-right"
                      />
                      {!!Number(editForm.sueldoSemanal) && (
                        <p className="mt-0.5 text-right text-[10px] text-slate-400">= {currencyMX(sueldoDiarioDeSemanal(editForm.sueldoSemanal))}/día</p>
                      )}
                    </td>
                    <td className="flex gap-1 py-1.5">
                      <button onClick={saveEdit} className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditId(null)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100">
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-1.5">
                        {t.imss && (
                          <button
                            onClick={() => toggleExpand(t.id)}
                            className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                            title="Ver datos IMSS"
                          >
                            <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${expandedId === t.id ? 'rotate-180' : ''}`} />
                          </button>
                        )}
                        <span className="font-medium text-slate-700">{t.nombre}</span>
                        {t.imss?.estatus === 'BAJA' && (
                          <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-500">BAJA</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-2 text-slate-500">{obraNombre(t.obraId)}</td>
                    <td className="py-2 pr-2 text-slate-500">{t.puesto || '—'}</td>
                    <td className="py-2 pr-2 text-slate-500">
                      {t.esCabo ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600">
                          <HardHat className="h-3 w-3" /> Cabo
                        </span>
                      ) : t.caboId ? (
                        caboNombre(t.caboId) || '—'
                      ) : (
                        <span className="text-slate-400">Sin cabo</span>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-right text-slate-600">{currencyMX(t.sueldoDiario)}</td>
                    <td className="py-2">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => startEdit(t)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => onDelete(t.id)} className="rounded p-1.5 text-rose-400 hover:bg-rose-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
              {expandedId === t.id && t.imss && (
                <tr className="animate-fade-in border-b border-slate-50 bg-slate-50/70">
                  <td colSpan={6} className="px-3 py-3">
                    <div className="flex items-start gap-2">
                      <IdCard className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                      <div className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
                        <Dato label="NSS" value={t.imss.nss} />
                        <Dato label="RFC" value={t.imss.rfc} />
                        <Dato label="CURP" value={t.imss.curp} />
                        <Dato label="Registro patronal" value={t.imss.registroPatronal} />
                        <Dato label="Fecha inicio" value={t.imss.fechaInicio} />
                        <Dato label="Fecha baja" value={t.imss.fechaBaja} />
                        <Dato label="Estatus" value={t.imss.estatus} />
                        <Dato
                          label="Documentos"
                          value={`INE:${t.imss.documentos?.ine || '—'} · CURP:${t.imss.documentos?.curp || '—'} · CSF:${t.imss.documentos?.csf || '—'}`}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Dato({ label, value }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-slate-600">{value || '—'}</div>
    </div>
  );
}
