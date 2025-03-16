//// typescript
// filepath: /home/lukas/Source/wembat/backend/src/api/application/applicationToken.test.ts

import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { applicationToken } from "./applicationToken";
import { cryptoService } from "../../crypto";

// Prisma-Client und cryptoService mocken
jest.mock("@prisma/client", () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      application: {
        findUnique: jest.fn(),
      },
    })),
  };
});

jest.mock("../../crypto", () => ({
  cryptoService: {
    createApplicationJWT: jest.fn(),
  },
}));

const prisma = new PrismaClient();

describe("testApplicationToken", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 500 if applicationInfo is not present", async () => {
    // Hier setzen wir req.body absichtlich nicht
    await applicationToken(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Application Info not present");
  });

  it("should return 500 if application not found", async () => {
    req.body = { applicationInfo: { appUId: "test-app-id" } };

    // Mock findUnique, damit es keinen Eintrag zurückgibt
    (prisma.application.findUnique as jest.Mock).mockResolvedValue(undefined);

    await applicationToken(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Application not found");
  });

  it("should return 500 if database error occurs", async () => {
    req.body = { applicationInfo: { appUId: "test-app-id" } };

    // Mock findUnique, damit es einen DB-Fehler wirft
    (prisma.application.findUnique as jest.Mock).mockRejectedValue(
      new Error("Database error")
    );

    await applicationToken(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Database error");
  });

  it("should return 500 if JWT creation fails", async () => {
    req.body = { applicationInfo: { appUId: "test-app-id" } };

    // Mock findUnique, damit es einen gültigen Anwendungsdatensatz zurückgibt
    (prisma.application.findUnique as jest.Mock).mockResolvedValue({
      uid: "test-app-id",
      name: "Test App",
      domain: "test.com",
    });

    // Mock createApplicationJWT mit einem Fehler
    (cryptoService.createApplicationJWT as jest.Mock).mockRejectedValue(
      new Error("JWT creation failed")
    );

    await applicationToken(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("JWT creation failed");
  });

  it("should return token if valid data is provided", async () => {
    req.body = { applicationInfo: { appUId: "test-app-id" } };

    const mockApp = {
      uid: "test-app-id",
      name: "Test App",
      domain: "test.com",
    };

    const mockToken = "mock-jwt-token";

    // Mock findUnique, damit es einen gültigen Anwendungsdatensatz zurückgibt
    (prisma.application.findUnique as jest.Mock).mockResolvedValue(mockApp);

    // Mock createApplicationJWT, damit es einen gültigen Token zurückgibt
    (cryptoService.createApplicationJWT as jest.Mock).mockResolvedValue(mockToken);

    await applicationToken(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockToken);
  });
});