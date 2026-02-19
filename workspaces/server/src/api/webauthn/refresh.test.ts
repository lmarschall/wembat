import { Request, Response } from "express";
import { PrismaClient } from "./../generated/prisma/client";

// --- 1. PRISMA MOCK ---
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
};

// Ensure this matches the exact import path in your refresh.ts file
jest.mock("./../generated/prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

const prisma = (mockPrisma as unknown) as PrismaClient;

// --- 2. CRYPTO MOCK ---
const mockCreateSessionToken = jest.fn();

jest.mock("../../crypto", () => ({
  cryptoService: {
    createSessionToken: mockCreateSessionToken,
  },
}));

// --- 3. DYNAMIC IMPORT OF CONTROLLER ---
// Load refresh AFTER the mocks are registered to prevent import hoisting bugs
const { refresh } = require("./refresh");

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
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return error if refreshToken cookie is missing", async () => {
    // refreshToken is deliberately left undefined
    await refresh(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Refresh Token not present");
  });

  it("should return error if userInfo is missing", async () => {
    req.cookies = { refreshToken: "test-refresh-token" };
    // userInfo is deliberately left undefined
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
    // res.locals.payload is deliberately left undefined

    await refresh(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Payload not present");
  });

  it("should return error if user not found in database", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.cookies = { refreshToken: "test-refresh-token" };
    req.body = {
      userInfo: {
        userMail: "test@user.com",
        sessionId: "session123",
      },
    };
    res.locals.payload = { aud: "https://example.de" };

    mockPrisma.user.findUnique.mockRejectedValue(
      new Error("User could not be found in database")
    );

    await refresh(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User could not be found in database");
  });

  it("should return error if user is null", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.cookies = { refreshToken: "test-refresh-token" };
    req.body = {
      userInfo: {
        userMail: "test@user.com",
        sessionId: "session123",
      },
    };
    res.locals.payload = { aud: "https://example.de" };

    mockPrisma.user.findUnique.mockResolvedValue(null);

    await refresh(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User could not be found in database");
  });

  it("should return error if user session not found", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.cookies = { refreshToken: "test-refresh-token" };
    req.body = {
      userInfo: {
        userMail: "test@user.com",
        sessionId: "session123",
      },
    };
    res.locals.payload = { aud: "https://example.de" };

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
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.cookies = { refreshToken: "test-refresh-token" };
    req.body = {
      userInfo: {
        userMail: "test@user.com",
        sessionId: "session123",
      },
    };
    res.locals.payload = { aud: "https://example.de" };

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