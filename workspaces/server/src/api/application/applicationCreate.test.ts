import { Request, Response } from "express";
import { PrismaClient } from "#prisma";
// Sauberer ESM Import ganz oben! Vitest kümmert sich um die richtige Reihenfolge.
import { applicationCreate } from "#api/application/applicationCreate";
import { vi, describe, beforeEach, it, expect } from "vitest";

// --- 1. HOISTING DER MOCK VARIABLEN ---
// Alles was innerhalb von vi.mock verwendet wird, MUSS hier rein!
const { mockPrisma, mockAddToDomainWhitelist } = vi.hoisted(() => {
    return {
        mockPrisma: {
            application: {
                create: vi.fn(),
            },
        },
        mockAddToDomainWhitelist: vi.fn(),
    };
});

// --- 2. REGISTRIERUNG DER MOCKS ---
vi.mock("#prisma", () => ({
    PrismaClient: vi.fn().mockImplementation(() => mockPrisma),
}));

vi.mock("#redis", () => ({
    redisService: {
        addToDomainWhitelist: mockAddToDomainWhitelist,
    }
}));

const prisma = (mockPrisma as unknown) as PrismaClient;

// --- 3. TEST SUITE ---
describe("testApplicationCreate", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        req = {
            body: {},
        };
        res = {
            status: vi.fn().mockReturnThis(),
            send: vi.fn(),
        };
        vi.clearAllMocks(); // Wichtig: vi statt jest
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