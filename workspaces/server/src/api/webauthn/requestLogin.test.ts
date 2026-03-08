import { Request, Response } from "express";
import { PrismaClient } from "#prisma";
// Sauberer ESM-Import
import { requestLogin } from "#api/webauthn/requestLogin"; 
import { vi, describe, beforeEach, it, expect } from "vitest";

// --- 1. HOISTING DER MOCK VARIABLEN ---
const { mockPrisma, mockGenerateAuthOptions } = vi.hoisted(() => {
  return {
    mockPrisma: {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    },
    mockGenerateAuthOptions: vi.fn(),
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
  generateAuthenticationOptions: mockGenerateAuthOptions,
}));

const prisma = (mockPrisma as unknown) as PrismaClient;

// --- 3. TEST SUITE ---
describe("testRequestLogin", () => {
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
    res.locals = { payload: { aud: "https://test.de" } };
    req.body = { userInfo: { userMail: "test@user.com" } };

    mockPrisma.user.findUnique.mockResolvedValue(null);

    await requestLogin(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User could not be found in database");
  });

  it("should return 400 if generateAuthenticationOptions fails", async () => {
    res.locals = { payload: { aud: "https://test.de" } };
    req.body = { userInfo: { userMail: "test@user.com" } };

    mockPrisma.user.findUnique.mockResolvedValue({
      uid: "userId",
      mail: "test@user.com",
      devices: [],
      sessions: [],
    });

    mockGenerateAuthOptions.mockRejectedValue(
      new Error("Authentication Options could not be generated")
    );

    await requestLogin(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Authentication Options could not be generated");
  });

  it("should return 400 if user update fails", async () => {
    res.locals = { payload: { aud: "https://test.de" } };
    req.body = { userInfo: { userMail: "test@user.com" } };

    mockPrisma.user.findUnique.mockResolvedValue({
      uid: "userId",
      mail: "test@user.com",
      devices: [],
      sessions: [],
    });

    mockGenerateAuthOptions.mockResolvedValue({
      challenge: "test-challenge",
      allowCredentials: [],
    });

    mockPrisma.user.update.mockRejectedValue(
      new Error("Updating user challenge failed")
    );

    await requestLogin(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Updating user challenge failed");
  });

  it("should return 200 and options if successful", async () => {
    res.locals = { payload: { aud: "https://test.de" } };
    req.body = { userInfo: { userMail: "test@user.com" } };

    mockPrisma.user.findUnique.mockResolvedValue({
      uid: "userId",
      mail: "test@user.com",
      devices: [
        { uid: "dev1", credentialId: "abcd", transports: ["usb"] },
      ],
      sessions: [],
    });

    mockGenerateAuthOptions.mockResolvedValue({
      challenge: "test-challenge",
      allowCredentials: [{ id: "abcd", transports: ["usb"] }],
    });

    mockPrisma.user.update.mockResolvedValue({
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