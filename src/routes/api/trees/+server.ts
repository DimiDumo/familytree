import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllTrees, createTree } from '$lib/server/db';
import { createPerson, createFamilyUnit } from '$lib/types/family';

// GET /api/trees - List all trees
export const GET: RequestHandler = async ({ platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const trees = await getAllTrees(db);
	return json(trees);
};

// POST /api/trees - Create a new tree
export const POST: RequestHandler = async ({ request, platform }) => {
	const db = platform?.env.DB;
	if (!db) {
		return json({ error: 'Database not available' }, { status: 500 });
	}

	const body = await request.json();
	const { name, rootPerson } = body as {
		name: string;
		rootPerson: { firstName: string; lastName: string; gender?: 'male' | 'female'; birthDate?: string; deathDate?: string };
	};

	if (!name || !rootPerson?.firstName || !rootPerson?.lastName) {
		return json({ error: 'Missing required fields' }, { status: 400 });
	}

	const person = createPerson(rootPerson);
	const rootUnit = createFamilyUnit([person]);
	const treeId = crypto.randomUUID();

	await createTree(db, { id: treeId, name, rootUnit });

	return json({ id: treeId, name, rootId: rootUnit.id }, { status: 201 });
};
