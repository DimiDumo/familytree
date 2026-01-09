import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { addUnit, addPerson, updateUnit, getTree } from '$lib/server/db';
import { getDB } from '$lib/server/local-db';
import { createPerson, createFamilyUnit } from '$lib/types/family';

// POST /api/trees/[id]/units - Add child, spouse, or mistress
export const POST: RequestHandler = async ({ params, request, platform }) => {
	const db = getDB(platform);

	const body = await request.json();
	const { action, unitId, person: personData, motherIndex } = body as {
		action: 'addChild' | 'addSpouse' | 'addMistress';
		unitId: string;
		person: { firstName: string; lastName: string; gender?: 'male' | 'female'; birthDate?: string; deathDate?: string };
		motherIndex?: number;
	};

	if (!action || !unitId || !personData?.firstName || !personData?.lastName) {
		return json({ error: 'Missing required fields' }, { status: 400 });
	}

	const tree = await getTree(db, params.id);
	if (!tree) {
		return json({ error: 'Tree not found' }, { status: 404 });
	}

	const unit = tree.units[unitId];
	if (!unit) {
		return json({ error: 'Unit not found' }, { status: 404 });
	}

	const person = createPerson(personData);

	if (action === 'addChild') {
		// Create a new child unit
		const childUnit = createFamilyUnit([person], { parentId: unitId, motherIndex });
		await addUnit(db, params.id, childUnit);
		return json({ unit: childUnit, person }, { status: 201 });
	} else if (action === 'addSpouse') {
		// Add person to existing unit, change type to couple
		await addPerson(db, unitId, person);
		await updateUnit(db, unitId, { type: 'couple', primaryPersonIndex: 0 });
		return json({ person, unitType: 'couple' }, { status: 201 });
	} else if (action === 'addMistress') {
		// Add person to existing unit, change type to polygamous
		await addPerson(db, unitId, person);
		await updateUnit(db, unitId, { type: 'polygamous' });
		return json({ person, unitType: 'polygamous' }, { status: 201 });
	}

	return json({ error: 'Invalid action' }, { status: 400 });
};
