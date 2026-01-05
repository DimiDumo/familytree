<script lang="ts">
	import { BaseEdge, type EdgeProps } from '@xyflow/svelte';

	let { id, sourceX, sourceY, targetX, targetY }: EdgeProps = $props();

	// Create a step path: vertical down, horizontal across, vertical down
	const edgePath = $derived.by(() => {
		const midY = sourceY + (targetY - sourceY) / 2;
		return `M ${sourceX} ${sourceY} L ${sourceX} ${midY} L ${targetX} ${midY} L ${targetX} ${targetY}`;
	});
</script>

<BaseEdge {id} path={edgePath} style="stroke: #9ca3af; stroke-width: 2px;" />
