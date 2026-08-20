import { useMemo, useState } from 'react';
import { Users, Plus, Trash2, Pencil, Check, X, Search } from 'lucide-react';
import { currencyMX } from '../utils/payroll.js';

const emptyForm = { nombre: '', obraId: '', puesto: '', sueldoDiario: '' };

export default function WorkersPanel({ trabajadores, obras, onAdd, onUpdate, onDelete }) {
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [busqueda, setBusqueda] = useState('');
  const [filtroObra, setFiltroObra] = useState('todas');

  const obraNombre = (id) => obras.find((o) => o.id === id)?.nombre || 'Sin obra';

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
      sueldoDiario: Number(form.sueldoDiario) || 0,
      activo: true,
    });
    setForm(emptyForm);
  };

  const startEdit = (t) => {
    setEditId(t.id);
    setEditForm({ nombre: t.nombre, obraId: t.obraId, puesto: t.puesto || '', sueldoDiario: t.sueldoDiario });
  };

  const saveEdit = () => {
    onUpdate(editId, {
      nombre: editForm.nombre.trim(),
      obraId: editForm.obraId,
      puesto: editForm.puesto.trim(),
      sueldoDiario: Number(editForm.sueldoDiario) || 0,
    });
    setEditId(null);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-slate-500" />
        <h3 className="font-semibold text-slate-800">Trabajadores</h3>
      </div>

      <form onSubmit={handleAdd} className="mb-5 grid grid-cols-1 gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-5">
        <input
          placeholder="Nombre completo"
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          className="rounded border border-slate-200 px-2 py-2 text-sm sm:col-span-2"
        />
        <select
          value={form.obraId}
          onChange={(e) => setForm({ ...form, obraId: e.target.value })}
          className="rounded border border-slate-200 px-2 py-2 text-sm"
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
          className="rounded border border-slate-200 px-2 py-2 text-sm"
        />
        <input
          type="number"
          min="0"
          placeholder="Sueldo diario"
          value={form.sueldoDiario}
          onChange={(e) => setForm({ ...form, sueldoDiario: e.target.value })}
          className="rounded border border-slate-200 px-2 py-2 text-sm"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 sm:col-span-5"
        >
          <Plus className="h-4 w-4" /> Agregar trabajador
        </button>
      </form>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <input
            placeholder="Buscar por nombre…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-2 pl-8 pr-3 text-sm"
          />
        </div>
        <select
          value={filtroObra}
          onChange={(e) => setFiltroObra(e.target.value)}
          className="rounded-lg border border-slate-200 px-2 py-2 text-sm"
        >
          <option value="todas">Todas las obras</option>
          {obras.map((o) => (
            <option key={o.id} value={o.id}>{o.nombre}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2 pr-2">Nombre</th>
              <th className="py-2 pr-2">Obra</th>
              <th className="py-2 pr-2">Puesto</th>
              <th className="py-2 pr-2 text-right">Sueldo diario</th>
              <th className="py-2 pr-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((t) => (
              <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50/60">
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
                      <input
                        type="number"
                        value={editForm.sueldoDiario}
                        onChange={(e) => setEditForm({ ...editForm, sueldoDiario: e.target.value })}
                        className="w-24 rounded border border-sky-300 px-2 py-1 text-right"
                      />
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
                    <td className="py-2 pr-2 font-medium text-slate-700">{t.nombre}</td>
                    <td className="py-2 pr-2 text-slate-500">{obraNombre(t.obraId)}</td>
                    <td className="py-2 pr-2 text-slate-500">{t.puesto || '—'}</td>
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
            ))}
          </tbody>
        </table>
        {filtrados.length === 0 && (
          <p className="py-6 text-center text-sm text-slate-400">No hay trabajadores que coincidan.</p>
        )}
      </div>
    </div>
  );
}
