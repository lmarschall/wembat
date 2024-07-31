import { Router } from "express";

import { requestRegister } from "./requestRegister";
import { register } from "module";
import { requestLogin } from "./requestLogin";
import { login } from "./login";
import { updateCredentials } from "./updateCredentials";
import { requestOnboard } from "./requestOnboard";
import { onboard } from "./onboard";

export const webauthnRoutes = Router();

webauthnRoutes.post("/request-register", async (req, res) => requestRegister(req, res));
webauthnRoutes.post("/register", async (req, res) => register(req, res));
webauthnRoutes.post("/request-login", async (req, res) => requestLogin(req, res));
webauthnRoutes.post("/login", async (req, res) => login(req, res));
webauthnRoutes.post("/update-credentials", async (req, res) => updateCredentials(req, res));
webauthnRoutes.post("/request-onboard", async (req, res) => requestOnboard(req, res));
webauthnRoutes.post("/onboard", async (req, res) => onboard(req, res));

type UserWithDevices = Prisma.UserGetPayload<{
	include: { devices: true };
}>;

type UserWithDevicesAndSessions = Prisma.UserGetPayload<{
	include: { devices: true, sessions: true };
}>;

interface ExtensionsLargeBlobSupport extends AuthenticationExtensionsClientInputs {
	largeBlob: {
		support: string;
	};
}

interface ExtensionsLargeBlobWrite extends AuthenticationExtensionsClientInputs {
	largeBlob: {
		write: Uint8Array;
	};
}

interface ExtensionsLargeBlobRead extends AuthenticationExtensionsClientInputs {
	largeBlob: {
		read: boolean,
	};
}

const rpId = process.env.RPID || "localhost:3000";
const rpName = "Wembat";
const expectedOrigin = `https://${rpId}:3000`;
const appUId = "clz2v6xdh0140uctnqfg0edlv";

console.log("server is starting webauthn services");