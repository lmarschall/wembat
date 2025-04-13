import axios from "axios";
import { register } from "./functions/register";
import { decrypt } from "./functions/decrypt";
import { login } from "./functions/login";
import { encrypt } from "./functions/encrypt";
import { onboard } from "./functions/onboard";
import { jwtDecode } from "./functions/helper";
import { token } from "./functions/token";
import { link } from "./functions/link";
export * from "./types";
/**
 * Represents a client for interacting with the Wembat API.
 */
class WembatClient {
    #apiUrl;
    #axiosClient;
    #jwt;
    #publicKey;
    #privateKey;
    /**
     * Creates an instance of WembatClient.
     * @param url - The URL of the Backend API.
     */
    constructor(applicationToken) {
        // parse jwt token and get application information
        const tokenPayload = jwtDecode(applicationToken);
        if (tokenPayload == null) {
            throw new Error("Invalid application token");
        }
        this.#apiUrl = tokenPayload.iss;
        this.#axiosClient = axios.create({
            baseURL: `${this.#apiUrl}/api/webauthn`,
            validateStatus: function (status) {
                return status == 200 || status == 400;
            },
            transformResponse: (res) => res,
            responseType: "text",
        });
        this.#axiosClient.defaults.headers.common["Content-Type"] =
            "application/json";
        this.#axiosClient.defaults.headers.common["Authorization"] =
            `Bearer ${this.#jwt}`;
        this.#axiosClient.defaults.headers.common["Wembat-App-Token"] =
            `Bearer ${applicationToken}`;
    }
    /**
     * Encrypts a Wembat message using the provided public key.
     *
     * @param wembatMessage - The Wembat message to encrypt.
     * @param publicKey - The public key to use for encryption.
     * @returns A promise that resolves to a WembatActionResponse containing the encrypted Wembat message.
     */
    async encrypt(wembatMessage, publicKey) {
        return await encrypt(this.#privateKey, wembatMessage, publicKey);
    }
    /**
     * Decrypts a Wembat message using the provided public key.
     *
     * @param wembatMessage - The Wembat message to decrypt.
     * @param publicKey - The public key used for decryption.
     * @returns A promise that resolves to a WembatActionResponse containing the decrypted Wembat message.
     */
    async decrypt(wembatMessage, publicKey) {
        return await decrypt(this.#privateKey, wembatMessage, publicKey);
    }
    /**
     * Registers a user device with the provided email address.
     *
     * @param userMail - The email address of the user to register.
     * @returns A Promise that resolves to a WembatActionResponse containing the registration result.
     */
    async register(userMail, autoRegister = false) {
        return await register(this.#axiosClient, userMail, autoRegister);
    }
    /**
     * Logs in the user with the specified email address.
     * @param userMail The email address of the user.
     * @returns A promise that resolves to a WembatActionResponse containing the login result.
     */
    async login(userMail, autoLogin = false) {
        const [loginResult, privateKey, publicKey, jwt] = await login(this.#axiosClient, userMail, autoLogin);
        this.#privateKey = privateKey;
        this.#publicKey = publicKey;
        this.#jwt = jwt;
        this.#axiosClient.defaults.headers.common["Authorization"] =
            `Bearer ${this.#jwt}`;
        return loginResult;
    }
    /**
     * Onboards the new user device linked to the active wembat session.
     * @returns A promise that resolves to a WembatActionResponse containing the onboard result.
     */
    async onboard() {
        return await onboard(this.#axiosClient, this.#publicKey, this.#privateKey);
    }
    /**
     * Links the new user device to the active wembat session.
     * @returns A promise that resolves to a WembatActionResponse containing the link result.
     */
    async link() {
        return await link(this.#axiosClient);
    }
    /**
     * Retrieves the token for the current session.
     * @returns A promise that resolves to a WembatActionResponse containing the token.
     */
    async token() {
        return await token(this.#axiosClient, this.#jwt);
    }
    /**
     * Retrieves the crypto public key.
     * @returns The crypto public key.
     */
    getCryptoPublicKey() {
        return this.#publicKey;
    }
}
export { WembatClient };
//# sourceMappingURL=index.js.map