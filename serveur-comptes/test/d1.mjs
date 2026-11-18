// Fausse base D1 pour les essais : la même interface que Cloudflare (prepare, bind, first, all, run, batch),
// branchée sur SQLite (node:sqlite) avec le vrai schema.sql.
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
export function fausseBase() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  const instruction = (q, args = []) => ({
    bind: (...a) => instruction(q, a),
    first: async (col) => { const r = db.prepare(q).get(...args); return r ? (col ? r[col] : { ...r }) : null; },
    all: async () => ({ success: true, results: db.prepare(q).all(...args).map((r) => ({ ...r })) }),
    run: async () => { const i = db.prepare(q).run(...args); return { success: true, meta: { changes: Number(i.changes) } }; },
  });
  return { _db: db, prepare: (q) => instruction(q), batch: async (l) => { const out = []; for (const s of l) out.push(await s.run()); return out; } };
}
