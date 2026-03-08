import { Request, Response } from "express";
import { PrismaClient } from "#prisma";
// Sauberer ESM-Import (Passe den Pfad an, falls die Datei woanders liegt)
import { updateCredentials } from "#api/webauthn/updateCredentials"; 
import { vi, describe, beforeEach, it, expect } from "vitest";

// --- 1. HOISTING DER MOCK VARIABLEN ---
const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      session: {
        update: vi.fn(),
      },
    },
  };
});

// --- 2. REGISTRIERUNG DER MOCKS ---
// Nutzt jetzt sauber deinen #prisma Alias
vi.mock("#prisma", () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma),
}));

const prisma = (mockPrisma as unknown) as PrismaClient;

// --- 3. TEST SUITE ---
describe("testUpdateCredentials", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };
    vi.clearAllMocks(); // Wichtig: vi statt jest
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