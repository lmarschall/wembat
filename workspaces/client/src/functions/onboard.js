import { browserSupportsWebAuthn, browserSupportsWebAuthnAutofill, startAuthentication, } from "@simplewebauthn/browser";
import { ab2str, bufferToArrayBuffer, saveCryptoKeyAsString } from "./helper";
export async function onboard(axiosClient, publicKey, privateKey) {
    const actionResponse = {
        success: false,
        error: {},
        result: {},
    };
    try {
        if (!browserSupportsWebAuthn())
            throw Error("WebAuthn is not supported on this browser!");
        if (axiosClient == undefined)
            throw Error("Axiso Client undefined!");
        if (publicKey == undefined)
            throw Error("Public Key undefined!");
        if (privateKey == undefined)
            throw Error("Private Key undefined!");
        const requestOnboardResponse = await axiosClient.post(`/request-onboard`, {});
        if (requestOnboardResponse.status !== 200) {
            // i guess we need to handle errors here
            throw Error(requestOnboardResponse.data);
        }
        const onboardRequestResponseData = JSON.parse(requestOnboardResponse.data);
        const challengeOptions = onboardRequestResponseData.options;
        const conditionalUISupported = await browserSupportsWebAuthnAutofill();
        challengeOptions.extensions.prf.eval.first = bufferToArrayBuffer(challengeOptions.extensions.prf.eval.first);
        const credentials = await startAuthentication({
            optionsJSON: challengeOptions,
        }).catch((err) => {
            throw Error(err);
        });
        const credentialExtensions = credentials.clientExtensionResults;
        const inputKeyMaterial = new Uint8Array(credentialExtensions?.prf.results.first);
        const keyDerivationKey = await crypto.subtle.importKey("raw", inputKeyMaterial, "HKDF", false, ["deriveKey"]);
        // wild settings here
        const label = "encryption key";
        const info = new TextEncoder().encode(label);
        const salt = new Uint8Array();
        const encryptionKey = await crypto.subtle.deriveKey({ name: "HKDF", info, salt, hash: "SHA-256" }, keyDerivationKey, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
        console.log("save public key to string");
        const publicKeyString = await saveCryptoKeyAsString(publicKey);
        console.log("save private key to string");
        const privateKeyString = await saveCryptoKeyAsString(privateKey);
        const nonce = crypto.getRandomValues(new Uint8Array(12));
        const encoder = new TextEncoder();
        console.log("encrypt private key");
        const encryptedPrivateKey = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, encryptionKey, encoder.encode(privateKeyString));
        const onboardResponse = await axiosClient.post(`/onboard`, {
            onboardRequest: {
                privateKey: ab2str(encryptedPrivateKey),
                publicKey: publicKeyString,
                nonce: ab2str(nonce.buffer),
                credentials: credentials,
                challenge: challengeOptions.challenge,
            },
        });
        if (onboardResponse.status !== 200) {
            throw Error(onboardResponse.data);
        }
        const onboardResult = {
            verified: true,
        };
        actionResponse.result = onboardResult;
        actionResponse.success = true;
        return actionResponse;
    }
    catch (error) {
        if (error instanceof Error) {
            actionResponse.error = {
                error: error.message,
            };
            console.error(error);
            return actionResponse;
        }
        else {
            throw Error("Unknown Error:");
        }
    }
}
//# sourceMappingURL=onboard.js.map