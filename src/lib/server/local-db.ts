/// <reference types="@cloudflare/workers-types" />
import { dev } from '$app/environment';

// Get DB from platform or fall back to local for dev
export function getDB(platform: App.Platform | undefined): D1Database {
	if (platform?.env?.DB) {
		return platform.env.DB;
	}
	if (dev) {
		// Dynamic import to avoid bundling Node.js modules in production
		throw new Error('For local development, use: bun run dev:wrangler');
	}
	throw new Error('Database not available - D1 binding missing');
}
