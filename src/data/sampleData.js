import { createEmptyWeek, getMonday, toISODate } from '../utils/payroll.js';

export const SAMPLE_OBRAS = [
  { id: 'obra_1', nombre: 'Residencial Las Palmas' },
  { id: 'obra_2', nombre: 'Plaza Comercial Vista Sur' },
  { id: 'obra_3', nombre: 'Puente Río Verde' },
];

export const SAMPLE_TRABAJADORES = [
  { id: 'trab_1', nombre: 'Juan Carlos Pérez López', obraId: 'obra_1', puesto: 'Albañil', sueldoDiario: 450, activo: true },
  { id: 'trab_2', nombre: 'María Guadalupe Torres Ramírez', obraId: 'obra_1', puesto: 'Ayudante General', sueldoDiario: 350, activo: true },
  { id: 'trab_3', nombre: 'Roberto Hernández Cruz', obraId: 'obra_2', puesto: 'Electricista', sueldoDiario: 520, activo: true },
  { id: 'trab_4', nombre: 'Luis Fernando Gómez Silva', obraId: 'obra_2', puesto: 'Plomero', sueldoDiario: 480, activo: true },
  { id: 'trab_5', nombre: 'Alejandro Martínez Ortiz', obraId: 'obra_3', puesto: 'Operador de Maquinaria', sueldoDiario: 600, activo: true },
  { id: 'trab_6', nombre: 'Pedro Antonio Sánchez Vega', obraId: 'obra_3', puesto: 'Soldador', sueldoDiario: 550, activo: true },
];

function buildSampleWeek() {
  const monday = getMonday(new Date());
  const week = createEmptyWeek({ startDate: monday, id: 'sem_ejemplo' });

  const asistencias = {
    trab_1: { dias: { lun: 1, mar: 1, mie: 1, jue: 1, vie: 1, sab: 0.5 }, extras: 200, vales: 300 },
    trab_2: { dias: { lun: 1, mar: 1, mie: 0.5, jue: 1, vie: 1, sab: 0 }, extras: 0, vales: 150 },
    trab_3: { dias: { lun: 1, mar: 1, mie: 1, jue: 1, vie: 1, sab: 1 }, extras: 350, vales: 0 },
    trab_4: { dias: { lun: 1, mar: 0, mie: 1, jue: 1, vie: 1, sab: 0.5 }, extras: 0, vales: 200 },
    trab_5: { dias: { lun: 1, mar: 1, mie: 1, jue: 'P', vie: 1, sab: 1 }, extras: 500, vales: 400 },
    trab_6: { dias: { lun: 1, mar: 1, mie: 1, jue: 1, vie: 0.5, sab: 0 }, extras: 100, vales: 0 },
  };

  week.registros = SAMPLE_TRABAJADORES.map((t) => ({
    trabajadorId: t.id,
    dias: asistencias[t.id].dias,
    extras: asistencias[t.id].extras,
    vales: asistencias[t.id].vales,
  }));

  return week;
}

export function getSampleDataset() {
  return {
    obras: SAMPLE_OBRAS,
    trabajadores: SAMPLE_TRABAJADORES,
    semanas: [buildSampleWeek()],
  };
}

export { toISODate };
