import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteUnit, getTree } from '$lib/server/db';

// DELETE /api/trees/[id]/units/[unitId] - Delete unit and descendants
export const DELETE: RequestHandler = async ({ params, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const tree = await getTree(db, params.id);
	if (!tree) {
		return json({ error: 'Tree not found' }, { status: 404 });
	}

	// Don't allow deleting the root unit
	if (params.unitId === tree.rootId) {
		return json({ error: 'Cannot delete root unit' }, { status: 400 });
	}

	const deletedIds = await deleteUnit(db, params.unitId, params.id);
	return json({ deletedIds });
};
