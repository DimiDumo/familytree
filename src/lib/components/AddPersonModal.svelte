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
	}

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!firstName.trim() || !lastName.trim()) return;

		onSubmit({
			firstName: firstName.trim(),
			lastName: lastName.trim(),
			gender,
			birthDate: birthDate || undefined,
			deathDate: deathDate || undefined
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
			} else {
				resetForm();
			}
		}
	});
</script>

<dialog class="modal" class:modal-open={open}>
	<div class="modal-box">
		<h3 class="font-bold text-lg mb-4">{modeLabels[mode]}</h3>

		<form onsubmit={handleSubmit} class="space-y-4">
			<div class="form-control">
				<label class="label" for="firstName">
					<span class="label-text">First Name *</span>
				</label>
				<input
					id="firstName"
					type="text"
					class="input input-bordered"
					bind:value={firstName}
					required
					placeholder="Enter first name"
				/>
			</div>

			<div class="form-control">
				<label class="label" for="lastName">
					<span class="label-text">Last Name *</span>
				</label>
				<input
					id="lastName"
					type="text"
					class="input input-bordered"
					bind:value={lastName}
					required
					placeholder="Enter last name"
				/>
			</div>

			<fieldset class="form-control">
				<legend class="label">
					<span class="label-text">Gender *</span>
				</legend>
				<div class="flex gap-6">
					<label class="label cursor-pointer gap-2">
						<input
							type="radio"
							name="gender"
							class="radio radio-primary"
							value="male"
							bind:group={gender}
						/>
						<span class="label-text">Male</span>
					</label>
					<label class="label cursor-pointer gap-2">
						<input
							type="radio"
							name="gender"
							class="radio radio-secondary"
							value="female"
							bind:group={gender}
						/>
						<span class="label-text">Female</span>
					</label>
				</div>
			</fieldset>

			<div class="grid grid-cols-2 gap-4">
				<div class="form-control">
					<label class="label" for="birthDate">
						<span class="label-text">Birth Date</span>
					</label>
					<input
						id="birthDate"
						type="date"
						class="input input-bordered"
						bind:value={birthDate}
					/>
				</div>

				<div class="form-control">
					<label class="label" for="deathDate">
						<span class="label-text">Death Date</span>
					</label>
					<input
						id="deathDate"
						type="date"
						class="input input-bordered"
						bind:value={deathDate}
					/>
				</div>
			</div>

			<div class="modal-action">
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
