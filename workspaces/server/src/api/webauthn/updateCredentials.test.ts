//// typescript
// filepath: /home/lukas/Source/wembat/backend/src/api/webauthn/updateCredentials.test.ts

import { Request, Response } from "express";
import { updateCredentials } from "./updateCredentials";
import { PrismaClient } from "@prisma/client";

// Prisma mocken
jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    session: {
      update: jest.fn(),
    },
  })),
}));

const prisma = new PrismaClient();

describe("testUpdateCredentials", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return 400 if updateCredentialsRequest is not present", async () => {
    await updateCredentials(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Challenge Response not present");
  });

  it("should return 400 if session update fails", async () => {
    req.body = {
      updateCredentialsRequest: {
        privKey: "testPrivKey",
        pubKey: "testPubKey",
        nonce: 1234,
        sessionId: "testSessionId",
      },
    };

    // const mockUpdate = jest
    //   .fn()
    //   .mockRejectedValue(new Error("Updating user challenge failed"));
    // (require("@prisma/client").PrismaClient as jest.Mock).mockImplementation(() => ({
    //   session: {
    //     update: mockUpdate,
    //   },
    // }));

    (prisma.session.update as jest.Mock).mockRejectedValue(
      new Error("Updating user challenge failed")
    );

    await updateCredentials(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Updating user challenge failed");
  });

  it("should return 200 and success if update is successful", async () => {
    req.body = {
      updateCredentialsRequest: {
        privKey: "testPrivKey",
        pubKey: "testPubKey",
        nonce: 9999,
        sessionId: "testSessionId",
      },
    };

    (prisma.session.update as jest.Mock).mockResolvedValue({});

    await updateCredentials(req as Request, res as Response, prisma);

    expect(prisma.session.update).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(JSON.stringify({ success: true }));
  });
});