//// typescript
// filepath: /home/lukas/Source/wembat/src/functions/encrypt.test.ts
import { describe, it, expect, beforeAll, vi } from "vitest";
import { encrypt } from "./encrypt";
import { deriveEncryptionKey, ab2str } from "./helper";
// window.crypto in Node-Umgebung mocken
beforeAll(() => {
    Object.defineProperty(globalThis, "window", {
        value: {
            crypto: {
                getRandomValues: vi.fn().mockImplementation((arr) => {
                    // mock z.B. gefülltes Array
                    for (let i = 0; i < arr.length; i++)
                        arr[i] = i;
                    return arr;
                }),
                subtle: {
                    encrypt: vi.fn(),
                },
            },
        },
    });
});
vi.mock("./helper", () => ({
    deriveEncryptionKey: vi.fn(),
    ab2str: vi.fn(),
}));
describe("encrypt", () => {
    it("wirft Fehler, wenn privateKey nicht vorhanden ist", async () => {
        const result = await encrypt(undefined, {}, {});
        expect(result.success).toBe(false);
        expect(result.error.error).toBe("Private Key undefined!");
    });
    it("verschlüsselt erfolgreich und gibt Objekte zurück", async () => {
        deriveEncryptionKey.mockResolvedValue("mockEncKey");
        ab2str.mockReturnValue("mockedString");
        globalThis.window.crypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(8));
        const mockPrivateKey = {};
        const mockPublicKey = {};
        const mockMsg = {
            message: "Hello World",
            encrypted: "",
            iv: "",
        };
        const result = await encrypt(mockPrivateKey, mockMsg, mockPublicKey);
        expect(deriveEncryptionKey).toHaveBeenCalledWith(mockPrivateKey, mockPublicKey);
        expect(globalThis.window.crypto.subtle.encrypt).toHaveBeenCalled();
        expect(result.success).toBe(true);
        expect(result.result.encrypted).toBe("mockedString");
        expect(result.result.iv).toBe("mockedString");
    });
    it("gibt Fehler zurück, wenn encrypt fehlschlägt", async () => {
        deriveEncryptionKey.mockResolvedValue("mockEncKey");
        globalThis.window.crypto.subtle.encrypt.mockRejectedValue(new Error("Encryption failed"));
        const mockKey = {};
        const mockMsg = { message: "test", encrypted: "", iv: "" };
        const result = await encrypt(mockKey, mockMsg, mockKey);
        expect(result.success).toBe(false);
        expect(result.error.error).toBe("Encryption failed");
    });
});
//# sourceMappingURL=encrypt.test.js.map