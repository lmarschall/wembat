//// typescript
// filepath: /home/lukas/Source/wembat/backend/src/api/device/deviceList.test.ts

import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { deviceList } from "./deviceList";

// PrismaClient mocken
jest.mock("@prisma/client", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { PrismaClient: jest.fn().mockImplementation(() => ({
        user: {
            findUnique: jest.fn(),
        },
    })) };
});

const prisma = new PrismaClient();

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
        (prisma.user.findUnique as jest.Mock).mockRejectedValue(new Error("DB error"));
        await deviceList(req as Request, res as Response, prisma);
        expect(res.status).toHaveBeenCalledWith(500);
        // The function throws "User could not be found in database" in the catch block.
        expect(res.send).toHaveBeenCalledWith("User could not be found in database");
    });

    it("should return 500 if user is not found", async () => {
        res.locals = { payload: { userMail: "test@example.com" } };
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        await deviceList(req as Request, res as Response, prisma);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith("User could not be found in database");
    });

    it("should return 200 and user devices if user is found", async () => {
        const fakeDevices = [{ id: 1, name: "Device1" }, { id: 2, name: "Device2" }];
        res.locals = { payload: { userMail: "test@example.com" } };
        (prisma.user.findUnique as jest.Mock).mockResolvedValue({
            mail: "test@example.com",
            devices: fakeDevices,
        });
        await deviceList(req as Request, res as Response, prisma);
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(fakeDevices);
    });
});