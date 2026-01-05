<script lang="ts">
	import type { Person } from '$lib/types/family';

	interface Props {
		open: boolean;
		person?: Person;
		onClose: () => void;
	}

	let { open, person, onClose }: Props = $props();

	const formatDate = (date?: string) => {
		if (!date) return 'Unknown';
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	};

	const genderLabel = $derived(
		person?.gender === 'male' ? 'Male' : person?.gender === 'female' ? 'Female' : 'Unknown'
	);
</script>

<dialog class="modal" class:modal-open={open}>
	<div class="modal-box">
		{#if person}
			<h3 class="font-bold text-xl mb-4">{person.firstName} {person.lastName}</h3>

			<div class="space-y-3">
				<div class="flex justify-between">
					<span class="text-base-content/60">Gender</span>
					<span>{genderLabel}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-base-content/60">Birth Date</span>
					<span>{formatDate(person.birthDate)}</span>
				</div>
				{#if person.deathDate}
					<div class="flex justify-between">
						<span class="text-base-content/60">Death Date</span>
						<span>{formatDate(person.deathDate)}</span>
					</div>
				{/if}
			</div>
		{/if}

		<div class="modal-action">
			<button class="btn" onclick={onClose}>Close</button>
		</div>
	</div>

	<form method="dialog" class="modal-backdrop">
		<button onclick={onClose}>close</button>
	</form>
</dialog>
