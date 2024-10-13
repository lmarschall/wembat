import { Request, Response } from "express";
import { decodeProtectedHeader, importJWK, jwtVerify } from "jose";
import { publicKeyJwk } from "../../crypto";

const serverUrl = process.env.SERVER_URL || "http://localhost:8080";

export async function validateApplicationToken(
	req: Request,
	res: Response,
	next: any
) {
	console.log("validate application token");

	try {
		if (req.headers["wembat-app-token"] == null)
			return res.status(401).send();

		const authorization = (req.headers["wembat-app-token"] as string).split(
			" "
		);

		if (authorization[0] !== "Bearer") return res.status(401).send();

		const jwt = authorization[1];

		// extract public key from jwk parameters
		const header = decodeProtectedHeader(jwt);
		const algorithm = header.alg;
		const spki = header.jwk;

		if (algorithm == undefined || algorithm == null || algorithm !== "ES256")
			return res.status(401).send();

		if (spki == undefined || spki == null || JSON.stringify(spki) !== JSON.stringify(publicKeyJwk))
			return res.status(401).send();

		const importedKey = await importJWK(spki, algorithm);
		const { payload, protectedHeader } = await jwtVerify(jwt, importedKey, {
			issuer: serverUrl,
			// audience: "urn:example:audience",
			algorithms: ["ES256"],
		});

		res.locals.payload = payload;
		return next();
	} catch (error) {
		console.log(error);
		return res.status(401).send();
	}
}
