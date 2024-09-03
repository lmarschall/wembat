import { Request, Response, Router } from "express";

import { requestRegister } from "./functions/requestRegister";
import { register } from "./functions/register";
import { requestLogin } from "./functions/requestLogin";
import { login } from "./functions/login";
import { updateCredentials } from "./functions/updateCredentials";
import { requestOnboard } from "./functions/requestOnboard";
import { onboard } from "./functions/onboard";
import { validateAppToken, validateJWTToken } from "../validate";

export const webauthnRoutes = Router();

webauthnRoutes.post(
	"/request-register",
	validateAppToken,
	async (req: Request, res: Response) => requestRegister(req, res)
);
webauthnRoutes.post(
	"/register",
	validateAppToken,
	async (req: Request, res: Response) => register(req, res)
);
webauthnRoutes.post(
	"/request-login",
	validateAppToken,
	async (req: Request, res: Response) => requestLogin(req, res)
);
webauthnRoutes.post(
	"/login",
	validateAppToken,
	async (req: Request, res: Response) => login(req, res)
);
webauthnRoutes.post(
	"/update-credentials",
	validateJWTToken,
	async (req: Request, res: Response) => updateCredentials(req, res)
);
webauthnRoutes.post(
	"/request-onboard",
	validateJWTToken,
	async (req: Request, res: Response) => requestOnboard(req, res)
);
webauthnRoutes.post(
	"/onboard",
	validateJWTToken,
	async (req: Request, res: Response) => onboard(req, res)
);

console.log("server is starting webauthn services");
