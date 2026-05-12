import { Request, Response } from "express";
import { PrismaClient } from "#prisma";
import { register } from "#api/webauthn/register";
import { vi, describe, beforeEach, it, expect } from "vitest";

// --- 1. HOISTING DER MOCK VARIABLEN ---
const { mockPrisma, mockVerifyAuth, mockAddToWebAuthnTokens, mockCryptoService } = vi.hoisted(() => {
  return {
    mockAddToWebAuthnTokens: vi.fn(),
    mockPrisma: {
      user: { findUnique: vi.fn() },
      device: { create: vi.fn() },
      session: { create: vi.fn() }, // <-- Neu: Session Mock
    },
    mockVerifyAuth: vi.fn(),
    mockCryptoService: { // <-- Neu: CryptoService Mock
      createSessionToken: vi.fn(),
      createSessionRefreshToken: vi.fn(),
    }
  };
});

// --- 2. REGISTRIERUNG DER MOCKS ---
vi.mock("#prisma", () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma),
}));

vi.mock("#redis", () => ({
  redisService: {
    addToWebAuthnTokens: mockAddToWebAuthnTokens,
  },
}));

// Neu: #crypto Mock
vi.mock("#crypto", () => ({
  cryptoService: mockCryptoService,
}));

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
      cookie: vi.fn().mockReturnThis(), // <-- Neu: res.cookie muss kettbar (chainable) sein
      send: vi.fn(),
    };
    vi.clearAllMocks();
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

  it("should return 400 if device create fails", async () => {
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
    
    mockPrisma.device.create.mockRejectedValue(
      new Error("Device Regitration update or create failed")
    );

    await register(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Device Regitration update or create failed");
  });

  it("should return 200 and verified if successful", async () => {
    // payload braucht jetzt auch appUId, da es im Code aufgerufen wird
    res.locals = { payload: { aud: "https://example.com", appUId: "testAppUid" } };
    req.body = {
      registerChallengeResponse: {
        challenge: "testChallenge",
        credentials: {
          response: { transports: ["usb"] },
        },
        privateKey: "privKey",
        publicKey: "pubKey",
        cipherBlob: "blob"
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
    
    // Mocks für die neuen DB und Crypto Aufrufe
    mockPrisma.device.create.mockResolvedValue({ uid: "deviceUid" });
    mockPrisma.session.create.mockResolvedValue({ uid: "sessionUid" });
    mockCryptoService.createSessionToken.mockResolvedValue("mockedToken");
    mockCryptoService.createSessionRefreshToken.mockResolvedValue("mockedRefreshToken");
    mockAddToWebAuthnTokens.mockResolvedValue(true);

    await register(req as Request, res as Response, prisma);

    // Wir prüfen ob der Cookie korrekt gesetzt wurde
    expect(res.cookie).toHaveBeenCalledWith(
        'refreshToken', 
        'mockedRefreshToken', 
        expect.any(Object)
    );

    expect(res.status).toHaveBeenCalledWith(200);
    
    // Erwarteter JSON Body hat sich in deiner Implementierung geändert!
    expect(res.send).toHaveBeenCalledWith(JSON.stringify({ 
        verified: true,
        token: "mockedToken",
        sessionId: "sessionUid"
    }));
  });
});