/// <reference types="@cloudflare/workers-types" />
import { dev } from '$app/environment';

// Get DB from platform or fall back to local for dev
export function getDB(platform: App.Platform | undefined): D1Database {
	// In dev mode, always use the shared local database so all worktrees share the same data
	if (dev) {
		// Dynamic import to avoid bundling Node.js modules in production
		throw new Error('For local development, use: bun run dev:wrangler');
	}
<<<<<<< Updated upstream
	throw new Error('Database not available - D1 binding missing');
=======
	// In production, use the D1 database from the platform
	if (platform?.env?.DB) {
		return platform.env.DB;
	}
	throw new Error('Database not available');
>>>>>>> Stashed changes
}
