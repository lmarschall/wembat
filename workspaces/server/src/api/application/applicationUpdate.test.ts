import { Request, Response } from "express";
import { PrismaClient } from "#prisma";
// Sauberer ESM-Import dank Vitest-Hoisting
import { applicationUpdate } from "#api/application/applicationUpdate";
import { vi, describe, beforeEach, it, expect } from "vitest";

// --- 1. HOISTING DER MOCK VARIABLEN ---
const { mockPrisma, mockAddToDomainWhitelist, mockRemoveFromDomainWhitelist } = vi.hoisted(() => {
  return {
    mockPrisma: {
      application: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    },
    mockAddToDomainWhitelist: vi.fn(),
    mockRemoveFromDomainWhitelist: vi.fn(),
  };
});

// --- 2. REGISTRIERUNG DER MOCKS ---
// Nutzt jetzt sauber deinen #prisma Alias
vi.mock("#prisma", () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma),
}));

// Nutzt jetzt sauber deinen #redis Alias
vi.mock("#redis", () => ({
  redisService: {
    addToDomainWhitelist: mockAddToDomainWhitelist,
    removeFromDomainWhitelist: mockRemoveFromDomainWhitelist,
  }
}));

const prisma = (mockPrisma as unknown) as PrismaClient;

// --- 3. TEST SUITE ---
describe("testApplicationUpdate", () => {
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
    vi.clearAllMocks(); // Wichtig: vi statt jest
  });

  it("should return 500 if applicationInfo is not present", async () => {
    // No applicationInfo in the request body
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

    // Simulate a database error on findUnique
    mockPrisma.application.findUnique.mockRejectedValue(
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

    mockPrisma.application.findUnique.mockResolvedValue({
      uid: "test-app-id",
      name: "Old Name",
      domain: "old-domain.com",
    });

    // Simulate a database error on update
    mockPrisma.application.update.mockRejectedValue(
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

    mockPrisma.application.findUnique.mockResolvedValue({
      uid: "test-app-id",
      name: "Old Name",
      domain: "old-domain.com",
    });

    mockPrisma.application.update.mockResolvedValue({
      uid: "test-app-id",
      name: "Updated Name",
      domain: "updated-domain.com",
    });

    mockAddToDomainWhitelist.mockResolvedValue({});
    mockRemoveFromDomainWhitelist.mockResolvedValue({});

    await applicationUpdate(req as Request, res as Response, prisma);

    // Verify explicitly mocked functions were called
    expect(mockPrisma.application.findUnique).toHaveBeenCalled();
    expect(mockPrisma.application.update).toHaveBeenCalled();
    
    // Depending on your controller logic, you can assert exact params passed to Redis here:
    // expect(mockRemoveFromDomainWhitelist).toHaveBeenCalledWith("https://old-domain.com");
    // expect(mockAddToDomainWhitelist).toHaveBeenCalledWith("https://updated-domain.com");

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalled();
  });
});