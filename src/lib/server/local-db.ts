import { Database, type SQLQueryBindings } from 'bun:sqlite';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { dev } from '$app/environment';
import { homedir } from 'os';

// Use a fixed location outside of worktrees so all dev instances share the same database
const DB_DIR = join(homedir(), '.local', 'share', 'familytree');
const DB_PATH = join(DB_DIR, 'dev.sqlite');

let db: Database | null = null;

function getDb(): Database {
	if (!db) {
		// Ensure the directory exists
		if (!existsSync(DB_DIR)) {
			mkdirSync(DB_DIR, { recursive: true });
		}
		db = new Database(DB_PATH, { create: true });
		// Initialize schema if needed - look for schema.sql in the project
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
