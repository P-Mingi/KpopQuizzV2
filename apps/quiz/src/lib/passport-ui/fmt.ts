// Run O1, lot (b), lane P1: the one placeholder filler of the passport words. `{name}` is replaced from `vars`; an
// unknown placeholder is left as written. Pure and isomorphic (client components fill the numbers and names they own).

export type FmtVars = Readonly<Record<string, string | number>>;

export function fmt(template: string, vars: FmtVars = {}): string {
  return template.replace(/\{([a-zA-Z0-9]+)\}/g, (whole, key: string) => {
    const v = vars[key];
    return v === undefined ? whole : String(v);
  });
}
