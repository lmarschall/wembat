import { Application, PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

type ApplicationInfo = {
	appName: string;
    appDomain: string;
};

export async function applicationCreate(req: Request, res: Response) {
    try {

        if (!req.body.applicationInfo) throw Error("Application Info not present");
		const { appName, appDomain } = req.body.userInfo as ApplicationInfo;
        
        const app = await prisma.application
			.create({
				data: {
					name: appName,
					domain: appDomain,
				}
			})
			.catch((err) => {
				console.log(err);
				throw Error("Error while creating new application");
			}) as Application;

        res.json(app);

    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
}