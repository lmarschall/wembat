import {
	RegisterResponse,
	RequestRegisterResponse,
	WembatActionResponse,
	WembatError,
	WembatRegisterResult,
} from "../types";
import {
	RegistrationResponseJSON,
} from "@simplewebauthn/types";
import { AxiosInstance } from "axios";
import { Bridge, BridgeMessageType, StartRegistrationContent } from "../bridge";
import { bufferToArrayBuffer, deriveEllipticKeypair, deriveEncryptionKeyFromPRF, encryptPrivateKeyString, parseSecretString, saveCryptoKeyAsString, toBase64 } from "./helper";
import { Store } from "../store";

/**
 * Registers a user with the specified user ID.
 *
 * @param axiosClient - The Axios instance for making HTTP requests.
 * @param bridge - The post message bridge object to send data to the wembat frontend.
 * @param store - The store to save authenticated information.
 * @param userMail - The email address of the user to register.
 * @param autoRegister - The boolean flag to determine if auto register process should be triggered
 * @returns A promise that resolves to a `WembatActionResponse` containing the registration result.
 */
export async function register(
	axiosClient: AxiosInstance,
	bridge: Bridge,
	store: Store,
	userMail: string,
	autoRegister: boolean
): Promise<WembatActionResponse<WembatRegisterResult>> {
	const actionResponse: WembatActionResponse<WembatRegisterResult> = {
		success: false,
		error: {} as WembatError,
		result: {} as WembatRegisterResult,
	};

	try {
		const requestRegisterResponse = await axiosClient.post<string>(
			`/request-register`,
			{
				userInfo: { userMail: userMail },
			}
		);

		if (requestRegisterResponse.status !== 200) throw new Error(requestRegisterResponse.data);

		const requestRegisterResponseData: RequestRegisterResponse = JSON.parse(
			requestRegisterResponse.data
		);

		const challengeOptions = requestRegisterResponseData.options as any;
		
		challengeOptions.extensions.prf.eval.first = bufferToArrayBuffer(
			challengeOptions.extensions.prf.eval.first
		);

		const content: StartRegistrationContent = { challengeOptions: challengeOptions, autoRegister };
		const credentials: RegistrationResponseJSON = await bridge.invoke(BridgeMessageType.StartRegistration, content);

		if (credentials.clientExtensionResults == undefined) throw new Error("Client Extension Result undefined!");
		
		const credentialExtensions = credentials.clientExtensionResults as any;

		if (!credentialExtensions.prf?.enabled) throw new Error("PRF extension disabled");

		const inputKeyMaterial = new Uint8Array(
			credentialExtensions?.prf.results.first
		);
		
		const [version, saltString, ivString] = parseSecretString("");
		const { encryptionKey, salt } = await deriveEncryptionKeyFromPRF(inputKeyMaterial, version, saltString);
		
		const keys = await deriveEllipticKeypair();
		store.setKeys(keys.privateKey, keys.publicKey);

		const publicKeyString = await saveCryptoKeyAsString(keys.publicKey);
		const privateKeyString = await saveCryptoKeyAsString(keys.privateKey);

		const { encryptedBuffer, iv } = await encryptPrivateKeyString(privateKeyString, encryptionKey);
		const cipherBlob = `v1|${toBase64(salt)}|${toBase64(iv)}`;

		const registerResponse = await axiosClient.post<string>(`/register`, {
			registerChallengeResponse: {
				credentials: credentials,
				challenge: requestRegisterResponseData.options.challenge,
				privateKey: toBase64(new Uint8Array(encryptedBuffer)),
				publicKey: publicKeyString,
				cipherBlob: cipherBlob,
			},
		});

		if (registerResponse.status !== 200) 
			throw new Error(registerResponse.data);

		const registerResponseData: RegisterResponse = JSON.parse(
			registerResponse.data
		);

		if (!registerResponseData.verified)
			throw new Error("Registration not verified");

		const token = registerResponseData.token;

		store.setUserMail(userMail);
		store.setToken(token);

		axiosClient.defaults.headers.common["Authorization"] =
			`Bearer ${token}`;

		const registerResult: WembatRegisterResult = {
			verified: registerResponseData.verified,
			publicKey: keys.publicKey
		};
		actionResponse.result = registerResult;
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
			throw new Error("Unknown Error:");
		}
	}
}
