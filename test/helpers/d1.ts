import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Minimal D1Database shim over node:sqlite for tests. Implements the surface
 * worker/app.ts uses: prepare().bind().{run,all,first} and batch().
 */
export function makeTestDB(): D1Database {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  const migration = readFileSync(
    fileURLToPath(new URL("../../migrations/0001_init.sql", import.meta.url)),
    "utf8",
  );
  db.exec(migration);
  return wrap(db);
}

function wrap(db: DatabaseSync): D1Database {
  const makeStmt = (sql: string, params: unknown[]): D1PreparedStatement => {
    const bound = params.map((p) => (typeof p === "boolean" ? (p ? 1 : 0) : p));
    return {
      bind: (...args: unknown[]) => makeStmt(sql, args),
      async run() {
        const info = db.prepare(sql).run(...(bound as any));
        return {
          success: true,
          meta: { changes: Number(info.changes), last_row_id: Number(info.lastInsertRowid) },
        } as any;
      },
      async all<T = unknown>() {
        const results = db.prepare(sql).all(...(bound as any)) as T[];
        return { success: true, results, meta: {} } as any;
      },
      async first<T = unknown>(col?: string) {
        const row = db.prepare(sql).get(...(bound as any)) as any;
        if (!row) return null;
        return (col ? row[col] : row) as T;
      },
      async raw() {
        return db.prepare(sql).all(...(bound as any)) as any;
      },
    } as unknown as D1PreparedStatement;
  };

  return {
    prepare: (sql: string) => makeStmt(sql, []),
    async batch(statements: D1PreparedStatement[]) {
      // node:sqlite is synchronous; emulate atomicity with an explicit txn.
      db.exec("BEGIN");
      try {
        const out = [];
        for (const s of statements) out.push(await (s as any).run());
        db.exec("COMMIT");
        return out as any;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
    async exec(sql: string) {
      db.exec(sql);
      return { count: 0, duration: 0 } as any;
    },
    dump: async () => new ArrayBuffer(0),
    withSession: (() => {
      throw new Error("not implemented");
    }) as any,
  } as unknown as D1Database;
}
