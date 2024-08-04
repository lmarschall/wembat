import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { Application, Session, User } from "@prisma/client";

const keyPairs: any = {};

export async function initCrypto() {
	keyPairs.tokenKeyPair = await generateKeyPair("ES256");
}

export async function createSessionJWT(session: Session) {
	const publicJwk = await exportJWK(keyPairs.tokenKeyPair.publicKey);

	return await new SignJWT({ userMail: session.userUId })
		.setProtectedHeader({ alg: "ES256", jwk: publicJwk })
		.setIssuedAt()
		.setIssuer("localhost:8080")
		.setAudience("urn:example:audience")
		// .setExpirationTime('2h') // no exp time
		.sign(keyPairs.tokenKeyPair.privateKey);
}

export async function createApplicationJWT(application: Application) {
	const publicJwk = await exportJWK(keyPairs.tokenKeyPair.publicKey);

	return await new SignJWT({ appName: application.name })
		.setProtectedHeader({ alg: "ES256", jwk: publicJwk })
		.setIssuedAt()
		.setIssuer("localhost:8080")
		.setAudience(application.url)
		// .setExpirationTime('2h') // no exp time
		.sign(keyPairs.tokenKeyPair.privateKey);
}
