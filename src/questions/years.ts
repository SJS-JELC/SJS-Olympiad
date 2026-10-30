export const theoryYears = ['L5', 'U5', 'L6', 'U6'] as const;
export type TheoryYear = typeof theoryYears[number];
const key = 'sjs-olympiad-theory-year';
export const isTheoryYear = (value: string | null): value is TheoryYear => theoryYears.includes(value as TheoryYear);
export function readTheoryYear(): TheoryYear {
  try { const value = localStorage.getItem(key); return isTheoryYear(value) ? value : 'L6'; }
  catch { return 'L6'; }
}
export function rememberTheoryYear(year: TheoryYear) {
  try { localStorage.setItem(key, year); } catch { /* This optional preference cannot authorize an event or year. */ }
}
export function routeYear(options: URLSearchParams, selected: TheoryYear): TheoryYear | null {
  if (!options.has('year')) return selected;
  const explicit = options.get('year');
  return isTheoryYear(explicit) ? explicit : null;
}
