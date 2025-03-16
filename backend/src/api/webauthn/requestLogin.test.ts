//// typescript
// filepath: /home/lukas/Source/wembat/backend/src/api/webauthn/requestLogin.test.ts

import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { requestLogin } from "./requestLogin";
import { generateAuthenticationOptions } from "@simplewebauthn/server";

jest.mock("@prisma/client", () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    })),
  };
});

jest.mock("@simplewebauthn/server", () => ({
  generateAuthenticationOptions: jest.fn(),
}));

const prisma = new PrismaClient();

describe("testRequestLogin", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = { body: {} };
    res = {
      locals: {},
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 400 if userInfo is missing", async () => {
    await requestLogin(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User info not present");
  });

  it("should return 400 if payload is missing", async () => {
    req.body = { userInfo: { userMail: "test@user.com" } };

    await requestLogin(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Payload not present");
  });

  it("should return 400 if user is not found in database", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = { userInfo: { userMail: "test@user.com" } };
    res.locals.payload = { aud: "https://test.de" };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await requestLogin(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User could not be found in database");
  });

  it("should return 400 if generateAuthenticationOptions fails", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = { userInfo: { userMail: "test@user.com" } };
    res.locals.payload = { aud: "https://test.de" };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      uid: "userId",
      mail: "test@user.com",
      devices: [],
      sessions: [],
    });

    (generateAuthenticationOptions as jest.Mock).mockRejectedValue(
      new Error("Authentication Options could not be generated")
    );

    await requestLogin(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Authentication Options could not be generated");
  });

  it("should return 400 if user update fails", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = { userInfo: { userMail: "test@user.com" } };
    res.locals.payload = { aud: "https://test.de" };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      uid: "userId",
      mail: "test@user.com",
      devices: [],
      sessions: [],
    });

    (generateAuthenticationOptions as jest.Mock).mockResolvedValue({
      challenge: "test-challenge",
      allowCredentials: [],
    });

    (prisma.user.update as jest.Mock).mockRejectedValue(
      new Error("Updating user challenge failed")
    );

    await requestLogin(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Updating user challenge failed");
  });

  it("should return 200 and options if successful", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = { userInfo: { userMail: "test@user.com" } };
    res.locals.payload = { aud: "https://test.de" };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      uid: "userId",
      mail: "test@user.com",
      devices: [
        { uid: "dev1", credentialId: "abcd", transports: ["usb"] },
      ],
      sessions: [],
    });

    (generateAuthenticationOptions as jest.Mock).mockResolvedValue({
      challenge: "test-challenge",
      allowCredentials: [{ id: "abcd", transports: ["usb"] }],
    });

    (prisma.user.update as jest.Mock).mockResolvedValue({
      uid: "userId",
      challenge: "test-challenge",
    });

    await requestLogin(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      JSON.stringify({
        options: {
          challenge: "test-challenge",
          allowCredentials: [{ id: "abcd", transports: ["usb"] }],
        },
      })
    );
  });
});