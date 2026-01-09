/// <reference types="@cloudflare/workers-types" />
import type { FamilyTree, FamilyUnit, Person } from '$lib/types/family';

// Database row types
interface TreeRow {
	id: string;
	name: string;
	root_id: string;
	created_at: string;
	updated_at: string;
}

interface UnitRow {
	id: string;
	tree_id: string;
	type: 'single' | 'couple' | 'polygamous';
	parent_id: string | null;
	primary_person_index: number | null;
	mother_index: number | null;
}

interface PersonRow {
	id: string;
	unit_id: string;
	first_name: string;
	last_name: string;
	gender: 'male' | 'female' | null;
	birth_date: string | null;
	death_date: string | null;
	photo_url: string | null;
	biography: string | null;
	position: number;
}

// Get all trees (list view)
export async function getAllTrees(db: D1Database): Promise<{ id: string; name: string }[]> {
	const result = await db.prepare('SELECT id, name FROM family_trees ORDER BY updated_at DESC').all<TreeRow>();
	return result.results.map((row) => ({ id: row.id, name: row.name }));
}

// Get full tree with all units and persons
export async function getTree(db: D1Database, treeId: string): Promise<FamilyTree | null> {
	// Get tree
	const treeResult = await db.prepare('SELECT * FROM family_trees WHERE id = ?').bind(treeId).first<TreeRow>();
	if (!treeResult) return null;

	// Get all units for this tree
	const unitsResult = await db.prepare('SELECT * FROM family_units WHERE tree_id = ?').bind(treeId).all<UnitRow>();

	// Get all persons for all units
	const unitIds = unitsResult.results.map((u) => u.id);
	let personsResult: { results: PersonRow[] } = { results: [] };
	if (unitIds.length > 0) {
		const placeholders = unitIds.map(() => '?').join(',');
		personsResult = await db
			.prepare(`SELECT * FROM persons WHERE unit_id IN (${placeholders}) ORDER BY position`)
			.bind(...unitIds)
			.all<PersonRow>();
	}

	// Group persons by unit
	const personsByUnit: Record<string, Person[]> = {};
	for (const person of personsResult.results) {
		if (!personsByUnit[person.unit_id]) {
			personsByUnit[person.unit_id] = [];
		}
		personsByUnit[person.unit_id].push({
			id: person.id,
			firstName: person.first_name,
			lastName: person.last_name,
			gender: person.gender ?? undefined,
			birthDate: person.birth_date ?? undefined,
			deathDate: person.death_date ?? undefined,
			photoUrl: person.photo_url ?? undefined,
			biography: person.biography ?? undefined
		});
	}

	// Build units map with childrenIds
	const units: Record<string, FamilyUnit> = {};
	const childrenByParent: Record<string, string[]> = {};

	for (const unit of unitsResult.results) {
		if (unit.parent_id) {
			if (!childrenByParent[unit.parent_id]) {
				childrenByParent[unit.parent_id] = [];
			}
			childrenByParent[unit.parent_id].push(unit.id);
		}
	}

	for (const unit of unitsResult.results) {
		units[unit.id] = {
			id: unit.id,
			type: unit.type,
			persons: personsByUnit[unit.id] || [],
			childrenIds: childrenByParent[unit.id] || [],
			parentId: unit.parent_id ?? undefined,
			primaryPersonIndex: unit.primary_person_index ?? undefined,
			motherIndex: unit.mother_index ?? undefined
		};
	}

	return {
		id: treeResult.id,
		name: treeResult.name,
		rootId: treeResult.root_id,
		units
	};
}

// Create a new tree with root unit and person
export async function createTree(
	db: D1Database,
	data: { id: string; name: string; rootUnit: FamilyUnit }
): Promise<void> {
	const { id, name, rootUnit } = data;

	// Insert tree
	await db
		.prepare('INSERT INTO family_trees (id, name, root_id) VALUES (?, ?, ?)')
		.bind(id, name, rootUnit.id)
		.run();

	// Insert root unit
	await db
		.prepare(
			'INSERT INTO family_units (id, tree_id, type, parent_id, primary_person_index, mother_index) VALUES (?, ?, ?, ?, ?, ?)'
		)
		.bind(rootUnit.id, id, rootUnit.type, null, rootUnit.primaryPersonIndex ?? null, rootUnit.motherIndex ?? null)
		.run();

	// Insert persons
	for (let i = 0; i < rootUnit.persons.length; i++) {
		const person = rootUnit.persons[i];
		await db
			.prepare(
				'INSERT INTO persons (id, unit_id, first_name, last_name, gender, birth_date, death_date, photo_url, biography, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
			)
			.bind(
				person.id,
				rootUnit.id,
				person.firstName,
				person.lastName,
				person.gender ?? null,
				person.birthDate ?? null,
				person.deathDate ?? null,
				person.photoUrl ?? null,
				person.biography ?? null,
				i
			)
			.run();
	}
}

// Delete a tree (cascade handled by DB)
export async function deleteTree(db: D1Database, treeId: string): Promise<void> {
	// Get all units first for cascading delete
	const unitsResult = await db.prepare('SELECT id FROM family_units WHERE tree_id = ?').bind(treeId).all<{ id: string }>();
	const unitIds = unitsResult.results.map((u) => u.id);

	// Delete persons first
	if (unitIds.length > 0) {
		const placeholders = unitIds.map(() => '?').join(',');
		await db.prepare(`DELETE FROM persons WHERE unit_id IN (${placeholders})`).bind(...unitIds).run();
	}

	// Delete units
	await db.prepare('DELETE FROM family_units WHERE tree_id = ?').bind(treeId).run();

	// Delete tree
	await db.prepare('DELETE FROM family_trees WHERE id = ?').bind(treeId).run();
}

// Add a unit to a tree
export async function addUnit(
	db: D1Database,
	treeId: string,
	unit: FamilyUnit
): Promise<void> {
	await db
		.prepare(
			'INSERT INTO family_units (id, tree_id, type, parent_id, primary_person_index, mother_index) VALUES (?, ?, ?, ?, ?, ?)'
		)
		.bind(
			unit.id,
			treeId,
			unit.type,
			unit.parentId ?? null,
			unit.primaryPersonIndex ?? null,
			unit.motherIndex ?? null
		)
		.run();

	// Insert persons
	for (let i = 0; i < unit.persons.length; i++) {
		const person = unit.persons[i];
		await db
			.prepare(
				'INSERT INTO persons (id, unit_id, first_name, last_name, gender, birth_date, death_date, photo_url, biography, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
			)
			.bind(
				person.id,
				unit.id,
				person.firstName,
				person.lastName,
				person.gender ?? null,
				person.birthDate ?? null,
				person.deathDate ?? null,
				person.photoUrl ?? null,
				person.biography ?? null,
				i
			)
			.run();
	}
}

// Update unit type and properties
export async function updateUnit(
	db: D1Database,
	unitId: string,
	updates: { type?: 'single' | 'couple' | 'polygamous'; primaryPersonIndex?: number }
): Promise<void> {
	const sets: string[] = [];
	const values: (string | number)[] = [];

	if (updates.type !== undefined) {
		sets.push('type = ?');
		values.push(updates.type);
	}
	if (updates.primaryPersonIndex !== undefined) {
		sets.push('primary_person_index = ?');
		values.push(updates.primaryPersonIndex);
	}

	if (sets.length === 0) return;

	values.push(unitId);
	await db.prepare(`UPDATE family_units SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();
}

// Delete unit and all descendants recursively
export async function deleteUnit(db: D1Database, unitId: string, treeId: string): Promise<string[]> {
	// Find all descendant units
	const toDelete: string[] = [unitId];
	let index = 0;

	while (index < toDelete.length) {
		const currentId = toDelete[index];
		const children = await db
			.prepare('SELECT id FROM family_units WHERE parent_id = ?')
			.bind(currentId)
			.all<{ id: string }>();
		for (const child of children.results) {
			toDelete.push(child.id);
		}
		index++;
	}

	// Delete persons for all units
	if (toDelete.length > 0) {
		const placeholders = toDelete.map(() => '?').join(',');
		await db.prepare(`DELETE FROM persons WHERE unit_id IN (${placeholders})`).bind(...toDelete).run();
	}

	// Delete all units
	if (toDelete.length > 0) {
		const placeholders = toDelete.map(() => '?').join(',');
		await db.prepare(`DELETE FROM family_units WHERE id IN (${placeholders})`).bind(...toDelete).run();
	}

	return toDelete;
}

// Add person to an existing unit
export async function addPerson(db: D1Database, unitId: string, person: Person): Promise<void> {
	// Get current max position
	const result = await db
		.prepare('SELECT MAX(position) as max_pos FROM persons WHERE unit_id = ?')
		.bind(unitId)
		.first<{ max_pos: number | null }>();
	const position = (result?.max_pos ?? -1) + 1;

	await db
		.prepare(
			'INSERT INTO persons (id, unit_id, first_name, last_name, gender, birth_date, death_date, photo_url, biography, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
		)
		.bind(
			person.id,
			unitId,
			person.firstName,
			person.lastName,
			person.gender ?? null,
			person.birthDate ?? null,
			person.deathDate ?? null,
			person.photoUrl ?? null,
			person.biography ?? null,
			position
		)
		.run();
}

// Update a person's data
export async function updatePerson(db: D1Database, personId: string, updates: Partial<Person>): Promise<void> {
	const sets: string[] = [];
	const values: (string | null)[] = [];

	if (updates.firstName !== undefined) {
		sets.push('first_name = ?');
		values.push(updates.firstName);
	}
	if (updates.lastName !== undefined) {
		sets.push('last_name = ?');
		values.push(updates.lastName);
	}
	if (updates.gender !== undefined) {
		sets.push('gender = ?');
		values.push(updates.gender ?? null);
	}
	if (updates.birthDate !== undefined) {
		sets.push('birth_date = ?');
		values.push(updates.birthDate ?? null);
	}
	if (updates.deathDate !== undefined) {
		sets.push('death_date = ?');
		values.push(updates.deathDate ?? null);
	}
	if (updates.photoUrl !== undefined) {
		sets.push('photo_url = ?');
		values.push(updates.photoUrl ?? null);
	}
	if (updates.biography !== undefined) {
		sets.push('biography = ?');
		values.push(updates.biography ?? null);
	}

	if (sets.length === 0) return;

	values.push(personId);
	await db.prepare(`UPDATE persons SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();
}
