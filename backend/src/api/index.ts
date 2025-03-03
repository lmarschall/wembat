import { Router } from "express";
import { Request, Response } from "express";
import { applicationList } from "./application/applicationList";
import { applicationCreate } from "./application/applicationCreate";
import { applicationToken } from "./application/applicationToken";
import { applicationUpdate } from "./application/applicationUpdate";
import { applicationDelete } from "./application/applicationDelete";
import { createAdminJWT } from "../crypto";
import { requestRegister } from "./webauthn/requestRegister";
import { validateAdminFunctions, validateAppFunctions, validateWebAuthnFunctions } from "./validate";
import { register } from "./webauthn/register";
import { refresh } from "./webauthn/refresh";
import { onboard } from "./webauthn/onboard";
import { requestOnboard } from "./webauthn/requestOnboard";
import { updateCredentials } from "./webauthn/updateCredentials";
import { requestLogin } from "./webauthn/requestLogin";
import { login } from "./webauthn/login";

export const apiRouter = Router();

const dashboardUrl = process.env.DASHBOARD_URL || "http://localhost:9090";

apiRouter.get(
	"/application/list",
	validateAdminFunctions,
	async (req: Request, res: Response) => applicationList(req, res)
);

apiRouter.post(
	"/application/token",
	validateAdminFunctions,
	async (req: Request, res: Response) => applicationToken(req, res)
);

apiRouter.post(
	"/application/create",
	validateAdminFunctions,
	async (req: Request, res: Response) => applicationCreate(req, res)
);

apiRouter.post(
	"/application/update",
	validateAdminFunctions,
	async (req: Request, res: Response) => applicationUpdate(req, res)
);

apiRouter.post(
	"/application/delete",
	validateAdminFunctions,
	async (req: Request, res: Response) => applicationDelete(req, res)
);

apiRouter.post(
	"/webauthn/request-register",
	validateAppFunctions,
	async (req: Request, res: Response) => requestRegister(req, res)
);

apiRouter.post(
	"/webauthn/register",
	validateAppFunctions,
	async (req: Request, res: Response) => register(req, res)
);

apiRouter.post(
	"/webauthn/request-login",
	validateAppFunctions,
	async (req: Request, res: Response) => requestLogin(req, res)
);

apiRouter.post(
	"/webauthn/login",
	validateAppFunctions,
	async (req: Request, res: Response) => login(req, res)
);

apiRouter.post(
	"/webauthn/update-credentials",
	validateWebAuthnFunctions,
	async (req: Request, res: Response) => updateCredentials(req, res)
);

apiRouter.post(
	"/webauthn/request-onboard",
	validateWebAuthnFunctions,
	async (req: Request, res: Response) => requestOnboard(req, res)
);

apiRouter.post(
	"/webauthn/onboard",
	validateWebAuthnFunctions,
	async (req: Request, res: Response) => onboard(req, res)
);

apiRouter.post(
	"/webauthn/refresh-token",
	validateAppFunctions,
	async (req: Request, res: Response) => refresh(req, res)
)

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
