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
	deriveEncryptedQuantumSeed,
	deriveEncryptionKeyFromPRF,
	deriveKeysFromEncryptedSeed,
	toBase64,
} from "./helper";
import { AxiosInstance } from "axios";
import { Bridge } from "../bridge";

/**
 * Logs in the user using WebAuthn authentication.
 * @param axiosClient - The Axios instance for making HTTP requests.
 * @param userMail - The email address of the user.
 * @returns A Promise that resolves to an array containing the action response, private key, public key, and JWT.
 */
export async function login(this: any, 
	axiosClient: AxiosInstance,
	bridge: Bridge,
	userMail: string,
	autoLogin = false
): Promise<WembatActionResponse<WembatLoginResult>> {
	const actionResponse: WembatActionResponse<WembatLoginResult> = {
		success: false,
		error: {} as WembatError,
		result: {} as WembatLoginResult,
	};

	let privateKey: CryptoKey | undefined = undefined;
	let publicKey: CryptoKey | undefined = undefined;
	let sessionKey: CryptoKey | undefined = undefined;
	let token: string | undefined = undefined;
	let seed: Uint8Array<ArrayBuffer> | undefined = undefined;

	try {
		if (!browserSupportsWebAuthn())
			throw new Error("WebAuthn is not supported on this browser!");

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
		const conditionalUISupported = await browserSupportsWebAuthnAutofill();

		challengeOptions.extensions.prf.eval.first = bufferToArrayBuffer(
			challengeOptions.extensions.prf.eval.first
		);

		const content: StartAuthenticationContent = { challengeOptions: challengeOptions };
		const credentials: AuthenticationResponseJSON = await this.bridge.invoke(BridgeMessageType.StartAuthentication, content);

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

		const token = loginReponseData.token;
  		const seedString = loginReponseData.seedString;
  		const ivString = loginReponseData.ivString;

  		const { encryptionKey, salt } = await deriveEncryptionKeyFromPRF(inputKeyMaterial, loginReponseData.salt);

		if (
			seedString !== "" &&
			ivString !== ""
		) {
			console.log("Loading existing keys");
			
			// sessionKey = deriveSessionKeyFromString()

			{ privateKey, publicKey } = await deriveKeysFromEncryptedSeed(encryptionKey, seedString, ivString)

		} else {
			console.log("Generating new keys");

			const { encryptedSeed, iv } = await deriveEncryptedQuantumSeed(encryptionKey);

			const headers = {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			};

			const saveCredentialsResponse = await axiosClient.post<string>(
				`/update-credentials`,
				{
					updateCredentialsRequest: {
						seedString: toBase64(encryptedSeed),
						ivString: toBase64(iv),
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
		return [actionResponse, privateKey, publicKey, token];
	} catch (error: Error | unknown) {
		if (error instanceof Error) {
			actionResponse.error = {
				message: error.message,
			};
			console.error(error);
			return [actionResponse, null, null, null];
		} else {
			throw new Error("Unknown Error");
		}
	}
}
