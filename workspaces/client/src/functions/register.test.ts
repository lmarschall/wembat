import { describe, it, beforeEach, vi, expect, Mock } from "vitest";
import { register } from "./register";
import { Bridge, BridgeMessageType } from "../bridge";
import type { AxiosInstance } from "axios";

describe("register", () => {
    let mockAxios: Partial<AxiosInstance>;
    let mockBridge: Partial<Bridge>;

    beforeEach(() => {
        vi.clearAllMocks();

        // Einfaches Setup für Axios
        mockAxios = {
            post: vi.fn(),
        };

        // Einfaches Setup für die Bridge
        mockBridge = {
            invoke: vi.fn(),
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
            "test@user.com",
            false
        );

        expect(result.success).toBe(false);
        // Beachte: Die neue Struktur ist result.error.message (nicht mehr .error)
        expect(result.error.message).toBe("Bad request");
    });

    it("should return error if bridge.invoke (startRegistration) fails", async () => {
        (mockAxios.post as Mock).mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify({
                options: { challenge: "testChallenge" },
            }),
        });

        (mockBridge.invoke as Mock).mockRejectedValueOnce(
            new Error("Bridge communication failed")
        );

        const result = await register(
            mockAxios as AxiosInstance,
            mockBridge as Bridge,
            "test@user.com",
            false
        );

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("Bridge communication failed");
    });

    it("should return error if PRF extension is disabled", async () => {
        (mockAxios.post as Mock).mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify({
                options: { challenge: "testChallenge" },
            }),
        });

        // Simuliere eine Bridge-Antwort, bei der PRF fehlt oder auf false steht
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
            "test@user.com",
            false
        );

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("PRF extension disabled");
    });

    it("should return error if /register does not return status 200", async () => {
        (mockAxios.post as Mock)
            // 1. Call: /request-register
            .mockResolvedValueOnce({
                status: 200,
                data: JSON.stringify({
                    options: { challenge: "testChallenge" },
                }),
            })
            // 2. Call: /register
            .mockResolvedValueOnce({
                status: 500,
                data: "Internal Server Error",
            });

        // Simuliere korrekte Bridge-Antwort mit PRF = true
        (mockBridge.invoke as Mock).mockResolvedValueOnce({
            clientExtensionResults: { prf: { enabled: true } },
            id: "credentialId",
            rawId: "rawId",
            response: {},
            type: "public-key",
        });

        const result = await register(
            mockAxios as AxiosInstance,
            mockBridge as Bridge,
            "test@user.com",
            false
        );

        expect(result.success).toBe(false);
        expect(result.error.message).toBe("Internal Server Error");
    });

    it("should return success=true when everything succeeds", async () => {
        const mockRequestRegisterData = {
            options: { challenge: "testChallenge" },
        };

        (mockAxios.post as Mock)
            // 1. Call: /request-register
            .mockResolvedValueOnce({
                status: 200,
                data: JSON.stringify(mockRequestRegisterData),
            })
            // 2. Call: /register
            .mockResolvedValueOnce({
                status: 200,
                data: JSON.stringify({ verified: true }),
            });

        const mockCredentials = {
            clientExtensionResults: { prf: { enabled: true } },
            id: "credentialId",
            rawId: "rawId",
            response: {},
            type: "public-key",
        };

        (mockBridge.invoke as Mock).mockResolvedValueOnce(mockCredentials);

        const result = await register(
            mockAxios as AxiosInstance,
            mockBridge as Bridge,
            "test@user.com",
            true // autoRegister
        );

        // Überprüfen, ob invoke mit den exakten Parametern aufgerufen wurde
        expect(mockBridge.invoke).toHaveBeenCalledWith(
            BridgeMessageType.StartRegistration,
            {
                challengeOptions: mockRequestRegisterData,
                autoRegister: true,
            }
        );

        // Überprüfen, ob POST /register mit den exakten Parametern aufgerufen wurde
        expect(mockAxios.post).toHaveBeenNthCalledWith(2, `/register`, {
            registerChallengeResponse: {
                credentials: mockCredentials,
                challenge: "testChallenge",
            },
        });

        expect(result.success).toBe(true);
        expect(result.result.verified).toBe(true);
    });
});