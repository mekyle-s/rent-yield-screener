// Zillow wide-CSV parser. Date columns are detected by regex, NEVER positionally
// (metro files have 5 meta columns, ZIP files 9 — constitution/ADR-0004 rule).
// All meta values stay strings (ZIP RegionName keeps leading zeros); blank data
// cells stay null — never coerced to 0.

const DATE_COL = /^\d{4}-\d{2}-\d{2}$/;

export interface ParsedCsv {
  metaCols: string[];
  dateCols: string[];
  rows: {
    meta: Record<string, string>;
    values: Record<string, number | null>;
  }[];
}

// Quote-aware split: RegionName/Metro fields contain commas (e.g. "New York, NY").
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') inQuotes = false;
      else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}

export function parseCsv(text: string): ParsedCsv {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((l) => l.trim().length > 0);
  // Fail fast on an empty/headerless file (finding #7): the etl runner bypasses
  // validateCsvSchema, so a 0-byte cached CSV otherwise crashed with an opaque
  // TypeError deep in splitCsvLine(undefined).
  if (lines.length === 0)
    throw new Error("parseCsv: empty file or missing header row");
  const header = splitCsvLine(lines[0]);
  const metaCols = header.filter((c) => !DATE_COL.test(c));
  const dateCols = header.filter((c) => DATE_COL.test(c));

  const rows = lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const meta: Record<string, string> = {};
    const values: Record<string, number | null> = {};
    header.forEach((col, i) => {
      const cell = cells[i] ?? "";
      if (DATE_COL.test(col)) {
        // Nulls stay null (constitution/ADR-0004). A blank, whitespace-only, or
        // non-numeric cell ("NA") is missing data — NEVER coerce it: Number(" ")
        // is 0 (a fabricated value) and Number("NA") is NaN (serializes as null
        // but reads as present in latest-month selection). Only a finite number
        // survives; everything else is null (finding #3).
        const trimmed = cell.trim();
        const n = trimmed === "" ? NaN : Number(trimmed);
        values[col] = Number.isFinite(n) ? n : null;
      } else meta[col] = cell;
    });
    return { meta, values };
  });

  return { metaCols, dateCols, rows };
}
