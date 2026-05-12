import { Request, Response } from "express";
import { PrismaClient } from "#prisma";
// Sauberer ESM-Import (Passe den Pfad an, falls requestRegister woanders liegt)
import { requestRegister } from "#api/webauthn/requestRegister";
import { vi, describe, beforeEach, it, expect } from "vitest";

// --- 1. HOISTING DER MOCK VARIABLEN ---
const { 
  mockPrisma, 
  mockGenerateRegOptions, 
  mockRandomBytes 
} = vi.hoisted(() => {
  return {
    mockPrisma: {
      user: {
        upsert: vi.fn(),
        update: vi.fn(),
      },
    },
    mockGenerateRegOptions: vi.fn(),
    mockRandomBytes: vi.fn().mockReturnValue(Buffer.from("mockedRandomBytes")),
  };
});

// --- 2. REGISTRIERUNG DER MOCKS ---

// Prisma Alias Mock
vi.mock("#prisma", () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrisma),
}));

// WebAuthn Server Mock
vi.mock("@simplewebauthn/server", () => ({
  __esModule: true,
  generateRegistrationOptions: mockGenerateRegOptions,
}));

// Node Crypto Mock
vi.mock("crypto", () => ({
  randomBytes: mockRandomBytes,
}));

const prisma = (mockPrisma as unknown) as PrismaClient;

// --- 3. TEST SUITE ---
describe("testRequestRegister", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = { body: {} };
    res = {
      locals: {},
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };
    vi.clearAllMocks(); // Wichtig: vi statt jest
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
    res.locals = { payload: { aud: "https://test.de", userMail: "test@user.com" } };
    req.body = { userInfo: { userMail: "test@user.com" } };
    
    mockPrisma.user.upsert.mockRejectedValue(new Error("DB error"));
    
    await requestRegister(req as Request, res as Response, prisma);
    
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User could not be found or created in database");
  });

  it("should return 400 if generateRegistrationOptions fails", async () => {
    res.locals = { payload: { aud: "https://test.de", userMail: "test@user.com" } };
    req.body = { userInfo: { userMail: "test@user.com" } };
    
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
    res.locals = { payload: { aud: "https://test.de", userMail: "test@user.com" } };
    req.body = { userInfo: { userMail: "test@user.com" } };
    
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
    res.locals = { payload: { aud: "https://test.de", userMail: "test@user.com" } };
    req.body = { userInfo: { userMail: "test@user.com" } };
    
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