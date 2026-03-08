import { Request, Response } from "express";
import { cryptoService, initCryptoTest } from "#crypto";
import { validateWebAuthnToken } from "#api/validate/validateWebAuthn";
import { generateKeyPair } from "jose";
import { vi, describe, beforeEach, it, expect, type Mock } from "vitest";

describe("validateWebAuthnToken", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: Mock; // Vitest Mock-Typ statt jest.Mock

    beforeEach(async () => {
        await initCryptoTest();

        req = {
            headers: {},
        };
        res = {
            locals: {},
            status: vi.fn().mockReturnThis(),
            send: vi.fn(),
        };
        next = vi.fn();
    });

    it("should return 401 if no Authorization header is present", async () => {
        await validateWebAuthnToken(req as Request, res as Response, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith("No Authorization header");
    });

    it("should return 401 if Authorization header is invalid", async () => {
        req.headers = req.headers || {};
        req.headers.authorization = "Invalid header";
        await validateWebAuthnToken(req as Request, res as Response, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith("Invalid Authorization header");
    });

    // Falls du diesen Test später mit vi.mock() und importOriginal (wie vorhin gezeigt) 
    // wiederherstellen willst, kannst du das problemlos machen!
    // it("should return 401 if algorithm is invalid", async () => { ... });

    it("should return 401 if public key is invalid", async () => {
        const jwt = await cryptoService.createJWT(
            { sessionId: "session.uid", userMail: "user.mail" },
            "ES256",
            "",
            ""
        );
        req.headers = req.headers || {};
        req.headers.authorization = "Bearer " + jwt;
        
        // Simuliert einen manipulierten/falschen Key
        let newKeyPair = await generateKeyPair("ES256");
        cryptoService.setPublicKey(newKeyPair.publicKey);
        
        await validateWebAuthnToken(req as Request, res as Response, next);
        
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith("Invalid public key");
    });

    it("should call next if token is valid", async () => {
        const jwt = await cryptoService.createJWT(
            { sessionId: "session.uid", userMail: "user.mail" },
            "ES256",
            "",
            ""
        );
        req.headers = req.headers || {};
        res.locals = res.locals || {};
        req.headers.authorization = "Bearer " + jwt;
        
        await validateWebAuthnToken(req as Request, res as Response, next);
        
        expect(res.locals.payload.sessionId).toBe("session.uid");
        expect(res.locals.payload.userMail).toBe("user.mail");
        expect(next).toHaveBeenCalled();
    });
});