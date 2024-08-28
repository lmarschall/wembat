import { assert, expect, test } from 'vitest';
import { str2ab, ab2str, deriveEncryptionKey, saveCryptoKeyAsString, loadCryptoPublicKeyFromString, loadCryptoPrivateKeyFromString } from './helper';

test("str2ab", () => {
    const str = "Hello, World!";
    const expected = new Uint8Array([72, 101, 108, 108, 111, 44, 32, 87, 111, 114, 108, 100, 33]).buffer;
    expect(str2ab(str)).toBe(expected);
});

test("ab2str", () => {
    const ab = new Uint8Array([72, 101, 108, 108, 111, 44, 32, 87, 111, 114, 108, 100, 33]).buffer;
    const expected = "Hello, World!";
    expect(ab2str(ab)).toBe(expected);
});

// test("deriveEncryptionKey", async () => {
//     const privateKey = await window.crypto.subtle.generateKey(
//         {
//             name: "ECDH",
//             namedCurve: "P-384",
//         },
//         true,
//         ["deriveKey", "deriveBits"]
//     );
//     const publicKey = await window.crypto.subtle.generateKey(
//         {
//             name: "ECDH",
//             namedCurve: "P-384",
//         },
//         true,
//         []
//     );
//     const encryptionKey = await deriveEncryptionKey(privateKey, publicKey);
//     expect(encryptionKey).toBeDefined();
// });

// test("saveCryptoKeyAsString", async () => {
//     const key = await window.crypto.subtle.generateKey(
//         {
//             name: "AES-GCM",
//             length: 256,
//         },
//         true,
//         ["encrypt", "decrypt"]
//     );
//     const exported = await saveCryptoKeyAsString(key);
//     expect(exported).toBeDefined();
// });

// test("loadCryptoPublicKeyFromString", async () => {
//     const publicKeyString = ""; // Provide a valid public key string here
//     const publicKey = await loadCryptoPublicKeyFromString(publicKeyString);
//     expect(publicKey).toBeDefined();
// });

// test("loadCryptoPrivateKeyFromString", async () => {
//     const privateKeyString = ""; // Provide a valid private key string here
//     const privateKey = await loadCryptoPrivateKeyFromString(privateKeyString);
//     expect(privateKey).toBeDefined();
// });