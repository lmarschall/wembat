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
 * Derives an encryption key using the provided private and public keys.
 * @param privateKey - The private key used for key derivation.
 * @param publicKey - The public key used for key derivation.
 * @returns A promise that resolves to the derived encryption key.
 * @throws An error if the encryption key could not be derived.
 */
export async function deriveEncryptionKey(privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
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
export async function saveCryptoKeyAsString(cryptoKey: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("jwk", cryptoKey);
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
    if (privateKeyString !== "") {
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
    } else {
        throw Error("Private Key String empty");
    }
}