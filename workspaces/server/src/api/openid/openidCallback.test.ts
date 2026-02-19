import { Request, Response } from "express";

// --- 1. AUTH STORE MOCK ---
const mockAuthStoreFail = jest.fn();
const mockAuthStoreSuccess = jest.fn();

// Ensure this matches the exact import path in your openidCallback.ts file
jest.mock("../auth-store", () => ({
    authStore: {
        fail: mockAuthStoreFail,
        success: mockAuthStoreSuccess,
    },
}));

// --- 2. DYNAMIC IMPORT OF CONTROLLER ---
// Load openidCallback AFTER the mocks are registered
const { openidCallback } = require("./openidCallback");

describe("testOpenidCallback", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let mockOpenidClient: any;
    const redirectUri = "https://example.com/callback";

    beforeEach(() => {
        req = {
            query: {},
            session: {} as any, 
        };
        res = {
            setHeader: jest.fn(),
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };

        // Create a fresh mock client for every test
        mockOpenidClient = {
            callbackParams: jest.fn().mockReturnValue({ code: "mock-auth-code" }),
            oauthCallback: jest.fn(),
            userinfo: jest.fn(),
        };

        jest.clearAllMocks();
    });

    // Helper function to generate valid base64 state strings for testing
    const generateValidState = (requestId: string, nonce: string) => {
        return Buffer.from(JSON.stringify({ requestId, nonce })).toString('base64');
    };

    it("should return 400 if openidClient is undefined", async () => {
        await openidCallback(req as Request, res as Response, undefined, redirectUri);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith("openid client undefined");
    });

    it("should return 400 if state decoding fails (invalid JSON/base64)", async () => {
        req.query = { state: "invalid-base-64-string!@#" };

        await openidCallback(req as Request, res as Response, mockOpenidClient, redirectUri);

        expect(res.status).toHaveBeenCalledWith(400);
        
        // JSON.parse error messages vary by Node version, but they always mention "JSON"
        expect(res.send).toHaveBeenCalledWith(expect.stringContaining("JSON")); 
    });

    it("should fail authStore and return 400 if nonce does not match session (Anti-CSRF)", async () => {
        const fakeState = generateValidState("req-123", "nonce-from-url");
        req.query = { state: fakeState };
        
        // Simulate a mismatch in the session (e.g., an attacker trying to replay a state)
        req.session!.githubState = "different-nonce-in-session";

        await openidCallback(req as Request, res as Response, mockOpenidClient, redirectUri);

        expect(mockAuthStoreFail).toHaveBeenCalledWith("req-123", "Security Error: State mismatch");
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith("Security Check Failed");
    });

    it("should return 400 if oauthCallback does not return an access_token", async () => {
        const validState = generateValidState("req-123", "valid-nonce");
        req.query = { state: validState };
        req.session!.githubState = "valid-nonce";

        // Simulate a failed token exchange (no access_token returned)
        mockOpenidClient.oauthCallback.mockResolvedValue({ id_token: "only-id-token" });

        await openidCallback(req as Request, res as Response, mockOpenidClient, redirectUri);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith("No access token received");
    });

    it("should successfully process callback, update authStore, and send HTML success", async () => {
        const validState = generateValidState("req-123", "valid-nonce");
        req.query = { state: validState };
        req.session!.githubState = "valid-nonce";

        const mockTokenSet = { access_token: "mock-access-token" };
        const mockUserProfile = { sub: "github-user-id", email: "test@github.com" };

        mockOpenidClient.oauthCallback.mockResolvedValue(mockTokenSet);
        mockOpenidClient.userinfo.mockResolvedValue(mockUserProfile);

        await openidCallback(req as Request, res as Response, mockOpenidClient, redirectUri);

        // 1. Verify correct params were passed to the client
        expect(mockOpenidClient.callbackParams).toHaveBeenCalledWith(req);
        expect(mockOpenidClient.oauthCallback).toHaveBeenCalledWith(
            redirectUri, 
            { code: "mock-auth-code" }, 
            { state: validState }
        );
        expect(mockOpenidClient.userinfo).toHaveBeenCalledWith("mock-access-token");

        // 2. Verify success was written to store
        expect(mockAuthStoreSuccess).toHaveBeenCalledWith(
            "req-123", 
            mockUserProfile, 
            "YOUR_GENERATED_JWT" // Matches the hardcoded string in your controller
        );

        // 3. Verify headers and HTML response
        expect(res.setHeader).toHaveBeenCalledWith('Cross-Origin-Opener-Policy', 'unsafe-none');
        expect(res.send).toHaveBeenCalledWith(expect.stringContaining("Authentication Successful"));
    });
});