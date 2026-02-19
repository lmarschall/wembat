import { Request, Response } from "express";
import { PrismaClient } from "./../generated/prisma/client";

// --- 1. PRISMA MOCK ---
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

// Ensure this matches the exact import path in your requestOnboard.ts file
jest.mock("./../generated/prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

const prisma = (mockPrisma as unknown) as PrismaClient;

// --- 2. WEBAUTHN MOCK ---
const mockGenerateAuthOptions = jest.fn();

jest.mock("@simplewebauthn/server", () => ({
  __esModule: true,
  generateAuthenticationOptions: mockGenerateAuthOptions,
}));

// --- 3. DYNAMIC IMPORT OF CONTROLLER ---
// Load requestOnboard AFTER the mocks are registered to prevent import hoisting bugs
const { requestOnboard } = require("./requestOnboard");

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
    
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await requestOnboard(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User could not be found in database");
  });

  it("should return 400 if generateAuthenticationOptions fails", async () => {
    req.headers = req.headers || {};
    res.locals = res.locals || {};
    res.locals.payload = { aud: "https://example.de", userMail: "test@user.com" };
    
    mockPrisma.user.findUnique.mockResolvedValue({
      uid: "testUserUid",
      devices: [],
    });
    mockGenerateAuthOptions.mockRejectedValue(
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
    
    mockPrisma.user.findUnique.mockResolvedValue({
      uid: "testUserUid",
      devices: [],
    });
    mockGenerateAuthOptions.mockResolvedValue({
      challenge: "test-challenge",
      allowCredentials: [],
    });
    mockPrisma.user.update.mockRejectedValue(
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
    
    mockPrisma.user.findUnique.mockResolvedValue({
      uid: "testUserUid",
      devices: [{ credentialId: "123", transports: ["usb"] }],
    });
    mockGenerateAuthOptions.mockResolvedValue({
      challenge: "test-challenge",
      allowCredentials: [{ id: "123", transports: ["usb"] }],
    });
    mockPrisma.user.update.mockResolvedValue({
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