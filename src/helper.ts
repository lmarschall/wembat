export function str2ab(str: string): ArrayBuffer {
    str = atob(str);
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

export function ab2str(buf: ArrayBuffer): string {
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(buf)]));
}

export async function deriveEncryptionKey(publicKey: CryptoKey): Promise<CryptoKey> {
    if (this.privateKey !== undefined && publicKey !== undefined) {
        const encryptionKey = await window.crypto.subtle.deriveKey(
            {
                name: "ECDH",
                public: this.publicKey,
            },
            this.privateKey,
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

export async function saveCryptoKeyAsString(cryptoKey: CryptoKey): Promise<string> {
    const exported = await window.crypto.subtle.exportKey("jwk", cryptoKey);
    return JSON.stringify(exported);
}

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