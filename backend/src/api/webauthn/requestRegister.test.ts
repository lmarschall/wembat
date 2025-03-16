import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { requestRegister } from "./requestRegister";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { randomBytes } from "crypto";

jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    user: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
  })),
}));

jest.mock("@simplewebauthn/server", () => ({
  generateRegistrationOptions: jest.fn(),
}));

jest.mock("crypto", () => ({
  randomBytes: jest.fn().mockReturnValue(Buffer.from("mockedRandomBytes")),
}));

const prisma = new PrismaClient();

describe("testRequestRegister", () => {
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
    await requestRegister(req as Request, res as Response, prisma);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User info not present");
  });

  it("should return 400 if payload is missing", async () => {
    req.body = { userInfo: { userMail: "test@user.com" } };
    await requestRegister(req as Request, res as Response, prisma);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Payload not present");
  });

  it("should return 400 if user could not be created", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = { userInfo: { userMail: "test@user.com" } };
    res.locals.payload = { aud: "https://test.de" };
    (prisma.user.upsert as jest.Mock).mockRejectedValue(new Error("DB error"));
    await requestRegister(req as Request, res as Response, prisma);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User could not be found or created in database");
  });

  it("should return 400 if generateRegistrationOptions fails", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = { userInfo: { userMail: "test@user.com" } };
    res.locals.payload = { aud: "https://test.de" };
    (prisma.user.upsert as jest.Mock).mockResolvedValue({
      uid: "testUserUid",
      devices: [],
    });
    (generateRegistrationOptions as jest.Mock).mockRejectedValue(new Error("Gen error"));
    await requestRegister(req as Request, res as Response, prisma);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Registration Option could not be generated");
  });

  it("should return 400 if user challenge could not be updated", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = { userInfo: { userMail: "test@user.com" } };
    res.locals.payload = { aud: "https://test.de" };
    (prisma.user.upsert as jest.Mock).mockResolvedValue({
      uid: "testUserUid",
      devices: [],
    });
    (generateRegistrationOptions as jest.Mock).mockResolvedValue({ challenge: "testChallenge" });
    (prisma.user.update as jest.Mock).mockRejectedValue(new Error("Update error"));
    await requestRegister(req as Request, res as Response, prisma);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User challenge could not be updated");
  });

  it("should return 200 and options if successful", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = { userInfo: { userMail: "test@user.com" } };
    res.locals.payload = { aud: "https://test.de" };
    (prisma.user.upsert as jest.Mock).mockResolvedValue({
      uid: "testUserUid",
      devices: [],
    });
    (generateRegistrationOptions as jest.Mock).mockResolvedValue({ challenge: "mockChallenge" });
    (prisma.user.update as jest.Mock).mockResolvedValue({ challenge: "mockChallenge" });

    await requestRegister(req as Request, res as Response, prisma);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(JSON.stringify({ options: { challenge: "mockChallenge" } }));
  });
});