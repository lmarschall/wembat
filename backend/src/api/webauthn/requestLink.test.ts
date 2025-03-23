//// typescript
// filepath: /home/lukas/Source/wembat/backend/src/api/webauthn/requestLink.test.ts

import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { requestLink } from "./requestLink";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { isoUint8Array } from '@simplewebauthn/server/helpers';

// Mock PrismaClient
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

// Mock generateRegistrationOptions from simplewebauthn
jest.mock("@simplewebauthn/server", () => ({
  generateRegistrationOptions: jest.fn(),
}));

// Mock isoUint8Array.fromUTF8String
jest.mock('@simplewebauthn/server/helpers', () => ({
  isoUint8Array: {
    fromUTF8String: jest.fn().mockImplementation((str: string) => Buffer.from(str))
  }
}));

const prisma = new PrismaClient();

describe("requestLink", () => {
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

  it("should return 400 if payload is not present", async () => {
    await requestLink(req as Request, res as Response, prisma);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Payload not present");
  });

  it("should return 400 if prisma.user.findUnique throws an error", async () => {
    res.locals = { payload: { aud: "https://example.com", userMail: "test@example.com" } };
    (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error("DB error"));
    
    await requestLink(req as Request, res as Response, prisma);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User could not be found or created in database");
  });

  it("should return 400 if user is not found", async () => {
    res.locals = { payload: { aud: "https://example.com", userMail: "test@example.com" } };
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    
    await requestLink(req as Request, res as Response, prisma);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User could not be found in database");
  });

  it("should return 400 if generateRegistrationOptions fails", async () => {
    res.locals = { payload: { aud: "https://example.com", userMail: "test@example.com" } };
    // Return a fake user with devices array.
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      uid: "user123",
      mail: "test@example.com",
      devices: []
    });
    (generateRegistrationOptions as jest.Mock).mockRejectedValue(new Error("Gen error"));
    
    await requestLink(req as Request, res as Response, prisma);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Registration Option could not be generated");
  });

  it("should return 400 if updating user challenge fails", async () => {
    res.locals = { payload: { aud: "https://example.com", userMail: "test@example.com" } };
    const fakeOptions = { challenge: "testChallenge", extensions: { prf: { eval: { first: [1,2,3] } } } };
    
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      uid: "user123",
      mail: "test@example.com",
      devices: []
    });
    (generateRegistrationOptions as jest.Mock).mockResolvedValue(fakeOptions);
    (prisma.user.update as jest.Mock).mockRejectedValue(new Error("Update error"));
    
    await requestLink(req as Request, res as Response, prisma);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("User challenge could not be updated");
  });

  it("should return 200 with registration options on success", async () => {
    res.locals = { payload: { aud: "https://example.com", userMail: "test@example.com" } };
    const fakeOptions = { challenge: "testChallenge", extensions: { prf: { eval: { first: [1,2,3] } } } };
    
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      uid: "user123",
      mail: "test@example.com",
      devices: []
    });
    (generateRegistrationOptions as jest.Mock).mockResolvedValue(fakeOptions);
    (prisma.user.update as jest.Mock).mockResolvedValue({ uid: "user123", challenge: "testChallenge" });
    
    await requestLink(req as Request, res as Response, prisma);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: {
        mail: "test@example.com",
      },
      include: { devices: true }
    });
    expect(generateRegistrationOptions).toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { uid: "user123" },
      data: { challenge: "testChallenge" }
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(JSON.stringify({ options: fakeOptions }));
  });
});