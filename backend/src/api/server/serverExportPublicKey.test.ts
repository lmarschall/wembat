//// typescript
// filepath: /home/lukas/Source/wembat/backend/src/api/server/serverExportPublicKey.test.ts

import { Request, Response } from "express";
import { serverExportPublicKey } from "./serverExportPublicKey";
import { cryptoService } from "../../crypto";

jest.mock("../../crypto", () => ({
  cryptoService: {
    exportPublicKey: jest.fn(),
  },
}));

describe("testServerExportPublicKey", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 500 if cryptoService is not initialized", async () => {
    // Mock cryptoService als undefined
    (require("../../crypto").cryptoService as any) = undefined;

    await serverExportPublicKey(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("CryptoService not initialized");

    // Wiederherstellen
    (require("../../crypto").cryptoService as any) = { exportPublicKey: jest.fn() };
  });

  it("should return 500 when exportPublicKey fails", async () => {
    (cryptoService.exportPublicKey as jest.Mock).mockRejectedValue(new Error("Export error"));

    await serverExportPublicKey(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Export error");
  });

  it("should return 200 and the public key if successful", async () => {
    (cryptoService.exportPublicKey as jest.Mock).mockResolvedValue("mockedPublicKey");

    await serverExportPublicKey(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith("mockedPublicKey");
  });
});