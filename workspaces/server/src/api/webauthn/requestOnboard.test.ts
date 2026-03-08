import { Request, Response } from "express";
import { PrismaClient } from "#prisma";
// Sauberer ESM-Import (Pfad anpassen, falls requestOnboard woanders liegt)
import { requestOnboard } from "#api/webauthn/requestOnboard";
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
describe("testRequestOnboard", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {};
    res = {
      locals: {},
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };
    vi.clearAllMocks(); // Wichtig: vi statt jest
  });

  it("should return 400 if payload is missing", async () => {
    await requestOnboard(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Payload not present");
  });

  it("should return 400 if user not found", async () => {
    res.locals = { payload: { aud: "https://example.de", userMail: "test@user.com" } };
    
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await requestOnboard(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User could not be found in database");
  });

  it("should return 400 if generateAuthenticationOptions fails", async () => {
    res.locals = { payload: { aud: "https://example.de", userMail: "test@user.com" } };
    
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
    res.locals = { payload: { aud: "https://example.de", userMail: "test@user.com" } };
    
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
    res.locals = { payload: { aud: "https://example.de", userMail: "test@user.com" } };
    
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