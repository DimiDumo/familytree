import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getTree, deleteTree } from '$lib/server/db';

// GET /api/trees/[id] - Get full tree with all units and persons
export const GET: RequestHandler = async ({ params, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const tree = await getTree(db, params.id);
	if (!tree) {
		return json({ error: 'Tree not found' }, { status: 404 });
	}

	return json(tree);
};

// DELETE /api/trees/[id] - Delete entire tree
export const DELETE: RequestHandler = async ({ params, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	await deleteTree(db, params.id);
	return json({ success: true });
};
