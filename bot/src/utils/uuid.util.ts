/**
 * UUID utility wrapper to handle ESM uuid package in CommonJS NestJS app
 * Uses dynamic import to avoid require() conflicts with ESM-only uuid package
 */

let uuidV4: (options?: any, buffer?: any, offset?: number) => string;
let uuidParse: (uuid: string) => Uint8Array;
let uuidStringify: (bytes: Uint8Array) => string;

// Initialize UUID functions on first use
const initializeUuid = async () => {
  if (!uuidV4) {
    const uuid = await import('uuid');
    uuidV4 = uuid.v4;
    uuidParse = uuid.parse;
    uuidStringify = uuid.stringify;
  }
};

/**
 * Generate a UUID v4
 * @returns UUID string
 */
export async function generateUuid(): Promise<string> {
  await initializeUuid();
  return uuidV4();
}

/**
 * Synchronous wrapper for UUID generation
 * Use this in constructors or synchronous contexts
 */
export function generateUuidSync(): Promise<string> {
  return generateUuid();
}

/**
 * Parse UUID string to bytes
 */
export async function parseUuid(uuid: string): Promise<Uint8Array> {
  await initializeUuid();
  return uuidParse(uuid);
}

/**
 * Convert UUID bytes to string
 */
export async function stringifyUuid(bytes: Uint8Array): Promise<string> {
  await initializeUuid();
  return uuidStringify(bytes);
}
