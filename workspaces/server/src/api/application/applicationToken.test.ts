import { Request, Response } from "express";
import { PrismaClient } from "#prisma";
// Sauberer ESM-Import dank Vitest-Hoisting
import { applicationToken } from "#api/application/applicationToken";
import { vi, describe, beforeEach, it, expect } from "vitest";

// --- 1. HOISTING DER MOCK VARIABLEN ---
const { mockPrisma, mockCreateApplicationJWT } = vi.hoisted(() => {
  return {
    mockPrisma: {
      application: {
        findUnique: vi.fn(),
      },
    },
    mockCreateApplicationJWT: vi.fn(),
  };
});

// --- 2. REGISTRIERUNG DER MOCKS ---
vi.mock("#prisma", () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma),
}));

// WICHTIG: Statt "../../crypto" nutzen wir jetzt konsistent deinen neuen Alias!
// Stelle sicher, dass applicationToken.ts den Service auch über "#crypto" importiert.
vi.mock("#crypto", () => ({
  cryptoService: {
    createApplicationJWT: mockCreateApplicationJWT,
  },
}));

const prisma = (mockPrisma as unknown) as PrismaClient;

// --- 3. TEST SUITE ---
describe("testApplicationToken", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {
      body: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
      json: vi.fn(),
    };
    vi.clearAllMocks(); // vi statt jest
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