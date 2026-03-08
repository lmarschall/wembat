import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import { encrypt } from "./encrypt";
import { deriveEncryptionKey, toBase64 } from "./helper";
import { WembatMessage } from "../types";
import { Store } from "../store";

// Helper-Funktionen isoliert mocken
vi.mock("./helper", () => ({
    deriveEncryptionKey: vi.fn(),
    toBase64: vi.fn(),
}));

describe("encrypt", () => {
    let mockStore: Partial<Store>;
    
    const dummyPrivateKey = { type: "private" } as unknown as CryptoKey;
    const dummyPublicKey = { type: "public" } as unknown as CryptoKey;
    const dummyEncryptionKey = { type: "secret" } as unknown as CryptoKey;

    const mockMsg: WembatMessage = {
        message: "Hello World",
        encrypted: "",
        iv: "",
    };

    beforeEach(() => {
        vi.clearAllMocks();

        mockStore = {
            getPrivateKey: vi.fn().mockReturnValue(dummyPrivateKey),
        };

        // Sauberes Mocking der nativen Web Crypto API über Spies (kein window-Hack mehr nötig!)
        vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((arr: any) => {
            // Füllt das Array mit Dummy-Werten (z.B. 1), um einen vorhersehbaren IV zu simulieren
            arr.fill(1);
            return arr;
        });

        vi.spyOn(globalThis.crypto.subtle, 'encrypt').mockResolvedValue(new ArrayBuffer(8));
    });

    it("should return error if privateKey is undefined in store", async () => {
        (mockStore.getPrivateKey as Mock).mockReturnValue(undefined);

        const result = await encrypt(
            mockStore as Store,
            mockMsg,
            dummyPublicKey
        );

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("Private Key undefined!");
    });

    it("should encrypt successfully and return base64 encoded strings", async () => {
        (deriveEncryptionKey as Mock).mockResolvedValue(dummyEncryptionKey);
        
        // Wir simulieren, dass toBase64 je nach Aufruf (zuerst Payload, dann IV) unterschiedliche Strings liefert
        (toBase64 as Mock)
            .mockReturnValueOnce("mockBase64Cipher")
            .mockReturnValueOnce("mockBase64Iv");

        const result = await encrypt(mockStore as Store, mockMsg, dummyPublicKey);

        // Prüfen, ob der Schlüssel korrekt abgeleitet wurde
        expect(deriveEncryptionKey).toHaveBeenCalledWith(dummyPrivateKey, dummyPublicKey);
        
        // Prüfen, ob die echte kryptografische Verschlüsselung (in unserem Fall der Spy) aufgerufen wurde
        expect(globalThis.crypto.subtle.encrypt).toHaveBeenCalledWith(
            { name: "AES-GCM", iv: expect.any(Uint8Array) },
            dummyEncryptionKey,
            expect.any(Uint8Array) // Der kodierte "Hello World" Text
        );

        expect(result.success).toBe(true);
        expect(result.result.encrypted).toBe("mockBase64Cipher");
        expect(result.result.iv).toBe("mockBase64Iv");
        expect(result.result.message).toBe(""); // Wie in der Funktion definiert, wird message geleert
    });

    it("should return error if crypto.subtle.encrypt fails", async () => {
        (deriveEncryptionKey as Mock).mockResolvedValue(dummyEncryptionKey);
        
        // Verschlüsselung schlägt fehl
        vi.spyOn(globalThis.crypto.subtle, 'encrypt').mockRejectedValueOnce(
            new Error("Encryption failed")
        );

        const result = await encrypt(mockStore as Store, mockMsg, dummyPublicKey);

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("Encryption failed");
    });
});