/**
 * Registers a user with the specified user ID.
 * 
 * @param userUId - The user ID to register.
 * @returns A promise that resolves to a `WembatActionResponse` containing the registration result.
 */
export async function onboard(
    userUId: string
): Promise<WembatActionResponse<WembatRegisterResult>> {

    const actionResponse: WembatActionResponse<WembatOnboardResult> = {
        success: false,
        error: {} as WembatError,
        result: {} as WembatRegisterResult,
    };

    try {
        if (!browserSupportsWebAuthn())
            throw Error("WebAuthn is not supported on this browser!");

        if (this.axiosClient == undefined)
            throw Error("Axiso Client undefined!");

        const requestOnboardResponse = await this.axiosClient.post<string>(
            `/request-onboard`,
            {
                userInfo: { userJWT: this.jwt },
            }
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

        const firstSalt = new Uint8Array([
            0x4a, 0x18, 0xa1, 0xe7, 0x4b, 0xfb, 0x3d, 0x3f, 0x2a, 0x5d, 0x1f, 0x0c,
            0xcc, 0xe3, 0x96, 0x5e, 0x00, 0x61, 0xd1, 0x20, 0x82, 0xdc, 0x2a, 0x65,
            0x8a, 0x18, 0x10, 0xc0, 0x0f, 0x26, 0xbe, 0x1e,
          ]).buffer;
        
        challengeOptions.extensions.prf.eval.first = firstSalt
        console.log(challengeOptions);

        const credentials: AuthenticationResponseJSON =
            await startAuthentication(challengeOptions, false).catch(
                (err: string) => {
                    throw Error(err);
                }
            );

        const credentialExtensions = credentials.clientExtensionResults as any;

        const inputKeyMaterial = new Uint8Array(
            credentialExtensions?.prf.results.first,
        );
        
        const keyDerivationKey = await crypto.subtle.importKey(
            "raw",
            inputKeyMaterial,
            "HKDF",
            false,
            ["deriveKey"],
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
            ["encrypt", "decrypt"],
        );

        const publicKeyString = await this.saveCryptoKeyAsString(this.publicKey as CryptoKey);
        const privateKeyString = await this.saveCryptoKeyAsString(this.privateKey as CryptoKey);

        const nonce = window.crypto.getRandomValues(new Uint8Array(12));
        const encoder = new TextEncoder();

        const encryptedPrivateKey = await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: nonce },
            encryptionKey,
            encoder.encode(privateKeyString),
        );

        const onboardResponse = await this.axiosClient.post<string>(`/onboard`, {
            onboardRequest: {
                privKey: this.ab2str(encryptedPrivateKey),
                pubKey: publicKeyString,
                nonce: this.ab2str(nonce),
                credentials: credentials,
                challenge: challengeOptions.challenge
            },
        });

        if (onboardResponse.status !== 200) {
            throw Error(onboardResponse.data);
        }

        const onboardResult: WembatOnboardResult = {
            verifiedStatus: true,
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