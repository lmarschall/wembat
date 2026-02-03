import {
	browserSupportsWebAuthn,
	browserSupportsWebAuthnAutofill,
} from "@simplewebauthn/browser";
import {
	BridgeMessageType,
	LoginResponse,
	RequestLoginResponse,
	StartAuthenticationContent,
	WembatActionResponse,
	WembatError,
	WembatLoginResult,
} from "../types";
import { AuthenticationResponseJSON } from "@simplewebauthn/types";
import {
	bufferToArrayBuffer,
	deriveEllipticKeypair,
	deriveEncryptionKeyFromPRF,
	encryptPrivateKeyString,
	loadCryptoPrivateKeyFromString,
	loadCryptoPublicKeyFromString,
	parseSecretString,
	saveCryptoKeyAsString,
	toBase64,
} from "./helper";
import { AxiosInstance } from "axios";
import { Bridge } from "../bridge";
import { Store } from "../store"

/**
 * Logs in the user using WebAuthn authentication.
 * @param axiosClient - The Axios instance for making HTTP requests.
 * @param userMail - The email address of the user.
 * @returns A Promise that resolves to an array containing the action response, private key, public key, and JWT.
 */
export async function login(this: any, 
	axiosClient: AxiosInstance,
	bridge: Bridge,
	store: Store,
	userMail: string,
	autoLogin = false
): Promise<WembatActionResponse<WembatLoginResult>> {
	const actionResponse: WembatActionResponse<WembatLoginResult> = {
		success: false,
		error: {} as WembatError,
		result: {} as WembatLoginResult,
	};

	try {
		console.log("request login");

		const loginRequestResponse = await axiosClient.post<string>(
			`/request-login`,
			{
				userInfo: { userMail: userMail },
			}
		);

		if (loginRequestResponse.status !== 200)
			throw new Error(loginRequestResponse.data);

		const loginRequestResponseData: RequestLoginResponse = JSON.parse(
			loginRequestResponse.data
		);
		const challengeOptions = loginRequestResponseData.options as any;

		challengeOptions.extensions.prf.eval.first = bufferToArrayBuffer(
			challengeOptions.extensions.prf.eval.first
		);

		const content: StartAuthenticationContent = { challengeOptions: challengeOptions };
		const credentials: AuthenticationResponseJSON = await bridge.invoke(BridgeMessageType.StartAuthentication, content);

		const loginReponse = await axiosClient.post<string>(
			`/login`,
			{
				loginChallengeResponse: {
					credentials: credentials,
					challenge: challengeOptions.challenge,
				},
			},
			{
				withCredentials: true,
			}
		);

		if (loginReponse.status !== 200)
			throw new Error(loginReponse.data);

		const loginReponseData: LoginResponse = JSON.parse(loginReponse.data);

		if (!loginReponseData.verified)
			throw new Error("Login not verified");

		if (credentials.clientExtensionResults === undefined)
			throw new Error("Credentials not instance of PublicKeyCredential");
		
		const credentialExtensions = credentials.clientExtensionResults as any;
	
		const inputKeyMaterial = new Uint8Array(
			credentialExtensions?.prf.results.first
		);

		const token = loginReponseData.token
		store.setToken(token);

		const [version, saltString, ivString] = parseSecretString(loginReponseData.cipherBlob);

  		const { encryptionKey, salt } = await deriveEncryptionKeyFromPRF(inputKeyMaterial, version, saltString);

		if (
			saltString !== "" &&
			ivString !== ""
		) {
			console.log("Loading existing keys");
			const publicKey = await loadCryptoPublicKeyFromString(loginReponseData.publicUserKey);
			const privateKey = await loadCryptoPrivateKeyFromString(loginReponseData.privateUserKeyEncrypted, encryptionKey, ivString);
			store.setKeys(privateKey, publicKey);

		} else {
			console.log("Generating new keys");

			const keys = await deriveEllipticKeypair();
			store.setKeys(keys.privateKey, keys.publicKey);

			const publicKeyString = await saveCryptoKeyAsString(keys.publicKey);
			const privateKeyString = await saveCryptoKeyAsString(keys.privateKey);

			const { encryptedBuffer, iv } = await encryptPrivateKeyString(privateKeyString, encryptionKey);

			const headers = {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			};

			// Constructing the string
			const cipherBlob = `v1|${toBase64(salt)}|${toBase64(iv)}`;

			const saveCredentialsResponse = await axiosClient.post<string>(
				`/update-credentials`,
				{
					updateCredentialsRequest: {
						privKey: toBase64(new Uint8Array(encryptedBuffer)),
						pubKey: publicKeyString,
						cipherBlob: cipherBlob,
						sessionId: loginReponseData.sessionId,
					},
				},
				{
					headers: headers,
				}
			);

			if (saveCredentialsResponse.status !== 200)
				throw new Error(saveCredentialsResponse.data);
		}

		const loginResult: WembatLoginResult = {
			loginResponse: loginReponseData,
			keyMaterial: inputKeyMaterial
		};
		actionResponse.result = loginResult;
		actionResponse.success = true;
		return actionResponse;
	} catch (error: Error | unknown) {
		if (error instanceof Error) {
			actionResponse.error = {
				message: error.message,
			};
			console.error(error);
			return actionResponse;
		} else {
			throw new Error("Unknown Error");
		}
	}
}
