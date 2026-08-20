import { nameSimilarity, DUPLICATE_THRESHOLD } from './normalize.js';

// Para cada registro importado, busca el/los trabajadores existentes más
// parecidos por nombre (comparación difusa, sin acentos/mayúsculas/espacios).
export function findBestMatch(record, trabajadores) {
  let best = null;
  for (const trabajador of trabajadores) {
    const score = nameSimilarity(record.nombre, trabajador.nombre);
    if (!best || score > best.score) {
      best = { trabajador, score };
    }
  }
  return best;
}

// Clasifica un lote de registros importados en:
//  - "duplicate": similitud >= umbral -> requiere decisión del usuario
//  - "new": sin coincidencia suficiente -> se puede crear directo
export function classifyImportBatch(records, trabajadores) {
  return records.map((record, index) => {
    const match = trabajadores.length > 0 ? findBestMatch(record, trabajadores) : null;
    const isDuplicate = match && match.score >= DUPLICATE_THRESHOLD;
    return {
      key: `import_${index}_${Date.now()}`,
      record,
      match: isDuplicate ? match.trabajador : null,
      score: match?.score ?? 0,
      status: isDuplicate ? 'duplicate' : 'new',
      decision: null, // 'merge' | 'create' | 'skip' (se define al resolver)
    };
  });
}
