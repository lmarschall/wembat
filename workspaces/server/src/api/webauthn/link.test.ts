//// typescript
// filepath: /home/lukas/Source/wembat/backend/src/api/webauthn/link.test.ts

import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { link } from "./link";
import { verifyRegistrationResponse, VerifyRegistrationResponseOpts } from "@simplewebauthn/server";

// Mock PrismaClient
jest.mock("@prisma/client", () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({
        user: {
            findUnique: jest.fn(),
        },
        device: {
            upsert: jest.fn(),
        },
    })),
}));

// Mock verifyRegistrationResponse from simplewebauthn/server
jest.mock("@simplewebauthn/server", () => ({
    verifyRegistrationResponse: jest.fn(),
}));

const prisma = new PrismaClient();

describe("link", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        req = {
            body: {},
        };
        res = {
            locals: {},
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        jest.clearAllMocks();
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
        (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error("DB error"));
        
        await link(req as Request, res as Response, prisma);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith("Could not find user for given challenge");
    });

    it("should return error if user is not found", async () => {
        res.locals = res.locals || {};
        req.body.linkChallengeResponse = { challenge: "testChallenge", credentials: {} };
        res.locals.payload = { aud: "https://example.com", userMail: "test@example.com" };
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        
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
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(fakeUser);
        (verifyRegistrationResponse as jest.Mock).mockRejectedValue(new Error("Verification failed"));

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
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(fakeUser);
        (verifyRegistrationResponse as jest.Mock).mockResolvedValue({ verified: false });
        
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
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(fakeUser);
        (verifyRegistrationResponse as jest.Mock).mockResolvedValue({ verified: true, registrationInfo: null });
        
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
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(fakeUser);
        (verifyRegistrationResponse as jest.Mock).mockResolvedValue({
            verified: true,
            registrationInfo: fakeRegistrationInfo,
        });
        (prisma.device.upsert as jest.Mock).mockRejectedValue(new Error("Upsert error"));

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
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(fakeUser);
        (verifyRegistrationResponse as jest.Mock).mockResolvedValue({
            verified: true,
            registrationInfo: fakeRegistrationInfo,
        });
        (prisma.device.upsert as jest.Mock).mockResolvedValue({}); // simulate successful upsert

        await link(req as Request, res as Response, prisma);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(JSON.stringify({ verified: true }));
    });
});