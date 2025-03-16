import { Request, Response } from "express";
import { applicationCreate } from "./applicationCreate";
import { redisService } from "../../redis";

jest.mock("@prisma/client", () => {
    return {
        ...jest.requireActual('@prisma/client'),  // Keep other implementations intact
        PrismaClient: jest.fn().mockImplementation(() => ({
            application: {
                create: jest.fn(),
            },
        })),
    };
});

jest.mock("../../redis", () => ({
    redisService: {
      addToDomainWhitelist: jest.fn(),
    }
}));

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe("testApplicationCreate", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        req = {
            body: {},
        };
        res = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
        };
        jest.clearAllMocks();
    });

    it("should return 500 if applicationInfo is not present", async () => {
        await applicationCreate(req as Request, res as Response, prisma);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith("Application Info not present");
    });

    it("should return 500 if there is an error while creating the application", async () => {
        req.body = {
            applicationInfo: {
                appUId: "test-app-id",
                appName: "Test App",
                appDomain: "test.com",
            },
        };

        (prisma.application.create as jest.Mock).mockRejectedValue(
            new Error("Database error")
        );

        await applicationCreate(req as Request, res as Response, prisma);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith("Error while creating application");
    });

    it("should create an application and return 200 if valid data is provided", async () => {
        req.body = {
            applicationInfo: {
                appUId: "test-app-id",
                appName: "Test App",
                appDomain: "test.com",
            },
        };

        const mockApplication = {
            id: 1,
            name: "Test App",
            domain: "test.com",
        };

        (prisma.application.create as jest.Mock).mockResolvedValue(
            mockApplication
        );

        (redisService.addToDomainWhitelist as jest.Mock).mockResolvedValue({});

        await applicationCreate(req as Request, res as Response, prisma);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalled();
    });
});