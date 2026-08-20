import { useState } from 'react';
import { Building2, Plus, Trash2, Pencil, Check, X } from 'lucide-react';

export default function ObrasPanel({ obras, trabajadores, onAdd, onUpdate, onDelete }) {
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [editId, setEditId] = useState(null);
  const [editNombre, setEditNombre] = useState('');

  const contarTrabajadores = (obraId) => trabajadores.filter((t) => t.obraId === obraId).length;

  const handleAdd = (e) => {
    e.preventDefault();
    const nombre = nuevoNombre.trim();
    if (!nombre) return;
    onAdd(nombre);
    setNuevoNombre('');
  };

  const startEdit = (obra) => {
    setEditId(obra.id);
    setEditNombre(obra.nombre);
  };

  const saveEdit = () => {
    if (editNombre.trim()) onUpdate(editId, { nombre: editNombre.trim() });
    setEditId(null);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <Building2 className="h-5 w-5 text-slate-500" />
        <h3 className="font-semibold text-slate-800">Obras / Frentes de trabajo</h3>
      </div>

      <form onSubmit={handleAdd} className="mb-4 flex gap-2">
        <input
          value={nuevoNombre}
          onChange={(e) => setNuevoNombre(e.target.value)}
          placeholder="Nombre de la nueva obra"
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          <Plus className="h-4 w-4" /> Agregar
        </button>
      </form>

      <ul className="divide-y divide-slate-100">
        {obras.map((obra) => (
          <li key={obra.id} className="flex items-center justify-between gap-2 py-2">
            {editId === obra.id ? (
              <input
                autoFocus
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                className="flex-1 rounded border border-sky-300 px-2 py-1 text-sm"
              />
            ) : (
              <div>
                <p className="text-sm font-medium text-slate-700">{obra.nombre}</p>
                <p className="text-xs text-slate-400">{contarTrabajadores(obra.id)} trabajador(es)</p>
              </div>
            )}
            <div className="flex shrink-0 gap-1">
              {editId === obra.id ? (
                <>
                  <button onClick={saveEdit} className="rounded p-1.5 text-emerald-600 hover:bg-emerald-50">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditId(null)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100">
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => startEdit(obra)} className="rounded p-1.5 text-slate-400 hover:bg-slate-100">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDelete(obra.id)}
                    className="rounded p-1.5 text-rose-400 hover:bg-rose-50"
                    title={contarTrabajadores(obra.id) > 0 ? 'Reasigna a sus trabajadores antes de eliminar' : 'Eliminar'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
        {obras.length === 0 && <p className="py-4 text-center text-sm text-slate-400">Aún no hay obras registradas.</p>}
      </ul>
    </div>
  );
}
