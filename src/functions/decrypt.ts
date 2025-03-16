import { deriveEncryptionKey, str2ab } from "./helper";
import { WembatActionResponse, WembatError, WembatMessage } from "../types";

/**
 * Decrypts a WembatMessage using the provided publicKey.
 *
 * @param privateKey - The CryptoKey used for decryption.
 * @param wembatMessage - The WembatMessage to decrypt.
 * @param publicKey - The CryptoKey used for decryption.
 * @returns A Promise that resolves to a WembatActionResponse containing the decrypted message.
 */
export async function decrypt(
	privateKey: CryptoKey | undefined,
	wembatMessage: WembatMessage,
	publicKey: CryptoKey
): Promise<WembatActionResponse<WembatMessage>> {
	const actionResponse = {
		success: false,
		error: {} as WembatError,
		result: {} as WembatMessage,
	};

	try {
		if (privateKey == undefined) throw Error("Private Key undefined!");

		const encryptionKey = await deriveEncryptionKey(privateKey, publicKey);
		const iv = wembatMessage.iv;

		const decrypted = await window.crypto.subtle.decrypt(
			{
				name: "AES-GCM",
				iv: str2ab(iv),
			},
			encryptionKey,
			str2ab(wembatMessage.encrypted)
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
				error: error.message,
			};
			console.error(error);
			return actionResponse;
		} else {
			throw Error("Unknown Error:");
		}
	}
}
