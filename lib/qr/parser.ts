/**
 * Parser for the Boom Boom Robo Da Round 1 QR payload.
 *
 * Format:
 *   R1|V1|BB117|COLOR:RED=6|BLUE=9|GREEN=4|YELLOW=5|SHAPE:CIRCLE=8|TRIANGLE=1|SQUARE=7|DIAMOND=3|COLSEQ:RED-YELLOW-BLUE-GREEN|SHAPESEQ:CIRCLE-SQUARE-TRIANGLE-DIAMOND|ORDER:COLOR-SHAPE
 *
 * Note: the "|" character is used both as the top-level field separator
 * AND inside the COLOR / SHAPE key groups, so we can't naively split and
 * index. Instead we walk the tokens and start a new section whenever a
 * token begins with one of the known section prefixes.
 */

export interface ParsedPayload {
  round: string;
  version: string;
  chitCode: string;
  colorMap: Record<string, number>;
  shapeMap: Record<string, number>;
  colorSequence: string[];
  shapeSequence: string[];
  operationOrder: string[];
  raw: string;
}

const SECTION_PREFIXES = ["COLOR", "SHAPE", "COLSEQ", "SHAPESEQ", "ORDER"] as const;
type SectionKey = (typeof SECTION_PREFIXES)[number];

function isSectionToken(token: string): SectionKey | null {
  const idx = token.indexOf(":");
  if (idx === -1) return null;
  const prefix = token.slice(0, idx);
  return (SECTION_PREFIXES as readonly string[]).includes(prefix)
    ? (prefix as SectionKey)
    : null;
}

function parseKeyMap(value: string): Record<string, number> {
  const map: Record<string, number> = {};
  for (const entry of value.split("|")) {
    const [name, num] = entry.split("=");
    if (!name || num === undefined) continue;
    const parsed = Number(num.trim());
    if (Number.isFinite(parsed)) {
      map[name.trim().toUpperCase()] = parsed;
    }
  }
  return map;
}

function parseSequence(value: string): string[] {
  return value
    .split("-")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

/**
 * Parses a raw QR payload string. Returns null if the payload does not
 * look like a valid Round 1 payload (wrong format, missing fields, etc).
 */
export function parsePayload(raw: string): ParsedPayload | null {
  if (!raw || typeof raw !== "string") return null;

  const tokens = raw.split("|").map((t) => t.trim());
  if (tokens.length < 3) return null;

  const [round, version, chitCode] = tokens;

  if (!round.startsWith("R") || !version.startsWith("V") || !chitCode) {
    return null;
  }

  const sections: Record<SectionKey, string> = {
    COLOR: "",
    SHAPE: "",
    COLSEQ: "",
    SHAPESEQ: "",
    ORDER: "",
  };

  let currentKey: SectionKey | null = null;

  for (let i = 3; i < tokens.length; i++) {
    const token = tokens[i];
    const section = isSectionToken(token);

    if (section) {
      currentKey = section;
      sections[currentKey] = token.slice(token.indexOf(":") + 1);
    } else if (currentKey) {
      sections[currentKey] += "|" + token;
    }
  }

  if (!sections.COLOR || !sections.SHAPE) {
    return null;
  }

  const colorMap = parseKeyMap(sections.COLOR);
  const shapeMap = parseKeyMap(sections.SHAPE);
  const colorSequence = parseSequence(sections.COLSEQ);
  const shapeSequence = parseSequence(sections.SHAPESEQ);
  const operationOrder = sections.ORDER
    ? sections.ORDER.split("-").map((s) => s.trim().toUpperCase())
    : [];

  if (Object.keys(colorMap).length === 0 || Object.keys(shapeMap).length === 0) {
    return null;
  }

  return {
    round,
    version,
    chitCode: chitCode.toUpperCase(),
    colorMap,
    shapeMap,
    colorSequence,
    shapeSequence,
    operationOrder,
    raw,
  };
}

export function chitCodesMatch(a: string, b: string): boolean {
  return a.trim().toUpperCase() === b.trim().toUpperCase();
}
