import { Request, Response, Router } from "express";

import { requestRegister } from "./functions/requestRegister";
import { register } from "./functions/register";
import { requestLogin } from "./functions/requestLogin";
import { login } from "./functions/login";
import { updateCredentials } from "./functions/updateCredentials";
import { requestOnboard } from "./functions/requestOnboard";
import { onboard } from "./functions/onboard";
import { refresh } from "./functions/refresh";
import { validateAppFunctions, validateWebAuthnFunctions } from "../validate";

export const webauthnRoutes = Router();

webauthnRoutes.post(
	"/request-register",
	validateAppFunctions,
	async (req: Request, res: Response) => requestRegister(req, res)
);
webauthnRoutes.post(
	"/register",
	validateAppFunctions,
	async (req: Request, res: Response) => register(req, res)
);
webauthnRoutes.post(
	"/request-login",
	validateAppFunctions,
	async (req: Request, res: Response) => requestLogin(req, res)
);
webauthnRoutes.post(
	"/login",
	validateAppFunctions,
	async (req: Request, res: Response) => login(req, res)
);
webauthnRoutes.post(
	"/update-credentials",
	validateWebAuthnFunctions,
	async (req: Request, res: Response) => updateCredentials(req, res)
);
webauthnRoutes.post(
	"/request-onboard",
	validateWebAuthnFunctions,
	async (req: Request, res: Response) => requestOnboard(req, res)
);
webauthnRoutes.post(
	"/onboard",
	validateWebAuthnFunctions,
	async (req: Request, res: Response) => onboard(req, res)
);
webauthnRoutes.post(
	"/refresh-token",
	validateAppFunctions,
	async (req: Request, res: Response) => refresh(req, res)
)

console.log("server is starting webauthn services");
