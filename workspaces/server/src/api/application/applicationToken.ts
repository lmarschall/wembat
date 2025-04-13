import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { cryptoService } from "../../crypto";
import { ApplicationInfo } from "../types";

export async function applicationToken(req: Request, res: Response, prisma: PrismaClient): Promise<void> {
    try {

        if (!req.body.applicationInfo) throw Error("Application Info not present");
		const { appUId } = req.body.applicationInfo as ApplicationInfo;
        const app = await prisma.application.findUnique({
            where: {
                uid: appUId
            }
        });

        if (app == undefined) throw Error("Application not found");

        const token = await cryptoService.createApplicationJWT(app);

        res.status(200).json(token);

    } catch (err: any) {
        console.error(err);
        res.status(500).send(err.message);
    }
}