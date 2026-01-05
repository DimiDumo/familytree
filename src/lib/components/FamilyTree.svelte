<script lang="ts">
	import { SvelteFlow, Controls, Background, MiniMap, type Node, type Edge } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';

	import FamilyNode from './FamilyNode.svelte';
	import FamilyEdge from './FamilyEdge.svelte';
	import AddPersonModal from './AddPersonModal.svelte';
	import type { Person } from '$lib/types/family';

	type AddMode = 'child' | 'spouse' | 'partner';

	interface ModalState {
		open: boolean;
		mode: AddMode;
		unitId: string;
		motherIndex?: number;
	}

	interface Props {
		nodes: Node[];
		edges: Edge[];
		onAddChild?: (unitId: string, person: Partial<Person> & { firstName: string; lastName: string }, motherIndex?: number) => void;
		onAddSpouse?: (unitId: string, person: Partial<Person> & { firstName: string; lastName: string }) => void;
		onAddPartner?: (unitId: string, person: Partial<Person> & { firstName: string; lastName: string }) => void;
	}

	let { nodes = $bindable([]), edges = $bindable([]), onAddChild, onAddSpouse, onAddPartner }: Props = $props();

	let modalState = $state<ModalState>({
		open: false,
		mode: 'child',
		unitId: ''
	});

	// Callbacks to open modal
	function handleAddChild(unitId: string, motherIndex?: number) {
		modalState = { open: true, mode: 'child', unitId, motherIndex };
	}

	function handleAddSpouse(unitId: string) {
		modalState = { open: true, mode: 'spouse', unitId };
	}

	function handleAddPartner(unitId: string) {
		modalState = { open: true, mode: 'partner', unitId };
	}

	function closeModal() {
		modalState = { ...modalState, open: false };
	}

	function handlePersonSubmit(person: Partial<Person> & { firstName: string; lastName: string }) {
		switch (modalState.mode) {
			case 'child':
				onAddChild?.(modalState.unitId, person, modalState.motherIndex);
				break;
			case 'spouse':
				onAddSpouse?.(modalState.unitId, person);
				break;
			case 'partner':
				onAddPartner?.(modalState.unitId, person);
				break;
		}
		closeModal();
	}

	// Inject callbacks into node data
	const nodesWithCallbacks = $derived(
		nodes.map((node) => ({
			...node,
			data: {
				...node.data,
				onAddChild: handleAddChild,
				onAddSpouse: handleAddSpouse,
				onAddPartner: handleAddPartner
			}
		}))
	);

	const nodeTypes = {
		family: FamilyNode
	} as const;

	const edgeTypes = {
		family: FamilyEdge
	} as const;

	// Key to force re-render and fitView when nodes change
	const flowKey = $derived(nodes.map(n => n.id).join('-'));
</script>

<div class="w-full h-full">
	{#key flowKey}
		<SvelteFlow nodes={nodesWithCallbacks} bind:edges {nodeTypes} {edgeTypes} fitView>
			<Controls />
			<Background bgColor="oklch(var(--b2))" />
			<MiniMap bgColor="oklch(var(--b1))" />
		</SvelteFlow>
	{/key}
</div>

<AddPersonModal
	open={modalState.open}
	mode={modalState.mode}
	onSubmit={handlePersonSubmit}
	onClose={closeModal}
/>

<style>
	/* SvelteFlow third-party components need global style overrides */
	:global(.svelte-flow) {
		background: oklch(var(--b2)) !important;
	}

	:global(.svelte-flow__controls-button) {
		background: oklch(var(--b1)) !important;
		border-color: oklch(var(--b3)) !important;
		fill: oklch(var(--bc)) !important;
	}

	:global(.svelte-flow__controls-button:hover) {
		background: oklch(var(--b2)) !important;
	}
</style>
