/**
 * Encrypts a Wembat message using the provided public key.
 *
 * @param wembatMessage - The Wembat message to be encrypted.
 * @param publicKey - The public key used for encryption.
 * @returns A promise that resolves to a WembatActionResponse containing the encrypted message.
 */
export async function encrypt(
    wembatMessage: WembatMessage,
    publicKey: CryptoKey
): Promise<WembatActionResponse<WembatMessage>> {
    const actionResponse = {
        success: false,
        error: {} as WembatError,
        result: {} as WembatMessage,
    };

    try {
        const encryptionKey = await this.deriveEncryptionKey(publicKey);
        const iv = window.crypto.getRandomValues(new Uint8Array(12));

        const encoder = new TextEncoder();
        const encoded = encoder.encode(wembatMessage.message);
        const encrypted = await window.crypto.subtle.encrypt(
            {
                name: "AES-GCM",
                iv: iv,
            },
            encryptionKey,
            encoded
        );

        const message: WembatMessage = {
            encrypted: this.ab2str(encrypted),
            iv: this.ab2str(iv),
            message: "",
        };
        actionResponse.result = message;
        actionResponse.success = true;
    } catch (error: any) {
        const errorMessage: WembatError = {
            error: error,
        };
        actionResponse.error = errorMessage;
        console.error(error);
    } finally {
        return actionResponse;
    }
}