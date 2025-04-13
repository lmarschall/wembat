import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

export async function applicationList(req: Request, res: Response, prisma: PrismaClient): Promise<void> {
    try {

        const apps = await prisma.application.findMany();

        res.status(200).json(apps);

    } catch (err: any) {
        console.error(err);
        res.status(500).send(err.message);
    }
}