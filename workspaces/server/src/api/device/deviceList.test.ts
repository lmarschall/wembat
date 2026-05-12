import { Request, Response } from "express";
import { PrismaClient } from "#prisma";
// Sauberer ESM-Import (Passe den Pfad an, falls die Datei woanders liegt)
import { deviceList } from "#api/device/deviceList";
import { vi, describe, beforeEach, it, expect } from "vitest";

// --- 1. HOISTING DER MOCK VARIABLEN ---
const { mockPrisma } = vi.hoisted(() => {
    return {
        mockPrisma: {
            user: {
                findUnique: vi.fn(),
            },
        },
    };
});

// --- 2. REGISTRIERUNG DER MOCKS ---
// Nutzt jetzt deinen #prisma Alias anstelle des relativen Pfades
vi.mock("#prisma", () => ({
    PrismaClient: vi.fn().mockImplementation(() => mockPrisma),
}));

const prisma = (mockPrisma as unknown) as PrismaClient;

// --- 3. TEST SUITE ---
describe("deviceList", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        req = { body: {} };
        res = {
            locals: {},
            status: vi.fn().mockReturnThis(),
            send: vi.fn(),
            json: vi.fn(),
        };
        vi.clearAllMocks(); // Wichtig: vi statt jest
    });

    it("should return 500 if payload is not present", async () => {
        await deviceList(req as Request, res as Response, prisma);
        
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith("Payload not present");
    });

    it("should return 500 if prisma.user.findUnique throws an error", async () => {
        res.locals = { payload: { userMail: "test@example.com" } };
        
        mockPrisma.user.findUnique.mockRejectedValue(new Error("DB error"));
        
        await deviceList(req as Request, res as Response, prisma);
        
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith("User could not be found in database");
    });

    it("should return 500 if user is not found", async () => {
        res.locals = { payload: { userMail: "test@example.com" } };
        
        mockPrisma.user.findUnique.mockResolvedValue(null);
        
        await deviceList(req as Request, res as Response, prisma);
        
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith("User could not be found in database");
    });

    it("should return 200 and user devices if user is found", async () => {
        const fakeDevices = [{ id: 1, name: "Device1" }, { id: 2, name: "Device2" }];
        res.locals = { payload: { userMail: "test@example.com" } };
        
        mockPrisma.user.findUnique.mockResolvedValue({
            mail: "test@example.com",
            devices: fakeDevices,
        });
        
        await deviceList(req as Request, res as Response, prisma);
        
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(fakeDevices);
    });
});