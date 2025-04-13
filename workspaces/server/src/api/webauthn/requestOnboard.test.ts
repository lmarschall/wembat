//// typescript
// filepath: /home/lukas/Source/wembat/backend/src/api/webauthn/requestOnboard.test.ts

import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { requestOnboard } from "./requestOnboard";
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

describe("testRequestOnboard", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {};
    res = {
      locals: {},
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 400 if payload is missing", async () => {
    await requestOnboard(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Payload not present");
  });

  it("should return 400 if user not found", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    res.locals.payload = { aud: "https://example.de", userMail: "test@user.com" };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await requestOnboard(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User could not be found in database");
  });

  it("should return 400 if generateAuthenticationOptions fails", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    res.locals.payload = { aud: "https://example.de", userMail: "test@user.com" };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      uid: "testUserUid",
      devices: [],
    });
    (generateAuthenticationOptions as jest.Mock).mockRejectedValue(
      new Error("Authentication Options could not be generated")
    );

    await requestOnboard(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Authentication Options could not be generated");
  });

  it("should return 400 if updating user challenge fails", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    res.locals.payload = { aud: "https://example.de", userMail: "test@user.com" };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      uid: "testUserUid",
      devices: [],
    });
    (generateAuthenticationOptions as jest.Mock).mockResolvedValue({
      challenge: "test-challenge",
      allowCredentials: [],
    });
    (prisma.user.update as jest.Mock).mockRejectedValue(
      new Error("Updating user challenge failed")
    );

    await requestOnboard(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Updating user challenge failed");
  });

  it("should return 200 and options when successful", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    res.locals.payload = { aud: "https://example.de", userMail: "test@user.com" };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      uid: "testUserUid",
      devices: [{ credentialId: "123", transports: ["usb"] }],
    });
    (generateAuthenticationOptions as jest.Mock).mockResolvedValue({
      challenge: "test-challenge",
      allowCredentials: [{ id: "123", transports: ["usb"] }],
    });
    (prisma.user.update as jest.Mock).mockResolvedValue({
      uid: "testUserUid",
      challenge: "test-challenge",
    });

    await requestOnboard(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      JSON.stringify({
        options: {
          challenge: "test-challenge",
          allowCredentials: [{ id: "123", transports: ["usb"] }],
        },
      })
    );
  });
});