<script lang="ts">
	import type { Person } from '$lib/types/family';

	interface Props {
		person: Person;
	}

	let { person }: Props = $props();

	const fullName = $derived(`${person.firstName} ${person.lastName}`);

	const formatDate = (date?: string) => {
		if (!date) return '';
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	};

	const lifespan = $derived.by(() => {
		const birth = person.birthDate ? formatDate(person.birthDate) : '?';
		const death = person.deathDate ? formatDate(person.deathDate) : '';
		return death ? `${birth} - ${death}` : `b. ${birth}`;
	});

	const genderClass = $derived(
		person.gender === 'male' ? 'male' : person.gender === 'female' ? 'female' : ''
	);
</script>

<div class="flex flex-col items-center p-3 min-w-[120px]">
	<div class="w-15 h-15 rounded-full overflow-hidden mb-2 border-3 {genderClass === 'male' ? 'border-primary' : genderClass === 'female' ? 'border-secondary' : 'border-base-300'}">
		{#if person.photoUrl}
			<img src={person.photoUrl} alt={fullName} class="w-full h-full object-cover" />
		{:else}
			<div class="w-full h-full flex items-center justify-center font-semibold text-xl {genderClass === 'male' ? 'bg-primary text-primary-content' : genderClass === 'female' ? 'bg-secondary text-secondary-content' : 'bg-base-300 text-base-content'}">
				{person.firstName[0]}{person.lastName[0]}
			</div>
		{/if}
	</div>
	<div class="text-center">
		<div class="font-semibold text-sm text-base-content">{fullName}</div>
		<div class="text-xs text-base-content/60">{lifespan}</div>
	</div>
</div>

<style>
	.w-15 {
		width: 60px;
	}
	.h-15 {
		height: 60px;
	}
	.border-3 {
		border-width: 3px;
	}
</style>
