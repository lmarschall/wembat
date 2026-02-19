import { Request, Response } from "express";
import { PrismaClient } from "./../generated/prisma/client";

// --- 1. PRISMA MOCK ---
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
};

// Ensure this matches the exact import path in your requestLink.ts file
jest.mock("./../generated/prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

const prisma = (mockPrisma as unknown) as PrismaClient;

// --- 2. WEBAUTHN SERVER MOCK ---
const mockGenerateRegOptions = jest.fn();

jest.mock("@simplewebauthn/server", () => ({
  __esModule: true,
  generateRegistrationOptions: mockGenerateRegOptions,
}));

// --- 3. WEBAUTHN HELPERS MOCK ---
const mockFromUTF8String = jest.fn().mockImplementation((str: string) => Buffer.from(str));

jest.mock("@simplewebauthn/server/helpers", () => ({
  __esModule: true,
  isoUint8Array: {
    fromUTF8String: mockFromUTF8String,
  },
}));

// --- 4. DYNAMIC IMPORT OF CONTROLLER ---
// Load requestLink AFTER the mocks are registered to prevent import hoisting bugs
const { requestLink } = require("./requestLink");

describe("requestLink", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {};
    res = {
      locals: {},
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 400 if payload is not present", async () => {
    await requestLink(req as Request, res as Response, prisma);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Payload not present");
  });

  it("should return 400 if prisma.user.findUnique rejects", async () => {
    res.locals = { payload: { aud: "https://example.com", userMail: "test@example.com" } };
    
    mockPrisma.user.findUnique.mockRejectedValue(new Error("DB error"));
    
    await requestLink(req as Request, res as Response, prisma);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User could not be found or created in database");
  });

  it("should return 400 if user is not found", async () => {
    res.locals = { payload: { aud: "https://example.com", userMail: "test@example.com" } };
    
    mockPrisma.user.findUnique.mockResolvedValue(null);
    
    await requestLink(req as Request, res as Response, prisma);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User could not be found in database");
  });

  it("should return 400 if generateRegistrationOptions fails", async () => {
    const fakeUser = {
      uid: "user123",
      mail: "test@example.com",
      devices: [],
    };
    res.locals = { payload: { aud: "https://example.com", userMail: "test@example.com" } };
    
    mockPrisma.user.findUnique.mockResolvedValue(fakeUser);
    mockGenerateRegOptions.mockRejectedValue(new Error("Gen error"));

    await requestLink(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Registration Option could not be generated");
  });

  it("should return 400 if prisma.user.update fails", async () => {
    const fakeUser = {
      uid: "user123",
      mail: "test@example.com",
      devices: [{ credentialId: "cred1", transports: ["usb"] }],
    };
    res.locals = { payload: { aud: "https://example.com", userMail: "test@example.com" } };

    const fakeOptions = {
      challenge: "testChallenge",
      extensions: { prf: { eval: { first: [1, 2, 3] } } },
    };

    mockPrisma.user.findUnique.mockResolvedValue(fakeUser);
    mockGenerateRegOptions.mockResolvedValue(fakeOptions);
    mockPrisma.user.update.mockRejectedValue(new Error("Update error"));

    await requestLink(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User challenge could not be updated");
  });

  it("should return 200 with registration options on success", async () => {
    const fakeUser = {
      uid: "user123",
      mail: "test@example.com",
      devices: [{ credentialId: "cred1", transports: ["usb"] }],
    };
    const fakeOptions = {
      challenge: "testChallenge",
      extensions: { prf: { eval: { first: [1, 2, 3] } } },
    };
    res.locals = { payload: { aud: "https://example.com", userMail: "test@example.com" } };

    mockPrisma.user.findUnique.mockResolvedValue(fakeUser);
    mockGenerateRegOptions.mockResolvedValue(fakeOptions);
    mockPrisma.user.update.mockResolvedValue({ uid: fakeUser.uid, challenge: fakeOptions.challenge });

    await requestLink(req as Request, res as Response, prisma);

    // Using the explicit mock variables directly for your assertions!
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { mail: "test@example.com" },
      include: { devices: true },
    });
    expect(mockFromUTF8String).toHaveBeenCalledWith(fakeUser.uid);
    expect(mockGenerateRegOptions).toHaveBeenCalled();
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { uid: fakeUser.uid },
      data: { challenge: fakeOptions.challenge },
    });
    
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(JSON.stringify({ options: fakeOptions }));
  });
});