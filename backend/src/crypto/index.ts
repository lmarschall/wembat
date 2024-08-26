import { generateKeyPair, exportJWK, SignJWT } from "jose";
import { Application, Session, User } from "@prisma/client";

const keyPairs: any = {};
const apiUrl = process.env.API_URL || "http://localhost:8080";

export async function initCrypto() {
	keyPairs.tokenKeyPair = await generateKeyPair("ES256");
}

export async function createSessionJWT(session: Session, user: User, url: string) {
	const publicJwk = await exportJWK(keyPairs.tokenKeyPair.publicKey);

	return await new SignJWT({ sessionId: session.uid, userMail: user.mail })
		.setProtectedHeader({ alg: "ES256", jwk: publicJwk })
		.setIssuedAt()
		.setIssuer(apiUrl)
		.setAudience(url)
		// .setExpirationTime('2h') // no exp time
		.sign(keyPairs.tokenKeyPair.privateKey);
}

export async function createApplicationJWT(application: Application) {
	const publicJwk = await exportJWK(keyPairs.tokenKeyPair.publicKey);

	return await new SignJWT({ appUId: application.uid, appDomain: application.domain })
		.setProtectedHeader({ alg: "ES256", jwk: publicJwk })
		.setIssuedAt()
		.setIssuer(apiUrl)
		.setAudience(`https://${application.domain}`)
		// .setExpirationTime('2h') // no exp time
		.sign(keyPairs.tokenKeyPair.privateKey);
}
