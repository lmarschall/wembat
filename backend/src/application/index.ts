import { PrismaClient } from "@prisma/client";
import { createApplicationJWT } from "../crypto";

const prisma = new PrismaClient();

export const applicationTokens = new Map<string, string>();
export const applicationKeys = new Array<string>();

const registeredDomains =
	process.env.APP_DOMAINS || "localhost:3000, localhost:3001, localhost:3002";

export async function initApplications() {
	const domains = registeredDomains.split(",").map((domain) => domain.trim());
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
		console.log(`Application ${appUrl} registered with token ${token}`);
	}
}
