import { Request, Response } from "express";
import { PrismaClient } from "./../generated/prisma/client";

// --- 1. PRISMA MOCK ---
const mockPrisma = {
    user: {
        findUnique: jest.fn(),
    },
};

// Ensure this matches the exact import path in your deviceList.ts file
jest.mock("./../generated/prisma/client", () => ({
    PrismaClient: jest.fn().mockImplementation(() => mockPrisma),
}));

const prisma = (mockPrisma as unknown) as PrismaClient;

// --- 2. DYNAMIC IMPORT OF CONTROLLER ---
// Load deviceList AFTER the mocks are registered to prevent import hoisting bugs
const { deviceList } = require("./deviceList");

describe("deviceList", () => {
    let req: Partial<Request>;
    let res: Partial<Response>;

    beforeEach(() => {
        req = { body: {} };
        res = {
            locals: {},
            status: jest.fn().mockReturnThis(),
            send: jest.fn(),
            json: jest.fn(),
        };
        jest.clearAllMocks();
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