import { Request, Response } from "express";
import { PrismaClient } from "./../generated/prisma/client";

// --- 1. PRISMA MOCK ---
const mockPrisma = {
  application: {
    findUnique: jest.fn(),
  },
};

// Ensure this matches the exact import path in your applicationToken.ts file
jest.mock("./../generated/prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

const prisma = (mockPrisma as unknown) as PrismaClient;

// --- 2. CRYPTO SERVICE MOCK ---
const mockCreateApplicationJWT = jest.fn();

jest.mock("../../crypto", () => ({
  cryptoService: {
    createApplicationJWT: mockCreateApplicationJWT,
  },
}));

// --- 3. DYNAMIC IMPORT OF CONTROLLER ---
// Load applicationToken AFTER the mocks are registered to prevent import hoisting bugs
const { applicationToken } = require("./applicationToken");

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
    // req.body is intentionally left empty
    await applicationToken(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Application Info not present");
  });

  it("should return 500 if application not found", async () => {
    req.body = { applicationInfo: { appUId: "test-app-id" } };

    // Mock findUnique to return no record
    mockPrisma.application.findUnique.mockResolvedValue(null);

    await applicationToken(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Application not found");
  });

  it("should return 500 if database error occurs", async () => {
    req.body = { applicationInfo: { appUId: "test-app-id" } };

    // Mock findUnique to throw a DB error
    mockPrisma.application.findUnique.mockRejectedValue(
      new Error("Database error")
    );

    await applicationToken(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Database error");
  });

  it("should return 500 if JWT creation fails", async () => {
    req.body = { applicationInfo: { appUId: "test-app-id" } };

    mockPrisma.application.findUnique.mockResolvedValue({
      uid: "test-app-id",
      name: "Test App",
      domain: "test.com",
    });

    // Mock createApplicationJWT to throw an error
    mockCreateApplicationJWT.mockRejectedValue(
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

    mockPrisma.application.findUnique.mockResolvedValue(mockApp);
    mockCreateApplicationJWT.mockResolvedValue(mockToken);

    await applicationToken(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockToken);
  });
});