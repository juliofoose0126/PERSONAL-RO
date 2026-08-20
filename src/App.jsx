import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  ClipboardList,
  Upload,
  Users,
  Building2,
  Wallet,
  HardHat,
  Sparkles,
  Trash2,
  CalendarPlus,
  Download,
  Menu,
  X,
} from 'lucide-react';

import { usePersistentState, STORAGE_KEYS } from './utils/storage.js';
import { getSampleDataset } from './data/sampleData.js';
import { REAL_OBRAS, REAL_TRABAJADORES } from './data/personalReal.js';
import {
  createEmptyWeek,
  createEmptyRegistro,
  distributeDaysAcrossWeek,
  addDays,
  getMonday,
  groupByObra,
  currencyMX,
} from './utils/payroll.js';
import { normalizeText, nameSimilarity } from './utils/normalize.js';
import { exportNominaToExcel } from './utils/excelExport.js';

import ImportPanel from './components/ImportPanel.jsx';
import AttendanceMatrix from './components/AttendanceMatrix.jsx';
import WorkersPanel from './components/WorkersPanel.jsx';
import ObrasPanel from './components/ObrasPanel.jsx';

const TABS = [
  { id: 'importar', label: 'Importar', icon: Upload },
  { id: 'asistencia', label: 'Asistencia', icon: ClipboardList },
  { id: 'trabajadores', label: 'Trabajadores', icon: Users },
  { id: 'obras', label: 'Obras', icon: Building2 },
  { id: 'nomina', label: 'Nómina', icon: Wallet },
];

export default function App() {
  const [obras, setObras] = usePersistentState(STORAGE_KEYS.obras, REAL_OBRAS);
  const [trabajadores, setTrabajadores] = usePersistentState(STORAGE_KEYS.trabajadores, REAL_TRABAJADORES);
  const [semanas, setSemanas] = usePersistentState(STORAGE_KEYS.semanas, []);
  const [currentWeekId, setCurrentWeekId] = usePersistentState(STORAGE_KEYS.currentWeekId, null);

  const [activeTab, setActiveTab] = useState('importar');
  const [filtroObra, setFiltroObra] = useState('todas');
  const [exporting, setExporting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabRefs = useRef({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  useLayoutEffect(() => {
    const btn = tabRefs.current[activeTab];
    if (btn) setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth, ready: true });
  }, [activeTab]);

  useEffect(() => {
    function syncIndicator() {
      const btn = tabRefs.current[activeTab];
      if (btn) setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth, ready: true });
    }
    window.addEventListener('resize', syncIndicator);
    return () => window.removeEventListener('resize', syncIndicator);
  }, [activeTab]);

  function selectTab(id) {
    setActiveTab(id);
    setMobileMenuOpen(false);
  }

  const currentWeek = useMemo(() => {
    return semanas.find((s) => s.id === currentWeekId) || semanas[0] || null;
  }, [semanas, currentWeekId]);

  const registrosPorTrabajador = useMemo(() => {
    const map = new Map();
    for (const r of currentWeek?.registros || []) map.set(r.trabajadorId, r);
    return map;
  }, [currentWeek]);

  const trabajadoresFiltrados = useMemo(() => {
    return filtroObra === 'todas' ? trabajadores : trabajadores.filter((t) => t.obraId === filtroObra);
  }, [trabajadores, filtroObra]);

  const resumenSemana = useMemo(() => {
    if (!currentWeek) return { grupos: [], total: 0 };
    const grupos = groupByObra(currentWeek, trabajadores, obras);
    const total = grupos.reduce((acc, g) => acc + g.subtotal, 0);
    return { grupos, total };
  }, [currentWeek, trabajadores, obras]);

  // ---------- Obras ----------
  function addObra(nombre) {
    const nueva = { id: uuidv4(), nombre };
    setObras((prev) => [...prev, nueva]);
    return nueva.id;
  }

  function updateObra(id, patch) {
    setObras((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  function deleteObra(id) {
    if (trabajadores.some((t) => t.obraId === id)) {
      alert('No puedes eliminar una obra con trabajadores asignados. Reasígnalos primero.');
      return;
    }
    setObras((prev) => prev.filter((o) => o.id !== id));
  }

  // ---------- Trabajadores ----------
  function addTrabajador(data) {
    const nuevo = { id: uuidv4(), activo: true, ...data };
    setTrabajadores((prev) => [...prev, nuevo]);
    return nuevo.id;
  }

  function updateTrabajador(id, patch) {
    setTrabajadores((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function deleteTrabajador(id) {
    setTrabajadores((prev) => prev.filter((t) => t.id !== id));
    setSemanas((prev) =>
      prev.map((s) => ({ ...s, registros: s.registros.filter((r) => r.trabajadorId !== id) }))
    );
  }

  // ---------- Semana / asistencia ----------
  function ensureCurrentWeek() {
    if (currentWeek) return currentWeek;
    const nueva = createEmptyWeek({});
    setSemanas((prev) => [...prev, nueva]);
    setCurrentWeekId(nueva.id);
    return nueva;
  }

  function updateRegistro(trabajadorId, updater) {
    const week = ensureCurrentWeek();
    setSemanas((prev) =>
      prev.map((s) => {
        if (s.id !== week.id) return s;
        const registros = [...s.registros];
        const idx = registros.findIndex((r) => r.trabajadorId === trabajadorId);
        const base = idx >= 0 ? registros[idx] : createEmptyRegistro(trabajadorId);
        const actualizado = updater(base);
        if (idx >= 0) registros[idx] = actualizado;
        else registros.push(actualizado);
        return { ...s, registros };
      })
    );
  }

  function setDia(trabajadorId, dayKey, value) {
    updateRegistro(trabajadorId, (reg) => ({ ...reg, dias: { ...reg.dias, [dayKey]: value } }));
  }

  function setMonto(trabajadorId, field, value) {
    updateRegistro(trabajadorId, (reg) => ({ ...reg, [field]: value }));
  }

  function crearNuevaSemana() {
    const ultima = [...semanas].sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
    const inicio = ultima ? addDays(new Date(`${ultima.endDate}T00:00:00`), 1) : getMonday(new Date());
    const nueva = createEmptyWeek({ startDate: inicio });
    setSemanas((prev) => [...prev, nueva]);
    setCurrentWeekId(nueva.id);
  }

  // ---------- Datos de ejemplo ----------
  function cargarDatosEjemplo() {
    const sample = getSampleDataset();
    setObras(sample.obras);
    setTrabajadores(sample.trabajadores);
    setSemanas(sample.semanas);
    setCurrentWeekId(sample.semanas[0].id);
    setActiveTab('asistencia');
  }

  function limpiarTodo() {
    if (!confirm('¿Borrar todos los datos guardados (obras, trabajadores y semanas)? Esta acción no se puede deshacer.')) return;
    setObras([]);
    setTrabajadores([]);
    setSemanas([]);
    setCurrentWeekId(null);
  }

  // ---------- Importación inteligente ----------
  function applyImportBatch(items) {
    const obrasLocal = [...obras];
    let trabajadoresLocal = [...trabajadores];
    const week = ensureCurrentWeek();
    const registrosMap = new Map((week.registros || []).map((r) => [r.trabajadorId, { ...r }]));

    let creados = 0;
    let actualizados = 0;
    let omitidos = 0;

    function findOrCreateObra(nombreTexto) {
      const norm = normalizeText(nombreTexto);
      let found = obrasLocal.find((o) => normalizeText(o.nombre) === norm);
      if (!found) found = obrasLocal.find((o) => nameSimilarity(o.nombre, nombreTexto) >= 0.85);
      if (found) return found.id;
      const nueva = { id: uuidv4(), nombre: nombreTexto.trim() };
      obrasLocal.push(nueva);
      return nueva.id;
    }

    for (const item of items) {
      const { record, decision, match } = item;
      if (!decision || decision === 'skip') {
        omitidos++;
        continue;
      }

      let trabajadorId;
      if (decision === 'merge' && match) {
        trabajadorId = match.id;
        const patch = {};
        if (record.puesto) patch.puesto = record.puesto;
        if (record.sueldoDiario) patch.sueldoDiario = record.sueldoDiario;
        if (record.obra) patch.obraId = findOrCreateObra(record.obra);
        trabajadoresLocal = trabajadoresLocal.map((t) => (t.id === trabajadorId ? { ...t, ...patch } : t));
        actualizados++;
      } else {
        const obraId = record.obra
          ? findOrCreateObra(record.obra)
          : obrasLocal[0]?.id || findOrCreateObra('Sin obra asignada');
        const nuevo = {
          id: uuidv4(),
          nombre: record.nombre,
          obraId,
          puesto: record.puesto || '',
          sueldoDiario: record.sueldoDiario || 0,
          activo: true,
        };
        trabajadoresLocal.push(nuevo);
        trabajadorId = nuevo.id;
        creados++;
      }

      if (record.diasTrabajados || record.extras || record.anticipos) {
        const previo = registrosMap.get(trabajadorId);
        registrosMap.set(trabajadorId, {
          trabajadorId,
          dias: record.diasTrabajados ? distributeDaysAcrossWeek(record.diasTrabajados) : previo?.dias || createEmptyRegistro(trabajadorId).dias,
          extras: record.extras || previo?.extras || 0,
          vales: record.anticipos || previo?.vales || 0,
        });
      }
    }

    setObras(obrasLocal);
    setTrabajadores(trabajadoresLocal);
    setSemanas((prev) => prev.map((s) => (s.id === week.id ? { ...s, registros: Array.from(registrosMap.values()) } : s)));

    return { creados, actualizados, omitidos };
  }

  // ---------- Exportar Excel ----------
  async function handleExport() {
    if (!currentWeek || currentWeek.registros.length === 0) {
      alert('No hay datos de asistencia en la semana actual para exportar.');
      return;
    }
    setExporting(true);
    try {
      await exportNominaToExcel({ semana: currentWeek, trabajadores, obras });
    } catch (err) {
      console.error(err);
      alert('Ocurrió un error al generar el archivo Excel.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-600 text-white shadow-md shadow-slate-800/20 transition-transform duration-300 hover:scale-105 sm:h-11 sm:w-11">
              <HardHat className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight tracking-tight text-slate-800 sm:text-lg">Nómina de Obra</h1>
              <p className="hidden text-xs text-slate-500 sm:block">Asistencia, importación y nómina semanal</p>
            </div>
          </div>

          <div className="hidden flex-wrap items-center gap-2 sm:flex">
            <button
              onClick={cargarDatosEjemplo}
              className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-sky-100 hover:shadow-sm active:translate-y-0"
            >
              <Sparkles className="h-4 w-4" /> Cargar datos de ejemplo
            </button>
            <button
              onClick={limpiarTodo}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-500 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-700 hover:shadow-sm active:translate-y-0"
            >
              <Trash2 className="h-4 w-4" /> Borrar todo
            </button>
          </div>

          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={mobileMenuOpen}
            className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors duration-200 hover:bg-slate-100 sm:hidden"
          >
            <Menu className={`absolute h-5 w-5 transition-all duration-200 ${mobileMenuOpen ? 'rotate-90 opacity-0' : 'rotate-0 opacity-100'}`} />
            <X className={`absolute h-5 w-5 transition-all duration-200 ${mobileMenuOpen ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'}`} />
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="animate-slide-down border-t border-slate-200/80 bg-white px-4 pb-4 pt-2 sm:hidden">
            <div className="flex flex-col gap-1">
              {TABS.map((tab, i) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => selectTab(tab.id)}
                    style={{ animationDelay: `${i * 30}ms` }}
                    className={`animate-fade-in-up flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors duration-150 ${
                      active ? 'bg-slate-800 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" /> {tab.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3">
              <button
                onClick={() => { cargarDatosEjemplo(); setMobileMenuOpen(false); }}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm font-medium text-sky-700 transition-colors hover:bg-sky-100"
              >
                <Sparkles className="h-4 w-4" /> Cargar datos de ejemplo
              </button>
              <button
                onClick={() => { limpiarTodo(); setMobileMenuOpen(false); }}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50"
              >
                <Trash2 className="h-4 w-4" /> Borrar todo
              </button>
            </div>
          </div>
        )}

        <nav className="relative mx-auto hidden max-w-7xl gap-1 overflow-x-auto px-4 pb-2 sm:flex sm:px-6">
          <div
            className="absolute bottom-2 h-9 rounded-lg bg-slate-800 shadow-sm transition-all duration-300 ease-out"
            style={{ left: indicator.left, width: indicator.width, opacity: indicator.ready ? 1 : 0 }}
          />
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={(el) => { tabRefs.current[tab.id] = el; }}
                onClick={() => selectTab(tab.id)}
                className={`relative z-10 inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                  active ? 'text-white' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" /> {tab.label}
              </button>
            );
          })}
        </nav>

        <nav className="flex gap-1 overflow-x-auto px-4 pb-2 sm:hidden">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => selectTab(tab.id)}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                  active ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" /> {tab.label}
              </button>
            );
          })}
        </nav>
      </header>

      <main key={activeTab} className="animate-fade-in-up mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <WeekBar
          semanas={semanas}
          currentWeek={currentWeek}
          onSelect={setCurrentWeekId}
          onNueva={crearNuevaSemana}
          filtroObra={filtroObra}
          setFiltroObra={setFiltroObra}
          obras={obras}
          showFiltro={activeTab === 'asistencia'}
        />

        {activeTab === 'importar' && (
          <ImportPanel trabajadores={trabajadores} onApplyImport={applyImportBatch} />
        )}

        {activeTab === 'asistencia' && (
          <AttendanceMatrix
            trabajadores={trabajadoresFiltrados}
            obras={obras}
            registrosPorTrabajador={registrosPorTrabajador}
            onSetDia={setDia}
            onSetMonto={setMonto}
          />
        )}

        {activeTab === 'trabajadores' && (
          <WorkersPanel
            trabajadores={trabajadores}
            obras={obras}
            onAdd={addTrabajador}
            onUpdate={updateTrabajador}
            onDelete={deleteTrabajador}
          />
        )}

        {activeTab === 'obras' && (
          <ObrasPanel
            obras={obras}
            trabajadores={trabajadores}
            onAdd={addObra}
            onUpdate={updateObra}
            onDelete={deleteObra}
          />
        )}

        {activeTab === 'nomina' && (
          <PayrollSummaryView
            resumen={resumenSemana}
            semana={currentWeek}
            onExport={handleExport}
            exporting={exporting}
          />
        )}
      </main>
    </div>
  );
}

function WeekBar({ semanas, currentWeek, onSelect, onNueva, filtroObra, setFiltroObra, obras, showFiltro }) {
  const ordenadas = [...semanas].sort((a, b) => b.startDate.localeCompare(a.startDate));
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-500">Semana:</span>
        {ordenadas.length > 0 ? (
          <select
            value={currentWeek?.id || ''}
            onChange={(e) => onSelect(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-medium text-slate-700"
          >
            {ordenadas.map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        ) : (
          <span className="text-sm text-slate-400">Sin semanas registradas</span>
        )}
        <button
          onClick={onNueva}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
        >
          <CalendarPlus className="h-3.5 w-3.5" /> Nueva semana
        </button>
      </div>

      {showFiltro && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-500">Obra:</span>
          <select
            value={filtroObra}
            onChange={(e) => setFiltroObra(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
          >
            <option value="todas">Todas</option>
            {obras.map((o) => (
              <option key={o.id} value={o.id}>{o.nombre}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function PayrollSummaryView({ resumen, semana, onExport, exporting }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
        <div>
          <h3 className="font-semibold text-slate-800">Resumen de nómina — {semana?.label || 'Sin semana'}</h3>
          <p className="text-sm text-slate-500">Total neto a pagar: <span className="font-semibold text-slate-700">{currencyMX(resumen.total)}</span></p>
        </div>
        <button
          onClick={onExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
        >
          <Download className="h-4 w-4" /> {exporting ? 'Generando…' : 'Descargar Nómina en Excel'}
        </button>
      </div>

      {resumen.grupos.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
          No hay registros de asistencia para esta semana todavía.
        </div>
      )}

      {resumen.grupos.map((g) => (
        <div key={g.obra.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
            <h4 className="font-semibold text-slate-700">{g.obra.nombre}</h4>
            <span className="text-sm font-semibold text-slate-600">{currencyMX(g.subtotal)}</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-400">
                <th className="px-4 py-2">Trabajador</th>
                <th className="px-4 py-2">Puesto</th>
                <th className="px-4 py-2 text-right">Total Neto</th>
              </tr>
            </thead>
            <tbody>
              {g.filas
                .sort((a, b) => a.trabajador.nombre.localeCompare(b.trabajador.nombre, 'es'))
                .map(({ trabajador, neto }) => (
                  <tr key={trabajador.id} className="border-b border-slate-50">
                    <td className="px-4 py-2 text-slate-700">{trabajador.nombre}</td>
                    <td className="px-4 py-2 text-slate-500">{trabajador.puesto || '—'}</td>
                    <td className="px-4 py-2 text-right font-medium text-slate-700">{currencyMX(neto)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
