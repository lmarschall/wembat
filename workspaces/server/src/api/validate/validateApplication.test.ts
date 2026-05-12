import { Request, Response } from "express";
import { cryptoService, initCryptoTest } from "#crypto";
import { initConfig } from "#config";
import { validateApplicationToken } from "#api/validate/validateApplication";
import { generateKeyPair } from "jose";
import { vi, describe, beforeEach, it, expect, type Mock } from "vitest";

describe("validateApplicationToken", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: Mock; // Vitest Mock-Typ statt jest.Mock

    beforeEach(async () => {
        await initConfig();
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
        await validateApplicationToken(req as Request, res as Response, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith("Unauthorized");
    });

    it("should return 401 if Authorization header is invalid", async () => {
        req.headers = req.headers || {};
        req.headers["wembat-app-token"] = "Invalid header";
        await validateApplicationToken(req as Request, res as Response, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith("Unauthorized");
    });

    // Falls du den Test für den ungültigen Algorithmus später mit dem 
    // Vitest-importOriginal-Trick (aus meiner letzten Nachricht) einbauen willst:
    // it("should return 401 if algorithm is invalid", async () => { ... });

    it("should return 401 if public key is invalid", async () => {
        const jwt = await cryptoService.createJWT(
            { appUId: "application.uid" },
            "ES256",
            "",
            ""
        );
        req.headers = req.headers || {};
        req.headers["wembat-app-token"] = "Bearer " + jwt;
        
        let newKeyPair = await generateKeyPair("ES256");
        cryptoService.setPublicKey(newKeyPair.publicKey);
        
        await validateApplicationToken(req as Request, res as Response, next);
        
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith("Unauthorized");
    });

    it("should call next if token is valid", async () => {
        const jwt = await cryptoService.createJWT(
            { appUId: "application.uid" },
            "ES256",
            "",
            ""
        );
        req.headers = req.headers || {};
        res.locals = res.locals || {};
        req.headers["wembat-app-token"] = "Bearer " + jwt;
        
        await validateApplicationToken(req as Request, res as Response, next);
        
        expect(res.locals.payload.appUId).toBe("application.uid");
        expect(next).toHaveBeenCalled();
    });
});