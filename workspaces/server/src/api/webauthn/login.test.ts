import { Request, Response } from "express";
import { PrismaClient } from "./../generated/prisma/client";

// 1. Define all Mocks FIRST
const mockVerifyAuth = jest.fn();
jest.mock("@simplewebauthn/server", () => ({
  __esModule: true,
  verifyAuthenticationResponse: mockVerifyAuth,
}));

const mockCreateToken = jest.fn();
const mockCreateRefreshToken = jest.fn();
jest.mock("../../crypto", () => ({
  cryptoService: {
    createSessionToken: mockCreateToken,
    createSessionRefreshToken: mockCreateRefreshToken,
  },
}));

const mockAddToWebAuthnTokens = jest.fn();
jest.mock("../../redis", () => ({
  redisService: {
    addToWebAuthnTokens: mockAddToWebAuthnTokens,
  },
}));

const mockPrisma = {
  user: { findUnique: jest.fn() },
  session: { create: jest.fn() },
};
const prisma = (mockPrisma as unknown) as PrismaClient;

// 2. THE CRITICAL FIX: Load the function AFTER mocks are registered 
// This prevents TypeScript from moving the import above our jest.mock calls.
const { login } = require("./login");

describe("testLogin", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(async () => {
    req = { body: {} };
    res = {
      locals: {},
      status: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
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