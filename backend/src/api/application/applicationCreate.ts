import { Request, Response } from "express";
import { Application, PrismaClient } from "@prisma/client";
import { ApplicationInfo } from "../types";
import { error } from "console";
// import { domainWhitelist } from "../../app";

// const prisma = new PrismaClient();

export async function applicationCreate(req: Request, res: Response, prisma: PrismaClient) {
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

		console.log(app);

		const appUrl = `https://${app.domain}`;
		// domainWhitelist.push(appUrl);

        res.status(200).send();

    } catch (err: any) {
        console.error(err);
        res.status(500).send(err.message);
    }
}