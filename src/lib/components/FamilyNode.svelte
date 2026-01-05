<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';
	import type { FamilyUnit, Person } from '$lib/types/family';
	import PersonCard from './PersonCard.svelte';

	interface Props {
		data: {
			unit: FamilyUnit;
		};
	}

	let { data }: Props = $props();

	const isCouple = $derived(data.unit.type === 'couple' && data.unit.persons.length === 2);
	const isPolygamous = $derived(data.unit.type === 'polygamous' && data.unit.persons.length >= 3);
	const hasParent = $derived(!!data.unit.parentId);
	const hasChildren = $derived(data.unit.childrenIds.length > 0);

	// Get the primary person (blood child)
	const primaryPerson = $derived.by(() => {
		const primaryIndex = data.unit.primaryPersonIndex ?? 0;
		return data.unit.persons[primaryIndex];
	});

	// Border color based on primary person's gender
	const primaryBorderColor = $derived(
		primaryPerson?.gender === 'male' ? '#3b82f6' : primaryPerson?.gender === 'female' ? '#ec4899' : '#6366f1'
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

<div class="family-node" class:couple={isCouple} class:polygamous={isPolygamous}>
	{#if hasParent}
		<Handle
			type="target"
			position={Position.Top}
			style={`left: ${handlePosition};`}
		/>
	{/if}

	<div class="persons">
		{#each orderedPersons as person (person.id)}
			<div
				class="person-wrapper"
				class:is-primary={hasParent && isPrimary(person)}
				style={hasParent && isPrimary(person) ? `border-top-color: ${primaryBorderColor};` : ''}
			>
				<PersonCard {person} />
			</div>
		{/each}
	</div>

	{#if isCouple}
		<div class="marriage-line"></div>
	{/if}

	{#if isPolygamous}
		<!-- Multiple marriage lines for polygamous units -->
		{#each women as woman, i (woman.id)}
			<div class="marriage-line" style={`left: ${((i + 0.5 + 0.5) / orderedPersons.length) * 100}%;`}></div>
		{/each}
	{/if}

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

<style>
	.family-node {
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 0.75rem;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		position: relative;
	}

	.family-node:hover {
		border-color: #6366f1;
	}

	.persons {
		display: flex;
		gap: 0.5rem;
	}

	.couple .persons,
	.polygamous .persons {
		position: relative;
	}

	.person-wrapper {
		position: relative;
	}

	/* Colored accent bar showing this person is the blood descendant */
	.is-primary {
		border-top: 4px solid #6366f1;
		border-radius: 0.5rem 0.5rem 0 0;
		margin-top: -2px;
		padding-top: 2px;
	}

	.marriage-line {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 24px;
		height: 4px;
		background: #ec4899;
		border-radius: 2px;
		z-index: 10;
	}

	/* For polygamous units, marriage lines have dynamic left positioning */
	.polygamous .marriage-line {
		transform: translateY(-50%);
	}
</style>
