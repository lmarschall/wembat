//// typescript
// filepath: /home/lukas/Source/wembat/backend/src/api/application/applicationUpdate.test.ts

import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { applicationUpdate } from "./applicationUpdate";
import { redisService } from "../../redis";

// Prisma-Client mocken
jest.mock("@prisma/client", () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      application: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    })),
  };
});

jest.mock("../../redis", () => ({
  redisService: {
    addToDomainWhitelist: jest.fn(),
    removeFromDomainWhitelist: jest.fn(),
  }
}));

const prisma = new PrismaClient();

describe("testApplicationUpdate", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 500 if applicationInfo is not present", async () => {
    // Keine applicationInfo im Request-Body
    await applicationUpdate(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Application Info not present");
  });

  it("should return 500 if findUnique fails", async () => {
    req.body = {
      applicationInfo: {
        appUId: "test-app-id",
        appName: "Test App",
        appDomain: "test.com",
      },
    };

    // Simuliere einen Datenbankfehler bei findUnique
    (prisma.application.findUnique as jest.Mock).mockRejectedValue(
      new Error("Database error")
    );

    await applicationUpdate(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Error while updating application");
  });

  it("should return 500 if update fails", async () => {
    req.body = {
      applicationInfo: {
        appUId: "test-app-id",
        appName: "Test App",
        appDomain: "test.com",
      },
    };

    // findUnique soll erfolgreich sein
    (prisma.application.findUnique as jest.Mock).mockResolvedValue({
      uid: "test-app-id",
      name: "Old Name",
      domain: "old-domain.com",
    });

    // update soll fehlschlagen
    (prisma.application.update as jest.Mock).mockRejectedValue(
      new Error("Error while updating application")
    );

    await applicationUpdate(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Error while updating application");
  });

  it("should update an application and return 200 if valid data is provided", async () => {
    req.body = {
      applicationInfo: {
        appUId: "test-app-id",
        appName: "Updated Name",
        appDomain: "updated-domain.com",
      },
    };

    // findUnique gibt ein bestehendes Objekt zurück
    (prisma.application.findUnique as jest.Mock).mockResolvedValue({
      uid: "test-app-id",
      name: "Old Name",
      domain: "old-domain.com",
    });

    // update liefert das aktualisierte Objekt zurück
    (prisma.application.update as jest.Mock).mockResolvedValue({
      uid: "test-app-id",
      name: "Updated Name",
      domain: "updated-domain.com",
    });

    (redisService.addToDomainWhitelist as jest.Mock).mockResolvedValue({});
    (redisService.removeFromDomainWhitelist as jest.Mock).mockResolvedValue({});

    await applicationUpdate(req as Request, res as Response, prisma);

    expect(prisma.application.findUnique).toHaveBeenCalled();
    expect(prisma.application.update).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalled();
  });
});