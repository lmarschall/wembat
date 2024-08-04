import { Request, Response } from "express";
import { checkForWebAuthnToken } from "../redis";
import { decodeProtectedHeader, importJWK, jwtVerify } from "jose";

export async function validateWebAuthnToken(req: Request, res: Response, next) {
	console.log("validate webauthn token");

	try {
		if (req.headers.authorization == null) return res.status(401).send();

		const authorization = req.headers.authorization.split(" ");

		if (authorization[0] !== "Bearer") return res.status(401).send();

		const jwt = authorization[1];
		// check if jwt token was issued by us
		if ((await checkForWebAuthnToken(jwt)) === false)
			return res.status(401).send();

		// extract public key from jwk parameters
		const header = decodeProtectedHeader(jwt);
		const algorithm = header.alg;
		const spki = header.jwk;

		if (algorithm !== "ES256") return res.status(401).send();

		const importedKey = await importJWK(spki, algorithm);
		const { payload, protectedHeader } = await jwtVerify(jwt, importedKey, {
			issuer: "urn:example:issuer",
			audience: "urn:example:audience",
			algorithms: ["ES256"],
		});
		res.locals.payload = payload;
		return next();
	} catch (error) {
		console.log(error);
		return res.status(401).send();
	}
}

export async function validateApplicationToken(
	req: Request,
	res: Response,
	next
) {
	console.log("validate application token");
	console.log(req.headers);

	const rpId = process.env.RPID || "localhost:3000";
	const rpName = "Wembat";
	const expectedOrigin = `https://${rpId}:3000`;
	const appUId = "clzbsocpw0013t4tnsocijehs";

	res.locals.rpId = rpId;
	res.locals.rpName = rpName;
	res.locals.expectedOrigin = expectedOrigin;
	res.locals.appUId = appUId;

	return next();
}
