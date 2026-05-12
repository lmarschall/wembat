import { deriveEncryptionKey, toBase64 } from "./helper";
import { WembatActionResponse, WembatError, WembatMessage } from "../types";
import { Store } from "../store";

/**
 * Encrypts a Wembat message using the provided public key.
 *
 * @param store - The store to save authenticated information.
 * @param wembatMessage - The Wembat message to be encrypted.
 * @param publicKey - The public key used for encryption.
 * @returns A promise that resolves to a WembatActionResponse containing the encrypted message.
 */
export async function encrypt(
	store: Store,
	wembatMessage: WembatMessage,
	publicKey: CryptoKey
): Promise<WembatActionResponse<WembatMessage>> {
	const actionResponse = {
		success: false,
		error: {} as WembatError,
		result: {} as WembatMessage,
	};

	try {
		const privateKey = store.getPrivateKey();
		if (privateKey == undefined) throw new Error("Private Key undefined!");

		const encryptionKey = await deriveEncryptionKey(privateKey, publicKey);
		const iv = crypto.getRandomValues(new Uint8Array(12));

		const encoder = new TextEncoder();
		const encoded = encoder.encode(wembatMessage.message);
		const encrypted = await crypto.subtle.encrypt(
			{
				name: "AES-GCM",
				iv: iv,
			},
			encryptionKey,
			encoded
		);

		const message: WembatMessage = {
			encrypted: toBase64(new Uint8Array(encrypted)),
			iv: toBase64(iv),
			message: "",
		};
		actionResponse.result = message;
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
