<script lang="ts">
	import { Handle, Position } from '@xyflow/svelte';
	import type { FamilyUnit } from '$lib/types/family';
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
</script>

<div class="family-node" class:couple={isCouple}>
	{#if hasParent}
		<Handle type="target" position={Position.Top} />
	{/if}

	<div class="persons">
		{#each data.unit.persons as person (person.id)}
			<PersonCard {person} />
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
