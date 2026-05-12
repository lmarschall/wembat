import { describe, it, expect } from "vitest";
import {
    jwtDecode,
    bufferToArrayBuffer,
    deriveEllipticKeypair,
    deriveEncryptionKey,
    saveCryptoKeyAsString,
    loadCryptoPublicKeyFromString,
    loadCryptoPrivateKeyFromString,
    deriveEncryptionKeyFromPRF,
    fromBase64,
    toBase64,
    parseSecretString,
    encryptPrivateKeyString
} from "./helper";

describe("helper functions", () => {
    
    describe("JWT & Buffer Utilities", () => {
        it("jwtDecode should decode a valid JWT", () => {
            const payload = {
                user: "test-wembat",
                exp: Math.floor(Date.now() / 1000) + 1000,
            };
            const base64Payload = btoa(JSON.stringify(payload));
            const dummyJWT = `header.${base64Payload}.signature`;
            
            const decoded = jwtDecode(dummyJWT);
            expect(decoded).toEqual(payload);
        });

        it("jwtDecode should return null for an invalid JWT", () => {
            const result = jwtDecode("invalid.token.here");
            expect(result).toBeNull();
        });

        it("bufferToArrayBuffer should convert a Node Buffer to an ArrayBuffer", () => {
            const nodeBuffer = Buffer.from([1, 2, 3, 4, 5]);
            const arrayBuffer = bufferToArrayBuffer(nodeBuffer);
            const view = new Uint8Array(arrayBuffer);
            expect(Array.from(view)).toEqual([1, 2, 3, 4, 5]);
        });
    });

    describe("Base64 Encoding & Decoding", () => {
        it("should perfectly roundtrip bytes through toBase64 and fromBase64", () => {
            const originalBytes = new Uint8Array([0, 255, 128, 64, 12, 99]);
            const base64String = toBase64(originalBytes);
            
            expect(typeof base64String).toBe("string");
            
            const recoveredBytes = fromBase64(base64String);
            expect(recoveredBytes).toEqual(originalBytes);
        });
    });

    describe("String Parsing", () => {
        it("parseSecretString should return 3 empty strings on empty input", () => {
            expect(parseSecretString("")).toEqual(["", "", ""]);
        });

        it("parseSecretString should successfully parse a 3-part string", () => {
            expect(parseSecretString("part1|part2|part3")).toEqual(["part1", "part2", "part3"]);
        });

        it("parseSecretString should throw an error if parts !== 3", () => {
            expect(() => parseSecretString("part1|part2")).toThrow("Failed to parse cipher blob");
            expect(() => parseSecretString("part1|part2|part3|part4")).toThrow("Failed to parse cipher blob");
        });
    });

    describe("Elliptic Curve Cryptography (ECDH & AES-GCM)", () => {
        it("should generate a valid P-384 keypair", async () => {
            const keys = await deriveEllipticKeypair();
            expect(keys.publicKey.type).toBe("public");
            expect(keys.publicKey.algorithm.name).toBe("ECDH");
            expect(keys.privateKey.type).toBe("private");
        });

        it("should derive a shared AES-GCM encryption key from two keypairs", async () => {
            const aliceKeys = await deriveEllipticKeypair();
            const bobKeys = await deriveEllipticKeypair();

            // Alice derives a shared key using her private key and Bob's public key
            const sharedKey = await deriveEncryptionKey(aliceKeys.privateKey, bobKeys.publicKey);
            
            expect(sharedKey.type).toBe("secret");
            expect(sharedKey.algorithm.name).toBe("AES-GCM");
        });

        it("should throw an error if missing keys for deriveEncryptionKey", async () => {
            const keys = await deriveEllipticKeypair();
            await expect(deriveEncryptionKey(undefined as any, keys.publicKey))
                .rejects.toThrow("Could not derive Encryption Key");
        });

        it("should export and import a public key successfully", async () => {
            const keys = await deriveEllipticKeypair();
            const pubKeyString = await saveCryptoKeyAsString(keys.publicKey);
            
            expect(typeof pubKeyString).toBe("string");
            expect(pubKeyString).toContain("crv"); // JWK should contain curve info

            const importedKey = await loadCryptoPublicKeyFromString(pubKeyString);
            expect(importedKey.type).toBe("public");
            expect(importedKey.algorithm.name).toBe("ECDH");
        });

        it("should throw an error when importing an empty public key string", async () => {
            await expect(loadCryptoPublicKeyFromString("")).rejects.toThrow("Public Key String empty");
        });

        it("should successfully encrypt, export, and re-import a private key", async () => {
            // 1. Setup Keys
            const keys = await deriveEllipticKeypair();
            const sharedKey = await deriveEncryptionKey(keys.privateKey, keys.publicKey); // Dummy self-derived AES key
            
            // 2. Export Private Key to JWK string
            const privKeyString = await saveCryptoKeyAsString(keys.privateKey);
            
            // 3. Encrypt the JWK string using the helper
            const { encryptedBuffer, iv } = await encryptPrivateKeyString(privKeyString, sharedKey);
            
            // Convert to base64 for the load function
            const b64EncryptedPayload = toBase64(new Uint8Array(encryptedBuffer));
            const b64Iv = toBase64(iv);

            // 4. Load & Decrypt
            const loadedPrivateKey = await loadCryptoPrivateKeyFromString(b64EncryptedPayload, sharedKey, b64Iv);
            
            expect(loadedPrivateKey.type).toBe("private");
            expect(loadedPrivateKey.algorithm.name).toBe("ECDH");
        });

        it("should throw an error when importing an empty private key string", async () => {
            const fakeKey = (await deriveEllipticKeypair()).privateKey; // Just a dummy CryptoKey
            await expect(loadCryptoPrivateKeyFromString("", fakeKey, "dummyIv")).rejects.toThrow("Private Key String empty");
        });
    });

    describe("HKDF Key Derivation", () => {
        it("should derive an encryption key from raw PRF material", async () => {
            const rawMaterial = new Uint8Array(32);
            globalThis.crypto.getRandomValues(rawMaterial);

            const { encryptionKey, salt } = await deriveEncryptionKeyFromPRF(rawMaterial, "1.0");

            expect(encryptionKey.type).toBe("secret");
            expect(encryptionKey.algorithm.name).toBe("AES-GCM");
            expect(salt.length).toBe(32);
        });

        it("should reuse an existing salt if provided", async () => {
            const rawMaterial = new Uint8Array(32);
            globalThis.crypto.getRandomValues(rawMaterial);
            
            const existingSalt = toBase64(new Uint8Array(32).fill(1)); // Dummy salt
            
            const { encryptionKey, salt } = await deriveEncryptionKeyFromPRF(rawMaterial, "1.0", existingSalt);
            
            expect(encryptionKey.type).toBe("secret");
            expect(toBase64(salt)).toBe(existingSalt); // Salt should match the input
        });
    });
});