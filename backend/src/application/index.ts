import { PrismaClient } from "@prisma/client";
import { createApplicationJWT } from "../crypto";

const prisma = new PrismaClient();

export const applicationKeys = new Array<string>();

const dashboardUrl = process.env.DASHBOARD_URL || "http://localhost:9090";

export async function initApplications(): Promise<boolean> {
	try {
		
		const apps = await prisma.application.findMany();

		for (const app of apps) {
			const appUrl = `https://${app.domain}`;
			applicationKeys.push(appUrl);
		}
		applicationKeys.push(dashboardUrl);
		return true;
	} catch (err) {
		console.error(err);
		return false;
	}
}
