import {
	browserSupportsWebAuthn,
	browserSupportsWebAuthnAutofill,
	startAuthentication,
} from "@simplewebauthn/browser";
import {
	RequestOnboardResponse,
	WembatActionResponse,
	WembatError,
	WembatOnboardResult,
	WembatRegisterResult,
} from "../types";
import { AuthenticationResponseJSON } from "@simplewebauthn/typescript-types";
import { ab2str, bufferToArrayBuffer, saveCryptoKeyAsString } from "../helper";
import { AxiosInstance } from "axios";

export async function onboard(
	axiosClient: AxiosInstance,
	publicKey: CryptoKey | undefined,
	privateKey: CryptoKey | undefined
): Promise<WembatActionResponse<WembatRegisterResult>> {
	const actionResponse: WembatActionResponse<WembatOnboardResult> = {
		success: false,
		error: {} as WembatError,
		result: {} as WembatRegisterResult,
	};

	try {
		if (!browserSupportsWebAuthn())
			throw Error("WebAuthn is not supported on this browser!");

		if (axiosClient == undefined) throw Error("Axiso Client undefined!");
		if (publicKey == undefined) throw Error("Public Key undefined!");
		if (privateKey == undefined) throw Error("Private Key undefined!");

		const requestOnboardResponse = await axiosClient.post<string>(
			`/request-onboard`,
			{}
		);

		if (requestOnboardResponse.status !== 200) {
			// i guess we need to handle errors here
			throw Error(requestOnboardResponse.data);
		}

		const onboardRequestResponseData: RequestOnboardResponse = JSON.parse(
			requestOnboardResponse.data
		);
		const challengeOptions = onboardRequestResponseData.options as any;
		const conditionalUISupported = await browserSupportsWebAuthnAutofill();

		challengeOptions.extensions.prf.eval.first = bufferToArrayBuffer(
			challengeOptions.extensions.prf.eval.first
		);

		const credentials: AuthenticationResponseJSON = await startAuthentication(
			challengeOptions,
			false
		).catch((err: string) => {
			throw Error(err);
		});

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

		console.log("save public key to string");

		const publicKeyString = await saveCryptoKeyAsString(
			publicKey as CryptoKey
		);

		console.log("save private key to string");
		// TODO better load decrypted string directly here
		const privateKeyString = await saveCryptoKeyAsString(
			privateKey as CryptoKey
		);

		const nonce = window.crypto.getRandomValues(new Uint8Array(12));
		const encoder = new TextEncoder();

		console.log("encrypt private key");

		const encryptedPrivateKey = await crypto.subtle.encrypt(
			{ name: "AES-GCM", iv: nonce },
			encryptionKey,
			encoder.encode(privateKeyString)
		);

		const onboardResponse = await axiosClient.post<string>(`/onboard`, {
			onboardRequest: {
				privateKey: ab2str(encryptedPrivateKey),
				publicKey: publicKeyString,
				nonce: ab2str(nonce),
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
	} catch (error: any) {
		const errorMessage: WembatError = {
			error: error,
		};
		actionResponse.error = errorMessage as WembatError;
		console.error(error);
	} finally {
		return actionResponse;
	}
}
