import { Application, PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { ApplicationInfo } from "..";

const prisma = new PrismaClient();

export async function applicationDelete(req: Request, res: Response) {
    try {

        if (!req.body.applicationInfo) throw Error("Application Info not present");
		const { appUId, appName, appDomain } = req.body.applicationInfo as ApplicationInfo;
        
        const app = await prisma.application
			.delete({
				where: {
					uid: appUId,
				}
			})
			.catch((err) => {
				console.log(err);
				throw Error("Error while deleting application");
			}) as Application;

        res.json(app);

    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
}