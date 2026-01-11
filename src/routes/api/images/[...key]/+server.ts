import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getR2 } from '$lib/server/local-r2';

// GET /api/images/[...key] - Serve an image from R2
export const GET: RequestHandler = async ({ params, platform }) => {
	const r2 = getR2(platform);
	const key = params.key;

	if (!key) {
		throw error(400, 'Missing image key');
	}

	const object = await r2.get(key);

	if (!object) {
		throw error(404, 'Image not found');
	}

	const headers = new Headers();
	headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
	headers.set('Cache-Control', 'public, max-age=31536000, immutable');
	headers.set('ETag', object.httpEtag);

	return new Response(object.body, { headers });
};

// DELETE /api/images/[...key] - Delete an image from R2
export const DELETE: RequestHandler = async ({ params, platform }) => {
	const r2 = getR2(platform);
	const key = params.key;

	if (!key) {
		throw error(400, 'Missing image key');
	}

	await r2.delete(key);

	return new Response(null, { status: 204 });
};
