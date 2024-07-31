import { Router } from "express";

import { requestRegister } from "./functions/requestRegister";
import { register } from "module";
import { requestLogin } from "./functions/requestLogin";
import { login } from "./functions/login";
import { updateCredentials } from "./functions/updateCredentials";
import { requestOnboard } from "./functions/requestOnboard";
import { onboard } from "./functions/onboard";

export const webauthnRoutes = Router();

webauthnRoutes.post("/request-register", async (req, res) => requestRegister(req, res));
webauthnRoutes.post("/register", async (req, res) => register(req, res));
webauthnRoutes.post("/request-login", async (req, res) => requestLogin(req, res));
webauthnRoutes.post("/login", async (req, res) => login(req, res));
webauthnRoutes.post("/update-credentials", async (req, res) => updateCredentials(req, res));
webauthnRoutes.post("/request-onboard", async (req, res) => requestOnboard(req, res));
webauthnRoutes.post("/onboard", async (req, res) => onboard(req, res));

const rpId = process.env.RPID || "localhost:3000";
const rpName = "Wembat";
const expectedOrigin = `https://${rpId}:3000`;
const appUId = "clz2v6xdh0140uctnqfg0edlv";

console.log("server is starting webauthn services");