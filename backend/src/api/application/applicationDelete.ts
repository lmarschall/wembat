import { Application, PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { ApplicationInfo } from "../types";
import { applicationKeys } from "../../application";

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

		const appUrl = `https://${app.domain}`;
		const index = applicationKeys.indexOf(appUrl);
		
		if (index !== -1) {
			applicationKeys.splice(index, 1);
		}

		res.status(200).send();

    } catch (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
    }
}