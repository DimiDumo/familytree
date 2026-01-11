import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getR2 } from '$lib/server/local-r2';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// POST /api/images - Upload an image
export const POST: RequestHandler = async ({ request, platform }) => {
	const r2 = getR2(platform);

	const formData = await request.formData();
	const file = formData.get('file') as File | null;
	const personId = formData.get('personId') as string | null;

	if (!file) {
		return json({ error: 'No file provided' }, { status: 400 });
	}

	if (!ALLOWED_TYPES.includes(file.type)) {
		return json({ error: 'Invalid file type. Allowed: jpg, png, gif, webp' }, { status: 400 });
	}

	if (file.size > MAX_SIZE) {
		return json({ error: 'File too large. Max size: 10MB' }, { status: 400 });
	}

	// Generate unique key
	const ext = file.name.split('.').pop() || 'jpg';
	const uuid = crypto.randomUUID();
	const key = personId ? `${personId}/${uuid}.${ext}` : `${uuid}.${ext}`;

	// Upload to R2
	await r2.put(key, file, {
		httpMetadata: {
			contentType: file.type
		}
	});

	return json({ key }, { status: 201 });
};
