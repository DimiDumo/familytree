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

<div class="person-card">
	<div class="avatar {genderClass}">
		{#if person.photoUrl}
			<img src={person.photoUrl} alt={fullName} />
		{:else}
			<div class="avatar-placeholder {genderClass}">
				{person.firstName[0]}{person.lastName[0]}
			</div>
		{/if}
	</div>
	<div class="info">
		<div class="name">{fullName}</div>
		<div class="dates">{lifespan}</div>
	</div>
</div>

<style>
	.person-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 0.75rem;
		min-width: 120px;
	}

	.avatar {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		overflow: hidden;
		margin-bottom: 0.5rem;
		border: 3px solid #d1d5db;
	}

	/* Male - blue border */
	.avatar.male {
		border-color: #3b82f6;
	}

	/* Female - pink border */
	.avatar.female {
		border-color: #ec4899;
	}

	.avatar img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.avatar-placeholder {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #6366f1;
		color: white;
		font-weight: 600;
		font-size: 1.25rem;
	}

	/* Male placeholder - blue background */
	.avatar-placeholder.male {
		background: #3b82f6;
	}

	/* Female placeholder - pink background */
	.avatar-placeholder.female {
		background: #ec4899;
	}

	.info {
		text-align: center;
	}

	.name {
		font-weight: 600;
		font-size: 0.875rem;
		color: #1f2937;
	}

	.dates {
		font-size: 0.75rem;
		color: #6b7280;
	}
</style>
