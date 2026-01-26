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
	WorkerAction,
} from "../types";
import { AuthenticationResponseJSON } from "@simplewebauthn/types";
import {
	ab2str,
	bufferToArrayBuffer,
	deriveEncryptedQuantumSeed,
	deriveEncryptionKeyFromPRF,
	deriveKeysFromEncryptedSeed,
	loadCryptoPrivateKeyFromString,
	loadCryptoPublicKeyFromString,
	saveCryptoKeyAsString,
	str2ab,
	toBase64,
} from "./helper";
import { AxiosInstance } from "axios";

/**
 * Logs in the user using WebAuthn authentication.
 * @param axiosClient - The Axios instance for making HTTP requests.
 * @param userMail - The email address of the user.
 * @returns A Promise that resolves to an array containing the action response, private key, public key, and JWT.
 */
export async function login(
	axiosClient: AxiosInstance,
	worker: Worker,
	userMail: string,
	autoLogin = false
): Promise<any> {
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
			throw Error("WebAuthn is not supported on this browser!");

		const loginRequestResponse = await axiosClient.post<string>(
			`/request-login`,
			{
				userInfo: { userMail: userMail },
			}
		);

		if (loginRequestResponse.status !== 200)
			throw Error(loginRequestResponse.data);

		const loginRequestResponseData: RequestLoginResponse = JSON.parse(
			loginRequestResponse.data
		);
		const challengeOptions = loginRequestResponseData.options as any;
		const conditionalUISupported = await browserSupportsWebAuthnAutofill();

		challengeOptions.extensions.prf.eval.first = bufferToArrayBuffer(
			challengeOptions.extensions.prf.eval.first
		);

		const credentials: AuthenticationResponseJSON = await startAuthentication(
			{
				optionsJSON: challengeOptions,
			}
		).catch((err: string) => {
			throw Error(err);
		});

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
			throw Error(loginReponse.data);

		const loginReponseData: LoginResponse = JSON.parse(loginReponse.data);

		if (!loginReponseData.verified)
			throw Error("Login not verified");


		const message: WorkerAction = { type: 'INITIALIZE', loginResponse: loginReponseData };
    
    	worker.postMessage(message, [prfSeed.buffer]);

		const loginResult: WembatLoginResult = {
			verified: loginReponseData.verified,
			token: token,
		};
		actionResponse.result = loginResult;
		actionResponse.success = true;
		return [actionResponse, privateKey, publicKey, token];
	} catch (error: Error | unknown) {
		if (error instanceof Error) {
			actionResponse.error = {
				error: error.message,
			};
			console.error(error);
			return [actionResponse, null, null, null];
		} else {
			throw Error("Unknown Error:");
		}
	}
}
