import { Request, Response } from "express";
import { cryptoService, initCryptoTest } from "../../crypto";
import { serverExportPublicKey } from "./serverExportPublicKey";

describe("validateServerExportPublicKey", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(async () => {

        req = {
            headers: {},
        };
        res = {
            locals: {},
            status: jest.fn().mockReturnThis(),
            send: jest.fn()
        };
    });

    it("should return 500 if export of public server key fails", async () => {
        await serverExportPublicKey(req as Request, res as Response);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith("Internal Server Error");
    });

    it("should return public server key if valid", async () => {
        await initCryptoTest();
        const pubKey = await cryptoService.exportPublicKey();
        await serverExportPublicKey(req as Request, res as Response);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(JSON.stringify(pubKey));
    });
});