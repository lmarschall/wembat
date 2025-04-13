//// typescript
// filepath: /home/lukas/Source/wembat/src/functions/login.test.ts
import { describe, it, beforeEach, vi, expect } from "vitest";
import { login } from "./login";
import { browserSupportsWebAuthn, browserSupportsWebAuthnAutofill, startAuthentication, } from "@simplewebauthn/browser";
// Axios-Mock (vereinfacht)
const mockAxiosClient = {
    post: vi.fn(),
};
// browserSupportsWebAuthn, browserSupportsWebAuthnAutofill und startAuthentication mocken
vi.mock("@simplewebauthn/browser", () => ({
    browserSupportsWebAuthn: vi.fn(),
    browserSupportsWebAuthnAutofill: vi.fn(),
    startAuthentication: vi.fn(),
}));
describe("login", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        browserSupportsWebAuthn.mockReturnValue(true);
        browserSupportsWebAuthnAutofill.mockResolvedValue(true);
    });
    it("wirft Fehler, wenn WebAuthn nicht unterstützt wird", async () => {
        browserSupportsWebAuthn.mockReturnValue(false);
        const result = await login(mockAxiosClient, "test@user.com");
        expect(result.success).toBe(false);
        expect(result.error.error).toBe("WebAuthn is not supported on this browser!");
    });
    it("wirft Fehler, wenn /request-login nicht Status 200 zurückgibt", async () => {
        mockAxiosClient.post.mockResolvedValueOnce({
            status: 400,
            data: "Bad request",
        });
        const result = await login(mockAxiosClient, "test@user.com");
        expect(result.success).toBe(false);
        expect(result.error.error).toBe("Bad request");
    });
    it("wirft Fehler, wenn Login nicht verifiziert ist", async () => {
        // /request-login
        mockAxiosClient.post.mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify({
                options: {
                    challenge: "testChallenge",
                    extensions: { prf: { eval: { first: new ArrayBuffer(2) } } },
                },
            }),
        });
        // startAuthentication
        startAuthentication.mockResolvedValue({
            clientExtensionResults: { prf: { results: { first: [1, 2] } } },
        });
        // /login
        mockAxiosClient.post.mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify({ verified: false }),
        });
        const result = await login(mockAxiosClient, "test@user.com");
        expect(result.success).toBe(false);
        expect(result.error.error).toBe("Login not verified");
    });
    it("kehrt mit success=true zurück, wenn alles korrekt ist", async () => {
        // /request-login
        mockAxiosClient.post.mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify({
                options: {
                    challenge: "testChallenge",
                    extensions: { prf: { eval: { first: new ArrayBuffer(2) } } },
                },
            }),
        });
        // startAuthentication
        startAuthentication.mockResolvedValue({
            clientExtensionResults: { prf: { results: { first: [1, 2] } } },
        });
        // /login
        mockAxiosClient.post.mockResolvedValueOnce({
            status: 200,
            data: JSON.stringify({
                verified: true,
                token: "testToken",
                publicUserKey: "",
                privateUserKeyEncrypted: "",
            }),
        });
        // /update-credentials
        mockAxiosClient.post.mockResolvedValueOnce({
            status: 200,
            data: "Updated",
        });
        const [actionResponse, privateKey, publicKey, token, refreshToken] = await login(mockAxiosClient, "test@user.com");
        expect(actionResponse.success).toBe(true);
        expect(token).toBe("testToken");
    });
});
//# sourceMappingURL=login.test.js.map