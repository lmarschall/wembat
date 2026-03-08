import { Request, Response } from "express";
import { PrismaClient } from "#prisma";
// Sauberer ESM-Import (Pfad anpassen, falls refresh.ts woanders liegt)
import { refresh } from "#api/webauthn/refresh";
import { vi, describe, beforeEach, it, expect } from "vitest";

// --- 1. HOISTING DER MOCK VARIABLEN ---
const { mockPrisma, mockCreateSessionToken } = vi.hoisted(() => {
  return {
    mockPrisma: {
      user: {
        findUnique: vi.fn(),
      },
    },
    mockCreateSessionToken: vi.fn(),
  };
});

// --- 2. REGISTRIERUNG DER MOCKS ---
vi.mock("#prisma", () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma),
}));

vi.mock("#crypto", () => ({
  cryptoService: {
    createSessionToken: mockCreateSessionToken,
  },
}));

const prisma = (mockPrisma as unknown) as PrismaClient;

// --- 3. TEST SUITE ---
describe("testRefresh", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {
      cookies: {},
      body: {},
    };
    res = {
      locals: {},
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

  it("should return error if userInfo is missing", async () => {
    req.cookies = { refreshToken: "test-refresh-token" };
    await refresh(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User info not present");
  });

  it("should return error if payload is missing", async () => {
    req.cookies = { refreshToken: "test-refresh-token" };
    req.body = {
      userInfo: {
        userMail: "test@user.com",
        sessionId: "session123",
      },
    };

    await refresh(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Payload not present");
  });

  it("should return error if user not found in database", async () => {
    res.locals = { payload: { aud: "https://example.de" } };
    req.cookies = { refreshToken: "test-refresh-token" };
    req.body = {
      userInfo: {
        userMail: "test@user.com",
        sessionId: "session123",
      },
    };

    mockPrisma.user.findUnique.mockRejectedValue(
      new Error("User could not be found in database")
    );

    await refresh(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User could not be found in database");
  });

  it("should return error if user is null", async () => {
    res.locals = { payload: { aud: "https://example.de" } };
    req.cookies = { refreshToken: "test-refresh-token" };
    req.body = {
      userInfo: {
        userMail: "test@user.com",
        sessionId: "session123",
      },
    };

    mockPrisma.user.findUnique.mockResolvedValue(null);

    await refresh(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User could not be found in database");
  });

  it("should return error if user session not found", async () => {
    res.locals = { payload: { aud: "https://example.de" } };
    req.cookies = { refreshToken: "test-refresh-token" };
    req.body = {
      userInfo: {
        userMail: "test@user.com",
        sessionId: "session123",
      },
    };

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

  it("should return 200 and token if refresh is valid", async () => {
    res.locals = { payload: { aud: "https://example.de" } };
    req.cookies = { refreshToken: "test-refresh-token" };
    req.body = {
      userInfo: {
        userMail: "test@user.com",
        sessionId: "session123",
      },
    };

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
          nonce: 1234,
        },
      ],
    });

    mockCreateSessionToken.mockResolvedValue("test-session-token");

    await refresh(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      JSON.stringify({
        token: "test-session-token",
      })
    );
  });
});