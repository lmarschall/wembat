import { describe, it, beforeEach, vi, expect, Mock } from "vitest";
import { login } from "./login";
import { Bridge, BridgeMessageType } from "../bridge";
import { Store } from "../store";
import type { AxiosInstance } from "axios";
import {
    bufferToArrayBuffer,
    deriveEncryptionKeyFromPRF,
    loadCryptoPrivateKeyFromString,
    loadCryptoPublicKeyFromString,
    parseSecretString,
} from "./helper";

// Kryptografische Helferfunktionen mocken, um schnelle & isolierte Unit-Tests zu garantieren
vi.mock("./helper", () => ({
    bufferToArrayBuffer: vi.fn(),
    deriveEncryptionKeyFromPRF: vi.fn(),
    loadCryptoPrivateKeyFromString: vi.fn(),
    loadCryptoPublicKeyFromString: vi.fn(),
    parseSecretString: vi.fn(),
}));

describe("login", () => {
    let mockAxios: Partial<AxiosInstance>;
    let mockBridge: Partial<Bridge>;
    let mockStore: Partial<Store>;

    const dummyPublicKey = { type: "public" } as unknown as CryptoKey;
    const dummyPrivateKey = { type: "private" } as unknown as CryptoKey;

    beforeEach(() => {
        vi.clearAllMocks();

        mockAxios = {
            post: vi.fn(),
            defaults: {
                headers: { common: {} },
            } as any,
        };

        mockBridge = {
            invoke: vi.fn(),
        };

        mockStore = {
            setKeys: vi.fn(),
            setUserMail: vi.fn(),
            setToken: vi.fn(),
            getPublicKey: vi.fn().mockReturnValue(dummyPublicKey),
            getPrivateKey: vi.fn().mockReturnValue(dummyPrivateKey),
        };
    });

    it("should return error if /request-login does not return status 200", async () => {
        (mockAxios.post as Mock).mockResolvedValueOnce({
            status: 400,
            data: "Bad request",
        });

        const result = await login(
            mockAxios as AxiosInstance,
            mockBridge as Bridge,
            mockStore as Store,
            "test@user.com"
        );

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("Bad request");
    });

    it("should return error if bridge.invoke (startAuthentication) fails", async () => {
        (mockAxios.post as Mock).mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify({
                options: { challenge: "testChallenge", extensions: { prf: { eval: { first: [1, 2] } } } },
            }),
        });

        (mockBridge.invoke as Mock).mockRejectedValueOnce(new Error("Bridge auth failed"));

        const result = await login(
            mockAxios as AxiosInstance,
            mockBridge as Bridge,
            mockStore as Store,
            "test@user.com"
        );

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("Bridge auth failed");
    });

    it("should return error if login is not verified by the server", async () => {
        // 1. /request-login
        (mockAxios.post as Mock).mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify({
                options: { challenge: "testChallenge", extensions: { prf: { eval: { first: [1, 2] } } } },
            }),
        });

        // Bridge
        (mockBridge.invoke as Mock).mockResolvedValueOnce({
            clientExtensionResults: { prf: { results: { first: [1, 2] } } },
        });

        // 2. /login
        (mockAxios.post as Mock).mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify({ verified: false }),
        });

        const result = await login(
            mockAxios as AxiosInstance,
            mockBridge as Bridge,
            mockStore as Store,
            "test@user.com"
        );

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("Login not verified");
    });

    it("should return error if clientExtensionResults is undefined", async () => {
        // 1. /request-login
        (mockAxios.post as Mock).mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify({
                options: { challenge: "testChallenge", extensions: { prf: { eval: { first: [1, 2] } } } },
            }),
        });

        // Bridge returns NO clientExtensionResults
        (mockBridge.invoke as Mock).mockResolvedValueOnce({
            id: "someId",
            rawId: "someRawId",
            type: "public-key",
            response: {}
        });

        // 2. /login
        (mockAxios.post as Mock).mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify({ verified: true }),
        });

        const result = await login(
            mockAxios as AxiosInstance,
            mockBridge as Bridge,
            mockStore as Store,
            "test@user.com"
        );

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("Credentials not instance of PublicKeyCredential");
    });

    it("should load existing keys and return success=true", async () => {
        // 1. /request-login
        (mockAxios.post as Mock).mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify({
                options: { challenge: "testChallenge", extensions: { prf: { eval: { first: [1, 2] } } } },
            }),
        });

        // Bridge
        (mockBridge.invoke as Mock).mockResolvedValueOnce({
            clientExtensionResults: { prf: { results: { first: [1, 2] } } },
        });

        // 2. /login
        (mockAxios.post as Mock).mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify({
                verified: true,
                token: "testToken",
                cipherBlob: "v1|mockSalt|mockIv",
                publicUserKey: "pubKeyString",
                privateUserKeyEncrypted: "privKeyEncString",
            }),
        });

        // Helper Mocks für existierende Keys
        (parseSecretString as Mock).mockReturnValue(["v1", "mockSalt", "mockIv"]);
        (deriveEncryptionKeyFromPRF as Mock).mockResolvedValue({ encryptionKey: {}, salt: new Uint8Array() });
        (loadCryptoPublicKeyFromString as Mock).mockResolvedValue(dummyPublicKey);
        (loadCryptoPrivateKeyFromString as Mock).mockResolvedValue(dummyPrivateKey);

        const result = await login(
            mockAxios as AxiosInstance,
            mockBridge as Bridge,
            mockStore as Store,
            "test@user.com"
        );

        // Prüfen, ob die Keys geladen und im Store gespeichert wurden
        expect(loadCryptoPublicKeyFromString).toHaveBeenCalledWith("pubKeyString");
        expect(loadCryptoPrivateKeyFromString).toHaveBeenCalledWith("privKeyEncString", expect.any(Object), "mockIv");
        expect(mockStore.setKeys).toHaveBeenCalledWith(dummyPrivateKey, dummyPublicKey);

        // Prüfen, ob Store-Daten & Axios-Header aktualisiert wurden
        expect(mockStore.setUserMail).toHaveBeenCalledWith("test@user.com");
        expect(mockStore.setToken).toHaveBeenCalledWith("testToken");
        expect(mockAxios.defaults!.headers.common["Authorization"]).toBe("Bearer testToken");

        expect(result.success).toBe(true);
        expect(result.result.verified).toBe(true);
        expect(result.result.publicKey).toBe(dummyPublicKey);
    });
});