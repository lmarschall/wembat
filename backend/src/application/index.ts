import { PrismaClient } from "@prisma/client";
import { createApplicationJWT } from "../crypto";

const prisma = new PrismaClient();

export const applicationTokens = new Map<string, string>();
export const applicationKeys = new Array<string>();

const registeredDomains =
	process.env.APP_DOMAINS || "localhost:3000, localhost:3001, localhost:3002";

const dashboardUrl = process.env.DASHBOARD_URL || "http://localhost:9090";

export async function initApplications(): Promise<boolean> {
	try {
		const domains = registeredDomains
			.split(",")
			.map((domain) => domain.trim());
		console.log(`Registering applications: ${domains}`);

		for (const domain of domains) {
			const app = await prisma.application
				.upsert({
					where: {
						domain: domain,
					},
					update: {},
					create: {
						domain: domain,
						name: domain,
					},
				})
				.catch((err) => {
					console.log(err);
					throw Error("App Create/Find failed");
				});

			const token = await createApplicationJWT(app);
			const appUrl = `https://${app.domain}`;
			applicationTokens.set(appUrl, token);
			applicationKeys.push(appUrl);
		}
		applicationKeys.push(dashboardUrl);
		return true;
	} catch (err) {
		console.error(err);
		return false;
	}
}
