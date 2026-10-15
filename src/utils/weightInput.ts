function roundWeightToHundredth(value: number): number {
  return Math.round((value + Math.sign(value) * Number.EPSILON) * 100) / 100;
}

export function parseWeightInput(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return null;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  const rounded = roundWeightToHundredth(parsed);
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function formatWeightInput(value: number): string {
  if (!Number.isFinite(value)) return '';
  return roundWeightToHundredth(value)
    .toFixed(2)
    .replace(/\.?0+$/, '')
    .replace('.', ',');
}
