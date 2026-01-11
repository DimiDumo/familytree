import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { dev } from '$app/environment';

// Use a fixed location for local R2 storage
const R2_DIR = join(homedir(), '.local', 'share', 'familytree', 'r2-images');

function ensureDir(path: string) {
	const dir = dirname(path);
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

// Minimal R2-compatible wrapper for local filesystem storage
export function getLocalR2(): R2Bucket {
	// Ensure the directory exists
	if (!existsSync(R2_DIR)) {
		mkdirSync(R2_DIR, { recursive: true });
	}

	return {
		async put(key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null | Blob, options?: R2PutOptions) {
			const filePath = join(R2_DIR, key);
			ensureDir(filePath);

			let data: Buffer;
			if (value instanceof Blob) {
				data = Buffer.from(await value.arrayBuffer());
			} else if (value instanceof ArrayBuffer) {
				data = Buffer.from(value);
			} else if (ArrayBuffer.isView(value)) {
				data = Buffer.from(value.buffer, value.byteOffset, value.byteLength);
			} else if (typeof value === 'string') {
				data = Buffer.from(value);
			} else if (value instanceof ReadableStream) {
				const chunks: Uint8Array[] = [];
				const reader = value.getReader();
				while (true) {
					const { done, value: chunk } = await reader.read();
					if (done) break;
					chunks.push(chunk);
				}
				data = Buffer.concat(chunks);
			} else {
				data = Buffer.from('');
			}

			// Store metadata in a separate file
			const metaPath = filePath + '.meta.json';
			const metadata = {
				httpMetadata: options?.httpMetadata || {},
				customMetadata: options?.customMetadata || {},
				size: data.length,
				uploaded: new Date().toISOString()
			};
			writeFileSync(metaPath, JSON.stringify(metadata));
			writeFileSync(filePath, data);

			return {
				key,
				version: '1',
				size: data.length,
				etag: 'local',
				httpEtag: '"local"',
				checksums: { md5: undefined },
				uploaded: new Date(),
				httpMetadata: options?.httpMetadata || {},
				customMetadata: options?.customMetadata || {},
				storageClass: 'Standard',
				writeHttpMetadata: () => {}
			} as unknown as R2Object;
		},

		async get(key: string) {
			const filePath = join(R2_DIR, key);
			if (!existsSync(filePath)) {
				return null;
			}

			const data = readFileSync(filePath);
			const metaPath = filePath + '.meta.json';
			let metadata = { httpMetadata: {}, customMetadata: {}, size: data.length, uploaded: new Date().toISOString() };
			if (existsSync(metaPath)) {
				metadata = JSON.parse(readFileSync(metaPath, 'utf-8'));
			}

			return {
				key,
				version: '1',
				size: data.length,
				etag: 'local',
				httpEtag: '"local"',
				checksums: { md5: undefined },
				uploaded: new Date(metadata.uploaded),
				httpMetadata: metadata.httpMetadata,
				customMetadata: metadata.customMetadata,
				storageClass: 'Standard',
				writeHttpMetadata: () => {},
				body: new ReadableStream({
					start(controller) {
						controller.enqueue(new Uint8Array(data));
						controller.close();
					}
				}),
				bodyUsed: false,
				arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
				text: async () => data.toString('utf-8'),
				json: async () => JSON.parse(data.toString('utf-8')),
				blob: async () => new Blob([data]),
				bytes: async () => new Uint8Array(data)
			} as unknown as R2ObjectBody;
		},

		async delete(keys: string | string[]) {
			const keyList = Array.isArray(keys) ? keys : [keys];
			for (const key of keyList) {
				const filePath = join(R2_DIR, key);
				if (existsSync(filePath)) {
					unlinkSync(filePath);
				}
				const metaPath = filePath + '.meta.json';
				if (existsSync(metaPath)) {
					unlinkSync(metaPath);
				}
			}
		},

		async head(key: string) {
			const filePath = join(R2_DIR, key);
			if (!existsSync(filePath)) {
				return null;
			}
			const stat = statSync(filePath);
			const metaPath = filePath + '.meta.json';
			let metadata = { httpMetadata: {}, customMetadata: {}, uploaded: new Date().toISOString() };
			if (existsSync(metaPath)) {
				metadata = JSON.parse(readFileSync(metaPath, 'utf-8'));
			}
			return {
				key,
				version: '1',
				size: stat.size,
				etag: 'local',
				httpEtag: '"local"',
				checksums: { md5: undefined },
				uploaded: new Date(metadata.uploaded),
				httpMetadata: metadata.httpMetadata,
				customMetadata: metadata.customMetadata,
				storageClass: 'Standard',
				writeHttpMetadata: () => {}
			} as unknown as R2Object;
		},

		async list(options?: R2ListOptions) {
			const prefix = options?.prefix || '';
			const objects: R2Object[] = [];

			function walkDir(dir: string, baseKey: string = '') {
				if (!existsSync(dir)) return;
				const entries = readdirSync(dir, { withFileTypes: true });
				for (const entry of entries) {
					const key = baseKey ? `${baseKey}/${entry.name}` : entry.name;
					if (entry.isDirectory()) {
						walkDir(join(dir, entry.name), key);
					} else if (!entry.name.endsWith('.meta.json')) {
						if (key.startsWith(prefix)) {
							const stat = statSync(join(dir, entry.name));
							objects.push({
								key,
								version: '1',
								size: stat.size,
								etag: 'local',
								httpEtag: '"local"',
								checksums: { md5: undefined },
								uploaded: stat.mtime,
								httpMetadata: {},
								customMetadata: {},
								storageClass: 'Standard',
								writeHttpMetadata: () => {}
							} as unknown as R2Object);
						}
					}
				}
			}

			walkDir(R2_DIR);
			return {
				objects,
				truncated: false,
				cursor: undefined,
				delimitedPrefixes: []
			} as R2Objects;
		},

		createMultipartUpload: () => { throw new Error('Not implemented'); },
		resumeMultipartUpload: () => { throw new Error('Not implemented'); }
	} as R2Bucket;
}

// Get R2 bucket from platform or fall back to local for dev
export function getR2(platform: App.Platform | undefined): R2Bucket {
	if (platform?.env?.IMAGES) {
		return platform.env.IMAGES;
	}
	if (dev) {
		return getLocalR2();
	}
	throw new Error('R2 bucket not available');
}
