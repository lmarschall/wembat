import { Request, Response } from "express";
import { PrismaClient } from "#prisma";
// Sauberer ESM-Import (Passe den Pfad an, falls register.ts woanders liegt)
import { register } from "#api/webauthn/register";
import { vi, describe, beforeEach, it, expect } from "vitest";

// --- 1. HOISTING DER MOCK VARIABLEN ---
const { mockPrisma, mockVerifyAuth } = vi.hoisted(() => {
  return {
    mockPrisma: {
      user: { findUnique: vi.fn() },
      device: { upsert: vi.fn() },
    },
    mockVerifyAuth: vi.fn(),
  };
});

// --- 2. REGISTRIERUNG DER MOCKS ---
// Nutzt jetzt sauber deinen #prisma Alias
vi.mock("#prisma", () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma),
}));

// Externes Modul sauber mocken
vi.mock("@simplewebauthn/server", () => ({
  __esModule: true,
  verifyRegistrationResponse: mockVerifyAuth,
}));

const prisma = (mockPrisma as unknown) as PrismaClient;

// --- 3. TEST SUITE ---
describe("testRegister", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = { body: {} };
    res = {
      locals: {},
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };
    vi.clearAllMocks(); // Wichtig: vi statt jest
  });

  it("should return 400 if registerChallengeResponse is not present", async () => {
    await register(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Register Challenge Response not present");
  });

  it("should return 400 if payload is missing", async () => {
    req.body = { registerChallengeResponse: { challenge: "testChallenge" } };
    
    await register(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Payload not present");
  });

  it("should return 400 if user is not found", async () => {
    res.locals = { payload: { aud: "https://example.com" } };
    req.body = { registerChallengeResponse: { challenge: "testChallenge" } };

    mockPrisma.user.findUnique.mockResolvedValue(null);

    await register(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Could not find user for given challenge");
  });

  it("should return 400 if verifyRegistrationResponse fails", async () => {
    res.locals = { payload: { aud: "https://example.com" } };
    req.body = { registerChallengeResponse: { challenge: "testChallenge", credentials: {} } };

    mockPrisma.user.findUnique.mockResolvedValue({
      uid: "userUid",
      challenge: "testChallenge",
      devices: [],
    });

    mockVerifyAuth.mockRejectedValue(
      new Error("Registration Response could not be verified")
    );

    await register(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Registration Response could not be verified");
  });

  it("should return 400 if verified is false", async () => {
    res.locals = { payload: { aud: "https://example.com" } };
    req.body = {
      registerChallengeResponse: { challenge: "testChallenge", credentials: {} },
    };
    
    mockPrisma.user.findUnique.mockResolvedValue({
      uid: "userUid",
      challenge: "testChallenge",
      devices: [],
    });
    
    mockVerifyAuth.mockResolvedValue({
      verified: false,
    });

    await register(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Could not verifiy reponse"); 
  });

  it("should return 400 if registrationInfo is missing", async () => {
    res.locals = { payload: { aud: "https://example.com" } };
    req.body = {
      registerChallengeResponse: { challenge: "testChallenge", credentials: {} },
    };
    
    mockPrisma.user.findUnique.mockResolvedValue({
      uid: "userUid",
      challenge: "testChallenge",
      devices: [],
    });
    
    mockVerifyAuth.mockResolvedValue({
      verified: true,
      registrationInfo: null,
    });

    await register(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Registration Info not present");
  });

  it("should return 400 if device upsert fails", async () => {
    res.locals = { payload: { aud: "https://example.com" } };
    req.body = {
      registerChallengeResponse: {
        challenge: "testChallenge",
        credentials: {
          response: { transports: ["usb"] },
        },
      },
    };
    
    mockPrisma.user.findUnique.mockResolvedValue({
      uid: "userUid",
      challenge: "testChallenge",
      devices: [],
    });
    
    mockVerifyAuth.mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: "credentialId",
          publicKey: new Uint8Array([1, 2, 3]),
          counter: 0,
        },
      },
    });
    
    mockPrisma.device.upsert.mockRejectedValue(
      new Error("Device Regitration update or create failed")
    );

    await register(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Device Regitration update or create failed");
  });

  it("should return 200 and verified if successful", async () => {
    res.locals = { payload: { aud: "https://example.com" } };
    req.body = {
      registerChallengeResponse: {
        challenge: "testChallenge",
        credentials: {
          response: { transports: ["usb"] },
        },
      },
    };
    
    mockPrisma.user.findUnique.mockResolvedValue({
      uid: "userUid",
      challenge: "testChallenge",
      devices: [],
    });
    
    mockVerifyAuth.mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: "credentialId",
          publicKey: new Uint8Array([1, 2, 3]),
          counter: 0,
        },
      },
    });
    
    mockPrisma.device.upsert.mockResolvedValue({});

    await register(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(JSON.stringify({ verified: true }));
  });
});