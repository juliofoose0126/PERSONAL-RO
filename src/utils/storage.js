import { useEffect, useState } from 'react';

const PREFIX = 'nomina_obra_';

export const STORAGE_KEYS = {
  obras: `${PREFIX}obras`,
  trabajadores: `${PREFIX}trabajadores`,
  semanas: `${PREFIX}semanas`,
  currentWeekId: `${PREFIX}current_week_id`,
};

export function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`No se pudo guardar en localStorage (${key})`, err);
  }
}

// Hook genérico: estado sincronizado automáticamente con localStorage.
export function usePersistentState(key, initialValue) {
  const [state, setState] = useState(() => readStorage(key, initialValue));

  useEffect(() => {
    writeStorage(key, state);
  }, [key, state]);

  return [state, setState];
}

// Respaldo/restauración manual de todos los datos de la app en un archivo
// .json. Los datos viven únicamente en el localStorage de este navegador —
// no hay servidor — así que si el sitio se abre desde un dominio distinto
// (p. ej. una URL de preview distinta a la de producción) o se borran los
// datos del sitio, este respaldo es la única forma de recuperarlos.
export function buildBackup({ obras, trabajadores, semanas, currentWeekId }) {
  return {
    tipo: 'respaldo-nomina-obra',
    version: 1,
    exportadoEn: new Date().toISOString(),
    obras,
    trabajadores,
    semanas,
    currentWeekId,
  };
}

export function parseBackup(jsonText) {
  let data;
  try {
    data = JSON.parse(jsonText);
  } catch {
    throw new Error('El archivo no es un JSON válido.');
  }
  if (!data || !Array.isArray(data.obras) || !Array.isArray(data.trabajadores) || !Array.isArray(data.semanas)) {
    throw new Error('El archivo no tiene el formato de un respaldo de esta app.');
  }
  return data;
}
