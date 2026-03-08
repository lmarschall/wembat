import { Request, Response } from "express";
import { PrismaClient } from "#prisma";
// Sauberer ESM-Import dank Vitest-Hoisting
import { applicationList } from "#api/application/applicationList";
import { vi, describe, beforeEach, it, expect } from "vitest";

// --- 1. HOISTING DER MOCK VARIABLEN ---
const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      application: {
        findMany: vi.fn(),
      },
    },
  };
});

// --- 2. REGISTRIERUNG DER MOCKS ---
vi.mock("#prisma", () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma),
}));

const prisma = (mockPrisma as unknown) as PrismaClient;

// --- 3. TEST SUITE ---
describe("testApplicationList", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {
      body: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      send: vi.fn(),
    };
    vi.clearAllMocks(); // Wichtig: vi statt jest
  });

  it("should return a list of applications", async () => {
    const mockApplications = [
      { uid: "app1", name: "Test App 1", domain: "test1.com" },
      { uid: "app2", name: "Test App 2", domain: "test2.com" },
    ];

    mockPrisma.application.findMany.mockResolvedValue(mockApplications);

    await applicationList(req as Request, res as Response, prisma);

    expect(mockPrisma.application.findMany).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockApplications);
  });

  it("should return 500 if an error occurs while listing applications", async () => {
    mockPrisma.application.findMany.mockRejectedValue(
      new Error("Database error")
    );

    await applicationList(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Database error");
  });
});