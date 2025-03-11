import { Request, Response } from "express";
import { decodeProtectedHeader, importJWK, jwtVerify } from "jose";
import { publicKeyJwk } from "../../crypto";

const serverUrl = process.env.SERVER_URL || "http://localhost:8080";

export async function validateAdminToken(
	req: Request,
	res: Response,
	next: any
) {
	console.log("validate admin token");

	try {
		if (req.headers.authorization == null) throw Error("No Authorization header");

		const authorization = req.headers.authorization.split(" ");

		if (authorization[0] !== "Bearer") throw Error("Invalid Authorization header");

		const jwt = authorization[1];

		// extract public key from jwk parameters
		const header = decodeProtectedHeader(jwt);
		const algorithm = header.alg;
		const spki = header.jwk;

		if (algorithm == undefined || algorithm == null || algorithm !== "ES256")
			throw Error("Invalid algorithm");

		if (spki == undefined || spki == null || JSON.stringify(spki) !== JSON.stringify(publicKeyJwk))
			throw Error("Invalid public key");

		const importedKey = await importJWK(spki, algorithm);
		const { payload, protectedHeader } = await jwtVerify(jwt, importedKey, {
			issuer: serverUrl,
			algorithms: ["ES256"],
		});
		res.locals.payload = payload;
		return next();
	} catch (error: any) {
		console.log(error);
		return res.status(401).send(error.message);
	}
}