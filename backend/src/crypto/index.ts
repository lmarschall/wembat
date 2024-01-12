import { generateKeyPair, exportJWK, SignJWT } from 'jose';

const keyPairs: any = {};

export const initCrypto = async () => {

    keyPairs.secretKeyPair = await window.crypto.subtle.generateKey(
        {
          name: "ECDH",
          namedCurve: "P-384",
        },
        true,
        ["deriveKey", "deriveBits"]
    );

    keyPairs.tokenKeyPair = await generateKeyPair('ES256');
}

export const createJWT = async(user: any) => {

    const publicJwk = await exportJWK(keyPairs.tokenKeyPair.publicKey)

    return await new SignJWT({ 'urn:example:claim': true, 'userId': user.uid })
    .setProtectedHeader({ alg: 'ES256', jwk: publicJwk })
    .setIssuedAt()
    .setIssuer('urn:example:issuer')
    .setAudience('urn:example:audience')
    // .setExpirationTime('2h') // no exp time
    .sign(keyPairs.tokenKeyPair.privateKey)
}

export const createSharedSecret = async(publicKey: any) => {
    return await window.crypto.subtle.deriveBits(
        {
        name: "ECDH",
        // @ts-ignore
        namedCurve: "P-384",
        public: publicKey,
        },
        keyPairs.secretKeyPair.privateKey,
        128,
    );
}

export const getPublicKeyFromString = async(pubKeyString: string) => {
    
    return await window.crypto.subtle.importKey(
        "jwk",
        JSON.parse(pubKeyString),
        {
        name: "ECDH",
        namedCurve: "P-384",
        },
        false,
        [],
    );
}

export const getPublicServerSecretKey = () => {
    return keyPairs.secretKeyPair.publicKey;
}