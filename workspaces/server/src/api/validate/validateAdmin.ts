import { Request, Response } from "express";
import { decodeProtectedHeader, importJWK, jwtVerify } from "jose";
import { cryptoService } from "#crypto";
import { configService } from "#config";

export async function validateAdminToken(
	req: Request,
	res: Response,
	next: any
): Promise<void> {
	console.log("validate admin token");

	try {
		if (req.headers.authorization == null) throw new Error("No Authorization header");

		const authorization = req.headers.authorization.split(" ");

		if (authorization[0] !== "Bearer") throw new Error("Invalid Authorization header");

		const jwt = authorization[1];

		// extract public key from jwk parameters
		const header = decodeProtectedHeader(jwt);
		const algorithm = header.alg;
		const spki = header.jwk;

		if (algorithm == undefined || algorithm == null || algorithm !== "ES256")
			throw new Error("Invalid algorithm");

		const publicKeyJwk = await cryptoService.getPublicKeyJwk();

		if (spki == undefined || spki == null || JSON.stringify(spki) !== JSON.stringify(publicKeyJwk))
			throw new Error("Invalid public key");

		const importedKey = await importJWK(spki, algorithm);
		const { payload, protectedHeader } = await jwtVerify(jwt, importedKey, {
			issuer: configService.getServerUrl(),
			algorithms: ["ES256"],
		});
		res.locals.payload = payload;
		next();
	} catch (error: any) {
		console.log(error);
		res.status(401).send("Unauthorized");
	}
}