import { Request, Response } from "express";
import { PrismaClient } from "#prisma";
import { refresh } from "#api/webauthn/refresh";
import { cryptoService, initCryptoTest } from "#crypto";
import { initConfig } from "#config";
import { generateKeyPair } from "jose";
import { vi, describe, beforeEach, it, expect } from "vitest";

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      user: {
        findUnique: vi.fn(),
      },
    },
  };
});

vi.mock("#prisma", () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma),
}));

const prisma = (mockPrisma as unknown) as PrismaClient;
const audience = "https://example.de";

describe("testRefresh", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(async () => {
    await initConfig();
    await initCryptoTest();

    req = {
      cookies: {},
      body: {},
    };
    res = {
      locals: { payload: { aud: audience } },
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };
    vi.clearAllMocks();
  });

  it("should return error if refreshToken cookie is missing", async () => {
    await refresh(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Refresh Token not present");
  });

  it("should return error if payload is missing", async () => {
    req.cookies = { refreshToken: "some-token" };
    res.locals = {};

    await refresh(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Payload not present");
  });

  it("should return error if refresh token is not a valid JWT", async () => {
    req.cookies = { refreshToken: "not-a-jwt" };

    await refresh(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("should return error if refresh token was not signed by the server's current key", async () => {
    const jwt = await cryptoService.createJWT(
      { sessionId: "session123", userMail: "test@user.com" },
      "ES256",
      audience,
      "7d"
    );

    // Simulate a forged/foreign token by rotating the key after signing.
    const rotatedKeyPair = await generateKeyPair("ES256");
    cryptoService.setPublicKey(rotatedKeyPair.publicKey);

    req.cookies = { refreshToken: jwt };

    await refresh(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Invalid public key");
  });

  it("should not allow forging a session for another user via the request body", async () => {
    // Attacker only controls the request body, not a valid refresh token for the victim.
    const jwt = await cryptoService.createJWT(
      { sessionId: "attacker-session", userMail: "attacker@evil.com" },
      "ES256",
      audience,
      "7d"
    );

    req.cookies = { refreshToken: jwt };
    req.body = {
      userInfo: { userMail: "victim@user.com", sessionId: "victim-session" },
    };

    mockPrisma.user.findUnique.mockResolvedValue({
      uid: "attackerUserId",
      mail: "attacker@evil.com",
      devices: [],
      sessions: [],
    });

    await refresh(req as Request, res as Response, prisma);

    // Identity must come from the verified token, never from the request body.
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { mail: "attacker@evil.com" } })
    );
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User session not found");
  });

  it("should return error if user not found in database", async () => {
    const jwt = await cryptoService.createJWT(
      { sessionId: "session123", userMail: "test@user.com" },
      "ES256",
      audience,
      "7d"
    );
    req.cookies = { refreshToken: jwt };

    mockPrisma.user.findUnique.mockRejectedValue(
      new Error("User could not be found in database")
    );

    await refresh(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User could not be found in database");
  });

  it("should return error if user is null", async () => {
    const jwt = await cryptoService.createJWT(
      { sessionId: "session123", userMail: "test@user.com" },
      "ES256",
      audience,
      "7d"
    );
    req.cookies = { refreshToken: jwt };

    mockPrisma.user.findUnique.mockResolvedValue(null);

    await refresh(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User could not be found in database");
  });

  it("should return error if user session not found", async () => {
    const jwt = await cryptoService.createJWT(
      { sessionId: "session123", userMail: "test@user.com" },
      "ES256",
      audience,
      "7d"
    );
    req.cookies = { refreshToken: jwt };

    mockPrisma.user.findUnique.mockResolvedValue({
      uid: "testUserId",
      mail: "test@user.com",
      devices: [],
      sessions: [{ uid: "someOtherSessionId" }],
    });

    await refresh(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User session not found");
  });

  it("should return 200 and a fresh session token if refresh token is valid", async () => {
    const jwt = await cryptoService.createJWT(
      { sessionId: "session123", userMail: "test@user.com" },
      "ES256",
      audience,
      "7d"
    );
    req.cookies = { refreshToken: jwt };

    mockPrisma.user.findUnique.mockResolvedValue({
      uid: "testUserId",
      mail: "test@user.com",
      devices: [],
      sessions: [
        {
          uid: "session123",
          userUId: "testUserId",
          appUId: "appId",
          deviceUId: "deviceUid",
          publicKey: "publicKey",
          privateKey: "privateKey",
        },
      ],
    });

    await refresh(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(200);
    const sentBody = JSON.parse((res.send as any).mock.calls[0][0]);
    expect(typeof sentBody.token).toBe("string");
    expect(sentBody.token.split(".")).toHaveLength(3);
  });
});
