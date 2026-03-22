import {
	exportJWK,
	exportSPKI,
	importPKCS8,
	importSPKI,
	SignJWT,
	KeyLike,
	generateKeyPair
} from "jose";
import { Application, Session, User } from "#prisma"
import { configService } from "#config";
import { readFileSync } from "node:fs";

interface KeyPair {
	privateKey: KeyLike;
	publicKey: KeyLike;
}

export let cryptoService: CryptoService;

export async function initCrypto(): Promise<boolean> {
	try {
		const algorithm = "ES256";
        
        // use import.meta.url to create an absolute path
        const privateKeyUrl = new URL("../../../keys/privateKey.pem", import.meta.url);
        const publicKeyUrl = new URL("../../../keys/publicKey.pem", import.meta.url);

        const pkcs8 = readFileSync(privateKeyUrl, "utf8");
        const ecPrivateKey = await importPKCS8(pkcs8, algorithm);
        
        const spki = readFileSync(publicKeyUrl, "utf8");
        const ecPublicKey = await importSPKI(spki, algorithm);

        cryptoService = new CryptoService(ecPrivateKey, ecPublicKey);

		return true;
	} catch (err) {
		console.error(err);
		return false;
	}
}

export async function initCryptoTest(algorithm = "ES256") {
	const keyPairs = await generateKeyPair(
		algorithm
	);
	cryptoService = new CryptoService(keyPairs.privateKey, keyPairs.publicKey);
}

export class CryptoService {
	private readonly keyPair: KeyPair;
	private readonly apiUrl: string = configService.getServerUrl();

	constructor(privateKey: KeyLike, publicKey: KeyLike) {
		this.keyPair = {
			privateKey: privateKey,
			publicKey: publicKey,
		};
	}

	async getPublicKeyJwk() {
		return await exportJWK(this.keyPair.publicKey);
	}

	async setPublicKey(publicKey: KeyLike) {
		this.keyPair.publicKey = publicKey;
	}

	async exportPublicKey() {
		return await exportSPKI(this.keyPair.publicKey);
	}

	async createSessionToken(session: Session, user: User, url: string) {
		return await this.createJWT(
			{ sessionId: session.uid, userMail: user.mail },
			"ES256",
			url,
			"15m"
		);
	}

	async createSessionRefreshToken(session: Session, user: User, url: string) {
		return await this.createJWT(
			{ sessionId: session.uid, userMail: user.mail },
			"ES256",
			url,
			"7d"
		);
	}

	async createApplicationJWT(application: Application) {
		return this.createJWT(
			{ appUId: application.uid },
			"ES256",
			`https://${application.domain}`,
			""
		);
	}

	async createAdminJWT() {
		return await this.createJWT({ admin: true }, "ES256", "", "");
	}

	async createJWT(
		payload: any,
		algorithm: string,
		audience: string,
		expiresIn: string
	) {
		const publicJwk = await exportJWK(this.keyPair.publicKey);

		if (expiresIn != "") {
			return await new SignJWT(payload)
				.setProtectedHeader({ alg: algorithm, jwk: publicJwk })
				.setIssuedAt()
				.setIssuer(this.apiUrl)
				.setAudience(audience)
				.setExpirationTime(expiresIn)
				.sign(this.keyPair.privateKey);
		} else {
			return await new SignJWT(payload)
				.setProtectedHeader({ alg: algorithm, jwk: publicJwk })
				.setIssuedAt()
				.setIssuer(this.apiUrl)
				.setAudience(audience)
				.sign(this.keyPair.privateKey);
		}
	}
}
