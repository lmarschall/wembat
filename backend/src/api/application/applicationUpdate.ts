import { Application, PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { ApplicationInfo } from "../types";
import { redisService } from "../../redis";

export async function applicationUpdate(req: Request, res: Response, prisma: PrismaClient) {
    try {

        if (!req.body.applicationInfo) throw Error("Application Info not present");
		const { appUId, appName, appDomain } = req.body.applicationInfo as ApplicationInfo;

		const tempApp = await prisma.application
			.findUnique({
				where: {
					uid: appUId
				}
			})
			.catch((err) => {
				console.log(err);
				throw Error("Error while updating application");
			}) as Application;
        
        const app = await prisma.application
			.update({
				where: {
					uid: appUId
				},
				data: {
					name: appName,
					domain: appDomain,
				}
			})
			.catch((err) => {
				console.log(err);
				throw Error("Error while updating application");
			}) as Application;

		const appUrl = `https://${tempApp.domain}`;
		
		await redisService.removeFromDomainWhitelist(appUrl);
		await redisService.addToDomainWhitelist(app.domain);

		res.status(200).send();

    } catch (err: any) {
        console.error(err);
        res.status(500).send(err.message);
    }
}