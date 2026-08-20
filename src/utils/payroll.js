// Cálculos financieros de nómina y utilidades de semana laboral.

export const DAY_KEYS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab'];

export const DAY_LABELS = {
  lun: 'Lun',
  mar: 'Mar',
  mie: 'Mié',
  jue: 'Jue',
  vie: 'Vie',
  sab: 'Sáb',
};

export const ATTENDANCE_VALUES = [
  { value: 1, label: '1.0', title: 'Día completo', className: 'bg-emerald-100 text-emerald-700' },
  { value: 0.5, label: '0.5', title: 'Medio día', className: 'bg-amber-100 text-amber-700' },
  { value: 0, label: '0', title: 'Falta', className: 'bg-rose-100 text-rose-700' },
  { value: 'P', label: 'P', title: 'Permiso', className: 'bg-sky-100 text-sky-700' },
];

// Distribuye un total de días trabajados (proveniente de una importación que
// no trae el detalle día a día) en la matriz semanal Lun-Sáb, de forma
// determinista: llena días completos de izquierda a derecha y, si sobra
// una fracción de 0.5, la coloca en el siguiente día disponible.
export function distributeDaysAcrossWeek(totalDias) {
  const dias = emptyWeekDays();
  let restante = Math.max(0, Math.min(Number(totalDias) || 0, DAY_KEYS.length));

  for (const key of DAY_KEYS) {
    if (restante <= 0) break;
    if (restante >= 1) {
      dias[key] = 1;
      restante -= 1;
    } else {
      dias[key] = 0.5;
      restante -= 0.5;
    }
  }
  return dias;
}

export function emptyWeekDays() {
  return DAY_KEYS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
}

// Suma solo valores numéricos; 'P' (permiso) no suma día trabajado.
export function diasTrabajados(dias = {}) {
  return DAY_KEYS.reduce((total, key) => {
    const v = dias[key];
    return total + (typeof v === 'number' ? v : 0);
  }, 0);
}

export function sueldoBase(dias, sueldoDiario) {
  return diasTrabajados(dias) * (Number(sueldoDiario) || 0);
}

export function totalNeto({ dias, sueldoDiario, extras = 0, vales = 0 }) {
  return sueldoBase(dias, sueldoDiario) + (Number(extras) || 0) - (Number(vales) || 0);
}

export function currencyMX(value) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(Number(value) || 0);
}

// Lunes de la semana ISO que contiene `date`.
export function getMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

export function toISODate(date) {
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

export function formatDateEs(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function weekLabel(startISO, endISO) {
  return `${formatDateEs(startISO)} – ${formatDateEs(endISO)}`;
}

export function createEmptyWeek({ startDate, id, label } = {}) {
  const start = startDate ? new Date(startDate) : getMonday(new Date());
  const startISO = toISODate(start);
  const endISO = toISODate(addDays(start, 5));
  return {
    id: id || `sem_${Date.now()}`,
    label: label || weekLabel(startISO, endISO),
    startDate: startISO,
    endDate: endISO,
    registros: [],
  };
}

export function findRegistro(semana, trabajadorId) {
  return semana?.registros.find((r) => r.trabajadorId === trabajadorId);
}

export function createEmptyRegistro(trabajadorId) {
  return {
    trabajadorId,
    dias: emptyWeekDays(),
    extras: 0,
    vales: 0,
  };
}

// Agrupa registros de una semana por obra, con subtotales.
export function groupByObra(semana, trabajadores, obras) {
  const trabajadorPorId = new Map(trabajadores.map((t) => [t.id, t]));
  const groups = new Map();

  for (const obra of obras) {
    groups.set(obra.id, { obra, filas: [], subtotal: 0 });
  }

  for (const registro of semana?.registros || []) {
    const trabajador = trabajadorPorId.get(registro.trabajadorId);
    if (!trabajador) continue;
    const obraId = trabajador.obraId;
    if (!groups.has(obraId)) {
      groups.set(obraId, {
        obra: obras.find((o) => o.id === obraId) || { id: obraId, nombre: 'Sin obra' },
        filas: [],
        subtotal: 0,
      });
    }
    const neto = totalNeto({
      dias: registro.dias,
      sueldoDiario: trabajador.sueldoDiario,
      extras: registro.extras,
      vales: registro.vales,
    });
    const group = groups.get(obraId);
    group.filas.push({ trabajador, registro, neto });
    group.subtotal += neto;
  }

  return Array.from(groups.values())
    .filter((g) => g.filas.length > 0)
    .sort((a, b) => a.obra.nombre.localeCompare(b.obra.nombre, 'es'));
}

// Agrupa los registros de una semana por Cabo/Encargado: cada grupo trae el
// desglose de su cuadrilla, el pago del propio cabo (si tiene registro) y el
// total acumulado a entregarle para que él haga la repartición. Los
// trabajadores sin cabo asignado (pago directo) se devuelven aparte.
export function groupByCabo(semana, trabajadores) {
  const trabajadorPorId = new Map(trabajadores.map((t) => [t.id, t]));
  const gruposPorCaboId = new Map();
  const sinCabo = { filas: [], subtotal: 0 };

  const getOrCreateGrupo = (cabo) => {
    if (!gruposPorCaboId.has(cabo.id)) {
      gruposPorCaboId.set(cabo.id, { cabo, filas: [], caboFila: null, equipoSubtotal: 0 });
    }
    return gruposPorCaboId.get(cabo.id);
  };

  for (const registro of semana?.registros || []) {
    const trabajador = trabajadorPorId.get(registro.trabajadorId);
    if (!trabajador) continue;
    const neto = totalNeto({
      dias: registro.dias,
      sueldoDiario: trabajador.sueldoDiario,
      extras: registro.extras,
      vales: registro.vales,
    });
    const fila = { trabajador, registro, neto };

    if (trabajador.esCabo) {
      const grupo = getOrCreateGrupo(trabajador);
      grupo.caboFila = fila;
      continue;
    }

    const cabo = trabajador.caboId ? trabajadorPorId.get(trabajador.caboId) : null;
    if (cabo && cabo.esCabo) {
      const grupo = getOrCreateGrupo(cabo);
      grupo.filas.push(fila);
      grupo.equipoSubtotal += neto;
    } else {
      sinCabo.filas.push(fila);
      sinCabo.subtotal += neto;
    }
  }

  const grupos = Array.from(gruposPorCaboId.values())
    .map((g) => ({
      ...g,
      totalCabo: g.equipoSubtotal + (g.caboFila?.neto || 0),
    }))
    .sort((a, b) => a.cabo.nombre.localeCompare(b.cabo.nombre, 'es'));

  return { grupos, sinCabo };
}
