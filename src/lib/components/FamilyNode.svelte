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

	// Order persons: male on left, female on right
	const orderedPersons = $derived.by(() => {
		if (!isCouple) return data.unit.persons;

		const persons = [...data.unit.persons];
		// Sort by gender: male first, then female
		persons.sort((a, b) => {
			if (a.gender === 'male' && b.gender === 'female') return -1;
			if (a.gender === 'female' && b.gender === 'male') return 1;
			return 0;
		});

		return persons;
	});

	// Check if a person is the primary (blood child)
	const isPrimary = (person: Person) => {
		return person.id === primaryPerson?.id;
	};

	// Handle position: if primary is male (left side) -> 25%, if female (right side) -> 75%
	const handlePosition = $derived.by(() => {
		if (!isCouple) return '50%';
		// Male is always left, female always right
		// So if primary is male, handle is at 25% (left), if female, at 75% (right)
		return primaryPerson?.gender === 'female' ? '75%' : '25%';
	});
</script>

<div class="family-node" class:couple={isCouple}>
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

	{#if hasChildren}
		<Handle type="source" position={Position.Bottom} />
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

	.couple .persons {
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
</style>
