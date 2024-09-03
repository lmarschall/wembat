import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { createApplicationJWT } from "../../crypto";

const prisma = new PrismaClient();

interface ApplicationInfo {
    appUId: string;
}

export async function applicationToken(req: Request, res: Response) {
    try {

        // const appUId = res.locals.payload.appUId;
        if (!req.body.applicationInfo) throw Error("Application Info not present");
		const { appUId } = req.body.userInfo as ApplicationInfo;
        const app = await prisma.application.findUnique({
            where: {
                uid: appUId
            }
        });

        const token = await createApplicationJWT(app);

        res.json(token);

    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
}