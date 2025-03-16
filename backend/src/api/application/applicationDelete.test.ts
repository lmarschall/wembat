//// typescript
// filepath: /home/lukas/Source/wembat/backend/src/api/application/applicationDelete.test.ts

import { Request, Response } from "express";
import { applicationDelete } from "./applicationDelete";
import { PrismaClient } from "@prisma/client";
import { redisService } from "../../redis";

// Prisma mocken
jest.mock("@prisma/client", () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      application: {
        delete: jest.fn(),
      },
    })),
  };
});

jest.mock("../../redis", () => ({
  redisService: {
    removeFromDomainWhitelist: jest.fn(),
  }
}));

const prisma = new PrismaClient();

describe("testApplicationDelete", () => {
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
    await applicationDelete(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Application Info not present");
  });

  it("should return 500 if there is an error while deleting the application", async () => {
    req.body = {
      applicationInfo: {
        appUId: "test-app-id",
        appName: "Test App",
        appDomain: "test.com",
      },
    };

    // Prisma so mocken, dass ein Fehler geworfen wird
    (prisma.application.delete as jest.Mock).mockRejectedValue(
      new Error("Error while deleting application")
    );

    await applicationDelete(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Error while deleting application");
  });

  it("should delete an application and return 200 if valid data is provided", async () => {
    req.body = {
      applicationInfo: {
        appUId: "test-app-id",
        appName: "Test App",
        appDomain: "test.com",
      },
    };

    // Domain vorher zum Whitelist-Array hinzufügen
    // redisService.addToDomainWhitelist("https://test.com");

    const mockApplication = {
      uid: "test-app-id",
      name: "Test App",
      domain: "test.com",
    };

    // Mock für erfolgreichen Löschvorgang
    (prisma.application.delete as jest.Mock).mockResolvedValue(mockApplication);

    (redisService.removeFromDomainWhitelist as jest.Mock).mockResolvedValue({});

    await applicationDelete(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalled();
    // Prüfen, ob die Domain aus der Whitelist entfernt wurde
    // expect(domainWhitelist).not.toContain("https://test.com");
  });
});