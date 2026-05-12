import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import { decrypt } from "./decrypt";
import { deriveEncryptionKey, fromBase64 } from "./helper";
import { WembatMessage } from "../types";
import { Store } from "../store";

// Helper-Funktionen isoliert mocken
vi.mock("./helper", () => ({
    deriveEncryptionKey: vi.fn(),
    fromBase64: vi.fn(),
}));

describe("decrypt", () => {
    let mockStore: Partial<Store>;

    const dummyPrivateKey = { type: "private" } as unknown as CryptoKey;
    const dummyPublicKey = { type: "public" } as unknown as CryptoKey;
    const dummyEncryptionKey = { type: "secret" } as unknown as CryptoKey;

    const mockMsg: WembatMessage = {
        message: "",
        encrypted: "MockEncryptedData",
        iv: "MockIv",
    };

    beforeEach(() => {
        vi.clearAllMocks();

        mockStore = {
            getPrivateKey: vi.fn().mockReturnValue(dummyPrivateKey),
        };

        // Sauberes Mocking der nativen Web Crypto API über Spies
        vi.spyOn(globalThis.crypto.subtle, 'decrypt').mockResolvedValue(
            // Wir simulieren das Entschlüsseln, indem wir einen ArrayBuffer zurückgeben, 
            // der von TextDecoder in "Decrypted Message" umgewandelt wird.
            new TextEncoder().encode("Decrypted Message").buffer
        );
    });

    it("should return error if privateKey is undefined in store", async () => {
        (mockStore.getPrivateKey as Mock).mockReturnValue(undefined);

        const result = await decrypt(
            mockStore as Store,
            mockMsg,
            dummyPublicKey
        );

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("Private Key undefined!");
    });

    it("should decrypt successfully and return the decoded message", async () => {
        (deriveEncryptionKey as Mock).mockResolvedValue(dummyEncryptionKey);
        
        const mockIvBytes = new Uint8Array([1, 2, 3]);
        const mockEncryptedBytes = new Uint8Array([4, 5, 6]);
        
        // Wir simulieren unterschiedliche Rückgaben für iv und encrypted payload
        (fromBase64 as Mock)
            .mockReturnValueOnce(mockIvBytes)          // Erster Aufruf (für IV)
            .mockReturnValueOnce(mockEncryptedBytes);  // Zweiter Aufruf (für Payload)

        const result = await decrypt(mockStore as Store, mockMsg, dummyPublicKey);

        // Prüfen, ob der Schlüssel korrekt abgeleitet wurde
        expect(deriveEncryptionKey).toHaveBeenCalledWith(dummyPrivateKey, dummyPublicKey);

        // Prüfen, ob fromBase64 korrekt mit den Werten aus dem Objekt aufgerufen wurde
        expect(fromBase64).toHaveBeenNthCalledWith(1, "MockIv");
        expect(fromBase64).toHaveBeenNthCalledWith(2, "MockEncryptedData");

        // Prüfen, ob die echte kryptografische Entschlüsselung aufgerufen wurde
        expect(globalThis.crypto.subtle.decrypt).toHaveBeenCalledWith(
            { name: "AES-GCM", iv: mockIvBytes },
            dummyEncryptionKey,
            mockEncryptedBytes
        );

        expect(result.success).toBe(true);
        expect(result.result.message).toBe("Decrypted Message");
        expect(result.result.encrypted).toBe(""); // Wie in der Funktion definiert, wird encrypted geleert
        expect(result.result.iv).toBe("MockIv"); // Der IV sollte erhalten bleiben
    });

    it("should return error if crypto.subtle.decrypt fails", async () => {
        (deriveEncryptionKey as Mock).mockResolvedValue(dummyEncryptionKey);
        
        // Entschlüsselung schlägt fehl (z.B. wegen manipuliertem Ciphertext oder falschem Key)
        vi.spyOn(globalThis.crypto.subtle, 'decrypt').mockRejectedValueOnce(
            new Error("Decrypt failed")
        );

        const result = await decrypt(mockStore as Store, mockMsg, dummyPublicKey);

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("Decrypt failed");
    });
});