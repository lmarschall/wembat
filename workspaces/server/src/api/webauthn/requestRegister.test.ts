import { Request, Response } from "express";
import { PrismaClient } from "./../generated/prisma/client";

// --- 1. PRISMA MOCK ---
const mockPrisma = {
  user: {
    upsert: jest.fn(),
    update: jest.fn(),
  },
};

// Ensure this matches the exact import path in your requestRegister.ts file
jest.mock("./../generated/prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

const prisma = (mockPrisma as unknown) as PrismaClient;

// --- 2. WEBAUTHN MOCK ---
const mockGenerateRegOptions = jest.fn();

jest.mock("@simplewebauthn/server", () => ({
  __esModule: true,
  generateRegistrationOptions: mockGenerateRegOptions,
}));

// --- 3. CRYPTO MOCK ---
const mockRandomBytes = jest.fn().mockReturnValue(Buffer.from("mockedRandomBytes"));

jest.mock("crypto", () => ({
  randomBytes: mockRandomBytes,
}));

// --- 4. DYNAMIC IMPORT OF CONTROLLER ---
// Load requestRegister AFTER the mocks are registered to prevent import hoisting bugs
const { requestRegister } = require("./requestRegister");

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
    
    mockPrisma.user.upsert.mockRejectedValue(new Error("DB error"));
    
    await requestRegister(req as Request, res as Response, prisma);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User could not be found or created in database");
  });

  it("should return 400 if generateRegistrationOptions fails", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = { userInfo: { userMail: "test@user.com" } };
    res.locals.payload = { aud: "https://test.de" };
    
    mockPrisma.user.upsert.mockResolvedValue({
      uid: "testUserUid",
      devices: [],
    });
    mockGenerateRegOptions.mockRejectedValue(new Error("Gen error"));
    
    await requestRegister(req as Request, res as Response, prisma);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Registration Option could not be generated");
  });

  it("should return 400 if user challenge could not be updated", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = { userInfo: { userMail: "test@user.com" } };
    res.locals.payload = { aud: "https://test.de" };
    
    mockPrisma.user.upsert.mockResolvedValue({
      uid: "testUserUid",
      devices: [],
    });
    mockGenerateRegOptions.mockResolvedValue({ challenge: "testChallenge" });
    mockPrisma.user.update.mockRejectedValue(new Error("Update error"));
    
    await requestRegister(req as Request, res as Response, prisma);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User challenge could not be updated");
  });

  it("should return 200 and options if successful", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    req.body = { userInfo: { userMail: "test@user.com" } };
    res.locals.payload = { aud: "https://test.de" };
    
    mockPrisma.user.upsert.mockResolvedValue({
      uid: "testUserUid",
      devices: [],
    });
    mockGenerateRegOptions.mockResolvedValue({ challenge: "mockChallenge" });
    mockPrisma.user.update.mockResolvedValue({ challenge: "mockChallenge" });

    await requestRegister(req as Request, res as Response, prisma);
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(JSON.stringify({ options: { challenge: "mockChallenge" } }));
  });
});