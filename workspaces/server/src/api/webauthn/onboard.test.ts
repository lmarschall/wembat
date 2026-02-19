import { Request, Response } from "express";
import { PrismaClient } from "./../generated/prisma/client";

// --- 1. PRISMA MOCK ---
const mockPrisma = {
  application: { findUnique: jest.fn() },
  user: { findUnique: jest.fn() },
  session: { create: jest.fn() },
};

// Ensure this matches the exact import path in your onboard.ts file
jest.mock("./../generated/prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

const prisma = (mockPrisma as unknown) as PrismaClient;

// --- 2. WEBAUTHN MOCK ---
const mockVerifyAuth = jest.fn();

jest.mock("@simplewebauthn/server", () => ({
  __esModule: true,
  verifyAuthenticationResponse: mockVerifyAuth,
}));

// --- 3. DYNAMIC IMPORT OF CONTROLLER ---
// Load onboard AFTER the mocks are registered to prevent import hoisting bugs
const { onboard } = require("./onboard");

describe("testOnboard", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {
      body: {},
    };
    res = {
      locals: {},
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should throw error if onboardRequest is not present", async () => {
    await onboard(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Challenge Response not present");
  });

  it("should throw error if res.locals.payload is not present", async () => {
    req.body = {
      onboardRequest: {
        credentials: {},
      },
    };

    await onboard(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Payload not present");
  });

  it("should throw error if application is not found", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = {
      onboardRequest: {
        credentials: {},
        challenge: "user-challenge",
      },
    };
    res.locals.payload = {
      aud: "https://example.de",
    };

    mockPrisma.application.findUnique.mockResolvedValue(null);

    await onboard(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Application not found");
  });

  it("should throw error if user for given challenge not found", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = {
      onboardRequest: {
        credentials: {},
        challenge: "user-challenge",
      },
    };
    res.locals.payload = {
      aud: "https://example.de",
    };

    mockPrisma.application.findUnique.mockResolvedValue({
      uid: "appUid",
      domain: "example.de",
    });

    mockPrisma.user.findUnique.mockRejectedValue(
      new Error("Could not find user for given challenge")
    );

    await onboard(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Could not find user for given challenge");
  });

  it("should throw error if authenticator not found in user's devices", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = {
      onboardRequest: {
        credentials: { rawId: "credential-id" },
        challenge: "user-challenge",
      },
    };
    res.locals.payload = {
      aud: "https://example.de",
    };

    mockPrisma.application.findUnique.mockResolvedValue({
      uid: "appUid",
      domain: "example.de",
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      uid: "userId",
      challenge: "user-challenge",
      devices: [], // No matching devices
    });

    await onboard(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Could not find authenticator matching");
  });

  it("should throw error if verifyAuthenticationResponse fails", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = {
      onboardRequest: {
        credentials: { rawId: "credential-id" },
        challenge: "user-challenge",
      },
    };
    res.locals.payload = {
      aud: "https://example.de",
    };

    mockPrisma.application.findUnique.mockResolvedValue({
      uid: "appUid",
      domain: "example.de",
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      uid: "userId",
      challenge: "user-challenge",
      devices: [
        {
          uid: "deviceUid",
          credentialId: "credential-id",
          credentialPublicKey: "test-public-key",
          counter: 0,
          transports: [],
        },
      ],
    });

    mockVerifyAuth.mockRejectedValue(
      new Error("Authentication Response could not be verified")
    );

    await onboard(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Authentication Response could not be verified");
  });

  it("should return 400 if not verified", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = {
      onboardRequest: {
        credentials: { rawId: "credential-id" },
        challenge: "user-challenge",
      },
    };
    res.locals.payload = {
      aud: "https://example.de",
    };

    mockPrisma.application.findUnique.mockResolvedValue({
      uid: "appUid",
      domain: "example.de",
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      uid: "userId",
      challenge: "user-challenge",
      devices: [
        {
          uid: "deviceUid",
          credentialId: "credential-id",
          credentialPublicKey: "test-public-key",
          counter: 0,
          transports: [],
        },
      ],
    });

    mockVerifyAuth.mockResolvedValue({
      verified: false,
    });

    await onboard(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Not verified");
  });

  it("should return 400 if session creation fails", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = {
      onboardRequest: {
        credentials: { rawId: "credential-id" },
        challenge: "user-challenge",
        privateKey: "test-private-key",
        publicKey: "test-public-key",
        nonce: 9999,
      },
    };
    res.locals.payload = {
      aud: "https://example.de",
    };

    mockPrisma.application.findUnique.mockResolvedValue({
      uid: "appUid",
      domain: "example.de",
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      uid: "userId",
      challenge: "user-challenge",
      devices: [
        {
          uid: "deviceUid",
          credentialId: "credential-id",
          credentialPublicKey: "test-public-key",
          counter: 0,
          transports: [],
        },
      ],
    });

    mockVerifyAuth.mockResolvedValue({
      verified: true,
      authenticationInfo: {},
    });

    mockPrisma.session.create.mockRejectedValue(
      new Error("Updating user challenge failed")
    );

    await onboard(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Updating user challenge failed");
  });

  it("should return 200 and success if onboard is valid", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = {
      onboardRequest: {
        credentials: { rawId: "credential-id" },
        challenge: "user-challenge",
        privateKey: "test-private-key",
        publicKey: "test-public-key",
        nonce: 9999,
      },
    };
    res.locals.payload = {
      aud: "https://example.de",
    };

    mockPrisma.application.findUnique.mockResolvedValue({
      uid: "appUid",
      domain: "example.de",
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      uid: "userId",
      challenge: "user-challenge",
      devices: [
        {
          uid: "deviceUid",
          credentialId: "credential-id",
          credentialPublicKey: "test-public-key",
          counter: 0,
          transports: [],
        },
      ],
    });

    mockVerifyAuth.mockResolvedValue({
      verified: true,
      authenticationInfo: {},
    });

    mockPrisma.session.create.mockResolvedValue({
      uid: "sessionuid",
      userUId: "userId",
      appUId: "appUid",
      deviceUId: "deviceUid",
      publicKey: "test-public-key",
      privateKey: "test-private-key",
      nonce: 9999,
    });

    await onboard(req as Request, res as Response, prisma);

    expect(mockPrisma.application.findUnique).toHaveBeenCalledWith({
      where: { domain: "example.de" },
    });
    expect(mockVerifyAuth).toHaveBeenCalled();
    expect(mockPrisma.session.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      JSON.stringify({
        success: true,
      })
    );
  });
});