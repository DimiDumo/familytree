export interface Person {
	id: string;
	firstName: string;
	lastName: string;
	birthDate?: string;
	deathDate?: string;
	photoUrl?: string;
}

export interface FamilyUnit {
	id: string;
	type: 'couple' | 'single';
	persons: Person[];
	childrenIds: string[];
	parentId?: string;
}

export interface FamilyTree {
	id: string;
	name: string;
	rootId: string;
	units: Record<string, FamilyUnit>;
}

export function createPerson(data: Partial<Person> & { firstName: string; lastName: string }): Person {
	return {
		id: crypto.randomUUID(),
		firstName: data.firstName,
		lastName: data.lastName,
		birthDate: data.birthDate,
		deathDate: data.deathDate,
		photoUrl: data.photoUrl
	};
}

export function createFamilyUnit(
	persons: Person[],
	options: { parentId?: string; childrenIds?: string[] } = {}
): FamilyUnit {
	return {
		id: crypto.randomUUID(),
		type: persons.length === 2 ? 'couple' : 'single',
		persons,
		childrenIds: options.childrenIds ?? [],
		parentId: options.parentId
	};
}

export function createFamilyTree(name: string, rootUnit: FamilyUnit): FamilyTree {
	return {
		id: crypto.randomUUID(),
		name,
		rootId: rootUnit.id,
		units: { [rootUnit.id]: rootUnit }
	};
}
