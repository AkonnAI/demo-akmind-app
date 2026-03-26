export const ok = (d: object, s = 200) => Response.json(d, { status: s });
export const fail = (m: string, s = 400) =>
  Response.json({ error: m }, { status: s });
