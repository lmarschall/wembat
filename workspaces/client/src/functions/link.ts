import {
	RegisterResponse,
	RequestLinkResponse,
	WembatActionResponse,
	WembatError,
	WembatLinkResult
} from "../types";
import {
	RegistrationResponseJSON,
} from "@simplewebauthn/types";
import { AxiosInstance } from "axios";
import { Bridge, BridgeMessageType, StartRegistrationContent } from "../bridge";
import { bufferToArrayBuffer, deriveEllipticKeypair, deriveEncryptionKeyFromPRF, encryptPrivateKeyString, parseSecretString, saveCryptoKeyAsString, toBase64 } from "./helper";
import { Store } from "../store";

/**
 * Links a new device to the user's account.
 *
 * @param axiosClient - The Axios instance for making HTTP requests.
 * @returns A promise that resolves to a `WembatActionResponse` containing the registration result.
 */
export async function link(
	axiosClient: AxiosInstance,
	store: Store,
	bridge: Bridge
): Promise<WembatActionResponse<WembatLinkResult>> {
	const actionResponse: WembatActionResponse<WembatLinkResult> = {
		success: false,
		error: {} as WembatError,
		result: {} as WembatLinkResult,
	};

	try {
		console.log("request link");

		const requestLinkResponse = await axiosClient.post<string>(
			`/request-link`,
			{}
		);

		if (requestLinkResponse.status !== 200) throw new Error(requestLinkResponse.data);

		const requestLinkResponseData: RequestLinkResponse = JSON.parse(
			requestLinkResponse.data
		);

		const challengeOptions = requestLinkResponseData.options as any;

		console.log(challengeOptions);
				
		challengeOptions.extensions.prf.eval.first = bufferToArrayBuffer(
			challengeOptions.extensions.prf.eval.first
		);

		console.log(challengeOptions);

		const content: StartRegistrationContent = { challengeOptions: challengeOptions, autoRegister: false };
		const credentials: RegistrationResponseJSON = await bridge.invoke(BridgeMessageType.StartRegistration, content);

		if (credentials.clientExtensionResults == undefined) throw new Error("Client Extension Result undefined!");

		const credentialExtensions = credentials.clientExtensionResults as any;

		if (!credentialExtensions.prf?.enabled) throw new Error("PRF extension disabled");

		const inputKeyMaterial = new Uint8Array(
			credentialExtensions?.prf.results.first
		);

		const [version, saltString, ivString] = parseSecretString("");
		const { encryptionKey, salt } = await deriveEncryptionKeyFromPRF(inputKeyMaterial, version, saltString);

		const publicKey = store.getPublicKey();
		const privateKey = store.getPrivateKey();

		if (publicKey == undefined || privateKey == undefined) throw Error("Public or Private Key undefined");

		const publicKeyString = await saveCryptoKeyAsString(publicKey);
		const privateKeyString = await saveCryptoKeyAsString(privateKey);

		const { encryptedBuffer, iv } = await encryptPrivateKeyString(privateKeyString, encryptionKey);
		const cipherBlob = `v1|${toBase64(salt)}|${toBase64(iv)}`;

		const linkResponse = await axiosClient.post<string>(`/link`, {
			linkChallengeResponse: {
				credentials: credentials,
				challenge: requestLinkResponseData.options.challenge,
				privateKey: toBase64(new Uint8Array(encryptedBuffer)),
				publicKey: publicKeyString,
				cipherBlob: cipherBlob,
			},
		});

		if (linkResponse.status !== 200) throw new Error(linkResponse.data);

		const linkResponseData: RegisterResponse = JSON.parse(linkResponse.data);

		if (!linkResponseData.verified)
			throw new Error("Linking not verified");

		const linkResult: WembatLinkResult = {
			verified: linkResponseData.verified,
		};
		actionResponse.result = linkResult;
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
