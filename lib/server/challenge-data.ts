import "server-only";
import fs from "node:fs";
import path from "node:path";

export interface ChallengeRow {
  chit_code: string;
  color_key: string;
  shape_key: string;
  color_sequence: string;
  shape_sequence: string;
  operation_order: string;
  vault_code: string;
  difficulty: string;
}

interface ManifestEntry {
  chit_code: string;
  difficulty: string;
  payload: string;
  status: string;
}

let cachedRows: ChallengeRow[] | null = null;
let cachedManifest: ManifestEntry[] | null = null;

function parseCsv(text: string): ChallengeRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: ChallengeRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",");
    const record: Record<string, string> = {};
    headers.forEach((header, idx) => {
      record[header] = (cells[idx] ?? "").trim();
    });
    rows.push(record as unknown as ChallengeRow);
  }

  return rows;
}

function loadRows(): ChallengeRow[] {
  if (cachedRows) return cachedRows;
  const csvPath = path.join(process.cwd(), "data", "data.csv");
  const text = fs.readFileSync(csvPath, "utf-8");
  cachedRows = parseCsv(text);
  return cachedRows;
}

function loadManifest(): ManifestEntry[] {
  if (cachedManifest) return cachedManifest;
  const manifestPath = path.join(process.cwd(), "data", "manifest.json");
  const text = fs.readFileSync(manifestPath, "utf-8");
  cachedManifest = JSON.parse(text);
  return cachedManifest!;
}

/** Safe: only confirms existence + difficulty, never any secret fields. */
export function findChitPublicInfo(chitCode: string): { exists: boolean; difficulty?: string } {
  const code = chitCode.trim().toUpperCase();
  const manifestEntry = loadManifest().find((m) => m.chit_code.toUpperCase() === code);
  if (manifestEntry) {
    return { exists: true, difficulty: manifestEntry.difficulty };
  }
  // Fall back to the CSV in case the manifest hasn't been generated for a chit yet.
  const row = loadRows().find((r) => r.chit_code.toUpperCase() === code);
  if (row) {
    return { exists: true, difficulty: row.difficulty };
  }
  return { exists: false };
}

/** Server-only: never returns the vault code itself, only a boolean match. */
export function validateVaultCode(chitCode: string, enteredCode: string): boolean {
  const code = chitCode.trim().toUpperCase();
  const row = loadRows().find((r) => r.chit_code.toUpperCase() === code);
  if (!row) return false;
  return row.vault_code.trim() === enteredCode.trim();
}
