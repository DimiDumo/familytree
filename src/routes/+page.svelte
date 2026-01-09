<script lang="ts">
	import { onMount } from 'svelte';
	import FamilyTree from '$lib/components/FamilyTree.svelte';
	import { familyStore } from '$lib/stores/familyStore.svelte';
	import { layoutFamilyTree, familyTreeToNodesEdges } from '$lib/utils/layout';
	import type { Node, Edge } from '@xyflow/svelte';
	import type { Person } from '$lib/types/family';

	type AppMode = 'view' | 'edit';

	let nodes = $state<Node[]>([]);
	let edges = $state<Edge[]>([]);
	let showTree = $state(false);
	let appMode = $state<AppMode>('edit');

	onMount(async () => {
		await familyStore.load();

		// Create sample data if no tree exists
		if (!familyStore.tree) {
			await createSampleTree();
		}

		await updateLayout();
	});

	async function createSampleTree() {
		// Create grandparents
		await familyStore.createNew('Sample Family', {
			firstName: 'John',
			lastName: 'Smith',
			gender: 'male',
			birthDate: '1940-05-15'
		});

		if (!familyStore.tree) return;

		// Add spouse to root (grandparents)
		const rootId = familyStore.tree.rootId;
		await familyStore.addSpouse(rootId, {
			firstName: 'Mary',
			lastName: 'Smith',
			gender: 'female',
			birthDate: '1942-08-22'
		});

		// Add first child (parent generation)
		await familyStore.addChild(rootId, {
			firstName: 'Robert',
			lastName: 'Smith',
			gender: 'male',
			birthDate: '1965-03-10'
		});

		// Add second child
		await familyStore.addChild(rootId, {
			firstName: 'Susan',
			lastName: 'Smith',
			gender: 'female',
			birthDate: '1968-11-25'
		});

		// Get the children units to add their families
		const rootUnit = familyStore.tree.units[rootId];
		if (rootUnit && rootUnit.childrenIds.length >= 2) {
			const child1Id = rootUnit.childrenIds[0];
			const child2Id = rootUnit.childrenIds[1];

			// Add spouse (wife) to first child
			await familyStore.addSpouse(child1Id, {
				firstName: 'Emily',
				lastName: 'Smith',
				gender: 'female',
				birthDate: '1967-07-14'
			});

			// Add mistress to first child (makes it polygamous)
			await familyStore.addMistress(child1Id, {
				firstName: 'Jennifer',
				lastName: 'Jones',
				gender: 'female',
				birthDate: '1970-01-15'
			});

			// Add grandchildren to first child - specifying which mother
			// Emily (wife) is at index 1 in persons array
			await familyStore.addChild(child1Id, {
				firstName: 'Michael',
				lastName: 'Smith',
				gender: 'male',
				birthDate: '1990-02-28'
			}, 1); // Child of Emily (wife)

			await familyStore.addChild(child1Id, {
				firstName: 'Sarah',
				lastName: 'Smith',
				gender: 'female',
				birthDate: '1993-09-05'
			}, 1); // Child of Emily (wife)

			// Jennifer (mistress) is at index 2 in persons array
			await familyStore.addChild(child1Id, {
				firstName: 'Jessica',
				lastName: 'Smith',
				gender: 'female',
				birthDate: '1995-06-20'
			}, 2); // Child of Jennifer (mistress)

			// Add spouse to second child
			await familyStore.addSpouse(child2Id, {
				firstName: 'David',
				lastName: 'Johnson',
				gender: 'male',
				birthDate: '1966-04-18'
			});

			// Add grandchildren to second child
			await familyStore.addChild(child2Id, {
				firstName: 'Emma',
				lastName: 'Johnson',
				gender: 'female',
				birthDate: '1992-12-12'
			});
		}
	}

	async function updateLayout() {
		if (!familyStore.tree) return;

		try {
			// Try ELK layout first
			const layout = await layoutFamilyTree(familyStore.tree);
			nodes = layout.nodes;
			edges = layout.edges;
		} catch (error) {
			console.warn('ELK layout failed, using fallback:', error);
			// Fallback to simple layout
			const layout = familyTreeToNodesEdges(familyStore.tree);
			nodes = layout.nodes;
			edges = layout.edges;
		}

		showTree = true;
	}

	async function handleReset() {
		await familyStore.clear();
		await createSampleTree();
		await updateLayout();
	}

	// Handle adding a child from the modal
	async function handleAddChild(
		unitId: string,
		person: Partial<Person> & { firstName: string; lastName: string },
		motherIndex?: number
	) {
		await familyStore.addChild(unitId, person, motherIndex);
		await updateLayout();
	}

	// Handle adding a spouse from the modal
	async function handleAddSpouse(
		unitId: string,
		person: Partial<Person> & { firstName: string; lastName: string }
	) {
		await familyStore.addSpouse(unitId, person);
		await updateLayout();
	}

	// Handle adding a partner (mistress) from the modal
	async function handleAddPartner(
		unitId: string,
		person: Partial<Person> & { firstName: string; lastName: string }
	) {
		await familyStore.addMistress(unitId, person);
		await updateLayout();
	}

	// Handle editing a person from the modal
	async function handleEditPerson(
		unitId: string,
		personId: string,
		updates: Partial<Person> & { firstName: string; lastName: string }
	) {
		await familyStore.updatePerson(unitId, personId, updates);
		// No re-layout needed since structure doesn't change
	}
</script>

<div class="h-screen flex flex-col">
	<header class="navbar bg-base-100 shadow-md">
		<div class="flex-1">
			<span class="text-xl font-bold px-4">Family Tree</span>
		</div>
		<div class="flex-none gap-2">
			<div class="tabs tabs-boxed">
				<button
					class="tab"
					class:tab-active={appMode === 'view'}
					onclick={() => (appMode = 'view')}
				>
					View
				</button>
				<button
					class="tab"
					class:tab-active={appMode === 'edit'}
					onclick={() => (appMode = 'edit')}
				>
					Edit
				</button>
			</div>
			<button class="btn btn-ghost btn-sm" onclick={handleReset}>
				Reset Sample Data
			</button>
		</div>
	</header>

	<main class="flex-1 bg-base-200">
		{#if familyStore.isLoading}
			<div class="flex items-center justify-center h-full">
				<span class="loading loading-spinner loading-lg"></span>
			</div>
		{:else if familyStore.error}
			<div class="flex items-center justify-center h-full">
				<div class="alert alert-error max-w-md">
					<span>Error: {familyStore.error}</span>
				</div>
			</div>
		{:else if showTree && nodes.length > 0}
			<FamilyTree
				bind:nodes
				bind:edges
				mode={appMode}
				onAddChild={handleAddChild}
				onAddSpouse={handleAddSpouse}
				onAddPartner={handleAddPartner}
				onEditPerson={handleEditPerson}
			/>
		{:else}
			<div class="flex items-center justify-center h-full">
				<span class="loading loading-spinner loading-lg"></span>
			</div>
		{/if}
	</main>
</div>
