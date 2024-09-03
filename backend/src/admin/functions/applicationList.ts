import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

export async function applicationList(req: Request, res: Response) {
    try {

        // const appUId = res.locals.payload.appUId;
        // const apps = await prisma.application.findMany({
        //     where: {
        //         appUId: appUId
        //     }
        // });
        const apps = await prisma.application.findMany();

        res.json(apps);

    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
}