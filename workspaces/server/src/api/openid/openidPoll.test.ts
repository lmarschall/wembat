import { Request, Response } from "express";
// Sauberer ESM-Import dank Vitest-Hoisting (Passe den Pfad an, falls er abweicht)
import { openidPoll } from "#api/openid/openidPoll";
import { vi, describe, beforeEach, it, expect } from "vitest";

// --- 1. HOISTING DER MOCK VARIABLEN ---
const { mockAuthStoreGet, mockAuthStoreDelete } = vi.hoisted(() => {
    return {
        mockAuthStoreGet: vi.fn(),
        mockAuthStoreDelete: vi.fn(),
    };
});

// --- 2. REGISTRIERUNG DER MOCKS ---
// Nutzt jetzt sauber deinen #api/auth-store Alias
vi.mock("#api/auth-store", () => ({
    authStore: {
        get: mockAuthStoreGet,
        delete: mockAuthStoreDelete,
    },
}));

// --- 3. TEST SUITE ---
describe("testOpenidPoll", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        req = {
            query: {},
        };
        res = {
            status: vi.fn().mockReturnThis(),
            send: vi.fn(),
            json: vi.fn(),
        };
        vi.clearAllMocks(); // Wichtig: vi statt jest
    });

    it("should return 400 if requestId is missing", async () => {
        await openidPoll(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith("Missing requestId");
    });

    it("should return 400 if session is not found in authStore", async () => {
        req.query = { requestId: "test-request-id" };
        mockAuthStoreGet.mockReturnValue(undefined);

        await openidPoll(req as Request, res as Response);

        expect(mockAuthStoreGet).toHaveBeenCalledWith("test-request-id");
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith("Session not found or expired");
    });

    it("should return pending JSON if state status is pending", async () => {
        req.query = { requestId: "test-request-id" };
        mockAuthStoreGet.mockReturnValue({ status: "pending" });

        await openidPoll(req as Request, res as Response);

        expect(res.json).toHaveBeenCalledWith({ status: "pending" });
        expect(mockAuthStoreDelete).not.toHaveBeenCalled(); // Ensure it isn't deleted early
    });

    it("should return success JSON and delete from store if state status is success", async () => {
        req.query = { requestId: "test-request-id" };
        const mockState = {
            status: "success",
            user: { uid: "user123" },
            token: "mock-jwt-token",
        };
        mockAuthStoreGet.mockReturnValue(mockState);

        await openidPoll(req as Request, res as Response);

        // Verify Replay Protection triggered
        expect(mockAuthStoreDelete).toHaveBeenCalledWith("test-request-id");
        
        expect(res.json).toHaveBeenCalledWith({
            status: "success",
            user: mockState.user,
            token: mockState.token,
        });
    });

    it("should return error JSON and delete from store if state status is error", async () => {
        req.query = { requestId: "test-request-id" };
        const mockState = {
            status: "error",
            error: "Authentication failed by provider",
        };
        mockAuthStoreGet.mockReturnValue(mockState);

        await openidPoll(req as Request, res as Response);

        // Verify failed sessions are also cleaned up
        expect(mockAuthStoreDelete).toHaveBeenCalledWith("test-request-id");
        
        expect(res.json).toHaveBeenCalledWith({
            status: "error",
            message: "Authentication failed by provider",
        });
    });
});