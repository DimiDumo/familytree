<script lang="ts">
	import type { Person } from '$lib/types/family';

	type AddMode = 'child' | 'spouse' | 'partner' | 'edit';

	interface Props {
		open: boolean;
		mode: AddMode;
		editPerson?: Person;
		onSubmit: (person: Partial<Person> & { firstName: string; lastName: string }) => void;
		onClose: () => void;
	}

	let { open, mode, editPerson, onSubmit, onClose }: Props = $props();

	let firstName = $state('');
	let lastName = $state('');
	let gender = $state<'male' | 'female'>('male');
	let birthDate = $state('');
	let deathDate = $state('');
	let biography = $state('');

	const modeLabels: Record<AddMode, string> = {
		child: 'Add Child',
		spouse: 'Add Spouse',
		partner: 'Add Partner',
		edit: 'Edit Person'
	};

	const isEdit = $derived(mode === 'edit');

	function resetForm() {
		firstName = '';
		lastName = '';
		gender = 'male';
		birthDate = '';
		deathDate = '';
		biography = '';
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!firstName.trim() || !lastName.trim()) return;

		onSubmit({
			firstName: firstName.trim(),
			lastName: lastName.trim(),
			gender,
			birthDate: birthDate || undefined,
			deathDate: deathDate || undefined,
			biography: biography.trim() || undefined
		});

		resetForm();
	}

	function handleClose() {
		resetForm();
		onClose();
	}

	// Reset or populate form when modal opens
	$effect(() => {
		if (open) {
			if (mode === 'edit' && editPerson) {
				firstName = editPerson.firstName;
				lastName = editPerson.lastName;
				gender = editPerson.gender || 'male';
				birthDate = editPerson.birthDate || '';
				deathDate = editPerson.deathDate || '';
				biography = editPerson.biography || '';
			} else {
				resetForm();
			}
		}
	});
</script>

<dialog class="modal" class:modal-open={open}>
	<div class="modal-box">
		<h3 class="font-bold text-lg mb-6">{modeLabels[mode]}</h3>

		<form onsubmit={handleSubmit} class="flex flex-col gap-4">
			<!-- Name fields -->
			<div class="grid grid-cols-2 gap-4">
				<div class="flex flex-col gap-1">
					<label class="text-sm font-medium" for="firstName">First Name *</label>
					<input
						id="firstName"
						type="text"
						class="input input-bordered w-full"
						bind:value={firstName}
						required
						placeholder="Enter first name"
					/>
				</div>
				<div class="flex flex-col gap-1">
					<label class="text-sm font-medium" for="lastName">Last Name *</label>
					<input
						id="lastName"
						type="text"
						class="input input-bordered w-full"
						bind:value={lastName}
						required
						placeholder="Enter last name"
					/>
				</div>
			</div>

			<!-- Gender -->
			<div class="flex flex-col gap-2">
				<span class="text-sm font-medium">Gender *</span>
				<div class="flex gap-4">
					<label class="flex items-center gap-2 cursor-pointer">
						<input
							type="radio"
							name="gender"
							class="radio radio-primary"
							value="male"
							bind:group={gender}
						/>
						<span>Male</span>
					</label>
					<label class="flex items-center gap-2 cursor-pointer">
						<input
							type="radio"
							name="gender"
							class="radio radio-secondary"
							value="female"
							bind:group={gender}
						/>
						<span>Female</span>
					</label>
				</div>
			</div>

			<!-- Date fields -->
			<div class="grid grid-cols-2 gap-4">
				<div class="flex flex-col gap-1">
					<label class="text-sm font-medium" for="birthDate">Birth Date</label>
					<input
						id="birthDate"
						type="date"
						class="input input-bordered w-full"
						bind:value={birthDate}
					/>
				</div>
				<div class="flex flex-col gap-1">
					<label class="text-sm font-medium" for="deathDate">Death Date</label>
					<input
						id="deathDate"
						type="date"
						class="input input-bordered w-full"
						bind:value={deathDate}
					/>
				</div>
			</div>

			<!-- Biography -->
			<div class="flex flex-col gap-1">
				<label class="text-sm font-medium" for="biography">Biography</label>
				<textarea
					id="biography"
					class="textarea textarea-bordered w-full h-24"
					bind:value={biography}
					placeholder="Enter biography..."
				></textarea>
			</div>

			<!-- Actions -->
			<div class="flex justify-end gap-2 mt-4">
				<button type="button" class="btn btn-ghost" onclick={handleClose}>
					Cancel
				</button>
				<button type="submit" class="btn btn-primary">
					{isEdit ? 'Save' : 'Add'}
				</button>
			</div>
		</form>
	</div>

	<form method="dialog" class="modal-backdrop">
		<button onclick={handleClose}>close</button>
	</form>
</dialog>
