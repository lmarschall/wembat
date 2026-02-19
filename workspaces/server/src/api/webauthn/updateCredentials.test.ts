import { Request, Response } from "express";
import { PrismaClient } from "./../generated/prisma/client";

// --- 1. PRISMA MOCK ---
const mockPrisma = {
  session: {
    update: jest.fn(),
  },
};

// Ensure this matches the exact import path in your updateCredentials.ts file
jest.mock("./../generated/prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

const prisma = (mockPrisma as unknown) as PrismaClient;

// --- 2. DYNAMIC IMPORT OF CONTROLLER ---
// Load updateCredentials AFTER the mocks are registered to prevent import hoisting bugs
const { updateCredentials } = require("./updateCredentials");

describe("testUpdateCredentials", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 400 if updateCredentialsRequest is not present", async () => {
    await updateCredentials(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Challenge Response not present");
  });

  it("should return 400 if session update fails", async () => {
    req.body = {
      updateCredentialsRequest: {
        privKey: "testPrivKey",
        pubKey: "testPubKey",
        nonce: 1234,
        sessionId: "testSessionId",
      },
    };

    mockPrisma.session.update.mockRejectedValue(
      new Error("Updating user challenge failed")
    );

    await updateCredentials(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Updating user challenge failed");
  });

  it("should return 200 and success if update is successful", async () => {
    req.body = {
      updateCredentialsRequest: {
        privKey: "testPrivKey",
        pubKey: "testPubKey",
        nonce: 9999,
        sessionId: "testSessionId",
      },
    };

    mockPrisma.session.update.mockResolvedValue({});

    await updateCredentials(req as Request, res as Response, prisma);

    expect(mockPrisma.session.update).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(JSON.stringify({ success: true }));
  });
});