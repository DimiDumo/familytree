export interface Person {
	id: string;
	firstName: string;
	lastName: string;
	gender?: 'male' | 'female';
	birthDate?: string;
	deathDate?: string;
	photoUrl?: string;
}

export interface FamilyUnit {
	id: string;
	type: 'couple' | 'single' | 'polygamous';
	persons: Person[];
	childrenIds: string[];
	parentId?: string;
	/** Index of the person who is the blood descendant (0 or 1). The other is the spouse. */
	primaryPersonIndex?: number;
	/** For children of polygamous units: index of mother in parent's persons array (1=wife, 2+=mistress) */
	motherIndex?: number;
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
		gender: data.gender,
		birthDate: data.birthDate,
		deathDate: data.deathDate,
		photoUrl: data.photoUrl
	};
}

export function createFamilyUnit(
	persons: Person[],
	options: { parentId?: string; childrenIds?: string[]; motherIndex?: number } = {}
): FamilyUnit {
	const type = persons.length >= 3 ? 'polygamous' : persons.length === 2 ? 'couple' : 'single';
	return {
		id: crypto.randomUUID(),
		type,
		persons,
		childrenIds: options.childrenIds ?? [],
		parentId: options.parentId,
		motherIndex: options.motherIndex
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
