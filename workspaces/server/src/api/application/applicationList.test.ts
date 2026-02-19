import { Request, Response } from "express";
import { PrismaClient } from "./../generated/prisma/client";

// --- 1. PRISMA MOCK ---
const mockPrisma = {
  application: {
    findMany: jest.fn(),
  },
};

// Ensure this matches the exact import path in your applicationList.ts file
jest.mock("./../generated/prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

const prisma = (mockPrisma as unknown) as PrismaClient;

// --- 2. DYNAMIC IMPORT OF CONTROLLER ---
// Load applicationList AFTER the mocks are registered to prevent import hoisting bugs
const { applicationList } = require("./applicationList");

describe("testApplicationList", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
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