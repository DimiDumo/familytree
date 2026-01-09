import { browser } from '$app/environment';
import type { FamilyTree, FamilyUnit, Person } from '$lib/types/family';

function createFamilyStore() {
	let tree = $state<FamilyTree | null>(null);
	let isLoaded = $state(false);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let currentTreeId = $state<string | null>(null);

	// Load tree from API
	async function load(treeId?: string) {
		if (!browser) return;

		isLoading = true;
		error = null;

		try {
			if (treeId) {
				// Load specific tree
				const response = await fetch(`/api/trees/${treeId}`);
				if (response.ok) {
					tree = await response.json();
					currentTreeId = treeId;
				} else if (response.status === 404) {
					tree = null;
					currentTreeId = null;
				} else {
					throw new Error('Failed to load tree');
				}
			} else {
				// Load list of trees and get the first one (or null)
				const response = await fetch('/api/trees');
				if (response.ok) {
					const trees = (await response.json()) as { id: string; name: string }[];
					if (trees.length > 0) {
						// Load the first tree
						const firstTreeResponse = await fetch(`/api/trees/${trees[0].id}`);
						if (firstTreeResponse.ok) {
							tree = (await firstTreeResponse.json()) as FamilyTree;
							currentTreeId = trees[0].id;
						}
					} else {
						tree = null;
						currentTreeId = null;
					}
				} else {
					throw new Error('Failed to load trees');
				}
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
			tree = null;
			currentTreeId = null;
		} finally {
			isLoaded = true;
			isLoading = false;
		}
	}

	// Create a new family tree
	async function createNew(name: string, rootPerson: Partial<Person> & { firstName: string; lastName: string }) {
		if (!browser) return;

		isLoading = true;
		error = null;

		try {
			const response = await fetch('/api/trees', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, rootPerson })
			});

			if (!response.ok) {
				throw new Error('Failed to create tree');
			}

			const result = (await response.json()) as { id: string };
			currentTreeId = result.id;

			// Reload the full tree
			await load(result.id);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			isLoading = false;
		}
	}

	// Add a spouse to a single person unit
	async function addSpouse(unitId: string, spouse: Partial<Person> & { firstName: string; lastName: string }) {
		if (!browser || !tree || !currentTreeId) return;

		const unit = tree.units[unitId];
		if (!unit || unit.type !== 'single') return;

		isLoading = true;
		error = null;

		try {
			const response = await fetch(`/api/trees/${currentTreeId}/units`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'addSpouse', unitId, person: spouse })
			});

			if (!response.ok) {
				throw new Error('Failed to add spouse');
			}

			const result = (await response.json()) as { person: Person };

			// Update local state
			unit.persons.push(result.person);
			unit.type = 'couple';
			unit.primaryPersonIndex = 0;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			isLoading = false;
		}
	}

	// Add a child to a family unit
	async function addChild(
		parentUnitId: string,
		child: Partial<Person> & { firstName: string; lastName: string },
		motherIndex?: number
	) {
		if (!browser || !tree || !currentTreeId) return;

		const parentUnit = tree.units[parentUnitId];
		if (!parentUnit) return;

		isLoading = true;
		error = null;

		try {
			const response = await fetch(`/api/trees/${currentTreeId}/units`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'addChild', unitId: parentUnitId, person: child, motherIndex })
			});

			if (!response.ok) {
				throw new Error('Failed to add child');
			}

			const result = (await response.json()) as { unit: FamilyUnit; person: Person };

			// Update local state
			tree.units[result.unit.id] = result.unit;
			parentUnit.childrenIds.push(result.unit.id);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			isLoading = false;
		}
	}

	// Add a mistress to a couple (converts to polygamous)
	async function addMistress(
		unitId: string,
		mistress: Partial<Person> & { firstName: string; lastName: string }
	) {
		if (!browser || !tree || !currentTreeId) return;

		const unit = tree.units[unitId];
		if (!unit || unit.type === 'single') return;

		isLoading = true;
		error = null;

		try {
			const response = await fetch(`/api/trees/${currentTreeId}/units`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'addMistress', unitId, person: mistress })
			});

			if (!response.ok) {
				throw new Error('Failed to add mistress');
			}

			const result = (await response.json()) as { person: Person };

			// Update local state
			unit.persons.push(result.person);
			unit.type = 'polygamous';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			isLoading = false;
		}
	}

	// Add a child unit (can be couple or single)
	async function addChildUnit(parentUnitId: string, unit: FamilyUnit) {
		if (!browser || !tree || !currentTreeId) return;

		const parentUnit = tree.units[parentUnitId];
		if (!parentUnit) return;

		// This is a convenience method - we add each person via the API
		// For simplicity, just add the first person as a child
		if (unit.persons.length > 0) {
			await addChild(parentUnitId, unit.persons[0], unit.motherIndex);
		}
	}

	// Update a person's data
	async function updatePerson(unitId: string, personId: string, updates: Partial<Person>) {
		if (!browser || !tree || !currentTreeId) return;

		const unit = tree.units[unitId];
		if (!unit) return;

		const person = unit.persons.find((p) => p.id === personId);
		if (!person) return;

		isLoading = true;
		error = null;

		try {
			const response = await fetch(`/api/trees/${currentTreeId}/persons/${personId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates)
			});

			if (!response.ok) {
				throw new Error('Failed to update person');
			}

			// Update local state
			Object.assign(person, updates);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			isLoading = false;
		}
	}

	// Remove a unit and all its descendants
	async function removeUnit(unitId: string) {
		if (!browser || !tree || !currentTreeId || unitId === tree.rootId) return;

		const unit = tree.units[unitId];
		if (!unit) return;

		isLoading = true;
		error = null;

		try {
			const response = await fetch(`/api/trees/${currentTreeId}/units/${unitId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Failed to delete unit');
			}

			const result = (await response.json()) as { deletedIds: string[] };

			// Update local state - remove from parent's children
			if (unit.parentId) {
				const parentUnit = tree.units[unit.parentId];
				if (parentUnit) {
					parentUnit.childrenIds = parentUnit.childrenIds.filter((id) => id !== unitId);
				}
			}

			// Remove all deleted units
			for (const id of result.deletedIds) {
				delete tree.units[id];
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			isLoading = false;
		}
	}

	// Get a unit by ID
	function getUnit(unitId: string): FamilyUnit | undefined {
		return tree?.units[unitId];
	}

	// Clear the tree
	async function clear() {
		if (!browser || !currentTreeId) return;

		isLoading = true;
		error = null;

		try {
			const response = await fetch(`/api/trees/${currentTreeId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Failed to delete tree');
			}

			tree = null;
			currentTreeId = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
		} finally {
			isLoading = false;
		}
	}

	// Export tree as JSON (from local state)
	function exportJSON(): string | null {
		return tree ? JSON.stringify(tree, null, 2) : null;
	}

	// Import tree from JSON - creates a new tree with the imported data
	async function importJSON(json: string) {
		if (!browser) return;

		try {
			const importedTree = JSON.parse(json) as FamilyTree;

			// Create new tree via API
			// For simplicity, we'll create a basic tree and would need a more complex import endpoint
			// For now, this preserves the local-only functionality
			tree = importedTree;
			currentTreeId = importedTree.id;
			error = null;
		} catch {
			error = 'Failed to import family tree';
		}
	}

	return {
		get tree() {
			return tree;
		},
		get isLoaded() {
			return isLoaded;
		},
		get isLoading() {
			return isLoading;
		},
		get error() {
			return error;
		},
		get currentTreeId() {
			return currentTreeId;
		},
		load,
		createNew,
		addSpouse,
		addMistress,
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
