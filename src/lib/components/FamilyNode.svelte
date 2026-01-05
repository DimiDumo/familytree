<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';
	import type { FamilyUnit, Person } from '$lib/types/family';
	import PersonCard from './PersonCard.svelte';
	import NodeAddControls from './NodeAddControls.svelte';

	interface Props {
		data: {
			unit: FamilyUnit;
			onAddChild?: (unitId: string, motherIndex?: number) => void;
			onAddSpouse?: (unitId: string) => void;
			onAddPartner?: (unitId: string) => void;
			onEditPerson?: (unitId: string, person: Person) => void;
		};
	}

	let { data }: Props = $props();

	let isHovered = $state(false);

	function handleAddChild(motherIndex?: number) {
		data.onAddChild?.(data.unit.id, motherIndex);
	}

	function handleAddSpouse() {
		data.onAddSpouse?.(data.unit.id);
	}

	function handleAddPartner() {
		data.onAddPartner?.(data.unit.id);
	}

	function handleEditPerson(person: Person) {
		data.onEditPerson?.(data.unit.id, person);
	}

	const isCouple = $derived(data.unit.type === 'couple' && data.unit.persons.length === 2);
	const isPolygamous = $derived(data.unit.type === 'polygamous' && data.unit.persons.length >= 3);
	const hasParent = $derived(!!data.unit.parentId);
	const hasChildren = $derived(data.unit.childrenIds.length > 0);

	// Get the primary person (blood child)
	const primaryPerson = $derived.by(() => {
		const primaryIndex = data.unit.primaryPersonIndex ?? 0;
		return data.unit.persons[primaryIndex];
	});

	// Border color class based on primary person's gender
	const primaryBorderClass = $derived(
		primaryPerson?.gender === 'male' ? 'border-primary' : primaryPerson?.gender === 'female' ? 'border-secondary' : 'border-accent'
	);

	// Order persons: male on left, females on right (for couple and polygamous)
	const orderedPersons = $derived.by(() => {
		if (data.unit.type === 'single') return data.unit.persons;

		const persons = [...data.unit.persons];
		// Sort by gender: male first, then females
		persons.sort((a, b) => {
			if (a.gender === 'male' && b.gender === 'female') return -1;
			if (a.gender === 'female' && b.gender === 'male') return 1;
			return 0;
		});

		return persons;
	});

	// Get women (for polygamous units - need handles for each)
	const women = $derived.by(() => {
		if (!isPolygamous) return [];
		return orderedPersons.filter(p => p.gender === 'female');
	});

	// Check if a person is the primary (blood child)
	const isPrimary = (person: Person) => {
		return person.id === primaryPerson?.id;
	};

	// Get the original index of a person in data.unit.persons (for motherIndex)
	const getPersonOriginalIndex = (person: Person) => {
		return data.unit.persons.findIndex(p => p.id === person.id);
	};

	// Handle position for target (incoming edge from parent)
	const handlePosition = $derived.by(() => {
		if (data.unit.type === 'single') return '50%';
		if (isPolygamous) {
			// For polygamous, position handle over the primary person
			const primaryIndex = orderedPersons.findIndex(p => p.id === primaryPerson?.id);
			const totalPersons = orderedPersons.length;
			// Each person takes equal width, handle at center of their slot
			return `${((primaryIndex + 0.5) / totalPersons) * 100}%`;
		}
		// Couple: male left, female right
		return primaryPerson?.gender === 'female' ? '75%' : '25%';
	});

	// Calculate source handle position for a woman (for polygamous units)
	const getWomanHandlePosition = (womanIndex: number, totalWomen: number) => {
		// Women are displayed after the man, so offset by 1 person width
		const totalPersons = orderedPersons.length;
		const womanPersonIndex = 1 + womanIndex; // Man is index 0, women start at 1
		return `${((womanPersonIndex + 0.5) / totalPersons) * 100}%`;
	};
</script>

<div
	class="relative"
	role="group"
	onmouseenter={() => (isHovered = true)}
	onmouseleave={() => (isHovered = false)}
>
	<!-- Invisible expanded hover zone -->
	<div class="absolute -inset-8 pointer-events-auto"></div>

	<div class="bg-base-100 border-2 border-base-300 rounded-xl shadow-md relative hover:border-primary">
	{#if hasParent}
		<Handle
			type="target"
			position={Position.Top}
			style={`left: ${handlePosition};`}
		/>
	{/if}

	<div class="flex gap-2">
		{#each orderedPersons as person (person.id)}
			<div
				class="relative {hasParent && isPrimary(person) ? `is-primary ${primaryBorderClass}` : ''}"
			>
				<PersonCard {person} onclick={() => handleEditPerson(person)} />
			</div>
		{/each}
	</div>

	{#if hasChildren}
		{#if isPolygamous}
			<!-- Multiple source handles for polygamous units - one per woman -->
			{#each women as woman, i (woman.id)}
				<Handle
					type="source"
					position={Position.Bottom}
					id={`mother-${getPersonOriginalIndex(woman)}`}
					style={`left: ${getWomanHandlePosition(i, women.length)};`}
				/>
			{/each}
		{:else}
			<Handle type="source" position={Position.Bottom} />
		{/if}
	{/if}
	</div>

	<NodeAddControls
		unit={data.unit}
		{isHovered}
		onAddChild={handleAddChild}
		onAddSpouse={handleAddSpouse}
		onAddPartner={handleAddPartner}
	/>
</div>

<style>
	/* Colored accent bar showing this person is the blood descendant */
	.is-primary {
		border-top-width: 8px;
		border-top-style: solid;
		border-radius: 0.5rem 0.5rem 0 0;
		margin-top: -4px;
		padding-top: 4px;
	}
</style>
