export interface DisplayCipherEntry {
  name: string;
  displayDigit: number;
  isDistractor: boolean;
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

export function deriveChitOffsetKey(chitCode: string): number {
  const digits = chitCode.match(/\d/g);
  if (digits?.length) {
    return digits.reduce((sum, digit) => sum + Number(digit), 0) % 10;
  }

  const fallbackSeed = chitCode.trim().toUpperCase();
  if (!fallbackSeed) return 0;
  return fallbackSeed.charCodeAt(fallbackSeed.length - 1) % 10;
}

export function offsetDisplayDigit(realDigit: number, key: number): number {
  return positiveModulo(realDigit + key, 10);
}

function deterministicShuffle<T>(items: T[], seed: string): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = stableHash(`${seed}:${i}`) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function buildObfuscatedDisplayEntries({
  map,
  sequence,
  candidates,
  chitCode,
  namespace,
}: {
  map: Record<string, number>;
  sequence: string[];
  candidates: string[];
  chitCode: string;
  namespace: string;
}): DisplayCipherEntry[] {
  const key = deriveChitOffsetKey(chitCode);
  const usedNames = new Set([
    ...Object.keys(map).map((name) => name.toUpperCase()),
    ...sequence.map((name) => name.toUpperCase()),
  ]);

  const realEntries: DisplayCipherEntry[] = Object.entries(map).map(([name, digit]) => ({
    name,
    displayDigit: offsetDisplayDigit(digit, key),
    isDistractor: false,
  }));

  const availableDistractors = candidates.filter((name) => !usedNames.has(name.toUpperCase()));
  const distractorCount = Math.min(availableDistractors.length, 1 + (stableHash(`${namespace}:${chitCode}:count`) % 2));
  const distractors: DisplayCipherEntry[] = [];

  for (let i = 0; i < distractorCount; i++) {
    const pickIndex = stableHash(`${namespace}:${chitCode}:pick:${i}`) % availableDistractors.length;
    const [name] = availableDistractors.splice(pickIndex, 1);
    distractors.push({
      name,
      displayDigit: stableHash(`${namespace}:${chitCode}:digit:${name}`) % 10,
      isDistractor: true,
    });
  }

  return deterministicShuffle([...realEntries, ...distractors], `${namespace}:${chitCode}:order`);
}
