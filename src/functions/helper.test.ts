//// typescript
// filepath: /home/lukas/Source/wembat/src/helper.test.ts

import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import {
	str2ab,
	ab2str,
	jwtDecode,
	bufferToArrayBuffer,
	deriveEncryptionKey,
	saveCryptoKeyAsString,
	loadCryptoPublicKeyFromString,
	loadCryptoPrivateKeyFromString,
} from "./helper";

// Stubs for global atob / btoa if not defined (node environment)
if (typeof atob === "undefined") {
	globalThis.atob = (str: string) =>
		Buffer.from(str, "base64").toString("binary");
}
if (typeof btoa === "undefined") {
	globalThis.btoa = (str: string) =>
		Buffer.from(str, "binary").toString("base64");
}

// Setup a minimal crypto.subtle mock for key derivation and export/import functions.
const dummyCryptoKey: CryptoKey = {} as CryptoKey;
const dummyJWK = { kty: "EC", crv: "P-384", x: "dummyX", y: "dummyY" };

beforeAll(() => {
	// A minimal implementation for crypto.subtle functions
	Object.defineProperty(globalThis, "window", {
		value: {
			crypto: {
				subtle: {
					deriveKey: vi.fn().mockResolvedValue(dummyCryptoKey),
					exportKey: vi.fn().mockResolvedValue(dummyJWK),
					importKey: vi.fn().mockResolvedValue(dummyCryptoKey),
				},
				getRandomValues: vi.fn().mockImplementation((arr: Uint8Array) => {
					for (let i = 0; i < arr.length; i++) {
						arr[i] = i;
					}
					return arr;
				}),
			},
		},
	});
});

describe("helper functions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("str2ab & ab2str", () => {
		it("should convert string to ArrayBuffer and back", () => {
			const originalText = "Hello, Wembat!";
			const base64 = btoa(originalText);
			const buffer = str2ab(base64);
			const recovered = ab2str(buffer);
			expect(atob(recovered)).toBe(originalText);
		});
	});

	describe("jwtDecode", () => {
		it("should decode a valid JWT", () => {
			const payload = {
				user: "test",
				exp: Math.floor(Date.now() / 1000) + 1000,
			};
			const base64Payload = btoa(JSON.stringify(payload));
			// Construct a dummy JWT (header.payload.signature)
			const dummyJWT = `header.${base64Payload}.signature`;
			const decoded = jwtDecode(dummyJWT);
			expect(decoded).toEqual(payload);
		});

		it("should return null for an invalid JWT", () => {
			const result = jwtDecode("invalid.token");
			expect(result).toBeNull();
		});
	});

	describe("bufferToArrayBuffer", () => {
		it("should convert a Node Buffer to an ArrayBuffer", () => {
			const nodeBuffer = Buffer.from([1, 2, 3, 4, 5]);
			const arrayBuffer = bufferToArrayBuffer(nodeBuffer);
			const view = new Uint8Array(arrayBuffer);
			expect(Array.from(view)).toEqual([1, 2, 3, 4, 5]);
		});
	});

	describe("deriveEncryptionKey", () => {
		it("should derive an encryption key when keys are provided", async () => {
			const derivedKey = await deriveEncryptionKey(
				dummyCryptoKey,
				dummyCryptoKey
			);
			expect(derivedKey).toBe(dummyCryptoKey);
			expect(window.crypto.subtle.deriveKey).toHaveBeenCalled();
		});

		it("should throw an error if one of the keys is undefined", async () => {
			await expect(
				deriveEncryptionKey(undefined as any, dummyCryptoKey)
			).rejects.toThrow("Could not derive Encryption Key");
		});
	});

	// describe("saveCryptoKeyAsString", () => {
	//   it("should export a CryptoKey as a string", async () => {
	//     const keyString = await saveCryptoKeyAsString(dummyCryptoKey);
	//     expect(keyString).toEqual(JSON.stringify(dummyJWK));
	//     expect(window.crypto.subtle.exportKey).toHaveBeenCalledWith("jwk", dummyCryptoKey);
	//   });
	// });

	describe("loadCryptoPublicKeyFromString", () => {
		it("should load a public CryptoKey from a string", async () => {
			const pubKeyString = JSON.stringify(dummyJWK);
			const importedKey = await loadCryptoPublicKeyFromString(pubKeyString);
			expect(importedKey).toBe(dummyCryptoKey);
			expect(window.crypto.subtle.importKey).toHaveBeenCalledWith(
				"jwk",
				dummyJWK,
				{ name: "ECDH", namedCurve: "P-384" },
				true,
				[]
			);
		});

		it("should throw an error if the public key string is empty", async () => {
			await expect(loadCryptoPublicKeyFromString("")).rejects.toThrow(
				"Public Key String empty"
			);
		});
	});

	describe("loadCryptoPrivateKeyFromString", () => {
		it("should load a private CryptoKey from a string", async () => {
			const privKeyString = JSON.stringify(dummyJWK);
			const importedKey = await loadCryptoPrivateKeyFromString(
				privKeyString
			);
			expect(importedKey).toBe(dummyCryptoKey);
			expect(window.crypto.subtle.importKey).toHaveBeenCalledWith(
				"jwk",
				dummyJWK,
				{ name: "ECDH", namedCurve: "P-384" },
				true,
				["deriveKey", "deriveBits"]
			);
		});

		it("should throw an error if the private key string is empty", async () => {
			await expect(loadCryptoPrivateKeyFromString("")).rejects.toThrow(
				"Private Key String empty"
			);
		});
	});
});
