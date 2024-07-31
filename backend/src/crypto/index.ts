import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { User } from "@prisma/client";

const keyPairs: any = {};

export async function initCrypto() {
	keyPairs.tokenKeyPair = await generateKeyPair("ES256");
}

export async function createJWT(user: User) {
	const publicJwk = await exportJWK(keyPairs.tokenKeyPair.publicKey);

	return await new SignJWT({ "urn:example:claim": true, userId: user.uid })
		.setProtectedHeader({ alg: "ES256", jwk: publicJwk })
		.setIssuedAt()
		.setIssuer("urn:example:issuer")
		.setAudience("urn:example:audience")
		// .setExpirationTime('2h') // no exp time
		.sign(keyPairs.tokenKeyPair.privateKey);
}
