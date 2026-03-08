import { describe, it, beforeEach, vi, expect, Mock } from "vitest";
import { onboard } from "./onboard";
import { Bridge, BridgeMessageType } from "../bridge";
import { Store } from "../store";
import type { AxiosInstance } from "axios";
import {
    bufferToArrayBuffer,
    deriveEncryptionKeyFromPRF,
    encryptPrivateKeyString,
    saveCryptoKeyAsString,
    toBase64
} from "./helper";

// Kryptografische Helferfunktionen mocken
vi.mock("./helper", () => ({
    bufferToArrayBuffer: vi.fn(),
    deriveEncryptionKeyFromPRF: vi.fn(),
    encryptPrivateKeyString: vi.fn(),
    saveCryptoKeyAsString: vi.fn(),
    toBase64: vi.fn(),
}));

describe("onboard", () => {
    let mockAxios: Partial<AxiosInstance>;
    let mockBridge: Partial<Bridge>;
    let mockStore: Partial<Store>;

    const dummyPublicKey = {} as CryptoKey;
    const dummyPrivateKey = {} as CryptoKey;

    beforeEach(() => {
        vi.clearAllMocks();

        mockAxios = {
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

    it("should return error if public key is undefined in store", async () => {
        (mockStore.getPublicKey as Mock).mockReturnValue(undefined);

        const result = await onboard(
            mockAxios as AxiosInstance,
            mockBridge as Bridge,
            mockStore as Store
        );

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("Public Key undefined!");
    });

    it("should return error if private key is undefined in store", async () => {
        (mockStore.getPrivateKey as Mock).mockReturnValue(undefined);

        const result = await onboard(
            mockAxios as AxiosInstance,
            mockBridge as Bridge,
            mockStore as Store
        );

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("Private Key undefined!");
    });

    it("should return error if /request-onboard returns non-200 status", async () => {
        (mockAxios.post as Mock).mockResolvedValueOnce({
            status: 400,
            data: "Bad request",
        });

        const result = await onboard(
            mockAxios as AxiosInstance,
            mockBridge as Bridge,
            mockStore as Store
        );

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("Bad request");
    });

    it("should return error if bridge.invoke (startAuthentication) fails", async () => {
        (mockAxios.post as Mock).mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify({
                options: {
                    challenge: "testChallenge",
                    extensions: { prf: { eval: { first: [99, 100] } } },
                },
            }),
        });

        (bufferToArrayBuffer as Mock).mockReturnValue(new ArrayBuffer(2));
        (mockBridge.invoke as Mock).mockRejectedValueOnce(new Error("Auth failed"));

        const result = await onboard(
            mockAxios as AxiosInstance,
            mockBridge as Bridge,
            mockStore as Store
        );

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("Auth failed");
    });

    it("should return error if /onboard returns non-200 status", async () => {
        // 1. /request-onboard
        (mockAxios.post as Mock).mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify({
                options: {
                    challenge: "testChallenge",
                    extensions: { prf: { eval: { first: [99, 100] } } },
                },
            }),
        });

        (bufferToArrayBuffer as Mock).mockReturnValue(new ArrayBuffer(2));
        
        // Bridge Mock
        (mockBridge.invoke as Mock).mockResolvedValueOnce({
            clientExtensionResults: { prf: { results: { first: [99, 100] } } },
        });

        // Helper Mocks
        (deriveEncryptionKeyFromPRF as Mock).mockResolvedValueOnce({
            encryptionKey: {},
            salt: new Uint8Array([1, 2]),
        });
        (saveCryptoKeyAsString as Mock)
            .mockResolvedValueOnce("pubKeyStr")
            .mockResolvedValueOnce("privKeyStr");
        (encryptPrivateKeyString as Mock).mockResolvedValueOnce({
            encryptedBuffer: new ArrayBuffer(2),
            iv: new Uint8Array([3, 4]),
        });
        (toBase64 as Mock).mockReturnValue("mockBase64");

        // 2. /onboard schlägt fehl
        (mockAxios.post as Mock).mockResolvedValueOnce({
            status: 500,
            data: "Onboard Server Error",
        });

        const result = await onboard(
            mockAxios as AxiosInstance,
            mockBridge as Bridge,
            mockStore as Store
        );

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("Onboard Server Error");
    });

    it("should return success=true and construct correct payload when everything succeeds", async () => {
        const mockChallengeOptions = {
            challenge: "testChallenge",
            extensions: { prf: { eval: { first: [99, 100] } } },
        };

        // 1. /request-onboard
        (mockAxios.post as Mock).mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify({ options: mockChallengeOptions }),
        });

        const mockArrayBuffer = new ArrayBuffer(2);
        (bufferToArrayBuffer as Mock).mockReturnValue(mockArrayBuffer);

        const mockCredentials = {
            clientExtensionResults: { prf: { results: { first: [10, 20] } } },
            id: "credId",
        };
        (mockBridge.invoke as Mock).mockResolvedValueOnce(mockCredentials);

        (deriveEncryptionKeyFromPRF as Mock).mockResolvedValueOnce({
            encryptionKey: { type: "secret" },
            salt: new Uint8Array([1, 1, 1]),
        });

        (saveCryptoKeyAsString as Mock)
            .mockResolvedValueOnce("mockPubKeyString")
            .mockResolvedValueOnce("mockPrivKeyString");

        const mockEncryptedBuffer = new ArrayBuffer(5);
        (encryptPrivateKeyString as Mock).mockResolvedValueOnce({
            encryptedBuffer: mockEncryptedBuffer,
            iv: new Uint8Array([2, 2, 2]),
        });

        // Wir lassen toBase64 immer denselben String zurückgeben
        (toBase64 as Mock).mockReturnValue("b64-string");

        // 2. /onboard
        (mockAxios.post as Mock).mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify({ success: true }),
        });

        // Funktion ausführen
        const result = await onboard(
            mockAxios as AxiosInstance,
            mockBridge as Bridge,
            mockStore as Store
        );

        // Überprüfen, ob die Bridge mit den korrekten Parametern aufgerufen wurde
        expect(mockBridge.invoke).toHaveBeenCalledWith(
            BridgeMessageType.StartAuthentication,
            { challengeOptions: mockChallengeOptions }
        );

        // Überprüfen, ob der finale POST Request (/onboard) das korrekte Format hat
        expect(mockAxios.post).toHaveBeenNthCalledWith(2, `/onboard`, {
            onboardRequest: {
                privateKey: "b64-string", // toBase64(new Uint8Array(encryptedBuffer))
                publicKey: "mockPubKeyString",
                cipherBlob: "v1|b64-string|b64-string", // v1|salt|iv
                credentials: mockCredentials,
                challenge: "testChallenge",
            },
        });

        expect(result.success).toBe(true);
        expect(result.result.verified).toBe(true);
    });
});