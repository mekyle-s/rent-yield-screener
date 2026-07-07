// Fetch the 4 Zillow Research source CSVs (ZHVI/ZORI × Metro/ZIP).
// Raw files land in a gitignored cache dir — constitution V forbids committing them.
// The pre-parse fetch-integrity gate (B.3) lives in checkResponse(); every failure
// emits exactly one FETCH_INTEGRITY: token to stderr and exits 1, naming the URL.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const SOURCES = [
  {
    name: "zhvi-metro",
    url: "https://files.zillowstatic.com/research/public_csvs/zhvi/Metro_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
    headerStartsWith: "RegionID,SizeRank,RegionName,RegionType,StateName",
  },
  {
    name: "zhvi-zip",
    url: "https://files.zillowstatic.com/research/public_csvs/zhvi/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
    headerStartsWith:
      "RegionID,SizeRank,RegionName,RegionType,StateName,State,City,Metro,CountyName",
  },
  {
    name: "zori-metro",
    url: "https://files.zillowstatic.com/research/public_csvs/zori/Metro_zori_uc_sfrcondomfr_sm_sa_month.csv",
    headerStartsWith: "RegionID,SizeRank,RegionName,RegionType,StateName",
  },
  {
    name: "zori-zip",
    url: "https://files.zillowstatic.com/research/public_csvs/zori/Zip_zori_uc_sfrcondomfr_sm_sa_month.csv",
    headerStartsWith:
      "RegionID,SizeRank,RegionName,RegionType,StateName,State,City,Metro,CountyName",
  },
] as const;

function fail(url: string, reason: string): never {
  process.stderr.write(`FETCH_INTEGRITY: ${reason} url=${url}\n`);
  process.exit(1);
}

async function fetchOne(
  url: string,
  expectedHeader?: string,
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch (e) {
    fail(url, `network error (${(e as Error).message})`);
  }
  if (res.status !== 200) fail(url, `HTTP ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "";
  if (!/text\/csv|application\/octet-stream|text\/plain/.test(contentType))
    fail(url, `unexpected content-type "${contentType}"`);
  const body = await res.text();
  if (body.length === 0) fail(url, "empty body");
  if (expectedHeader && !body.startsWith(expectedHeader))
    fail(
      url,
      `header mismatch — expected row starting "${expectedHeader}", got "${body.slice(0, 80)}"`,
    );
  return body;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--dry-run")) {
    for (const s of SOURCES) console.log(s.url);
    return;
  }

  const urlFlag = args.indexOf("--url");
  if (urlFlag !== -1) {
    const url = args[urlFlag + 1];
    if (!url) fail("(none)", "missing value for --url");
    await fetchOne(url);
    console.log(`OK ${url}`);
    return;
  }

  const outFlag = args.indexOf("--out");
  const outDir = outFlag !== -1 ? args[outFlag + 1] : ".cache/zillow-raw";
  mkdirSync(outDir, { recursive: true });
  for (const s of SOURCES) {
    const body = await fetchOne(s.url, s.headerStartsWith);
    const dest = join(outDir, `${s.name}.csv`);
    writeFileSync(dest, body);
    console.log(`fetched ${s.name} -> ${dest} (${body.length} bytes)`);
  }
}

main();
