import { Request, Response, Router } from "express";

import { requestRegister } from "./functions/requestRegister";
import { register } from "module";
import { requestLogin } from "./functions/requestLogin";
import { login } from "./functions/login";
import { updateCredentials } from "./functions/updateCredentials";
import { requestOnboard } from "./functions/requestOnboard";
import { onboard } from "./functions/onboard";

export const webauthnRoutes = Router();

webauthnRoutes.post("/request-register", async (req: Request, res: Response) =>
	requestRegister(req, res)
);
webauthnRoutes.post("/register", async (req: Request, res: Response) =>
	register(req, res)
);
webauthnRoutes.post("/request-login", async (req: Request, res: Response) =>
	requestLogin(req, res)
);
webauthnRoutes.post("/login", async (req: Request, res: Response) =>
	login(req, res)
);
webauthnRoutes.post(
	"/update-credentials",
	async (req: Request, res: Response) => updateCredentials(req, res)
);
webauthnRoutes.post("/request-onboard", async (req: Request, res: Response) =>
	requestOnboard(req, res)
);
webauthnRoutes.post("/onboard", async (req: Request, res: Response) =>
	onboard(req, res)
);

const rpId = process.env.RPID || "localhost:3000";
const rpName = "Wembat";
const expectedOrigin = `https://${rpId}:3000`;
const appUId = "clz2v6xdh0140uctnqfg0edlv";

console.log("server is starting webauthn services");
