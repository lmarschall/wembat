//// typescript
// filepath: /home/lukas/Source/wembat/backend/src/api/webauthn/register.test.ts

import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { register } from "./register";
import { verifyRegistrationResponse } from "@simplewebauthn/server";

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      findUnique: jest.fn(),
    },
    device: {
      upsert: jest.fn(),
    },
  })),
}));

jest.mock("@simplewebauthn/server", () => ({
  verifyRegistrationResponse: jest.fn(),
}));

const prisma = new PrismaClient();

describe("testRegister", () => {
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

  it("should return 400 if registerChallengeResponse is not present", async () => {
    await register(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Register Challenge Response not present");
  });

  it("should return 400 if payload is missing", async () => {
    req.body = { registerChallengeResponse: { challenge: "testChallenge" } };
    await register(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Payload not present");
  });

  it("should return 400 if user is not found", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = { registerChallengeResponse: { challenge: "testChallenge" } };
    res.locals.payload = { aud: "https://example.com" };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await register(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Could not find user for given challenge");
  });

  it("should return 400 if verifyRegistrationResponse fails", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = { registerChallengeResponse: { challenge: "testChallenge", credentials: {} } };
    res.locals.payload = { aud: "https://example.com" };

    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      uid: "userUid",
      challenge: "testChallenge",
      devices: [],
    });

    (verifyRegistrationResponse as jest.Mock).mockRejectedValue(
      new Error("Registration Response could not be verified")
    );

    await register(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Registration Response could not be verified");
  });

  it("should return 400 if verified is false", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = {
      registerChallengeResponse: { challenge: "testChallenge", credentials: {} },
    };
    res.locals.payload = { aud: "https://example.com" };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      uid: "userUid",
      challenge: "testChallenge",
      devices: [],
    });
    (verifyRegistrationResponse as jest.Mock).mockResolvedValue({
      verified: false,
    });

    await register(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Could not verifiy reponse");
  });

  it("should return 400 if registrationInfo is missing", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = {
      registerChallengeResponse: { challenge: "testChallenge", credentials: {} },
    };
    res.locals.payload = { aud: "https://example.com" };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      uid: "userUid",
      challenge: "testChallenge",
      devices: [],
    });
    (verifyRegistrationResponse as jest.Mock).mockResolvedValue({
      verified: true,
      registrationInfo: null,
    });

    await register(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Registration Info not present");
  });

  it("should return 400 if device upsert fails", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = {
      registerChallengeResponse: {
        challenge: "testChallenge",
        credentials: {
          response: { transports: ["usb"] },
        },
      },
    };
    res.locals.payload = { aud: "https://example.com" };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      uid: "userUid",
      challenge: "testChallenge",
      devices: [],
    });
    (verifyRegistrationResponse as jest.Mock).mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: "credentialId",
          publicKey: new Uint8Array([1, 2, 3]),
          counter: 0,
        },
      },
    });
    (prisma.device.upsert as jest.Mock).mockRejectedValue(
      new Error("Device Registration update or create failed")
    );

    await register(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Device Regitration update or create failed");
  });

  it("should return 200 and verified if successful", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = {
      registerChallengeResponse: {
        challenge: "testChallenge",
        credentials: {
          response: { transports: ["usb"] },
        },
      },
    };
    res.locals.payload = { aud: "https://example.com" };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      uid: "userUid",
      challenge: "testChallenge",
      devices: [],
    });
    (verifyRegistrationResponse as jest.Mock).mockResolvedValue({
      verified: true,
      registrationInfo: {
        credential: {
          id: "credentialId",
          publicKey: new Uint8Array([1, 2, 3]),
          counter: 0,
        },
      },
    });
    (prisma.device.upsert as jest.Mock).mockResolvedValue({});

    await register(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(JSON.stringify({ verified: true }));
  });
});