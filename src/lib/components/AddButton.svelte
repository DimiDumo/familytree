<script lang="ts">
	interface Props {
		tooltip: string;
		variant?: 'primary' | 'secondary' | 'accent';
		onclick: (e: MouseEvent) => void;
	}

	let { tooltip, variant = 'accent', onclick }: Props = $props();

	const variantClass = $derived(
		variant === 'primary'
			? 'btn-primary'
			: variant === 'secondary'
				? 'btn-secondary'
				: 'btn-accent'
	);

	function handleClick(e: MouseEvent) {
		e.stopPropagation();
		onclick(e);
	}
</script>

<div class="tooltip" data-tip={tooltip}>
	<button
		type="button"
		class="btn btn-circle btn-xs {variantClass} shadow-md"
		onclick={handleClick}
		aria-label={tooltip}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="h-3 w-3"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			stroke-width="3"
		>
			<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
		</svg>
	</button>
</div>
