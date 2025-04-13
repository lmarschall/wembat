//// typescript
// filepath: /home/lukas/Source/wembat/src/functions/link.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { link } from "./link";
import { browserSupportsWebAuthn, startRegistration, } from "@simplewebauthn/browser";
// Mock the webauthn browser helpers
vi.mock("@simplewebauthn/browser", () => ({
    browserSupportsWebAuthn: vi.fn(),
    startRegistration: vi.fn(),
}));
describe("link", () => {
    let mockAxiosClient;
    const requestLinkResponseData = {
        options: { challenge: "testChallenge" },
    };
    const validRegistrationResponse = {
        clientExtensionResults: { prf: { enabled: true } },
    };
    beforeEach(() => {
        vi.clearAllMocks();
        mockAxiosClient = {
            post: vi.fn(),
        };
        // Default: browser supports WebAuthn
        browserSupportsWebAuthn.mockReturnValue(true);
        startRegistration.mockResolvedValue(validRegistrationResponse);
    });
    it("should return error if WebAuthn is not supported", async () => {
        browserSupportsWebAuthn.mockReturnValue(false);
        const result = await link(mockAxiosClient);
        expect(result.success).toBe(false);
        expect(result.error.error).toBe("WebAuthn is not supported on this browser!");
    });
    it("should throw error if /request-link returns non-200", async () => {
        mockAxiosClient.post.mockResolvedValueOnce({
            status: 400,
            data: "Error from request-link",
        });
        const result = await link(mockAxiosClient);
        expect(result.success).toBe(false);
        expect(result.error.error).toBe("Error from request-link");
    });
    it("should throw error if startRegistration fails", async () => {
        mockAxiosClient.post.mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify(requestLinkResponseData),
        });
        startRegistration.mockRejectedValueOnce(new Error("startRegistration error"));
        const result = await link(mockAxiosClient);
        expect(result.success).toBe(false);
        expect(result.error.error).toBe("Error: startRegistration error");
    });
    it("should throw error if PRF extension is disabled", async () => {
        mockAxiosClient.post.mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify(requestLinkResponseData),
        });
        startRegistration.mockResolvedValueOnce({
            clientExtensionResults: { prf: { enabled: false } },
        });
        const result = await link(mockAxiosClient);
        expect(result.success).toBe(false);
        expect(result.error.error).toBe("PRF extension disabled");
    });
    it("should throw error if /link returns non-200", async () => {
        mockAxiosClient.post
            // First call: /request-link returns 200 and valid options
            .mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify(requestLinkResponseData),
        })
            // Second call: /link returns non-200
            .mockResolvedValueOnce({
            status: 400,
            data: "Error from link",
        });
        const result = await link(mockAxiosClient);
        expect(result.success).toBe(false);
        expect(result.error.error).toBe("Error from link");
    });
    it("should return success if linking succeeds", async () => {
        const registerResponse = { verified: true };
        mockAxiosClient.post
            // First call: /request-link returns valid options
            .mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify(requestLinkResponseData),
        })
            // Second call: /link returns 200 and register response
            .mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify(registerResponse),
        });
        const result = await link(mockAxiosClient);
        expect(result.success).toBe(true);
        expect(result.result.verified).toBe(true);
    });
});
//# sourceMappingURL=link.test.js.map