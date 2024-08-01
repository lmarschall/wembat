import {
	browserSupportsWebAuthn,
	browserSupportsWebAuthnAutofill,
	startAuthentication,
} from "@simplewebauthn/browser";
import {
	LoginResponse,
	RequestLoginResponse,
	WembatActionResponse,
	WembatError,
	WembatLoginResult,
} from "../types";
import { AuthenticationResponseJSON } from "@simplewebauthn/typescript-types";
import {
	ab2str,
	loadCryptoPrivateKeyFromString,
	loadCryptoPublicKeyFromString,
	saveCryptoKeyAsString,
	str2ab,
} from "../helper";
import { WembatClient } from "..";

/**
 * Logs in a user with the provided user ID.
 *
 * @param userUId - The user ID.
 * @returns A promise that resolves to a `WembatActionResponse` containing the login result.
 * @throws An error if WebAuthn is not supported on the browser or if the Axios client is undefined.
 */
export async function login(
	this: WembatClient,
	userMail: string
): Promise<WembatActionResponse<WembatLoginResult>> {
	const actionResponse: WembatActionResponse<WembatLoginResult> = {
		success: false,
		error: {} as WembatError,
		result: {} as WembatLoginResult,
	};

	try {
		if (!browserSupportsWebAuthn())
			throw Error("WebAuthn is not supported on this browser!");

		if (this.axiosClient == undefined) throw Error("Axiso Client undefined!");

		const loginRequestResponse = await this.axiosClient.post<string>(
			`/request-login`,
			{
				userInfo: { userMail: userMail },
			}
		);

		if (loginRequestResponse.status !== 200) {
			// i guess we need to handle errors here
			throw Error(loginRequestResponse.data);
		}

		const loginRequestResponseData: RequestLoginResponse = JSON.parse(
			loginRequestResponse.data
		);
		const challengeOptions = loginRequestResponseData.options as any;
		const conditionalUISupported = await browserSupportsWebAuthnAutofill();

		const firstSalt = new Uint8Array([
			0x4a, 0x18, 0xa1, 0xe7, 0x4b, 0xfb, 0x3d, 0x3f, 0x2a, 0x5d, 0x1f, 0x0c,
			0xcc, 0xe3, 0x96, 0x5e, 0x00, 0x61, 0xd1, 0x20, 0x82, 0xdc, 0x2a, 0x65,
			0x8a, 0x18, 0x10, 0xc0, 0x0f, 0x26, 0xbe, 0x1e,
		]).buffer;

		challengeOptions.extensions.prf.eval.first = firstSalt;
		console.log(challengeOptions);

		const credentials: AuthenticationResponseJSON = await startAuthentication(
			challengeOptions,
			false
		).catch((err: string) => {
			throw Error(err);
		});

		const loginReponse = await this.axiosClient.post<string>(`/login`, {
			// TODO interfaces for request bodies
			loginChallengeResponse: {
				credentials: credentials,
				challenge: challengeOptions.challenge,
			},
		});

		if (loginReponse.status !== 200) {
			throw Error(loginReponse.data);
		}

		const loginReponseData: LoginResponse = JSON.parse(loginReponse.data);

		if (loginReponseData.verified) {
			this.jwt = loginReponseData.jwt;
		} else {
			throw Error("Login not verified");
		}

		this.axiosClient.defaults.headers.common['Authorization'] = `Bearer ${loginReponseData.jwt}`;
		console.log(this.axiosClient.defaults.headers.common);

		console.log(loginReponseData);

		const publicUserKeyString = loginReponseData.publicUserKey;
		const privateUserKeyEncryptedString =
			loginReponseData.privateUserKeyEncrypted;

		if (credentials.clientExtensionResults !== undefined) {
			const credentialExtensions = credentials.clientExtensionResults as any;

			const inputKeyMaterial = new Uint8Array(
				credentialExtensions?.prf.results.first
			);

			const keyDerivationKey = await crypto.subtle.importKey(
				"raw",
				inputKeyMaterial,
				"HKDF",
				false,
				["deriveKey"]
			);

			// wild settings here
			const label = "encryption key";
			const info = new TextEncoder().encode(label);
			const salt = new Uint8Array();

			const encryptionKey = await crypto.subtle.deriveKey(
				{ name: "HKDF", info, salt, hash: "SHA-256" },
				keyDerivationKey,
				{ name: "AES-GCM", length: 256 },
				false,
				["encrypt", "decrypt"]
			);

			if (
				publicUserKeyString !== "" &&
				privateUserKeyEncryptedString !== ""
			) {
				console.log("Loading existing keys");
				this.publicKey = await loadCryptoPublicKeyFromString(
					publicUserKeyString
				);

				const nonce = loginReponseData.nonce;
				const decoder = new TextDecoder();

				const decryptedPrivateUserKey = await crypto.subtle.decrypt(
					{ name: "AES-GCM", iv: str2ab(nonce) },
					encryptionKey,
					str2ab(privateUserKeyEncryptedString)
				);

				this.privateKey = await loadCryptoPrivateKeyFromString(
					decoder.decode(decryptedPrivateUserKey)
				);
			} else {
				console.log("Generating new keys");
				const keyPair = await window.crypto.subtle.generateKey(
					{
						name: "ECDH",
						namedCurve: "P-384",
					},
					true,
					["deriveKey", "deriveBits"]
				);

				this.publicKey = keyPair.publicKey;
				this.privateKey = keyPair.privateKey;

				const publicKeyString = await saveCryptoKeyAsString(this.publicKey);
				const privateKeyString = await saveCryptoKeyAsString(
					this.privateKey
				);

				const nonce = window.crypto.getRandomValues(new Uint8Array(12));
				const encoder = new TextEncoder();
				const encoded = encoder.encode(privateKeyString);

				const encryptedPrivateKey = await crypto.subtle.encrypt(
					{ name: "AES-GCM", iv: nonce },
					encryptionKey,
					encoded
				);

				const saveCredentialsResponse = await this.axiosClient.post<string>(
					`/update-credentials`,
					{
						updateCredentialsRequest: {
							privKey: ab2str(encryptedPrivateKey),
							pubKey: publicKeyString,
							nonce: ab2str(nonce),
							sessionId: loginReponseData.sessionId,
						},
					}
				);

				if (saveCredentialsResponse.status !== 200) {
					throw Error(saveCredentialsResponse.data);
				}
			}
		} else {
			throw Error("Credentials not instance of PublicKeyCredential");
		}

		const loginResult: WembatLoginResult = {
			verified: loginReponseData.verified,
			jwt: loginReponseData.jwt,
		};
		actionResponse.result = loginResult;
		actionResponse.success = true;
	} catch (error: any) {
		const errorMessage: WembatError = {
			error: error,
		};
		actionResponse.error = errorMessage;
		console.error(error);
	} finally {
		return actionResponse;
	}
}
