import { browserSupportsWebAuthn, browserSupportsWebAuthnAutofill, startAuthentication, } from "@simplewebauthn/browser";
import { ab2str, bufferToArrayBuffer, loadCryptoPrivateKeyFromString, loadCryptoPublicKeyFromString, saveCryptoKeyAsString, str2ab, } from "./helper";
/**
 * Logs in the user using WebAuthn authentication.
 * @param axiosClient - The Axios instance for making HTTP requests.
 * @param userMail - The email address of the user.
 * @returns A Promise that resolves to an array containing the action response, private key, public key, and JWT.
 */
export async function login(axiosClient, userMail, autoLogin = false) {
    const actionResponse = {
        success: false,
        error: {},
        result: {},
    };
    let privateKey = undefined;
    let publicKey = undefined;
    let token = undefined;
    try {
        if (!browserSupportsWebAuthn())
            throw Error("WebAuthn is not supported on this browser!");
        const loginRequestResponse = await axiosClient.post(`/request-login`, {
            userInfo: { userMail: userMail },
        });
        if (loginRequestResponse.status !== 200) {
            // i guess we need to handle errors here
            throw Error(loginRequestResponse.data);
        }
        const loginRequestResponseData = JSON.parse(loginRequestResponse.data);
        const challengeOptions = loginRequestResponseData.options;
        const conditionalUISupported = await browserSupportsWebAuthnAutofill();
        challengeOptions.extensions.prf.eval.first = bufferToArrayBuffer(challengeOptions.extensions.prf.eval.first);
        const credentials = await startAuthentication({
            optionsJSON: challengeOptions,
        }).catch((err) => {
            throw Error(err);
        });
        const loginReponse = await axiosClient.post(`/login`, {
            loginChallengeResponse: {
                credentials: credentials,
                challenge: challengeOptions.challenge,
            },
        }, {
            withCredentials: true,
        });
        if (loginReponse.status !== 200) {
            throw Error(loginReponse.data);
        }
        const loginReponseData = JSON.parse(loginReponse.data);
        if (!loginReponseData.verified)
            throw Error("Login not verified");
        token = loginReponseData.token;
        const publicUserKeyString = loginReponseData.publicUserKey;
        const privateUserKeyEncryptedString = loginReponseData.privateUserKeyEncrypted;
        if (credentials.clientExtensionResults !== undefined) {
            const credentialExtensions = credentials.clientExtensionResults;
            const inputKeyMaterial = new Uint8Array(credentialExtensions?.prf.results.first);
            const keyDerivationKey = await crypto.subtle.importKey("raw", inputKeyMaterial, "HKDF", false, ["deriveKey"]);
            // wild settings here
            const label = "encryption key";
            const info = new TextEncoder().encode(label);
            const salt = new Uint8Array();
            const encryptionKey = await crypto.subtle.deriveKey({ name: "HKDF", info, salt, hash: "SHA-256" }, keyDerivationKey, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
            if (publicUserKeyString !== "" &&
                privateUserKeyEncryptedString !== "") {
                console.log("Loading existing keys");
                publicKey = await loadCryptoPublicKeyFromString(publicUserKeyString);
                const nonce = loginReponseData.nonce;
                const decoder = new TextDecoder();
                const decryptedPrivateUserKey = await crypto.subtle.decrypt({ name: "AES-GCM", iv: str2ab(nonce) }, encryptionKey, str2ab(privateUserKeyEncryptedString));
                privateKey = await loadCryptoPrivateKeyFromString(decoder.decode(decryptedPrivateUserKey));
            }
            else {
                console.log("Generating new keys");
                const keyPair = await crypto.subtle.generateKey({
                    name: "ECDH",
                    namedCurve: "P-384",
                }, true, ["deriveKey", "deriveBits"]);
                publicKey = keyPair.publicKey;
                privateKey = keyPair.privateKey;
                const publicKeyString = await saveCryptoKeyAsString(publicKey);
                const privateKeyString = await saveCryptoKeyAsString(privateKey);
                const nonce = crypto.getRandomValues(new Uint8Array(12));
                const encoder = new TextEncoder();
                const encoded = encoder.encode(privateKeyString);
                const encryptedPrivateKey = await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, encryptionKey, encoded);
                const headers = {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                };
                const saveCredentialsResponse = await axiosClient.post(`/update-credentials`, {
                    updateCredentialsRequest: {
                        privKey: ab2str(encryptedPrivateKey),
                        pubKey: publicKeyString,
                        nonce: ab2str(nonce.buffer),
                        sessionId: loginReponseData.sessionId,
                    },
                }, {
                    headers: headers,
                });
                if (saveCredentialsResponse.status !== 200) {
                    throw Error(saveCredentialsResponse.data);
                }
            }
        }
        else {
            throw Error("Credentials not instance of PublicKeyCredential");
        }
        const loginResult = {
            verified: loginReponseData.verified,
            token: token,
        };
        actionResponse.result = loginResult;
        actionResponse.success = true;
        return [actionResponse, privateKey, publicKey, token];
    }
    catch (error) {
        if (error instanceof Error) {
            actionResponse.error = {
                error: error.message,
            };
            console.error(error);
            return [actionResponse, null, null, null];
        }
        else {
            throw Error("Unknown Error:");
        }
    }
}
//# sourceMappingURL=login.js.map