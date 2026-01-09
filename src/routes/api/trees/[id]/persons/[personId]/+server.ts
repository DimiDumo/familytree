import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updatePerson } from '$lib/server/db';
import { getDB } from '$lib/server/local-db';
import type { Person } from '$lib/types/family';

// PUT /api/trees/[id]/persons/[personId] - Update person data
export const PUT: RequestHandler = async ({ params, request, platform }) => {
	const db = getDB(platform);

	const updates = (await request.json()) as Partial<Person>;

	await updatePerson(db, params.personId, updates);
	return json({ success: true });
};
