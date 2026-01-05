<script lang="ts">
	import { fade } from 'svelte/transition';
	import type { FamilyUnit, Person } from '$lib/types/family';
	import AddButton from './AddButton.svelte';

	interface Props {
		unit: FamilyUnit;
		isHovered: boolean;
		onAddChild: (motherIndex?: number) => void;
		onAddSpouse: () => void;
		onAddPartner: () => void;
	}

	let { unit, isHovered, onAddChild, onAddSpouse, onAddPartner }: Props = $props();

	const isSingle = $derived(unit.type === 'single');
	const isCouple = $derived(unit.type === 'couple');
	const isPolygamous = $derived(unit.type === 'polygamous');

	// Get ordered persons (male first, then females)
	const orderedPersons = $derived.by(() => {
		if (unit.type === 'single') return unit.persons;
		const persons = [...unit.persons];
		persons.sort((a, b) => {
			if (a.gender === 'male' && b.gender === 'female') return -1;
			if (a.gender === 'female' && b.gender === 'male') return 1;
			return 0;
		});
		return persons;
	});

	// Get women for polygamous units
	const women = $derived.by(() => {
		if (!isPolygamous) return [];
		return orderedPersons.filter((p) => p.gender === 'female');
	});

	// Get the original index of a person in unit.persons (for motherIndex)
	const getPersonOriginalIndex = (person: Person) => {
		return unit.persons.findIndex((p) => p.id === person.id);
	};

	// Calculate button position for a woman in polygamous unit
	const getWomanButtonPosition = (womanIndex: number) => {
		const totalPersons = orderedPersons.length;
		const womanPersonIndex = 1 + womanIndex; // Man is index 0
		return `${((womanPersonIndex + 0.5) / totalPersons) * 100}%`;
	};
</script>

{#if isHovered}
	<div class="add-controls" transition:fade={{ duration: 150 }}>
		<!-- Child button(s) at bottom -->
		{#if isPolygamous}
			<!-- One button per woman for polygamous units -->
			{#each women as woman, i (woman.id)}
				<div
					class="absolute bottom-0 translate-y-full pt-2"
					style:left={getWomanButtonPosition(i)}
					style:transform="translateX(-50%) translateY(100%)"
				>
					<AddButton
						tooltip="Add child from {woman.firstName}"
						variant="secondary"
						onclick={() => onAddChild(getPersonOriginalIndex(woman))}
					/>
				</div>
			{/each}
		{:else}
			<!-- Single centered button for single/couple -->
			<div class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full pt-2">
				<AddButton
					tooltip="Add child"
					variant="accent"
					onclick={() => onAddChild()}
				/>
			</div>
		{/if}

		<!-- Spouse/Partner button on right -->
		<div class="absolute right-0 top-1/2 translate-x-full -translate-y-1/2 pl-2">
			{#if isSingle}
				<AddButton
					tooltip="Add spouse"
					variant="primary"
					onclick={onAddSpouse}
				/>
			{:else}
				<AddButton
					tooltip="Add partner"
					variant="secondary"
					onclick={onAddPartner}
				/>
			{/if}
		</div>
	</div>
{/if}

<style>
	.add-controls {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	.add-controls :global(.tooltip) {
		pointer-events: auto;
	}
</style>
