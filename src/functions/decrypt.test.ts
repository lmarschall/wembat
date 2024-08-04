import { decrypt } from './decrypt';
import { str2ab } from '../helper';
import { expect, test } from 'vitest';
import { WembatMessage } from '../types';

test("decrypt - successful decryption", async () => {
    const privateKey = await window.crypto.subtle.generateKey(
        {
            name: "ECDH",
            namedCurve: "P-384",
        },
        true,
        ["deriveKey", "deriveBits"]
    );
    const publicKey = await window.crypto.subtle.generateKey(
        {
            name: "ECDH",
            namedCurve: "P-384",
        },
        true,
        []
    );
    const wembatMessage: WembatMessage = {
        iv: "randomIV",
        message: "Hello, World!",
        encrypted: "encryptedMessage"
    };
    const expectedDecryptedMessage = {
        message: "Hello, World!",
        encrypted: "",
        iv: "randomIV"
    };
    // const str2abSpy = jest.spyOn(window, 'str2ab').mockReturnValue(new Uint8Array([72, 101, 108, 108, 111, 44, 32, 87, 111, 114, 108, 100, 33]).buffer);
    // const decryptSpy = jest.spyOn(window.crypto.subtle, 'decrypt').mockResolvedValue(new Uint8Array([72, 101, 108, 108, 111, 44, 32, 87, 111, 114, 108, 100, 33]).buffer);
    
    const result = await decrypt(privateKey.privateKey, wembatMessage, publicKey.publicKey);
    
    expect(result.success).toBe(true);
    expect(result.error).toEqual({});
    expect(result.result).toEqual(expectedDecryptedMessage);
    // expect(str2abSpy).toHaveBeenCalledWith("randomIV");
    // expect(str2abSpy).toHaveBeenCalledWith("encryptedMessage");
    // expect(decryptSpy).toHaveBeenCalledWith(
    //     {
    //         name: "AES-GCM",
    //         iv: new Uint8Array([114, 97, 110, 100, 111, 109, 73, 86]).buffer,
    //     },
    //     expect.any(CryptoKey),
    //     new Uint8Array([72, 101, 108, 108, 111, 44, 32, 87, 111, 114, 108, 100, 33]).buffer
    // );
});

test("decrypt - private key undefined", async () => {
    const privateKey = undefined;
    const publicKey = await window.crypto.subtle.generateKey(
        {
            name: "ECDH",
            namedCurve: "P-384",
        },
        true,
        []
    );
    const wembatMessage: WembatMessage = {
        iv: "randomIV",
        message: "Hello, World!",
        encrypted: "encryptedMessage"
    };
    const expectedErrorMessage = {
        error: new Error("Private Key undefined!")
    };
    
    const result = await decrypt(privateKey, wembatMessage, publicKey.publicKey);
    
    expect(result.success).toBe(false);
    expect(result.error).toEqual(expectedErrorMessage);
    expect(result.result).toEqual({});
});