//// typescript
// filepath: /home/lukas/Source/wembat/backend/src/api/webauthn/refresh.test.ts

import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { refresh } from "./refresh";
import { cryptoService } from "../../crypto";

// Prisma und cryptoService mocken
jest.mock("@prisma/client", () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      user: {
        findUnique: jest.fn(),
      },
    })),
  };
});

jest.mock("../../crypto", () => ({
  cryptoService: {
    createSessionToken: jest.fn(),
  },
}));

const prisma = new PrismaClient();

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
    // refreshToken nicht vorhanden
    await refresh(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Refresh Token not present");
  });

  it("should return error if userInfo is missing", async () => {
    req.cookies = { refreshToken: "test-refresh-token" };
    // userInfo nicht definiert
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
    // res.locals.payload nicht gesetzt

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
    res.locals.payload = {
      aud: "https://example.de",
    };

    // findUnique wirft einen Fehler
    (prisma.user.findUnique as jest.Mock).mockRejectedValue(
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
    res.locals.payload = {
      aud: "https://example.de",
    };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

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
    res.locals.payload = {
      aud: "https://example.de",
    };

    // findUnique gibt einen User ohne passende Session zurück
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
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
    res.locals.payload = {
      aud: "https://example.de",
    };

    // findUnique gibt User + Session zurück
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
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

    (cryptoService.createSessionToken as jest.Mock).mockResolvedValue("test-session-token");

    await refresh(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      JSON.stringify({
        token: "test-session-token",
      })
    );
  });
});