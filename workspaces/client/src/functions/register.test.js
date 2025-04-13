//// typescript
// filepath: /home/lukas/Source/wembat/src/functions/register.test.ts
import { describe, it, beforeEach, vi, expect } from "vitest";
import { register } from "./register";
import { browserSupportsWebAuthn, startRegistration, } from "@simplewebauthn/browser";
// Browser-Funktionalitäten mocken
vi.mock("@simplewebauthn/browser", () => ({
    browserSupportsWebAuthn: vi.fn(),
    startRegistration: vi.fn(),
}));
describe("register", () => {
    let mockAxios;
    beforeEach(() => {
        vi.clearAllMocks();
        browserSupportsWebAuthn.mockReturnValue(true);
        mockAxios = {
            post: vi.fn(),
        };
    });
    it("sollte Fehler werfen, wenn WebAuthn nicht unterstützt wird", async () => {
        browserSupportsWebAuthn.mockReturnValue(false);
        const result = await register(mockAxios, "test@user.com");
        expect(result.success).toBe(false);
        expect(result.error.error).toBe("WebAuthn is not supported on this browser!");
    });
    it("sollte Fehler werfen, wenn /request-register nicht Status 200 liefert", async () => {
        mockAxios.post.mockResolvedValueOnce({
            status: 400,
            data: "Bad request",
        });
        const result = await register(mockAxios, "test@user.com");
        expect(result.success).toBe(false);
        expect(result.error.error).toBe("Bad request");
    });
    it("sollte Fehler werfen, wenn startRegistration fehlschlägt", async () => {
        mockAxios.post.mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify({
                options: {
                    challenge: "testChallenge",
                },
            }),
        });
        startRegistration.mockRejectedValue(new Error("Registration failed"));
        const result = await register(mockAxios, "test@user.com");
        expect(result.success).toBe(false);
        expect(result.error.error).toBe("Error: Registration failed");
    });
    it("sollte Fehler werfen, wenn /register nicht Status 200 liefert", async () => {
        mockAxios.post
            // /request-register
            .mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify({
                options: { challenge: "testChallenge" },
            }),
        })
            // /register
            .mockResolvedValueOnce({
            status: 400,
            data: "Register endpoint error",
        });
        startRegistration.mockResolvedValue({
            clientExtensionResults: {},
            id: "credentialId",
            rawId: "rawId",
            response: {},
            type: "public-key",
        });
        const result = await register(mockAxios, "test@user.com");
        expect(result.success).toBe(false);
        expect(result.error.error).toBe("Register endpoint error");
    });
    it("sollte success=true zurückgeben, wenn alles korrekt verläuft", async () => {
        mockAxios.post
            // /request-register
            .mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify({
                options: { challenge: "testChallenge" },
            }),
        })
            // /register
            .mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify({
                verified: true,
            }),
        });
        startRegistration.mockResolvedValue({
            clientExtensionResults: {},
            id: "credentialId",
            rawId: "rawId",
            response: {},
            type: "public-key",
        });
        const result = await register(mockAxios, "test@user.com");
        expect(result.success).toBe(true);
        expect(result.result.verified).toBe(true);
    });
});
//# sourceMappingURL=register.test.js.map