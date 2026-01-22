import { WembatClientToken } from "../types";
import { randomBytes } from '@noble/post-quantum/utils.js';
import { gcm } from '@noble/ciphers/aes';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { ml_kem768 } from '@noble/post-quantum/ml-kem';

/**
 * Converts a string to an ArrayBuffer.
 *
 * @param str - The string to convert.
 * @returns The converted ArrayBuffer.
 */
export function str2ab(str: string): ArrayBuffer {
	str = atob(str);
	const buf = new ArrayBuffer(str.length);
	const bufView = new Uint8Array(buf);
	for (let i = 0, strLen = str.length; i < strLen; i++) {
		bufView[i] = str.charCodeAt(i);
	}
	return buf;
}

/**
 * Converts an ArrayBuffer to a string using base64 encoding.
 *
 * @param buf - The ArrayBuffer to convert.
 * @returns The base64 encoded string.
 */
export function ab2str(buf: ArrayBuffer): string {
	return btoa(String.fromCharCode.apply(null, [...new Uint8Array(buf)]));
}

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
		const encryptionKey = await window.crypto.subtle.deriveKey(
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
		throw Error("Could not derive Encryption Key");
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
	if (pubKeyString !== "") {
		return await window.crypto.subtle.importKey(
			"jwk",
			JSON.parse(pubKeyString),
			{
				name: "ECDH",
				namedCurve: "P-384",
			},
			true,
			[]
		);
	} else {
		throw Error("Public Key String empty");
	}
}

/**
 * Loads a cryptographic private key from a string representation.
 * @param privateKeyString The string representation of the private key.
 * @returns A promise that resolves to the loaded CryptoKey object.
 * @throws {Error} If the private key string is empty.
 */
export async function loadCryptoPrivateKeyFromString(
	privateKeyString: string
): Promise<CryptoKey> {

	if (privateKeyString === "") throw Error("Private Key String empty");

	return await window.crypto.subtle.importKey(
		"jwk",
		JSON.parse(privateKeyString),
		{
			name: "ECDH",
			namedCurve: "P-384",
		},
		false,
		["deriveKey", "deriveBits"]
	);
}

export async function deriveEncryptionKeyFromPRF(inputKeyMaterial: Uint8Array, existingSalt = null) {

	const salt = existingSalt || window.crypto.getRandomValues(new Uint8Array(32));

	const keyDerivationKey = await window.crypto.subtle.importKey(
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

export async function deriveSessionKeyFromString(publicUserKeyString: string, privateUserKeyEncryptedString: string, encryptionKey: CryptoKey) {
	const publicKey = await loadCryptoPublicKeyFromString(
		publicUserKeyString
	);

	const nonce = loginReponseData.nonce;
	const decoder = new TextDecoder();

	const decryptedPrivateUserKey = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv: str2ab(nonce) },
		encryptionKey,
		str2ab(privateUserKeyEncryptedString)
	);

	privateKey = await loadCryptoPrivateKeyFromString(
		decoder.decode(decryptedPrivateUserKey)
	);
}

export async function deriveEncryptedQuantumSeed(encryptionKey: CryptoKey)
{
	// 1. Generate the Quantum Seed (64 bytes for ML-KEM)
    const seed = new Uint8Array(64);
    window.crypto.getRandomValues(seed);

    // 4. Encrypt the Seed
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv,
        },
        encryptionKey,
        seed // <--- Encrypt the raw Uint8Array directly
    );

    return {
        // Convert ArrayBuffer to Uint8Array for easier DB storage/handling
        encryptedSeed: new Uint8Array(encryptedBuffer),
        iv: iv
    };
}

export async function deriveKeysFromEncryptedSeed(encryptionKey: CryptoKey, seedString: string, ivString: string) {
    
    const decryptedSeed = await crypto.subtle.decrypt(
		{ name: "AES-GCM", iv: fromBase64(ivString) },
		encryptionKey,
		fromBase64(seedString)
	);

	const keyPair = ml_kem768.keygen(new Uint8Array(decryptedSeed));

	return {
		publicKey: keyPair.publicKey,
		privateKey: keyPair.secretKey // Map 'secretKey' to your preferred name if needed
	};
}

export function fromBase64(base64String: string): Uint8Array<ArrayBuffer> {
  // 1. Modern Browsers (Chrome 133+, Firefox 133+, Safari 18.2+)
  if (Uint8Array.fromBase64) {
    return Uint8Array.fromBase64(base64String);
  }

  // 2. Legacy Fallback (Standard)
  // 'atob' decodes the base64 string to a binary string
  const binaryString = atob(base64String);
  
  // Convert binary string to byte array
  return Uint8Array.from(binaryString, (char) => char.codePointAt(0));
}

export function toBase64(bytes: Uint8Array<ArrayBuffer>): string {
  // 1. Modern Browsers
  if (bytes.toBase64) {
    return bytes.toBase64();
  }

  // 2. Legacy Fallback
  // 'btoa' requires a binary string. 
  // We use a safe loop to avoid stack overflow on large arrays.
  let binaryString = "";
  for (let i = 0; i < bytes.length; i++) {
    binaryString += String.fromCharCode(bytes[i]);
  }
  
  return btoa(binaryString);
}

export function createQuantumSession(recipientPublicKey) {
    // 1. Encapsulate
    // This function automatically:
    //  - Generates a random "Shared Secret" (32 bytes)
    //  - Creates the "Ciphertext" (lock) needed to send it
    const result = ml_kem768.encapsulate(recipientPublicKey);

    // result.sharedSecret -> KEEP SECRET (This is the Session Key)
    // result.cipherText   -> SEND TO USER

    // 2. KDF (Best Practice)
    // Use HKDF to turn the raw ML-KEM secret into a usable AES key
    const sessionKey = hkdf(
        sha256, 
        result.sharedSecret, 
        undefined, 
        'QuantumSessionKey_v1', 
        32
    );

    return {
        sessionKey: sessionKey,      // Use this to encrypt your actual data
        cipherText: result.cipherText // Send this public blob to the receiver
    };
}

export function recoverQuantumSession(cipherText, myPrivateKey) {
    // 1. Decapsulate
    // Uses the private key to unlock the ciphertext and reveal the SAME secret
    const rawSecret = ml_kem768.decapsulate(cipherText, myPrivateKey);

    // 2. KDF (Must match Sender exactly)
    const sessionKey = hkdf(
        sha256, 
        rawSecret, 
        undefined, 
        'QuantumSessionKey_v1', 
        32
    );

    return sessionKey; // This matches the Sender's key exactly
}
