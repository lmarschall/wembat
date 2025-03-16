import { Router } from "express";
import { Request, Response } from "express";
import { applicationList } from "./application/applicationList";
import { applicationCreate } from "./application/applicationCreate";
import { applicationToken } from "./application/applicationToken";
import { applicationUpdate } from "./application/applicationUpdate";
import { applicationDelete } from "./application/applicationDelete";
import { requestRegister } from "./webauthn/requestRegister";
import { register } from "./webauthn/register";
import { refresh } from "./webauthn/refresh";
import { onboard } from "./webauthn/onboard";
import { requestOnboard } from "./webauthn/requestOnboard";
import { updateCredentials } from "./webauthn/updateCredentials";
import { requestLogin } from "./webauthn/requestLogin";
import { login } from "./webauthn/login";
import { validateWebAuthnToken } from "./validate/validateWebAuthn";
import { validateApplicationToken } from "./validate/validateApplication";
import { validateAdminToken } from "./validate/validateAdmin";
import { serverExportPublicKey } from "./server/serverExportPublicKey";
import { PrismaClient } from "@prisma/client";

export const apiRouter = Router();

const prisma = new PrismaClient();

apiRouter.get(
	"/application/list",
	[validateAdminToken],
	async (req: Request, res: Response) => applicationList(req, res, prisma)
);

apiRouter.post(
	"/application/token",
	[validateAdminToken],
	async (req: Request, res: Response) => applicationToken(req, res, prisma)
);

apiRouter.post(
	"/application/create",
	[validateAdminToken],
	async (req: Request, res: Response) => applicationCreate(req, res, prisma)
);

apiRouter.post(
	"/application/update",
	[validateAdminToken],
	async (req: Request, res: Response) => applicationUpdate(req, res, prisma)
);

apiRouter.post(
	"/application/delete",
	[validateAdminToken],
	async (req: Request, res: Response) => applicationDelete(req, res, prisma)
);

apiRouter.post(
	"/webauthn/request-register",
	[validateApplicationToken],
	async (req: Request, res: Response) => requestRegister(req, res, prisma)
);

apiRouter.post(
	"/webauthn/register",
	[validateApplicationToken],
	async (req: Request, res: Response) => register(req, res, prisma)
);

apiRouter.post(
	"/webauthn/request-login",
	[validateApplicationToken],
	async (req: Request, res: Response) => requestLogin(req, res, prisma)
);

apiRouter.post(
	"/webauthn/login",
	[validateApplicationToken],
	async (req: Request, res: Response) => login(req, res, prisma)
);

apiRouter.post(
	"/webauthn/update-credentials",
	[validateWebAuthnToken],
	async (req: Request, res: Response) => updateCredentials(req, res, prisma)
);

apiRouter.post(
	"/webauthn/request-onboard",
	[validateWebAuthnToken],
	async (req: Request, res: Response) => requestOnboard(req, res, prisma)
);

apiRouter.post(
	"/webauthn/onboard",
	[validateWebAuthnToken],
	async (req: Request, res: Response) => onboard(req, res, prisma)
);

apiRouter.post(
	"/webauthn/refresh-token",
	[validateApplicationToken],
	async (req: Request, res: Response) => refresh(req, res, prisma)
);

apiRouter.get(
	"/server/publicKey",
	[validateApplicationToken],
	async (req: Request, res: Response) => serverExportPublicKey(req, res)
);
