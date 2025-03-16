import { Application, PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { ApplicationInfo } from "../types";
import { redisService } from "../../redis";

export async function applicationDelete(req: Request, res: Response, prisma: PrismaClient) {
    try {

        if (!req.body.applicationInfo) throw Error("Application Info not present");
		const { appUId, appName, appDomain } = req.body.applicationInfo as ApplicationInfo;
        
        const app = await prisma.application
			.delete({
				where: {
					uid: appUId,
				}
			})
			.catch((err: any) => {
				console.log(err);
				throw Error("Error while deleting application");
			}) as Application;

		const appUrl = `https://${app.domain}`;
		await redisService.removeFromDomainWhitelist(appUrl);

		res.status(200).send();

    } catch (err: any) {
        console.error(err);
        res.status(500).send(err.message);
    }
}