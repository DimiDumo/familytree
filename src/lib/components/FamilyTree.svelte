<script lang="ts">
	import { SvelteFlow, Controls, Background, MiniMap, type Node, type Edge } from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';

	import FamilyNode from './FamilyNode.svelte';
	import FamilyEdge from './FamilyEdge.svelte';

	interface Props {
		nodes: Node[];
		edges: Edge[];
	}

	let { nodes = $bindable([]), edges = $bindable([]) }: Props = $props();

	const nodeTypes = {
		family: FamilyNode
	} as const;

	const edgeTypes = {
		family: FamilyEdge
	} as const;
</script>

<div class="w-full h-full">
	<SvelteFlow bind:nodes bind:edges {nodeTypes} {edgeTypes} fitView>
		<Controls />
		<Background bgColor="oklch(var(--b2))" />
		<MiniMap bgColor="oklch(var(--b1))" />
	</SvelteFlow>
</div>

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
