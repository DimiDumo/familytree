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

<div class="family-tree-container">
	<SvelteFlow bind:nodes bind:edges {nodeTypes} {edgeTypes} fitView>
		<Controls />
		<Background />
		<MiniMap />
	</SvelteFlow>
</div>

<style>
	.family-tree-container {
		width: 100%;
		height: 100%;
	}
</style>
