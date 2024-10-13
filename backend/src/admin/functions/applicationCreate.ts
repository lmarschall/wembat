import { Application, PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { ApplicationInfo } from "..";
import { applicationKeys } from "../../application";

const prisma = new PrismaClient();

export async function applicationCreate(req: Request, res: Response) {
    try {

        if (!req.body.applicationInfo) throw Error("Application Info not present");
		const { appUId, appName, appDomain } = req.body.applicationInfo as ApplicationInfo;
        
        const app = await prisma.application
			.create({
				data: {
					name: appName,
					domain: appDomain,
				}
			})
			.catch((err) => {
				console.log(err);
				throw Error("Error while creating application");
			}) as Application;

		const appUrl = `https://${app.domain}`;
		applicationKeys.push(appUrl);

        res.status(200).send();

    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
}