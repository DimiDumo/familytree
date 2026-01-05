import { browser } from '$app/environment';
import type { FamilyTree, FamilyUnit, Person } from '$lib/types/family';
import { createPerson, createFamilyUnit, createFamilyTree } from '$lib/types/family';

const STORAGE_KEY = 'family-tree-data';

function createFamilyStore() {
	let tree = $state<FamilyTree | null>(null);
	let isLoaded = $state(false);

	// Load from localStorage on init
	function load() {
		if (!browser) return;

		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored) {
			try {
				tree = JSON.parse(stored);
			} catch {
				console.error('Failed to parse stored family tree');
				tree = null;
			}
		}
		isLoaded = true;
	}

	// Save to localStorage
	function save() {
		if (!browser || !tree) return;
		localStorage.setItem(STORAGE_KEY, JSON.stringify(tree));
	}

	// Create a new family tree
	function createNew(name: string, rootPerson: Partial<Person> & { firstName: string; lastName: string }) {
		const person = createPerson(rootPerson);
		const rootUnit = createFamilyUnit([person]);
		tree = createFamilyTree(name, rootUnit);
		save();
	}

	// Add a spouse to a single person unit
	function addSpouse(unitId: string, spouse: Partial<Person> & { firstName: string; lastName: string }) {
		if (!tree) return;

		const unit = tree.units[unitId];
		if (!unit || unit.type !== 'single') return;

		const person = createPerson(spouse);
		unit.persons.push(person);
		unit.type = 'couple';
		save();
	}

	// Add a child to a family unit
	function addChild(
		parentUnitId: string,
		child: Partial<Person> & { firstName: string; lastName: string }
	) {
		if (!tree) return;

		const parentUnit = tree.units[parentUnitId];
		if (!parentUnit) return;

		const person = createPerson(child);
		const childUnit = createFamilyUnit([person], { parentId: parentUnitId });

		tree.units[childUnit.id] = childUnit;
		parentUnit.childrenIds.push(childUnit.id);
		save();
	}

	// Add a child unit (can be couple or single)
	function addChildUnit(parentUnitId: string, unit: FamilyUnit) {
		if (!tree) return;

		const parentUnit = tree.units[parentUnitId];
		if (!parentUnit) return;

		unit.parentId = parentUnitId;
		tree.units[unit.id] = unit;
		parentUnit.childrenIds.push(unit.id);
		save();
	}

	// Update a person's data
	function updatePerson(unitId: string, personId: string, updates: Partial<Person>) {
		if (!tree) return;

		const unit = tree.units[unitId];
		if (!unit) return;

		const person = unit.persons.find((p) => p.id === personId);
		if (!person) return;

		Object.assign(person, updates);
		save();
	}

	// Remove a unit and all its descendants
	function removeUnit(unitId: string) {
		if (!tree || unitId === tree.rootId) return;

		const unit = tree.units[unitId];
		if (!unit) return;

		// Remove from parent's children
		if (unit.parentId) {
			const parentUnit = tree.units[unit.parentId];
			if (parentUnit) {
				parentUnit.childrenIds = parentUnit.childrenIds.filter((id) => id !== unitId);
			}
		}

		// Recursively remove descendants
		const toRemove = [unitId];
		while (toRemove.length > 0) {
			const id = toRemove.pop()!;
			const u = tree.units[id];
			if (u) {
				toRemove.push(...u.childrenIds);
				delete tree.units[id];
			}
		}

		save();
	}

	// Get a unit by ID
	function getUnit(unitId: string): FamilyUnit | undefined {
		return tree?.units[unitId];
	}

	// Clear the tree
	function clear() {
		tree = null;
		if (browser) {
			localStorage.removeItem(STORAGE_KEY);
		}
	}

	// Export tree as JSON
	function exportJSON(): string | null {
		return tree ? JSON.stringify(tree, null, 2) : null;
	}

	// Import tree from JSON
	function importJSON(json: string) {
		try {
			tree = JSON.parse(json);
			save();
		} catch {
			console.error('Failed to import family tree');
		}
	}

	return {
		get tree() {
			return tree;
		},
		get isLoaded() {
			return isLoaded;
		},
		load,
		createNew,
		addSpouse,
		addChild,
		addChildUnit,
		updatePerson,
		removeUnit,
		getUnit,
		clear,
		exportJSON,
		importJSON
	};
}

export const familyStore = createFamilyStore();
