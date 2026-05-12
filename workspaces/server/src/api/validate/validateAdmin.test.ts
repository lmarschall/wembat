import { Request, Response } from "express";
import { cryptoService, initCryptoTest } from "#crypto";
import { initConfig } from "#config";
import { validateAdminToken } from "#api/validate/validateAdmin";
import { generateKeyPair } from "jose";
import { vi, describe, beforeEach, it, expect, type Mock } from "vitest";

describe("validateAdminToken", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: Mock; // Nutzt den Typ von Vitest statt jest.Mock

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
        await validateAdminToken(req as Request, res as Response, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith("Unauthorized");
    });

    it("should return 401 if Authorization header is invalid", async () => {
        req.headers = req.headers || {};
        req.headers.authorization = "Invalid header";
        await validateAdminToken(req as Request, res as Response, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith("Unauthorized");
    });

    // Falls du diesen Test später aktivieren und "jose" mocken willst,
    // schau dir den Vitest-Bonus-Tipp unten an!
    // it("should return 401 if algorithm is invalid", async () => { ... });

    it("should return 401 if public key is invalid", async () => {
        const jwt = await cryptoService.createJWT(
            { admin: true },
            "ES256",
            "",
            ""
        );
        req.headers = req.headers || {};
        req.headers.authorization = "Bearer " + jwt;
        
        // Simuliert einen manipulierten/falschen Key
        let newKeyPair = await generateKeyPair("ES256");
        cryptoService.setPublicKey(newKeyPair.publicKey);
        
        await validateAdminToken(req as Request, res as Response, next);
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.send).toHaveBeenCalledWith("Unauthorized");
    });

    it("should call next if token is valid", async () => {
        const jwt = await cryptoService.createJWT(
            { admin: true },
            "ES256",
            "",
            ""
        );
        req.headers = req.headers || {};
        res.locals = res.locals || {};
        req.headers.authorization = "Bearer " + jwt;
        
        await validateAdminToken(req as Request, res as Response, next);
        
        expect(res.locals.payload.admin).toBe(true);
        expect(next).toHaveBeenCalled();
    });
});