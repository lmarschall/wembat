import {
	RequestOnboardResponse,
	WembatActionResponse,
	WembatError,
	WembatOnboardResult,
	WembatRegisterResult,
} from "../types";
import { AuthenticationResponseJSON } from "@simplewebauthn/types";
import { bufferToArrayBuffer, deriveEncryptionKeyFromPRF, encryptPrivateKeyString, saveCryptoKeyAsString, toBase64 } from "./helper";
import { AxiosInstance } from "axios";
import { Store } from "../store";
import { Bridge, BridgeMessageType, StartAuthenticationContent } from "../bridge";

export async function onboard(
	axiosClient: AxiosInstance,
	bridge: Bridge,
	store: Store
): Promise<WembatActionResponse<WembatOnboardResult>> {
	const actionResponse: WembatActionResponse<WembatOnboardResult> = {
		success: false,
		error: {} as WembatError,
		result: {} as WembatOnboardResult,
	};

	try {
		const publicKey = store.getPublicKey();
		const privateKey = store.getPrivateKey();

		if (publicKey == undefined) throw new Error("Public Key undefined!");
		if (privateKey == undefined) throw new Error("Private Key undefined!");

		const requestOnboardResponse = await axiosClient.post<string>(
			`/request-onboard`,
			{}
		);

		if (requestOnboardResponse.status !== 200) throw new Error(requestOnboardResponse.data);

		const onboardRequestResponseData: RequestOnboardResponse = JSON.parse(
			requestOnboardResponse.data
		);
		const challengeOptions = onboardRequestResponseData.options as any;
		// const conditionalUISupported = await browserSupportsWebAuthnAutofill();

		challengeOptions.extensions.prf.eval.first = bufferToArrayBuffer(
			challengeOptions.extensions.prf.eval.first
		);

		const content: StartAuthenticationContent = { challengeOptions: challengeOptions };
		const credentials: AuthenticationResponseJSON = await bridge.invoke(BridgeMessageType.StartAuthentication, content);

		const credentialExtensions = credentials.clientExtensionResults as any;

		const inputKeyMaterial = new Uint8Array(
			credentialExtensions?.prf.results.first
		);

		const { encryptionKey, salt } = await deriveEncryptionKeyFromPRF(inputKeyMaterial, "");

		const publicKeyString = await saveCryptoKeyAsString(publicKey);
		const privateKeyString = await saveCryptoKeyAsString(privateKey);

		const { encryptedBuffer, iv } = await encryptPrivateKeyString(privateKeyString, encryptionKey);

		const cipherBlob = `v1|${toBase64(salt)}|${toBase64(iv)}`;

		const onboardResponse = await axiosClient.post<string>(`/onboard`, {
			onboardRequest: {
				privateKey: toBase64(new Uint8Array(encryptedBuffer)),
				publicKey: publicKeyString,
				cipherBlob: cipherBlob,
				credentials: credentials,
				challenge: challengeOptions.challenge,
			},
		});

		if (onboardResponse.status !== 200) {
			throw Error(onboardResponse.data);
		}

		const onboardResult: WembatOnboardResult = {
			verified: true,
		};
		actionResponse.result = onboardResult;
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
			throw Error("Unknown Error:");
		}
	}
}
