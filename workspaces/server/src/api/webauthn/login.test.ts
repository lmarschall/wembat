import { Request, Response } from "express";
import { PrismaClient } from "#prisma";
// Sauberer ESM-Import (Passe den Pfad an, je nachdem wo deine login.ts liegt)
import { login } from "#api/webauthn/login"; 
import { vi, describe, beforeEach, it, expect } from "vitest";

// --- 1. HOISTING ALLER MOCK VARIABLEN ---
const { 
  mockVerifyAuth, 
  mockCreateToken, 
  mockCreateRefreshToken, 
  mockAddToWebAuthnTokens, 
  mockPrisma 
} = vi.hoisted(() => {
  return {
    mockVerifyAuth: vi.fn(),
    mockCreateToken: vi.fn(),
    mockCreateRefreshToken: vi.fn(),
    mockAddToWebAuthnTokens: vi.fn(),
    mockPrisma: {
      user: { findUnique: vi.fn() },
      session: { create: vi.fn() },
    },
  };
});

// --- 2. REGISTRIERUNG DER MOCKS ---
vi.mock("@simplewebauthn/server", () => ({
  __esModule: true,
  verifyAuthenticationResponse: mockVerifyAuth,
}));

// Nutzt jetzt deinen sauberen #crypto Alias
vi.mock("#crypto", () => ({
  cryptoService: {
    createSessionToken: mockCreateToken,
    createSessionRefreshToken: mockCreateRefreshToken,
  },
}));

// Nutzt jetzt deinen sauberen #redis Alias
vi.mock("#redis", () => ({
  redisService: {
    addToWebAuthnTokens: mockAddToWebAuthnTokens,
  },
}));

vi.mock("#prisma", () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma),
}));

const prisma = (mockPrisma as unknown) as PrismaClient;

// --- 3. TEST SUITE ---
describe("testLogin", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(async () => {
    req = { body: {} };
    res = {
      locals: {},
      status: vi.fn().mockReturnThis(),
      cookie: vi.fn().mockReturnThis(),
      send: vi.fn(),
      json: vi.fn(),
    };
    vi.clearAllMocks(); // Wichtig: vi statt jest
  });

  it("should return error if loginChallengeResponse is missing", async () => {
    await login(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Login Challenge Response not present");
  });

  it("should return error if res.locals.payload is missing", async () => {
    req.body = {
      loginChallengeResponse: {
        challenge: "some-challenge",
        credentials: {},
      },
    };

    await login(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Payload not present");
  });

  it("should return error if user not found", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = {
      loginChallengeResponse: {
        challenge: "some-challenge",
        credentials: {},
      },
    };
    res.locals.payload = { aud: "https://test.com", appUId: "testAppId" };

    mockPrisma.user.findUnique.mockRejectedValue(new Error("User with given challenge not found"));

    await login(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User with given challenge not found");
  });

  it("should return error if verifyAuthenticationResponse fails", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = {
      loginChallengeResponse: {
        challenge: "some-challenge",
        credentials: { rawId: "device-uid" },
      },
    };
    res.locals.payload = { aud: "https://test.com", appUId: "testAppId" };

    mockPrisma.user.findUnique.mockResolvedValue({
      uid: "testUserId",
      challenge: "some-challenge",
      devices: [{ uid: "device1", credentialId: "device-uid", counter: 0 }],
      sessions: [],
    });

    mockVerifyAuth.mockRejectedValue(new Error("Authentication Response could not be verified"));

    await login(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Authentication Response could not be verified");
  });

  it("should return error if user device is not onboarded to session", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = {
      loginChallengeResponse: {
        challenge: "some-challenge",
        credentials: { rawId: "device-uid" },
      },
    };
    res.locals.payload = { aud: "https://test.com", appUId: "testAppId" };

    mockPrisma.user.findUnique.mockResolvedValue({
      uid: "testUserId",
      challenge: "some-challenge",
      devices: [{ uid: "device1", credentialId: "device-uid", counter: 0 }],
      sessions: [{ appUId: "testAppId", deviceUId: "otherDeviceUid" }],
    });

    mockVerifyAuth.mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 1 },
    });

    await login(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User device is not onboarded to session");
  });

  it("should return 200 and tokens if valid data is provided", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = {
      loginChallengeResponse: {
        challenge: "some-challenge",
        credentials: { rawId: "device-uid" },
      },
    };
    res.locals.payload = { aud: "https://test.com", appUId: "testAppId" };

    mockPrisma.user.findUnique.mockResolvedValue({
      uid: "testUserId",
      challenge: "some-challenge",
      devices: [{ uid: "device1", credentialId: "device-uid", counter: 0 }],
      sessions: [],
    });

    mockVerifyAuth.mockResolvedValue({
      verified: true,
      authenticationInfo: { newCounter: 1 },
    });

    mockPrisma.session.create.mockResolvedValue({
      uid: "sessionId",
      userUId: "testUserId",
      appUId: "testAppId",
      deviceUId: "device1",
      publicKey: "publicKey",
      privateKey: "privateKey",
      cipherBlob: "cipherBlob",
      nonce: 1234,
    });

    mockCreateToken.mockResolvedValue("test-session-token");
    mockCreateRefreshToken.mockResolvedValue("test-refresh-token");
    mockAddToWebAuthnTokens.mockResolvedValue({});

    await login(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(200);
    // expect.any(Object) funktioniert in Vitest genauso wie in Jest!
    expect(res.cookie).toHaveBeenCalledWith("refreshToken", "test-refresh-token", expect.any(Object));
    expect(res.send).toHaveBeenCalledWith(
      JSON.stringify({
        verified: true,
        token: "test-session-token",
        sessionId: "sessionId",
        publicUserKey: "publicKey",
        privateUserKeyEncrypted: "privateKey",
        cipherBlob: "cipherBlob",
      })
    );
  });
});