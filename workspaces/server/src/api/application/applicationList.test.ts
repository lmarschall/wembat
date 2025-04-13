//// typescript
// filepath: /home/lukas/Source/wembat/backend/src/api/application/applicationList.test.ts

import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { applicationList } from "./applicationList";

// Prisma-Client mocken
jest.mock("@prisma/client", () => {
  return {
    PrismaClient: jest.fn().mockImplementation(() => ({
      application: {
        findMany: jest.fn(),
      },
    })),
  };
});

const prisma = new PrismaClient();

describe("testApplicationList", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
    };
    jest.clearAllMocks();
  });

  it("should return a list of applications", async () => {
    const mockApplications = [
      { uid: "app1", name: "Test App 1", domain: "test1.com" },
      { uid: "app2", name: "Test App 2", domain: "test2.com" },
    ];

    (prisma.application.findMany as jest.Mock).mockResolvedValue(mockApplications);

    await applicationList(req as Request, res as Response, prisma);

    expect(prisma.application.findMany).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(mockApplications);
  });

  it("should return 500 if an error occurs while listing applications", async () => {
    (prisma.application.findMany as jest.Mock).mockRejectedValue(
      new Error("Database error")
    );

    await applicationList(req as Request, res as Response, prisma);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Database error");
  });
});