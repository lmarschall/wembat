import { deriveEncryptionKey, fromBase64 } from "./helper";
import { WembatActionResponse, WembatError, WembatMessage } from "../types";
import { Store } from "../store";

/**
 * Decrypts a WembatMessage using the provided publicKey.
 *
 * @param privateKey - The CryptoKey used for decryption.
 * @param wembatMessage - The WembatMessage to decrypt.
 * @param publicKey - The CryptoKey used for decryption.
 * @returns A Promise that resolves to a WembatActionResponse containing the decrypted message.
 */
export async function decrypt(
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
		const iv = wembatMessage.iv;

		const decrypted = await crypto.subtle.decrypt(
			{
				name: "AES-GCM",
				iv: fromBase64(iv),
			},
			encryptionKey,
			fromBase64(wembatMessage.encrypted)
		);

		const decoder = new TextDecoder();
		const message: WembatMessage = {
			message: decoder.decode(decrypted),
			encrypted: "",
			iv: iv,
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
