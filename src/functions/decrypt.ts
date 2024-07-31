/**
 * Decrypts a WembatMessage using the provided publicKey.
 * 
 * @param wembatMessage - The WembatMessage to decrypt.
 * @param publicKey - The CryptoKey used for decryption.
 * @returns A Promise that resolves to a WembatActionResponse containing the decrypted message.
 */
export async function decrypt(
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
        const iv = wembatMessage.iv;

        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: "AES-GCM",
                iv: this.str2ab(iv),
            },
            encryptionKey,
            this.str2ab(wembatMessage.encrypted)
        );

        const dec = new TextDecoder();
        const message: WembatMessage = {
            message: dec.decode(decrypted),
            encrypted: "",
            iv: iv,
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