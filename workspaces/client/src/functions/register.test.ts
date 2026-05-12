import { describe, it, beforeEach, vi, expect, Mock } from "vitest";
import { register } from "./register";
import { Bridge, BridgeMessageType } from "../bridge";
import { Store } from "../store";
import type { AxiosInstance } from "axios";
import {
    bufferToArrayBuffer,
    deriveEllipticKeypair,
    deriveEncryptionKeyFromPRF,
    encryptPrivateKeyString,
    parseSecretString,
    saveCryptoKeyAsString,
    toBase64,
} from "./helper";

// Mock cryptographic helpers for fast & isolated unit testing
vi.mock("./helper", () => ({
    bufferToArrayBuffer: vi.fn(),
    deriveEllipticKeypair: vi.fn(),
    deriveEncryptionKeyFromPRF: vi.fn(),
    encryptPrivateKeyString: vi.fn(),
    parseSecretString: vi.fn(),
    saveCryptoKeyAsString: vi.fn(),
    toBase64: vi.fn(),
}));

describe("register", () => {
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
        };
    });

    it("should return error if /request-register does not return status 200", async () => {
        (mockAxios.post as Mock).mockResolvedValueOnce({
            status: 400,
            data: "Bad request",
        });

        const result = await register(
            mockAxios as AxiosInstance,
            mockBridge as Bridge,
            mockStore as Store,
            "test@user.com",
            false
        );

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("Bad request");
    });

    it("should return error if bridge.invoke (startRegistration) fails", async () => {
        (mockAxios.post as Mock).mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify({
                options: { challenge: "testChallenge", extensions: { prf: { eval: { first: [1, 2] } } } },
            }),
        });

        (mockBridge.invoke as Mock).mockRejectedValueOnce(
            new Error("Bridge communication failed")
        );

        const result = await register(
            mockAxios as AxiosInstance,
            mockBridge as Bridge,
            mockStore as Store,
            "test@user.com",
            false
        );

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("Bridge communication failed");
    });

    it("should return error if clientExtensionResults is undefined", async () => {
        (mockAxios.post as Mock).mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify({
                options: { challenge: "testChallenge", extensions: { prf: { eval: { first: [1, 2] } } } },
            }),
        });

        // Bridge missing clientExtensionResults
        (mockBridge.invoke as Mock).mockResolvedValueOnce({
            id: "credentialId",
            rawId: "rawId",
            response: {},
            type: "public-key",
        });

        const result = await register(
            mockAxios as AxiosInstance,
            mockBridge as Bridge,
            mockStore as Store,
            "test@user.com",
            false
        );

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("Client Extension Result undefined!");
    });

    it("should return error if PRF extension is disabled", async () => {
        (mockAxios.post as Mock).mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify({
                options: { challenge: "testChallenge", extensions: { prf: { eval: { first: [1, 2] } } } },
            }),
        });

        // Simulate bridge response where PRF is disabled
        (mockBridge.invoke as Mock).mockResolvedValueOnce({
            clientExtensionResults: { prf: { enabled: false } },
            id: "credentialId",
            rawId: "rawId",
            response: {},
            type: "public-key",
        });

        const result = await register(
            mockAxios as AxiosInstance,
            mockBridge as Bridge,
            mockStore as Store,
            "test@user.com",
            false
        );

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("PRF extension disabled");
    });

    it("should return error if /register does not return status 200", async () => {
        (mockAxios.post as Mock)
            .mockResolvedValueOnce({
                status: 200,
                data: JSON.stringify({
                    options: { challenge: "testChallenge", extensions: { prf: { eval: { first: [1, 2] } } } },
                }),
            })
            .mockResolvedValueOnce({
                status: 500,
                data: "Internal Server Error",
            });

        (mockBridge.invoke as Mock).mockResolvedValueOnce({
            clientExtensionResults: { prf: { enabled: true, results: { first: [1, 2] } } },
            id: "credentialId",
            rawId: "rawId",
            response: {},
            type: "public-key",
        });

        (parseSecretString as Mock).mockReturnValue(["v1", "salt", "iv"]);
        (deriveEncryptionKeyFromPRF as Mock).mockResolvedValue({ encryptionKey: {}, salt: new Uint8Array() });
        (deriveEllipticKeypair as Mock).mockResolvedValue({ publicKey: dummyPublicKey, privateKey: dummyPrivateKey });
        (encryptPrivateKeyString as Mock).mockResolvedValue({ encryptedBuffer: new ArrayBuffer(2), iv: new Uint8Array() });

        const result = await register(
            mockAxios as AxiosInstance,
            mockBridge as Bridge,
            mockStore as Store,
            "test@user.com",
            false
        );

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("Internal Server Error");
    });

    it("should return success=true when everything succeeds and update store", async () => {
        const mockRequestRegisterData = {
            options: { challenge: "testChallenge", extensions: { prf: { eval: { first: [1, 2] } } } },
        };

        (mockAxios.post as Mock)
            .mockResolvedValueOnce({
                status: 200,
                data: JSON.stringify(mockRequestRegisterData),
            })
            .mockResolvedValueOnce({
                status: 200,
                data: JSON.stringify({ verified: true, token: "mockToken" }),
            });

        const mockCredentials = {
            clientExtensionResults: { prf: { enabled: true, results: { first: [1, 2] } } },
            id: "credentialId",
            rawId: "rawId",
            response: {},
            type: "public-key",
        };

        (mockBridge.invoke as Mock).mockResolvedValueOnce(mockCredentials);

        // Setup successful helper mock returns
        (bufferToArrayBuffer as Mock).mockReturnValue(new ArrayBuffer(2));
        (parseSecretString as Mock).mockReturnValue(["v1", "mockSalt", "mockIv"]);
        (deriveEncryptionKeyFromPRF as Mock).mockResolvedValue({ encryptionKey: {}, salt: new Uint8Array([1, 1]) });
        (deriveEllipticKeypair as Mock).mockResolvedValue({ publicKey: dummyPublicKey, privateKey: dummyPrivateKey });
        (saveCryptoKeyAsString as Mock).mockResolvedValue("mockStringKey");
        (encryptPrivateKeyString as Mock).mockResolvedValue({ encryptedBuffer: new ArrayBuffer(2), iv: new Uint8Array([2, 2]) });
        (toBase64 as Mock).mockReturnValue("mockBase64");

        const result = await register(
            mockAxios as AxiosInstance,
            mockBridge as Bridge,
            mockStore as Store,
            "test@user.com",
            true // autoRegister
        );

        // Verify keys were saved to store
        expect(mockStore.setKeys).toHaveBeenCalledWith(dummyPrivateKey, dummyPublicKey);

        // Verify POST /register was called with exact new parameters
        expect(mockAxios.post).toHaveBeenNthCalledWith(2, `/register`, {
            registerChallengeResponse: {
                credentials: mockCredentials,
                challenge: "testChallenge",
                privateKey: "mockBase64",
                publicKey: "mockStringKey",
                cipherBlob: "v1|mockBase64|mockBase64",
            },
        });

        // Verify session data was set
        expect(mockStore.setUserMail).toHaveBeenCalledWith("test@user.com");
        expect(mockStore.setToken).toHaveBeenCalledWith("mockToken");
        expect(mockAxios.defaults!.headers.common["Authorization"]).toBe("Bearer mockToken");

        expect(result.success).toBe(true);
        expect(result.result.verified).toBe(true);
        expect(result.result.publicKey).toBe(dummyPublicKey);
    });
});