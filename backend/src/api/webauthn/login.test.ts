//// typescript
// filepath: /home/lukas/Source/wembat/backend/src/api/webauthn/login.test.ts

import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { login } from "./login";
import { cryptoService } from "../../crypto";
import { addToWebAuthnTokens } from "../../redis";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";

// Alle Abhängigkeiten mocken: Prisma, cryptoService, addToWebAuthnTokens, verifyAuthenticationResponse
jest.mock("@prisma/client", () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      user: {
        findUnique: jest.fn(),
      },
      session: {
        create: jest.fn(),
      },
    })),
  };
});

jest.mock("../../crypto", () => ({
  cryptoService: {
    createSessionToken: jest.fn(),
    createSessionRefreshToken: jest.fn(),
  },
}));

jest.mock("../../redis", () => ({
  addToWebAuthnTokens: jest.fn(),
}));

jest.mock("@simplewebauthn/server", () => ({
  verifyAuthenticationResponse: jest.fn(),
}));

const prisma = new PrismaClient();

describe("testLogin", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {
      body: {},
    };
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

    // res.locals.payload nicht setzen
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
    res.locals.payload = {
      aud: "https://test.com",
      appUId: "testAppId",
    };

    (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error("User with given challenge not found"));

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
        credentials: { rawId: "test-raw-id" },
      },
    };
    res.locals.payload = {
      aud: "https://test.com",
      appUId: "testAppId",
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      uid: "testUserId",
      challenge: "some-challenge",
      devices: [{ uid: "device1", credentialId: "abc", counter: 0 }],
      sessions: [],
    });

    (verifyAuthenticationResponse as jest.Mock).mockRejectedValue(new Error("Authentication Response could not be verified"));

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
    res.locals.payload = {
      aud: "https://test.com",
      appUId: "testAppId",
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      uid: "testUserId",
      challenge: "some-challenge",
      devices: [{ uid: "device1", credentialId: "device-uid", counter: 0 }],
      sessions: [{ appUId: "testAppId", deviceUId: "otherDeviceUid" }],
    });

    (verifyAuthenticationResponse as jest.Mock).mockResolvedValue({
      verified: true,
      authenticationInfo: {
        newCounter: 1,
      },
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

    res.locals.payload = {
      aud: "https://test.com",
      appUId: "testAppId",
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      uid: "testUserId",
      challenge: "some-challenge",
      devices: [{ uid: "device1", credentialId: "device-uid", counter: 0 }],
      sessions: [],
    });

    // WebAuthn-Verification simulieren
    (verifyAuthenticationResponse as jest.Mock).mockResolvedValue({
      verified: true,
      authenticationInfo: {
        newCounter: 1,
      },
    });

    // Session in DB erstellen
    (prisma.session.create as jest.Mock).mockResolvedValue({
      uid: "sessionId",
      userUId: "testUserId",
      appUId: "testAppId",
      deviceUId: "device1",
      publicKey: "publicKey",
      privateKey: "privateKey",
      nonce: 1234,
    });

    // createSessionToken und createSessionRefreshToken mocken
    (cryptoService.createSessionToken as jest.Mock).mockResolvedValue("test-session-token");
    (cryptoService.createSessionRefreshToken as jest.Mock).mockResolvedValue("test-refresh-token");

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
        nonce: 1234,
      })
    );
  });
});