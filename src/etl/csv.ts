// Zillow wide-CSV parser. Date columns are detected by regex, NEVER positionally
// (metro files have 5 meta columns, ZIP files 9 — constitution/ADR-0004 rule).
// All meta values stay strings (ZIP RegionName keeps leading zeros); blank data
// cells stay null — never coerced to 0.

const DATE_COL = /^\d{4}-\d{2}-\d{2}$/;

export interface ParsedCsv {
  metaCols: string[];
  dateCols: string[];
  rows: { meta: Record<string, string>; values: Record<string, number | null> }[];
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
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.length > 0);
  const header = splitCsvLine(lines[0]);
  const metaCols = header.filter((c) => !DATE_COL.test(c));
  const dateCols = header.filter((c) => DATE_COL.test(c));

  const rows = lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const meta: Record<string, string> = {};
    const values: Record<string, number | null> = {};
    header.forEach((col, i) => {
      const cell = cells[i] ?? "";
      if (DATE_COL.test(col)) values[col] = cell === "" ? null : Number(cell);
      else meta[col] = cell;
    });
    return { meta, values };
  });

  return { metaCols, dateCols, rows };
}
