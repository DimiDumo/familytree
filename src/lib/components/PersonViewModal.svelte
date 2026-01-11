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

	const hasPhotos = $derived((person?.photoUrls?.length ?? 0) > 0);
	const photoCount = $derived(person?.photoUrls?.length ?? 0);
</script>

<dialog class="modal" class:modal-open={open}>
	<div class="modal-box">
		{#if person}
			<!-- Photo Carousel -->
			{#if hasPhotos}
				<div class="mb-4">
					<div class="carousel carousel-center w-full rounded-box bg-base-200">
						{#each person.photoUrls as key, i (key)}
							<div class="carousel-item w-full">
								<img
									src="/api/images/{key}"
									alt="{person.firstName} {person.lastName} - Photo {i + 1}"
									class="w-full object-contain max-h-72"
								/>
							</div>
						{/each}
					</div>
					{#if photoCount > 1}
						<p class="text-center text-sm text-base-content/60 mt-2">
							Swipe to see {photoCount} photos
						</p>
					{/if}
				</div>
			{/if}

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
				{#if person.biography}
					<div class="pt-2 border-t border-base-300">
						<span class="text-base-content/60 text-sm">Biography</span>
						<p class="mt-1 whitespace-pre-wrap">{person.biography}</p>
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
