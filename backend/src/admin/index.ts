import { Router } from "express";
import { applicationList } from "./functions/applicationList";
import { applicationCreate } from "./functions/applicationCreate";
import { applicationToken } from "./functions/applicationToken";
import { validateAdminFunctions } from "../validate";
import { createAdminJWT } from "../crypto";

export const adminRoutes = Router();

const dashboardUrl = process.env.DASHBOARD_URL || "http://localhost:9090";

adminRoutes.get(
	"/application/list",
	validateAdminFunctions,
	async (req, res) => applicationList(req, res)
);

adminRoutes.post(
	"/application/token",
	validateAdminFunctions,
	async (req, res) => applicationToken(req, res)
);

adminRoutes.post(
	"/application/create",
	validateAdminFunctions,
	async (req, res) => applicationCreate(req, res)
);

export async function initAdmin(): Promise<boolean> {
	try {
		const token = await createAdminJWT();
		console.log(`Dashboard Url: ${dashboardUrl}/${token}`);
		return true;
	} catch (err) {
		console.error(err);
		return false;
	}
}
