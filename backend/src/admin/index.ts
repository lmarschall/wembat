import { Router } from "express";
import { applicationList } from "./functions/applicationList";
import { applicationCreate } from "./functions/applicationCreate";
import { applicationToken } from "./functions/applicationToken";
import { validateJWTToken } from "../validate";

export const adminRoutes = Router();

adminRoutes.get(
	"/application/list",
	validateJWTToken,
	async (req, res) => applicationList(req, res)
);

adminRoutes.post(
	"/application/token",
	validateJWTToken,
	async (req, res) => applicationToken(req, res)
);

adminRoutes.post(
	"/application/create",
	validateJWTToken,
	async (req, res) => applicationCreate(req, res)
);
