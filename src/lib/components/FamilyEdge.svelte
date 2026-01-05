<script lang="ts">
	import type { EdgeProps } from '@xyflow/svelte';

	interface Props extends EdgeProps {
		data?: {
			gender?: 'male' | 'female';
		};
	}

	let { id, sourceX, sourceY, targetX, targetY, data }: Props = $props();

	// Gender-based colors
	const strokeColor = $derived(
		data?.gender === 'male' ? '#3b82f6' : data?.gender === 'female' ? '#ec4899' : '#9ca3af'
	);

	// Unique marker ID for this edge
	const markerId = $derived(`arrowhead-${id}`);

	// Create a step path with rounded corners
	const edgePath = $derived.by(() => {
		const midY = sourceY + (targetY - sourceY) / 2;
		const radius = 8; // Corner radius

		// Determine direction - use generous threshold for "straight" to avoid tiny jogs
		const horizontalDiff = Math.abs(targetX - sourceX);
		const goingRight = targetX > sourceX;
		const straight = horizontalDiff < 20;

		// End line 1px before target to avoid overlapping the arrow
		const endY = targetY - 1;

		if (straight) {
			// Straight line down
			return `M ${sourceX} ${sourceY} L ${sourceX} ${endY}`;
		}

		if (goingRight) {
			return `
				M ${sourceX} ${sourceY}
				L ${sourceX} ${midY - radius}
				Q ${sourceX} ${midY} ${sourceX + radius} ${midY}
				L ${targetX - radius} ${midY}
				Q ${targetX} ${midY} ${targetX} ${midY + radius}
				L ${targetX} ${endY}
			`;
		} else {
			return `
				M ${sourceX} ${sourceY}
				L ${sourceX} ${midY - radius}
				Q ${sourceX} ${midY} ${sourceX - radius} ${midY}
				L ${targetX + radius} ${midY}
				Q ${targetX} ${midY} ${targetX} ${midY + radius}
				L ${targetX} ${endY}
			`;
		}
	});
</script>

<!-- Define arrowhead marker (smaller, tip at reference point) -->
<defs>
	<marker
		id={markerId}
		markerWidth="4"
		markerHeight="4"
		refX="4"
		refY="2"
		orient="auto"
		markerUnits="strokeWidth"
	>
		<path d="M 0 0 L 4 2 L 0 4 L 1 2 Z" fill={strokeColor} />
	</marker>
</defs>

<path
	{id}
	d={edgePath}
	fill="none"
	stroke={strokeColor}
	stroke-width="3"
	marker-end="url(#{markerId})"
/>
