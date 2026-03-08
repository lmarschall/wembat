import { Router, Request, Response } from "express";
import { BaseClient, Issuer } from 'openid-client';
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '#prisma'
import { applicationList } from "#api/application/applicationList";
import { applicationCreate } from "#api/application/applicationCreate";
import { applicationToken } from "#api/application/applicationToken";
import { applicationUpdate } from "#api/application/applicationUpdate";
import { applicationDelete } from "#api/application/applicationDelete";
import { requestRegister } from "#api/webauthn/requestRegister";
import { register } from "#api/webauthn/register";
import { refresh } from "#api/webauthn/refresh";
import { onboard } from "#api/webauthn/onboard";
import { requestOnboard } from "#api/webauthn/requestOnboard";
import { updateCredentials } from "#api/webauthn/updateCredentials";
import { requestLogin } from "#api/webauthn/requestLogin";
import { login } from "#api/webauthn/login";
import { validateWebAuthnToken } from "#api/validate/validateWebAuthn";
import { validateApplicationToken } from "#api/validate/validateApplication";
import { validateAdminToken } from "#api/validate/validateAdmin";
import { serverExportPublicKey } from "#api/server/serverExportPublicKey";
import { deviceList } from "#api/device/deviceList";
import { requestLink } from "#api/webauthn/requestLink";
import { link } from "#api/webauthn/link";
import { openidCallback } from "#api/openid/openidCallback";
import { openidLogin } from "#api/openid/openidLogin";
import { openidPoll } from "#api/openid/openidPoll";

import "dotenv/config";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "";
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || "";
const GITHUB_REDIRECT_URI = process.env.GITHUB_REDIRECT_URI || "";

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });

export const apiRouter = Router();
export const prisma = new PrismaClient({ adapter });

let openidClient: BaseClient | undefined;

export async function initOpenIdClient() {
  console.log("init openid");
  const githubIssuer = new Issuer({
	issuer: 'https://github.com',
	authorization_endpoint: 'https://github.com/login/oauth/authorize',
	token_endpoint: 'https://github.com/login/oauth/access_token',
	userinfo_endpoint: 'https://api.github.com/user',
  });

  openidClient = new githubIssuer.Client({
	client_id: GITHUB_CLIENT_ID,
	client_secret: GITHUB_CLIENT_SECRET,
	redirect_uris: [GITHUB_REDIRECT_URI],
	response_types: ['code'],
  });
  
  console.log('GitHub OAuth Config geladen');
}

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

apiRouter.get(
	"/device/list",
	[validateWebAuthnToken],
	async (req: Request, res: Response) => deviceList(req, res, prisma)
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
	"/webauthn/request-link",
	[validateWebAuthnToken],
	async (req: Request, res: Response) => requestLink(req, res, prisma)
);

apiRouter.post(
	"/webauthn/link",
	[validateWebAuthnToken],
	async (req: Request, res: Response) => link(req, res, prisma)
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

apiRouter.get(
	"/openid/login", 
	(req: Request, res: Response) => openidLogin(req, res, openidClient)
);

apiRouter.get(
	'/openid/callback', 
	async (req: Request, res: Response) => openidCallback(req, res, openidClient, GITHUB_REDIRECT_URI)
);

apiRouter.get(
	'/openid/poll',
	(req: Request, res: Response) => openidPoll(req, res)
);
    