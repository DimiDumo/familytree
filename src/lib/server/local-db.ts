import { Database, type SQLQueryBindings } from 'bun:sqlite';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { dev } from '$app/environment';

const DB_PATH = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/local.sqlite';

let db: Database | null = null;

function getDb(): Database {
	if (!db) {
		db = new Database(DB_PATH, { create: true });
		// Initialize schema if needed
		const schemaPath = join(process.cwd(), 'schema.sql');
		if (existsSync(schemaPath)) {
			const schema = readFileSync(schemaPath, 'utf-8');
			db.exec(schema);
		}
	}
	return db;
}

// D1-compatible wrapper for bun:sqlite
export function getLocalD1(): D1Database {
	const sqlite = getDb();

	return {
		prepare(query: string) {
			return {
				_query: query,
				_bindings: [] as SQLQueryBindings[],
				bind(...values: SQLQueryBindings[]) {
					this._bindings = values;
					return this;
				},
				async first<T>(): Promise<T | null> {
					const stmt = sqlite.prepare(this._query);
					return stmt.get(...this._bindings) as T | null;
				},
				async all<T>(): Promise<{ results: T[] }> {
					const stmt = sqlite.prepare(this._query);
					return { results: stmt.all(...this._bindings) as T[] };
				},
				async run() {
					const stmt = sqlite.prepare(this._query);
					stmt.run(...this._bindings);
					return { success: true, meta: { duration: 0 } };
				}
			};
		},
		async batch() {
			throw new Error('batch not implemented');
		},
		async dump() {
			throw new Error('dump not implemented');
		},
		async exec() {
			throw new Error('exec not implemented');
		}
	} as unknown as D1Database;
}

// Get DB from platform or fall back to local for dev
export function getDB(platform: App.Platform | undefined): D1Database {
	if (platform?.env?.DB) {
		return platform.env.DB;
	}
	if (dev) {
		return getLocalD1();
	}
	throw new Error('Database not available');
}
