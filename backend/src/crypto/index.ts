import { exportJWK, importPKCS8, importSPKI, SignJWT } from "jose";
import { Application, Session, User } from "@prisma/client";
import { readFileSync } from "fs";

interface KeyPair {
	tokenKeyPair: TokenKeyPair;
}

interface TokenKeyPair {
	privateKey: any;
	publicKey: any;
}

const keyPairs: KeyPair = {
	tokenKeyPair: {
		privateKey: null,
		publicKey: null,
	},
};
const apiUrl = process.env.SERVER_URL || "http://localhost:8080";

export async function initCrypto(): Promise<boolean> {
	try {
		const algorithm = "ES256";
		const pkcs8 = readFileSync("/usr/src/app/keys/privateKey.pem", "utf8");
		const ecPrivateKey = await importPKCS8(pkcs8, algorithm);
		const spki = readFileSync("/usr/src/app/keys/publicKey.pem", "utf8");
		const ecPublicKey = await importSPKI(spki, algorithm);

		keyPairs.tokenKeyPair = {
			privateKey: ecPrivateKey,
			publicKey: ecPublicKey,
		};
		return true;
	} catch (err) {
		console.error(err);
		return false;
	}
}

export async function createSessionJWT(
	session: Session,
	user: User,
	url: string
) {
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

	return await new SignJWT({
		appUId: application.uid,
		appDomain: application.domain,
	})
		.setProtectedHeader({ alg: "ES256", jwk: publicJwk })
		.setIssuedAt()
		.setIssuer(apiUrl)
		.setAudience(`https://${application.domain}`)
		// .setExpirationTime('2h') // no exp time
		.sign(keyPairs.tokenKeyPair.privateKey);
}
