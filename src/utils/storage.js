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
