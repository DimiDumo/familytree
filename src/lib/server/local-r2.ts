import { join, dirname } from 'path';
import { homedir } from 'os';
import { dev } from '$app/environment';
import { mkdir, writeFile, readFile, unlink, readdir, stat } from 'fs/promises';

// Use a fixed location for local R2 storage
const R2_DIR = join(homedir(), '.local', 'share', 'familytree', 'r2-images');

// Helper to check if file exists
async function fileExists(path: string): Promise<boolean> {
	try {
		await stat(path);
		return true;
	} catch {
		return false;
	}
}

// Minimal R2-compatible wrapper for local filesystem storage using Node.js fs/promises
export function getLocalR2(): R2Bucket {
	return {
		async put(key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null | Blob, options?: R2PutOptions) {
			const filePath = join(R2_DIR, key);
			const dir = dirname(filePath);

			try {
				// Ensure directory exists
				await mkdir(dir, { recursive: true });

				// Convert value to Buffer for Node.js writeFile
				let data: Buffer;
				if (value instanceof Blob) {
					data = Buffer.from(await value.arrayBuffer());
				} else if (value instanceof ArrayBuffer) {
					data = Buffer.from(value);
				} else if (ArrayBuffer.isView(value)) {
					data = Buffer.from(value.buffer, value.byteOffset, value.byteLength);
				} else if (typeof value === 'string') {
					data = Buffer.from(value, 'utf-8');
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

				// Write file using Node.js fs/promises
				await writeFile(filePath, data);

				// Store metadata in a separate file
				const metaPath = filePath + '.meta.json';
				const metadata = {
					httpMetadata: options?.httpMetadata || {},
					customMetadata: options?.customMetadata || {},
					size: data.length,
					uploaded: new Date().toISOString()
				};
				await writeFile(metaPath, JSON.stringify(metadata));

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
			} catch (error) {
				console.error('local-r2 put error:', error);
				throw error;
			}
		},

		async get(key: string) {
			const filePath = join(R2_DIR, key);

			try {
				if (!(await fileExists(filePath))) {
					return null;
				}

				const data = await readFile(filePath);
				const metaPath = filePath + '.meta.json';

				let metadata = { httpMetadata: {} as Record<string, string>, customMetadata: {}, size: data.length, uploaded: new Date().toISOString() };
				if (await fileExists(metaPath)) {
					const metaContent = await readFile(metaPath, 'utf-8');
					metadata = JSON.parse(metaContent);
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
			} catch (error) {
				console.error('local-r2 get error:', error);
				return null;
			}
		},

		async delete(keys: string | string[]) {
			const keyList = Array.isArray(keys) ? keys : [keys];
			for (const key of keyList) {
				const filePath = join(R2_DIR, key);
				try {
					await unlink(filePath);
				} catch { /* ignore */ }
				try {
					await unlink(filePath + '.meta.json');
				} catch { /* ignore */ }
			}
		},

		async head(key: string) {
			const filePath = join(R2_DIR, key);

			try {
				if (!(await fileExists(filePath))) {
					return null;
				}

				const fileStat = await stat(filePath);
				const metaPath = filePath + '.meta.json';

				let metadata = { httpMetadata: {}, customMetadata: {}, uploaded: new Date().toISOString() };
				if (await fileExists(metaPath)) {
					const metaContent = await readFile(metaPath, 'utf-8');
					metadata = JSON.parse(metaContent);
				}

				return {
					key,
					version: '1',
					size: fileStat.size,
					etag: 'local',
					httpEtag: '"local"',
					checksums: { md5: undefined },
					uploaded: new Date(metadata.uploaded),
					httpMetadata: metadata.httpMetadata,
					customMetadata: metadata.customMetadata,
					storageClass: 'Standard',
					writeHttpMetadata: () => {}
				} as unknown as R2Object;
			} catch {
				return null;
			}
		},

		async list(options?: R2ListOptions) {
			const prefix = options?.prefix || '';
			const objects: R2Object[] = [];

			async function walkDir(dir: string, baseKey: string = '') {
				try {
					const entries = await readdir(dir, { withFileTypes: true });
					for (const entry of entries) {
						const key = baseKey ? `${baseKey}/${entry.name}` : entry.name;
						if (entry.isDirectory()) {
							await walkDir(join(dir, entry.name), key);
						} else if (!entry.name.endsWith('.meta.json') && !entry.name.startsWith('.')) {
							if (key.startsWith(prefix)) {
								const fileStat = await stat(join(dir, entry.name));
								objects.push({
									key,
									version: '1',
									size: fileStat.size,
									etag: 'local',
									httpEtag: '"local"',
									checksums: { md5: undefined },
									uploaded: fileStat.mtime,
									httpMetadata: {},
									customMetadata: {},
									storageClass: 'Standard',
									writeHttpMetadata: () => {}
								} as unknown as R2Object);
							}
						}
					}
				} catch { /* directory doesn't exist */ }
			}

			await walkDir(R2_DIR);
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
	// In dev mode, always use local storage for reliability
	if (dev) {
		return getLocalR2();
	}
	// In production, use platform R2 binding
	if (platform?.env?.IMAGES) {
		return platform.env.IMAGES;
	}
	throw new Error('R2 bucket not available');
}
