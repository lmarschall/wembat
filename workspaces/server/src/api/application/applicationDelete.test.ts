import { Request, Response } from "express";
import { PrismaClient } from "#prisma";
import { applicationDelete } from "#api/application/applicationDelete";
import { vi, describe, beforeEach, it, expect } from "vitest";

const { mockPrisma, mockRemoveFromDomainWhitelist } = vi.hoisted(() => {
  return {
    mockPrisma: {
      application: {
        delete: vi.fn(),
      },
    },
    mockRemoveFromDomainWhitelist: vi.fn(),
  };
});

// 2. Jetzt laufen deine Mocks fehlerfrei, da die Variablen schon existieren
vi.mock("#prisma", () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma),
}));

vi.mock("#redis", () => ({
  redisService: {
    removeFromDomainWhitelist: mockRemoveFromDomainWhitelist,
  }
}));

const prisma = (mockPrisma as unknown) as PrismaClient;

describe("testApplicationDelete", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {
      body: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };
    vi.clearAllMocks();
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

    mockPrisma.application.delete.mockRejectedValue(
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

    const mockApplication = {
      uid: "test-app-id",
      name: "Test App",
      domain: "test.com",
    };

    mockPrisma.application.delete.mockResolvedValue(mockApplication);
    mockRemoveFromDomainWhitelist.mockResolvedValue({});

    await applicationDelete(req as Request, res as Response, prisma);

    // Verify our explicitly mocked functions were called correctly
    expect(mockPrisma.application.delete).toHaveBeenCalled();
    expect(mockRemoveFromDomainWhitelist).toHaveBeenCalledWith("https://test.com"); // Assuming your controller prepends https://

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalled();
  });
});