import { Request, Response } from "express";
import { applicationCreate } from "./applicationCreate";
import { PrismaClient } from "@prisma/client";
import { domainWhitelist } from "../../app";

// jest.mock("@prisma/client");

jest.mock("@prisma/client", () => ({
    ...jest.requireActual('@prisma/client'),  // Keep other implementations intact
	application: {
        // findUnique: jest.fn(),
        create: jest.fn(),
    },
}));

const prisma = new PrismaClient();

describe("applicationCreate", () => {
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
    });

    it("should return 500 if applicationInfo is not present", async () => {
        await applicationCreate(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith("Internal Server Error");
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

        await applicationCreate(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith("Internal Server Error");
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

        await applicationCreate(req as Request, res as Response);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalled();
        expect(domainWhitelist).toContain("https://test.com");
    });
});