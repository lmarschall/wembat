import { Router } from "express";
import { listApplications } from "./functions/listApplications";

export const adminRoutes = Router();

// const validateJWTToken = [validateWebAuthnToken];

adminRoutes.get(
	"/application/list",
	// validateJWTToken,
	async (req, res) => listApplications(req, res)
);
