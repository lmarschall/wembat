import { Request, Response } from "express";
import { PrismaClient } from "./../generated/prisma/client";

// --- 1. PRISMA MOCK ---
const mockPrisma = {
  application: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

// Ensure this matches the exact import path in your applicationUpdate.ts file
jest.mock("./../generated/prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

const prisma = (mockPrisma as unknown) as PrismaClient;

// --- 2. REDIS MOCK ---
const mockAddToDomainWhitelist = jest.fn();
const mockRemoveFromDomainWhitelist = jest.fn();

jest.mock("../../redis", () => ({
  redisService: {
    addToDomainWhitelist: mockAddToDomainWhitelist,
    removeFromDomainWhitelist: mockRemoveFromDomainWhitelist,
  }
}));

// --- 3. DYNAMIC IMPORT OF CONTROLLER ---
// Load applicationUpdate AFTER the mocks are registered to prevent import hoisting bugs
const { applicationUpdate } = require("./applicationUpdate");

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