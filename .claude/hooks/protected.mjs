// Shared guardrail-path definition (A2 / T7.5 finding 1). One source of truth
// for what an unattended loop may never modify: hook config is snapshotted at
// session start but these FILES are read at execution time.
export const PROTECTED = [
  /(^|\/)\.claude(\/|$)/,
  /(^|\/)scripts\/loop(\/|$)/,
  /(^|\/)\.github(\/|$)/,
];

export function isProtectedPath(p) {
  const normalized = String(p).replace(/\\/g, "/");
  return PROTECTED.some((re) => re.test(normalized));
}
