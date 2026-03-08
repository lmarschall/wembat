
/**
 * Decodes a JSON Web Token (JWT) and returns the decoded payload.
 * @param jwt The JWT to decode.
 * @returns The decoded payload as an object.
 */
export function jwtDecode(jwt: string): any {
	try {
		const base64Url = jwt.split(".")[1];
		const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
		const jsonPayload = decodeURIComponent(
			atob(base64)
				.split("")
				.map(function (c) {
					return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
				})
				.join("")
		);

		return JSON.parse(jsonPayload);
	} catch (err: any) {
		console.error(err);
		return null;
	}
}

/**
 * Converts a Node.js Buffer to an ArrayBuffer.
 *
 * @param buffer - The Node.js Buffer to convert.
 * @returns The converted ArrayBuffer.
 */
export function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
	const arrayBuffer = new ArrayBuffer(buffer.length);
	const view = new Uint8Array(arrayBuffer);
	for (let i = 0; i < buffer.length; ++i) {
		view[i] = buffer[i];
	}
	return arrayBuffer;
}

/**
 * Derives an encryption key using the provided private and public keys.
 * @param privateKey - The private key used for key derivation.
 * @param publicKey - The public key used for key derivation.
 * @returns A promise that resolves to the derived encryption key.
 * @throws An error if the encryption key could not be derived.
 */
export async function deriveEncryptionKey(
	privateKey: CryptoKey,
	publicKey: CryptoKey
): Promise<CryptoKey> {
	if (privateKey !== undefined && publicKey !== undefined) {
		const encryptionKey = await globalThis.crypto.subtle.deriveKey(
			{
				name: "ECDH",
				public: publicKey,
			},
			privateKey,
			{
				name: "AES-GCM",
				length: 256,
			},
			false,
			["encrypt", "decrypt"]
		);
		return encryptionKey;
	} else {
		throw new Error("Could not derive Encryption Key");
	}
}

/**
 * Saves a CryptoKey as a string by exporting it in JWK format.
 * @param cryptoKey The CryptoKey to be saved.
 * @returns A Promise that resolves to the exported CryptoKey as a string.
 */
export async function saveCryptoKeyAsString(
	cryptoKey: CryptoKey
): Promise<string> {
	const exported = await crypto.subtle.exportKey("jwk", cryptoKey);
	return JSON.stringify(exported);
}

/**
 * Loads a cryptographic public key from a string representation.
 * @param pubKeyString The string representation of the public key.
 * @returns A promise that resolves to the loaded CryptoKey object.
 * @throws {Error} If the public key string is empty.
 */
export async function loadCryptoPublicKeyFromString(
	pubKeyString: string
): Promise<CryptoKey> {

	if (pubKeyString === "") throw new Error("Public Key String empty");
	
	return await globalThis.crypto.subtle.importKey(
		"jwk",
		JSON.parse(pubKeyString),
		{
			name: "ECDH",
			namedCurve: "P-384",
		},
		true,
		[]
	);
}

/**
 * Loads a cryptographic private key from a string representation.
 * @param privateKeyString The string representation of the private key.
 * @returns A promise that resolves to the loaded CryptoKey object.
 * @throws {Error} If the private key string is empty.
 */
export async function loadCryptoPrivateKeyFromString(
	privateKeyString: string,
	encryptionKey: CryptoKey,
	ivString: string
): Promise<CryptoKey> {

	if (privateKeyString === "") throw new Error("Private Key String empty");

	const decoder = new TextDecoder();

	const decryptedPrivateUserKey = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv: fromBase64(ivString) },
		encryptionKey,
		fromBase64(privateKeyString)
	);

	return await globalThis.crypto.subtle.importKey(
		"jwk",
		JSON.parse(decoder.decode(decryptedPrivateUserKey)),
		{
			name: "ECDH",
			namedCurve: "P-384",
		},
		false,
		["deriveKey", "deriveBits"]
	);
}

export async function deriveEncryptionKeyFromPRF(inputKeyMaterial: Uint8Array<any>, version: string, existingSalt = "") {

	const salt = existingSalt == "" ? globalThis.crypto.getRandomValues(new Uint8Array(32)) : fromBase64(existingSalt);

	const keyDerivationKey = await globalThis.crypto.subtle.importKey(
		"raw",
		inputKeyMaterial,
		"HKDF",
		false,
		["deriveKey"]
	);

	const info = new TextEncoder().encode("encryption key");

	const encryptionKey = await crypto.subtle.deriveKey(
		{ name: "HKDF", info, salt, hash: "SHA-256" },
		keyDerivationKey,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"]
	);

	return {
		encryptionKey,
		salt
	}
}

export async function deriveEllipticKeypair() {

	const keyPair = await crypto.subtle.generateKey(
		{
			name: "ECDH",
			namedCurve: "P-384",
		},
		true,
		["deriveKey", "deriveBits"]
	);

	return {
		publicKey: keyPair.publicKey,
		privateKey: keyPair.privateKey
	};
}

export function fromBase64(base64String: string): Uint8Array<ArrayBuffer> {
  
	// modern browsers
	if ((Uint8Array as any).fromBase64) {
		return (Uint8Array as any).fromBase64(base64String);
	}

	// legacy fallback
	const binaryString = atob(base64String);
	const len = binaryString.length;
	const bytes = new Uint8Array(len);

	// Direct loop is faster than Uint8Array.from() with a callback
	for (let i = 0; i < len; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}

	return bytes;
}

export function toBase64(bytes: Uint8Array<ArrayBuffer>): string {

	// modern browsers
	if ((bytes as any).toBase64) {
		return (bytes as any).toBase64();
	}

	// legacy fallback
	const binaryString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  
  	return btoa(binaryString);
}

/**
 * Safely parses the secret string into 5 parts.
 * Returns 5 empty strings if the input is invalid or empty.
 */
export function parseSecretString(safeSecret: string) {

	// new session
	if (safeSecret === "") {
		return ["", "", ""];
	}
  
	// split the string
	const parts = safeSecret.split('|');

	// if we have exactly 3 parts
	if (parts.length === 3) {
		return parts;
	} else {
		throw new Error("Failed to parse cipher blob");
	}
}

export async function encryptPrivateKeyString(privateKeyString: string, encryptionKey: CryptoKey) {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const encoder = new TextEncoder();
	const encoded = encoder.encode(privateKeyString);

	const encryptedBuffer = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv: iv },
		encryptionKey,
		encoded
	);

	return {
		encryptedBuffer,
		iv
	}
}