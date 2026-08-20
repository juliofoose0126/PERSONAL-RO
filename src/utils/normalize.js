// Normalización de texto y comparación difusa (fuzzy matching)
// usada por el módulo de deduplicación inteligente.

export function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ') // quita puntuación
    .replace(/\s+/g, ' ')
    .trim();
}

// Distancia de Levenshtein clásica (programación dinámica, O(n*m)).
export function levenshteinDistance(a, b) {
  const s = a ?? '';
  const t = b ?? '';
  const m = s.length;
  const n = t.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prevRow = new Array(n + 1);
  let currRow = new Array(n + 1);
  for (let j = 0; j <= n; j++) prevRow[j] = j;

  for (let i = 1; i <= m; i++) {
    currRow[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1, // eliminación
        currRow[j - 1] + 1, // inserción
        prevRow[j - 1] + cost // sustitución
      );
    }
    [prevRow, currRow] = [currRow, prevRow];
  }
  return prevRow[n];
}

// Similaridad 0..1 basada en Levenshtein normalizado por la longitud mayor.
export function similarityRatio(a, b) {
  const s = normalizeText(a);
  const t = normalizeText(b);
  if (!s && !t) return 1;
  if (!s || !t) return 0;
  const maxLen = Math.max(s.length, t.length);
  const dist = levenshteinDistance(s, t);
  return 1 - dist / maxLen;
}

// Similaridad basada en tokens (bolsa de palabras) — buena para nombres
// donde el orden de nombre/apellido puede variar ("Juan Perez" vs "Perez Juan").
export function tokenSetRatio(a, b) {
  const tokensA = new Set(normalizeText(a).split(' ').filter(Boolean));
  const tokensB = new Set(normalizeText(b).split(' ').filter(Boolean));
  if (tokensA.size === 0 && tokensB.size === 0) return 1;
  if (tokensA.size === 0 || tokensB.size === 0) return 0;
  let intersection = 0;
  for (const tok of tokensA) if (tokensB.has(tok)) intersection++;
  const union = tokensA.size + tokensB.size - intersection;
  return intersection / union;
}

// Puntaje combinado (0..1) usado para decidir si dos nombres son "el mismo".
export function nameSimilarity(a, b) {
  const lev = similarityRatio(a, b);
  const tokens = tokenSetRatio(a, b);
  return Math.max(lev, tokens * 0.9 + lev * 0.1);
}

export const DUPLICATE_THRESHOLD = 0.78;

export function isLikelyDuplicate(a, b) {
  return nameSimilarity(a, b) >= DUPLICATE_THRESHOLD;
}
