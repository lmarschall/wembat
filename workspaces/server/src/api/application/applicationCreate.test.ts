import { Request, Response } from "express";
import { PrismaClient } from "./../generated/prisma/client";

// --- 1. PRISMA MOCK ---
const mockPrisma = {
    application: {
        create: jest.fn(),
    },
};

// Ensure this matches the exact import path in your applicationCreate.ts file
jest.mock("./../generated/prisma/client", () => ({
    PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

const prisma = (mockPrisma as unknown) as PrismaClient;

// --- 2. REDIS MOCK ---
const mockAddToDomainWhitelist = jest.fn();

jest.mock("../../redis", () => ({
    redisService: {
      addToDomainWhitelist: mockAddToDomainWhitelist,
    }
}));

// --- 3. DYNAMIC IMPORT OF CONTROLLER ---
// Load applicationCreate AFTER the mocks are registered to prevent import hoisting bugs
const { applicationCreate } = require("./applicationCreate");

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

        mockPrisma.application.create.mockRejectedValue(
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

        mockPrisma.application.create.mockResolvedValue(mockApplication);
        mockAddToDomainWhitelist.mockResolvedValue({});

        await applicationCreate(req as Request, res as Response, prisma);

        // Verify the mocks were called
        expect(mockPrisma.application.create).toHaveBeenCalled();
        expect(mockAddToDomainWhitelist).toHaveBeenCalled();
        
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalled();
    });
});