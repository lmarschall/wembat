import axios, { AxiosInstance } from "axios";

import { WembatActionResponse, WembatClientToken, WembatLoginResult, WembatMessage, WembatRegisterResult, WembatToken } from "./types";
import { register } from "./functions/register";
import { decrypt } from "./functions/decrypt";
import { login } from "./functions/login";
import { encrypt } from "./functions/encrypt";
import { onboard } from "./functions/onboard";
import { jwtDecode } from "./helper";
import { token } from "./functions/token";

export * from "./types";

/**
 * Represents a client for interacting with the Wembat API.
 */
class WembatClient {
	readonly #apiUrl: string;
	readonly #axiosClient: AxiosInstance;
	#jwt: string | undefined;
	#publicKey: CryptoKey | undefined;
	#privateKey: CryptoKey | undefined;

	/**
	 * Creates an instance of WembatClient.
	 * @param url - The URL of the Backend API.
	 */
	constructor(applicationToken: string) {
		// parse jwt token and get application information
		const tokenPayload: WembatClientToken = jwtDecode(applicationToken);

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
	public async encrypt (wembatMessage: WembatMessage, publicKey: CryptoKey): Promise<WembatActionResponse<WembatMessage>> {
		return await encrypt(this.#privateKey, wembatMessage, publicKey);
	}

	/**
	 * Decrypts a Wembat message using the provided public key.
	 * 
	 * @param wembatMessage - The Wembat message to decrypt.
	 * @param publicKey - The public key used for decryption.
	 * @returns A promise that resolves to a WembatActionResponse containing the decrypted Wembat message.
	 */
	public async decrypt (wembatMessage: WembatMessage, publicKey: CryptoKey): Promise<WembatActionResponse<WembatMessage>> {
		return await decrypt(this.#privateKey, wembatMessage, publicKey);
	}

	/**
	 * Registers a user with the provided email address.
	 * 
	 * @param userMail - The email address of the user to register.
	 * @returns A Promise that resolves to a WembatActionResponse containing the registration result.
	 */
	public async register (userMail: string, autoRegister: boolean = false): Promise<WembatActionResponse<WembatRegisterResult>> {
		return await register(this.#axiosClient, userMail, autoRegister);
	}

	/**
	 * Logs in the user with the specified email address.
	 * @param userMail The email address of the user.
	 * @returns A promise that resolves to a WembatActionResponse containing the login result.
	 */
	public async login (userMail: string, autoLogin: boolean = false): Promise<WembatActionResponse<WembatLoginResult>> {
		const [loginResult, privateKey, publicKey, jwt] = await login(this.#axiosClient, userMail, autoLogin);
		this.#privateKey = privateKey;
		this.#publicKey = publicKey;
		this.#jwt = jwt;
		this.#axiosClient.defaults.headers.common["Authorization"] =
			`Bearer ${this.#jwt}`;
		return loginResult;
	}

	public async onboard (): Promise<WembatActionResponse<WembatRegisterResult>> {
		return await onboard(this.#axiosClient, this.#publicKey, this.#privateKey);
	}

	public async token (): Promise<WembatActionResponse<WembatToken>> {
		return await token(this.#axiosClient, this.#jwt);
	}

	/**
	 * Retrieves the crypto public key.
	 * @returns The crypto public key.
	 */
	public getCryptoPublicKey() {
		return this.#publicKey;
	}
}

export { WembatClient };