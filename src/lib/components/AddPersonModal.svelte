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
	let photoUrls = $state<string[]>([]);
	let pendingFiles = $state<File[]>([]);
	let isUploading = $state(false);

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
		photoUrls = [];
		pendingFiles = [];
	}

	async function uploadFile(file: File, personId?: string): Promise<string> {
		const formData = new FormData();
		formData.append('file', file);
		if (personId) {
			formData.append('personId', personId);
		}

		const response = await fetch('/api/images', {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			throw new Error('Failed to upload image');
		}

		const result = (await response.json()) as { key: string };
		return result.key;
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!firstName.trim() || !lastName.trim()) return;

		isUploading = true;

		try {
			// Upload any pending files first
			const uploadedKeys: string[] = [];
			for (const file of pendingFiles) {
				const key = await uploadFile(file, editPerson?.id);
				uploadedKeys.push(key);
			}

			// Combine existing photos with newly uploaded ones
			const allPhotoUrls = [...photoUrls, ...uploadedKeys];

			onSubmit({
				firstName: firstName.trim(),
				lastName: lastName.trim(),
				gender,
				birthDate: birthDate || undefined,
				deathDate: deathDate || undefined,
				biography: biography.trim() || undefined,
				photoUrls: allPhotoUrls.length > 0 ? allPhotoUrls : undefined
			});

			resetForm();
		} catch (error) {
			console.error('Error uploading images:', error);
		} finally {
			isUploading = false;
		}
	}

	function handleClose() {
		resetForm();
		onClose();
	}

	function handleFileSelect(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files) {
			pendingFiles = [...pendingFiles, ...Array.from(input.files)];
			// Clear the input so the same file can be selected again
			input.value = '';
		}
	}

	function removeExistingPhoto(index: number) {
		photoUrls = photoUrls.filter((_, i) => i !== index);
	}

	function removePendingFile(index: number) {
		pendingFiles = pendingFiles.filter((_, i) => i !== index);
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
				photoUrls = editPerson.photoUrls ? [...editPerson.photoUrls] : [];
				pendingFiles = [];
			} else {
				resetForm();
			}
		}
	});
</script>

<dialog class="modal" class:modal-open={open}>
	<div class="modal-box max-w-lg">
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

			<!-- Photos -->
			<div class="flex flex-col gap-2">
				<span class="text-sm font-medium">Photos</span>

				<!-- Photo grid -->
				{#if photoUrls.length > 0 || pendingFiles.length > 0}
					<div class="grid grid-cols-4 gap-2 mb-2">
						<!-- Existing photos -->
						{#each photoUrls as key, i}
							<div class="relative aspect-square">
								<img
									src="/api/images/{key}"
									alt="Photo {i + 1}"
									class="w-full h-full object-cover rounded-lg"
								/>
								<button
									type="button"
									class="btn btn-circle btn-xs btn-error absolute -top-1 -right-1"
									aria-label="Remove photo"
									onclick={() => removeExistingPhoto(i)}
								>
									<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
									</svg>
								</button>
								{#if i === 0}
									<span class="absolute bottom-1 left-1 badge badge-sm badge-primary">Main</span>
								{/if}
							</div>
						{/each}
						<!-- Pending files -->
						{#each pendingFiles as file, i}
							<div class="relative aspect-square">
								<img
									src={URL.createObjectURL(file)}
									alt="New photo {i + 1}"
									class="w-full h-full object-cover rounded-lg opacity-70"
								/>
								<button
									type="button"
									class="btn btn-circle btn-xs btn-error absolute -top-1 -right-1"
									aria-label="Remove photo"
									onclick={() => removePendingFile(i)}
								>
									<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
										<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
									</svg>
								</button>
								<span class="absolute bottom-1 left-1 badge badge-sm badge-ghost">New</span>
							</div>
						{/each}
					</div>
				{/if}

				<!-- File input -->
				<input
					type="file"
					class="file-input file-input-bordered w-full"
					accept="image/jpeg,image/png,image/gif,image/webp"
					multiple
					onchange={handleFileSelect}
				/>
				<span class="text-xs text-base-content/60">First photo will be shown in the family tree</span>
			</div>

			<!-- Actions -->
			<div class="flex justify-end gap-2 mt-4">
				<button type="button" class="btn btn-ghost" onclick={handleClose} disabled={isUploading}>
					Cancel
				</button>
				<button type="submit" class="btn btn-primary" disabled={isUploading}>
					{#if isUploading}
						<span class="loading loading-spinner loading-sm"></span>
						Uploading...
					{:else}
						{isEdit ? 'Save' : 'Add'}
					{/if}
				</button>
			</div>
		</form>
	</div>

	<form method="dialog" class="modal-backdrop">
		<button onclick={handleClose}>close</button>
	</form>
</dialog>
