import { Request, Response } from "express";
import { PrismaClient } from "#prisma";
// Sauberer ESM-Import (Passe den Pfad an, falls link.ts woanders liegt)
import { link } from "#api/webauthn/link";
import { vi, describe, beforeEach, it, expect } from "vitest";

// --- 1. HOISTING DER MOCK VARIABLEN ---
const { mockPrisma, mockVerifyAuth } = vi.hoisted(() => {
    return {
        mockPrisma: {
            user: {
                findUnique: vi.fn(),
            },
            device: {
                upsert: vi.fn(),
            },
        },
        mockVerifyAuth: vi.fn(),
    };
});

// --- 2. REGISTRIERUNG DER MOCKS ---
// Nutzt jetzt deinen #prisma Alias anstelle des relativen Pfades
vi.mock("#prisma", () => ({
    PrismaClient: vi.fn().mockImplementation(() => mockPrisma),
}));

// Externes Modul sauber mocken
vi.mock("@simplewebauthn/server", () => ({
    __esModule: true,
    verifyRegistrationResponse: mockVerifyAuth,
}));

const prisma = (mockPrisma as unknown) as PrismaClient;

// --- 3. TEST SUITE ---
describe("link", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        req = {
            body: {},
        };
        res = {
            locals: {},
            status: vi.fn().mockReturnThis(),
            send: vi.fn(),
        };
        vi.clearAllMocks(); // Wichtig: vi statt jest
    });

    it("should return error if linkChallengeResponse is not present", async () => {
        await link(req as Request, res as Response, prisma);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith("Link Challenge Response not present");
    });

    it("should return error if payload is not present", async () => {
        req.body.linkChallengeResponse = { challenge: "testChallenge", credentials: {} };
        
        await link(req as Request, res as Response, prisma);
        
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith("Payload not present");
    });

    it("should return error if prisma.user.findUnique rejects", async () => {
        res.locals = res.locals || {};
        req.body.linkChallengeResponse = { challenge: "testChallenge", credentials: {} };
        res.locals.payload = { aud: "https://example.com", userMail: "test@example.com" };
        
        mockPrisma.user.findUnique.mockRejectedValue(new Error("DB error"));
        
        await link(req as Request, res as Response, prisma);
        
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith("Could not find user for given challenge");
    });

    it("should return error if user is not found", async () => {
        res.locals = res.locals || {};
        req.body.linkChallengeResponse = { challenge: "testChallenge", credentials: {} };
        res.locals.payload = { aud: "https://example.com", userMail: "test@example.com" };
        
        mockPrisma.user.findUnique.mockResolvedValue(null);
        
        await link(req as Request, res as Response, prisma);
        
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith("Could not find user for given challenge");
    });

    it("should return error if verifyRegistrationResponse fails", async () => {
        res.locals = res.locals || {};
        req.body.linkChallengeResponse = { challenge: "testChallenge", credentials: { response: { transports: ["usb"] } } };
        res.locals.payload = { aud: "https://example.com", userMail: "test@example.com" };
        const fakeUser = {
            uid: "user123",
            challenge: "testChallenge",
            devices: [],
        };
        
        mockPrisma.user.findUnique.mockResolvedValue(fakeUser);
        mockVerifyAuth.mockRejectedValue(new Error("Verification failed"));

        await link(req as Request, res as Response, prisma);
        
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith("Registration Response could not be verified");
    });

    it("should return error if verified is false", async () => {
        res.locals = res.locals || {};
        req.body.linkChallengeResponse = { challenge: "testChallenge", credentials: { response: { transports: ["usb"] } } };
        res.locals.payload = { aud: "https://example.com", userMail: "test@example.com" };
        const fakeUser = {
            uid: "user123",
            challenge: "testChallenge",
            devices: [],
        };
        
        mockPrisma.user.findUnique.mockResolvedValue(fakeUser);
        mockVerifyAuth.mockResolvedValue({ verified: false });
        
        await link(req as Request, res as Response, prisma);
        
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith("Could not verifiy reponse");
    });

    it("should return error if registrationInfo is null", async () => {
        res.locals = res.locals || {};
        req.body.linkChallengeResponse = { challenge: "testChallenge", credentials: { response: { transports: ["usb"] } } };
        res.locals.payload = { aud: "https://example.com", userMail: "test@example.com" };
        const fakeUser = {
            uid: "user123",
            challenge: "testChallenge",
            devices: [],
        };
        
        mockPrisma.user.findUnique.mockResolvedValue(fakeUser);
        mockVerifyAuth.mockResolvedValue({ verified: true, registrationInfo: null });
        
        await link(req as Request, res as Response, prisma);
        
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith("Registration Info not present");
    });

    it("should return error if prisma.device.upsert fails", async () => {
        res.locals = res.locals || {};
        req.body.linkChallengeResponse = {
            challenge: "testChallenge",
            credentials: { response: { transports: ["usb"] } },
        };
        res.locals.payload = { aud: "https://example.com", userMail: "test@example.com" };
        const fakeUser = {
            uid: "user123",
            challenge: "testChallenge",
            devices: [],
        };
        const fakeRegistrationInfo = {
            credential: {
                id: "cred123",
                publicKey: new Uint8Array([1, 2, 3]),
                counter: 5,
            },
        };
        
        mockPrisma.user.findUnique.mockResolvedValue(fakeUser);
        mockVerifyAuth.mockResolvedValue({
            verified: true,
            registrationInfo: fakeRegistrationInfo,
        });
        mockPrisma.device.upsert.mockRejectedValue(new Error("Upsert error"));

        await link(req as Request, res as Response, prisma);
        
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith("Device Regitration update or create failed");
    });

    it("should return 200 and verified = true on success", async () => {
        res.locals = res.locals || {};
        req.body.linkChallengeResponse = {
            challenge: "testChallenge",
            credentials: { response: { transports: ["usb"] } },
        };
        res.locals.payload = { aud: "https://example.com", userMail: "test@example.com" };
        const fakeUser = {
            uid: "user123",
            challenge: "testChallenge",
            devices: [],
        };
        const fakeRegistrationInfo = {
            credential: {
                id: "cred123",
                publicKey: new Uint8Array([1, 2, 3]),
                counter: 5,
            },
        };
        
        mockPrisma.user.findUnique.mockResolvedValue(fakeUser);
        mockVerifyAuth.mockResolvedValue({
            verified: true,
            registrationInfo: fakeRegistrationInfo,
        });
        mockPrisma.device.upsert.mockResolvedValue({}); // simulate successful upsert

        await link(req as Request, res as Response, prisma);
        
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(JSON.stringify({ verified: true }));
    });
});