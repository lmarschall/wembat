import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
import { link } from "./link";
import { Bridge, BridgeMessageType } from "../bridge";
import { Store } from "../store";
import type { AxiosInstance } from "axios";
import {
    bufferToArrayBuffer,
    deriveEncryptionKeyFromPRF,
    encryptPrivateKeyString,
    parseSecretString,
    saveCryptoKeyAsString,
    toBase64,
} from "./helper";

// Mock cryptographic helpers for fast & isolated unit testing
vi.mock("./helper", () => ({
    bufferToArrayBuffer: vi.fn(),
    deriveEncryptionKeyFromPRF: vi.fn(),
    encryptPrivateKeyString: vi.fn(),
    parseSecretString: vi.fn(),
    saveCryptoKeyAsString: vi.fn(),
    toBase64: vi.fn(),
}));

describe("link", () => {
    let mockAxiosClient: Partial<AxiosInstance>;
    let mockBridge: Partial<Bridge>;
    let mockStore: Partial<Store>;

    const dummyPublicKey = { type: "public" } as unknown as CryptoKey;
    const dummyPrivateKey = { type: "private" } as unknown as CryptoKey;

    const mockRequestLinkResponseData = {
        options: { challenge: "testChallenge", extensions: { prf: { eval: { first: [1, 2] } } } },
    };
    const validRegistrationResponse = {
        clientExtensionResults: { prf: { enabled: true, results: { first: [1, 2] } } },
        id: "credentialId",
        rawId: "rawId",
        response: {},
        type: "public-key",
    };

    beforeEach(() => {
        vi.clearAllMocks();
        
        mockAxiosClient = {
            post: vi.fn(),
        };

        mockBridge = {
            invoke: vi.fn(),
        };

        mockStore = {
            getPublicKey: vi.fn().mockReturnValue(dummyPublicKey),
            getPrivateKey: vi.fn().mockReturnValue(dummyPrivateKey),
        };
    });

    it("should return error if /request-link returns non-200", async () => {
        (mockAxiosClient.post as Mock).mockResolvedValueOnce({
            status: 400,
            data: "Error from request-link",
        });

        const result = await link(
            mockAxiosClient as AxiosInstance,
            mockStore as Store,
            mockBridge as Bridge
        );

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("Error from request-link");
    });

    it("should return error if bridge.invoke (startRegistration) fails", async () => {
        (mockAxiosClient.post as Mock).mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify(mockRequestLinkResponseData),
        });

        (mockBridge.invoke as Mock).mockRejectedValueOnce(
            new Error("startRegistration error")
        );

        const result = await link(
            mockAxiosClient as AxiosInstance,
            mockStore as Store,
            mockBridge as Bridge
        );

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("startRegistration error");
    });

    it("should return error if clientExtensionResults is undefined", async () => {
        (mockAxiosClient.post as Mock).mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify(mockRequestLinkResponseData),
        });

        (mockBridge.invoke as Mock).mockResolvedValueOnce({
            id: "credentialId",
            rawId: "rawId",
            response: {},
            type: "public-key",
            // missing clientExtensionResults
        });

        const result = await link(
            mockAxiosClient as AxiosInstance,
            mockStore as Store,
            mockBridge as Bridge
        );

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("Client Extension Result undefined!");
    });

    it("should return error if PRF extension is disabled", async () => {
        (mockAxiosClient.post as Mock).mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify(mockRequestLinkResponseData),
        });

        (mockBridge.invoke as Mock).mockResolvedValueOnce({
            clientExtensionResults: { prf: { enabled: false } },
            id: "credentialId",
            rawId: "rawId",
            response: {},
            type: "public-key",
        });

        const result = await link(
            mockAxiosClient as AxiosInstance,
            mockStore as Store,
            mockBridge as Bridge
        );

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("PRF extension disabled");
    });

    it("should return error if Public or Private Key is undefined in store", async () => {
        (mockAxiosClient.post as Mock).mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify(mockRequestLinkResponseData),
        });

        (mockBridge.invoke as Mock).mockResolvedValueOnce(validRegistrationResponse);

        (parseSecretString as Mock).mockReturnValue(["v1", "salt", "iv"]);
        (deriveEncryptionKeyFromPRF as Mock).mockResolvedValue({ encryptionKey: {}, salt: new Uint8Array() });

        // Force store to return undefined
        (mockStore.getPublicKey as Mock).mockReturnValue(undefined);

        const result = await link(
            mockAxiosClient as AxiosInstance,
            mockStore as Store,
            mockBridge as Bridge
        );

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("Public or Private Key undefined");
    });

    it("should return error if /link returns non-200", async () => {
        (mockAxiosClient.post as Mock)
            // 1. Call: /request-link returns 200 and valid options
            .mockResolvedValueOnce({
                status: 200,
                data: JSON.stringify(mockRequestLinkResponseData),
            })
            // 2. Call: /link returns non-200
            .mockResolvedValueOnce({
                status: 400,
                data: "Error from link",
            });

        // Bridge returns a valid response
        (mockBridge.invoke as Mock).mockResolvedValueOnce(validRegistrationResponse);

        (parseSecretString as Mock).mockReturnValue(["v1", "salt", "iv"]);
        (deriveEncryptionKeyFromPRF as Mock).mockResolvedValue({ encryptionKey: {}, salt: new Uint8Array() });
        (saveCryptoKeyAsString as Mock).mockResolvedValue("mockStringKey");
        (encryptPrivateKeyString as Mock).mockResolvedValue({ encryptedBuffer: new ArrayBuffer(2), iv: new Uint8Array() });

        const result = await link(
            mockAxiosClient as AxiosInstance,
            mockStore as Store,
            mockBridge as Bridge
        );

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("Error from link");
    });

    it("should return success and verify parameters if linking succeeds", async () => {
        const linkEndpointResponse = { verified: true };
        
        (mockAxiosClient.post as Mock)
            // 1. Call: /request-link
            .mockResolvedValueOnce({
                status: 200,
                data: JSON.stringify(mockRequestLinkResponseData),
            })
            // 2. Call: /link
            .mockResolvedValueOnce({
                status: 200,
                data: JSON.stringify(linkEndpointResponse),
            });

        (mockBridge.invoke as Mock).mockResolvedValueOnce(validRegistrationResponse);

        // Setup successful helper mock returns
        (bufferToArrayBuffer as Mock).mockReturnValue(new ArrayBuffer(2));
        (parseSecretString as Mock).mockReturnValue(["v1", "mockSalt", "mockIv"]);
        (deriveEncryptionKeyFromPRF as Mock).mockResolvedValue({ encryptionKey: {}, salt: new Uint8Array([1, 1]) });
        (saveCryptoKeyAsString as Mock).mockResolvedValue("mockStringKey");
        (encryptPrivateKeyString as Mock).mockResolvedValue({ encryptedBuffer: new ArrayBuffer(2), iv: new Uint8Array([2, 2]) });
        (toBase64 as Mock).mockReturnValue("mockBase64");

        const result = await link(
            mockAxiosClient as AxiosInstance,
            mockStore as Store,
            mockBridge as Bridge
        );

        // Verify that the Bridge was called with correct arguments
        expect(mockBridge.invoke).toHaveBeenCalledWith(
            BridgeMessageType.StartRegistration,
            {
                challengeOptions: {
                    challenge: "testChallenge",
                    extensions: {
                        prf: {
                            eval: {
                                // Match the mocked return value of bufferToArrayBuffer
                                first: new ArrayBuffer(2), 
                            },
                        },
                    },
                },
                autoRegister: false,
            }
        );

        // Verify that the final Axios post was called with correctly structured data
        expect(mockAxiosClient.post).toHaveBeenNthCalledWith(2, `/link`, {
            linkChallengeResponse: {
                credentials: validRegistrationResponse,
                challenge: "testChallenge",
                privateKey: "mockBase64",
                publicKey: "mockStringKey",
                cipherBlob: "v1|mockBase64|mockBase64",
            },
        });

        expect(result.success).toBe(true);
        expect(result.result.verified).toBe(true);
    });
});